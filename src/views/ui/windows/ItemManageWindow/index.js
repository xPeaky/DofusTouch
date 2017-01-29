require('./styles.less');
var addTooltip = require('TooltipBox').addTooltip;
var Button = require('Button').DofusButton;
var getText = require('getText').getText;
var inherits = require('util').inherits;
var ItemSlot = require('ItemSlot');
var ProgressBar = require('ProgressBar');
var Window = require('Window');
var windowsManager = require('windowsManager');
var WuiDom = require('wuidom');

// enums
var moods = {
	MOOD_LEAN: 0,
	MOOD_SATISFIED: 1,
	MOOD_FAT: 2
};

/**
 * That window is the manage the living object. You can give you the item Parasymbic Cape id: 12425. Associate the cape
 * to your actual one (by drag and drop into your cape equipment slot). Inside the action button you can manage the
 * living object.
 * @constructor
 */
function ItemManageWindow() {
	Window.call(this, {
		className: 'ItemManageWindow',
		title: getText('ui.item.manageItem'),
		positionInfo: { left: 'c', top: 'c', width: 300, height: 300 }
	});

	var self = this;

	// properties
	this.itemInstance = null;
	this.lastLivingObjectId = '';

	// methods
	function feedButtonTapped() {
		var feedWindow = windowsManager.getWindow('feed');
		if (!feedWindow.possessFeedItemForLivingObject(self.itemInstance)) {
			return window.gui.openSimplePopup(getText('ui.item.errorNoFoodLivingItem', self.itemInstance.item.nameId));
		}
		windowsManager.open('feed', { mode: 'livingObject', item: self.itemInstance });
	}

	function dissociateButtonTapped() {
		// will show original (now detached) living item once inventory, not dofus, emits event
		self.lastLivingObjectId = self.itemInstance.livingObjectId;

		window.dofus.sendMessage('LivingObjectDissociateMessage', {
			livingUID: self.itemInstance.objectUID,
			livingPosition: self.itemInstance.position
		});
	}

	function appearanceButtonTapped() {
		windowsManager.open('itemAppearance', { itemInstance: self.itemInstance });
	}

	this.once('open', function () {
		// ^^^ top
		var topRow = this.windowBody.createChild('div', { className: 'topRow' });

		// item slot
		this.itemSlot = topRow.appendChild(new ItemSlot());

		// buttons
		var buttons = topRow.createChild('div', { className: 'buttons' });

		this.feedButton = buttons.appendChild(new Button(getText('ui.item.feed')));
		this.feedButton.on('tap', feedButtonTapped);

		this.dissociateButton = buttons.appendChild(new Button(getText('ui.item.dissociate')));
		this.dissociateButton.on('tap', dissociateButtonTapped);

		this.appearanceButton = buttons.appendChild(new Button(getText('ui.item.skin')));
		this.appearanceButton.on('tap', appearanceButtonTapped);

		// ___ bottom
		var botRow = this.windowBody.createChild('div', { className: 'botRow' });

		// stats
		var statsBox = botRow.createChild('div', { className: 'statsBox' });
		statsBox.createChild('div', { className: 'label', text: getText('ui.common.state') + getText('ui.common.colon') });
		this.moodBox = statsBox.createChild('div', { className: 'value' });

		this.lastFedBox = statsBox.createChild('div', { className: ['label', 'lastFedBox'] });

		var labelStr = getText('ui.common.level') + getText('ui.common.colon');
		statsBox.createChild('div', { className: 'label', text: labelStr });
		this.levelBox = statsBox.createChild('div', { className: 'value' });

		labelStr = getText('ui.common.experiment') + getText('ui.common.colon');
		statsBox.createChild('div', { className: 'label', text: labelStr });
		this.expBar = statsBox.appendChild(new ProgressBar());
		this.expBar.addClassNames('expBar', 'blue', 'value');

		this.expTooltip = new WuiDom('div', { className: 'expTooltip' });
		addTooltip(this.expBar, this.expTooltip);

		// events
		window.gui.playerData.inventory.on('itemAdded', function (itemInstance) {
			// is added object newly detached living object?
			if (itemInstance.objectGID === self.lastLivingObjectId) {
				var livingObjectInstance = window.gui.playerData.inventory.objects[itemInstance.objectUID];
				self._displayItem(livingObjectInstance);
			}
		});

		window.gui.playerData.inventory.on('itemModified', function (itemInstance) {
			if (!itemInstance || !self.itemInstance) {
				return;
			}

			if (itemInstance.livingObjectId && itemInstance.livingObjectId === self.itemInstance.objectGID) {
				// modified object now associated with living object
				self._displayItem(itemInstance);
			} else if (itemInstance.objectUID === self.itemInstance.objectUID) {
				// item has been dissociated or simply updated
				self._displayItem(itemInstance);
			}
			// could be one conditional but split for (gasp) human readability
		});
	});

	this.on('open', function (params) {
		if (!params.itemInstance || !params.itemInstance.livingObjectCategory) {
			return console.error('Must provide a living object or living object associated itemInstance');
		}
		this._displayItem(params.itemInstance);
	});
}

inherits(ItemManageWindow, Window);
module.exports = ItemManageWindow;

ItemManageWindow.prototype._updateMood = function (itemInstance) {
	var moodStr;
	switch (itemInstance.livingObjectMood) {

		case moods.MOOD_LEAN:
			moodStr = getText('ui.common.lean');
			break;

		case moods.MOOD_SATISFIED:
			moodStr = getText('ui.common.satisfied');
			break;

		case moods.MOOD_FAT:
			moodStr = getText('ui.common.fat');
			break;
	}

	this.moodBox.setText(moodStr);
};

ItemManageWindow.prototype._updateLastFed = function (itemInstance) {
	this.lastFedBox.setText(itemInstance.livingObjectFoodDate);
};

ItemManageWindow.prototype._updateExp = function (itemInstance) {
	this.levelBox.setText(itemInstance.livingObjectLevel);

	var xp = itemInstance.livingObjectXp;
	var maxXp = itemInstance.livingObjectMaxXp;
	this.expBar.setValue(maxXp !== 0 ? xp / maxXp : 1);
	this.expTooltip.setText(xp + ' / ' + maxXp);
};

// public
ItemManageWindow.prototype._displayItem = function (itemInstance) {
	// NOTE: should always be a living object or item associated with living object
	this.itemInstance = itemInstance;

	// item icon
	this.itemSlot.setItem(itemInstance);
	this.itemSlot.setQuantity(1); // in case stacked multiple living objects

	// buttons
	// NOTE: can feed and dissociate only when associated
	if (itemInstance.livingObjectId && itemInstance.objectGID) {
		this.feedButton.enable();
		this.dissociateButton.enable();
	} else {
		this.feedButton.disable();
		this.dissociateButton.disable();
	}

	// mood
	this._updateMood(itemInstance);

	// last fed
	this._updateLastFed(itemInstance);

	// level & exp
	this._updateExp(itemInstance);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/ItemManageWindow/index.js
 ** module id = 780
 ** module chunks = 0
 **/