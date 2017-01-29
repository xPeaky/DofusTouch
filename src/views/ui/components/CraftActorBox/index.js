require('./styles.less');
var dragManager = require('dragManager');
var ItemSlot = require('ItemSlot');
var inherits = require('util').inherits;
var WuiDom = require('wuidom');
var MinMaxSelector = require('MinMaxSelector');
var getText = require('getText').getText;


function CraftActorBox() {
	WuiDom.call(this, 'div', { className: 'CraftActorBox' });
	var self = this;

	this._usedSlots = 0;
	this._runeSignatureUid = null;

	this._minMaxSelector = this.appendChild(new MinMaxSelector());
	this._minMaxSelector.setStyles({
		left: '20px',
		top: '30px'
	});

	var toCraft = false;
	var currentUID = null;
	var currentGID = null;
	var jobsData = window.gui.playerData.jobs;

	function moveItem(quantity) {
		jobsData.moveItemBetweenCrafAndInventory(currentUID, currentGID, quantity, toCraft);
	}

	this._minMaxSelector.on('confirm', moveItem);

	var wrapper = this.createChild('div', { className: 'wrapper' });
	var slotsContainer = this._slotsContainer = wrapper.createChild('div', { className: 'slotsContainer' });

	function selectSlot(itemUID, itemGID, quantity) {
		currentUID = itemUID;
		currentGID = itemGID;

		if (currentGID === jobsData.RUNE_SIGNATURE_GID) {
			return moveItem(1);
		}

		if (quantity === 1) {
			return moveItem(1);
		}

		self._minMaxSelector.open({
			min: 1,
			max: quantity
		});
	}

	function onDoubleTap() {
		if (self._isRemote) {
			return;
		}
		var itemInstance = this.itemInstance;
		if (!itemInstance) {
			return;
		}

		toCraft = false;

		// force qty one on double tap
		selectSlot(itemInstance.objectUID, itemInstance.objectGID, 1);
	}

	this._addDoubleTap = function (slot) {
		slot.on('doubletap', onDoubleTap);
	};

	this._createSignatureSlot = function () {
		var signatureSlot = this._signatureSlot = slotsContainer.appendChild(new ItemSlot());
		signatureSlot.addClassNames('signatureSlot');
		this._addDoubleTap(signatureSlot);
	};

	dragManager.setDroppable(this, ['craftInventory']);
	this.on('drop', function (slot) {
		if (self._isRemote) {
			return;
		}

		toCraft = true;
		var itemInstance = slot.itemInstance;

		var displayedQuantity = slot.getQuantity();
		selectSlot(itemInstance.objectUID, itemInstance.objectGID, displayedQuantity);
	});

	this._playerName = slotsContainer.createChild('div', { className: 'playerName' });
	this._playerRole = slotsContainer.createChild('div', { className: 'playerRole' });
	this._allSlots = slotsContainer.createChild('div', { className: 'allSlots' });

	// add signature slot
	this._createSignatureSlot();
	this._signatureSlot.hide();

	for (var i = 0; i < jobsData.MAX_CRAFT_SLOTS; i += 1) {
		this._allSlots.appendChild(new ItemSlot());
	}
}


inherits(CraftActorBox, WuiDom);
module.exports = CraftActorBox;


CraftActorBox.prototype.setNbSlots = function () {
	var children = this._allSlots.getChildren();
	var totalSlots = this._usedSlots + window.gui.playerData.jobs.getAvailableSlots();

	for (var i = 0, len = children.length; i < len; i += 1) {
		var slot = children[i];
		var isLocked = (i >= totalSlots);
		slot.toggleClassName('locked', isLocked);
		slot.isLocked = isLocked;
	}
};


CraftActorBox.prototype.toggleSignatureSlot = function (forceDisplay) {
	this._signatureSlot.toggleDisplay(forceDisplay);
};


CraftActorBox.prototype.selectSlots = function (select) {
	var children = this._allSlots.getChildren();
	for (var i = 0, len = children.length; i < len; i += 1) {
		var slot = children[i];
		slot.toggleClassName('selected', (!slot.isLocked && select));
	}
};


CraftActorBox.prototype.incrementAvailableSlots = function (increment) {
	var jobsData = window.gui.playerData.jobs;
	var currentSlots = jobsData.getAvailableSlots();

	var newSlots = currentSlots + increment;
	jobsData.setAvailableSlots(newSlots);
};


CraftActorBox.prototype.setAsRemote = function () {
	this._isRemote = true;
	this._slotsContainer.addClassNames('client');
};


CraftActorBox.prototype.setPlayerName = function (playerName) {
	this._playerName.setText(playerName);
};


CraftActorBox.prototype.toggleReady = function (forceDisplay) {
	this.toggleClassName('isReady', forceDisplay);
};


CraftActorBox.prototype._findSlotByUID = function (UID) {
	var children = this._allSlots.getChildren();

	for (var i = 0, len = children.length; i < len; i += 1) {
		var slot = children[i];
		if (slot.itemInstance && slot.itemInstance.objectUID === UID) {
			return i;
		}
	}
	return null;
};


/**
 * @param {object} itemInstance
 */
CraftActorBox.prototype.addAndModifySlot = function (itemInstance) {
	var self = this;
	var slot;
	var children = this._allSlots.getChildren();

	if (itemInstance.objectGID === window.gui.playerData.jobs.RUNE_SIGNATURE_GID) {
		var signatureSlot = this._signatureSlot;

		this._runeSignatureUid = itemInstance.objectUID;
		signatureSlot.setItem(itemInstance);

		if (!this._isRemote) {
			dragManager.setDraggable(
				signatureSlot,
				{ backgroundImage: signatureSlot.getImage() },
				'crafting',
				{ slot: signatureSlot }
			);
		}
		return;
	}

	var slotIndex = this._findSlotByUID(itemInstance.objectUID);

	if (!slotIndex && slotIndex !== 0) {
		// add
		slot = children[this._usedSlots];
		slot.setItem(itemInstance);
		self._addDoubleTap(slot);

		if (!this._isRemote) {
			dragManager.setDraggable(slot, { backgroundImage: slot.getImage() }, 'crafting', { slot: slot });
		}

		this._usedSlots += 1;
	} else {
		// modify
		slot = children[slotIndex];
		slot.setItem(itemInstance);
	}
};

/**
 * Remove ingredient. Return if the ingredient was correctly removed.
 * @param {number} objectUID
 * @return {boolean} - Should we increment slots availability?
 */
CraftActorBox.prototype.removeIngredient = function (objectUID) {
	var shouldIncrementSlots = false;

	if (objectUID === this._runeSignatureUid) {
		this._signatureSlot.destroy();
		this._runeSignatureUid = null;
		this._createSignatureSlot();
		return shouldIncrementSlots; // false, not increment on rune signature
	}

	var slotIndex = this._findSlotByUID(objectUID);

	if (!slotIndex && slotIndex !== 0) {
		return shouldIncrementSlots; // false, slot not found
	}

	// slot found, we should increment slots
	shouldIncrementSlots = true;

	var children = this._allSlots.getChildren();
	var slot = children[slotIndex];

	slot.destroy();

	this._allSlots.appendChild(new ItemSlot());
	this.setNbSlots();

	this._usedSlots -= 1;
	return shouldIncrementSlots;
};


CraftActorBox.prototype.getGivenIngredientsInfo = function () {
	var children = this._allSlots.getChildren();
	var givenIngredientsInfo = [];

	for (var i = 0, len = children.length; i < len; i += 1) {
		var itemInstance = children[i].itemInstance;
		if (itemInstance) {
			givenIngredientsInfo.push({
				UID: itemInstance.objectUID,
				GID: itemInstance.objectGID,
				quantity: itemInstance.quantity
			});
		}
	}
	return givenIngredientsInfo;
};


CraftActorBox.prototype.getRuneSignatureInfo = function () {
	var itemInstance = this._signatureSlot.itemInstance;
	if (!itemInstance) {
		return {};
	}
	return {
		UID: itemInstance.objectUID,
		GID: itemInstance.objectGID,
		quantity: itemInstance.quantity
	};
};


CraftActorBox.prototype.setCrafterJobLevel = function (skillId, crafterJobLevel, jobName) {
	if (!crafterJobLevel) {
		this._playerRole.setText(getText('ui.craft.client'));
	} else {
		this._playerRole.setText(jobName + ' ' + getText('ui.common.short.level') + ' ' + crafterJobLevel);
	}
};



CraftActorBox.prototype.clear = function () {
	this._minMaxSelector.hide();
	this._isRemote = false;
	this._usedSlots = 0;

	this._signatureSlot.destroy();
	this._runeSignatureUid = null;

	var children = this._allSlots.getChildren();
	this._createSignatureSlot();
	this._signatureSlot.hide();

	for (var i = 0, len = children.length; i < len; i += 1) {
		var slot = children[i];
		slot.destroy();
		this._allSlots.appendChild(new ItemSlot());
	}
	this.setNbSlots();
};




/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/CraftActorBox/index.js
 ** module id = 914
 ** module chunks = 0
 **/