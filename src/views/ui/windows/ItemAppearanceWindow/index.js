require('./styles.less');
var Button = require('Button').DofusButton;
var getText = require('getText').getText;
var inherits = require('util').inherits;
var Slot = require('Slot');
var staticContent = require('staticContent');
var Window = require('Window');
var windowsManager = require('windowsManager');
var assetPreloading = require('assetPreloading');

// const
var MAX_NUM_SKINS = 20;

function ItemAppearanceWindow() {
	Window.call(this, {
		className: 'ItemAppearanceWindow',
		title: getText('ui.item.chooseSkin'),
		positionInfo: { left: 'c', top: 'c', width: 450, height: 200 }
	});

	var self = this;

	// properties
	this.itemSlots = [];
	this.selectedSlot = null;
	this.itemInstance = null;

	// methods
	function closeWindow() {
		windowsManager.close('itemAppearance');
	}

	function confirmButtonTapped() {
		// NOTE: server receives skin from 1-20, though icons accessed from 0-19
		var selectedSkin = self.itemSlots.indexOf(self.selectedSlot) + 1;
		if (self.itemInstance.livingObjectSkin === selectedSkin) {
			return closeWindow();
		}

		this.disable();
		window.dofus.sendMessage('LivingObjectChangeSkinRequestMessage', {
			livingUID: self.itemInstance.objectUID,
			livingPosition: self.itemInstance.position,
			skinId: selectedSkin
		});
		// close window once object modified message
	}

	function clean() {
		self.delClassNames('spinner');
		self.confirmButton.enable();
		if (self.selectedSlot) {
			self.selectedSlot.select(false);
			delete self.selectedSlot;
		}
	}

	function selectSlot() {
		var selectedSkin = self.itemSlots.indexOf(this) + 1;
		if (this === self.selectedSlot || self.itemInstance.livingObjectLevel < selectedSkin) {
			return;
		}
		if (self.selectedSlot) {
			self.selectedSlot.select(false);
		}
		this.select();
		self.selectedSlot = this;
	}

	this.once('open', function () {
		// slots grid
		this.itemSlotsBox = this.windowBody.createChild('div', { className: 'itemSlotsBox' });
		for (var i = 0; i < MAX_NUM_SKINS; i += 1) {
			var newSlot = this.itemSlotsBox.appendChild(new Slot());
			newSlot.on('tap', selectSlot);

			self.itemSlots.push(newSlot);
		}

		this.confirmButton = this.windowBody.appendChild(new Button(getText('ui.common.validation')));
		this.confirmButton.on('tap', confirmButtonTapped);

		// events
		window.gui.playerData.inventory.on('itemModified', function (itemInstance) {
			if (self.itemInstance && itemInstance.objectUID === self.itemInstance.objectUID) {
				closeWindow();
			}
		});
	});

	this.on('open', function (params) {
		if (!params.itemInstance || !params.itemInstance.livingObjectCategory) {
			return console.error('Must provide a living object or living object associated itemInstance');
		}
		this._displayItem(params.itemInstance);
	});

	this.on('close', function () {
		clean();
	});
}

inherits(ItemAppearanceWindow, Window);
module.exports = ItemAppearanceWindow;

ItemAppearanceWindow.prototype._displayItem = function (itemInstance) {
	// NOTE: should always be a living object or item associated with living object
	this.itemInstance = itemInstance;

	var self = this;
	this.addClassNames('spinner');
	this.confirmButton.disable();

	// select slot
	self.itemSlots[itemInstance.livingObjectSkin - 1].emit('tap'); // select

	var objectId = itemInstance.livingObjectId || itemInstance.objectGID;
	staticContent.getData('LivingObjectSkinJntMood', objectId, function (error, skin) {
		if (error) {
			return console.error(error);
		}

		// update each item slot with all available skins in current mood
		// limit available by level, which corresponds to each skin + 1
		var i;
		var images = [];
		for (i = 0; i < skin.moods[itemInstance.livingObjectMood].length; i += 1) {
			var iconId = skin.moods[itemInstance.livingObjectMood][i];
			images.push('gfx/items/' + iconId + '.png');
		}

		assetPreloading.preloadImages(images, function (urls) {
			for (var i = 0; i < self.itemSlots.length; i += 1) {
				var itemSlot = self.itemSlots[i];
				if (i >= self.itemInstance.livingObjectLevel) {
					itemSlot.unset();
				} else {
					itemSlot.setImage(urls[i]);
				}
			}

			self.delClassNames('spinner');
			self.confirmButton.enable();
		});
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/ItemAppearanceWindow/index.js
 ** module id = 776
 ** module chunks = 0
 **/