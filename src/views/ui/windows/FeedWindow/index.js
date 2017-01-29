require('./styles.less');
var Button = require('Button');
var getText = require('getText').getText;
var inherits = require('util').inherits;
var ItemBox = require('ItemBox');
var NumberInputBox = require('NumberInputBox');
var Placeholder = require('Placeholder');
var Window = require('Window');

// TODO the RideFood database does not possess a primary key. so in the meantime, i just hardcode the 6 values..
var rideFoodGIds = [7903, 7904];
var rideFoodTypeIds = [41, 62, 63, 64];

function filterMount(item) {
	return rideFoodGIds.indexOf(item.objectGID) !== -1 || rideFoodTypeIds.indexOf(item.item.typeId) !== -1;
}

function feedItem(qty, foodUID, data) {
	window.dofus.sendMessage('ObjectFeedMessage', {
		objectUID: data.item.objectUID,
		foodUID: foodUID,
		foodQuantity: qty
	});
}

function feedMount(qty, foodUID, data) {
	window.dofus.sendMessage('MountFeedRequestMessage', {
		mountUid: data.mountUid,
		mountLocation: data.mountLocation,
		mountFoodUid: foodUID,
		quantity: qty
	});
}

function getLivingObjectMessage() { return getText('ui.item.confirmFoodLivingItem'); }

function getMountMessage(qty, name) { return getText('ui.item.confirmFoodMount', qty, name); }


function FeedWindow(storageViewer) {
	Window.call(this, {
		title: getText('ui.common.feed'),
		className: 'FeedWindow',
		positionInfo: { right: 315, bottom: 30, width: 400, height: 510 }
	});

	var self = this;

	var foodItems, footTypeItems;
	function filterPet(item) {
		return foodItems.indexOf(item.objectGID) !== -1 || footTypeItems.indexOf(item.item.typeId) !== -1;
	}

	var livingObjectCategory;
	function filterLivingObject(item) {
		return !item.livingObjectCategory && item.item.type.id === livingObjectCategory;
	}

	function setupWithQuantity() {
		self.quantity.show();
		self.quantityLabel.setText(getText('ui.common.quantity') + getText('ui.common.colon'));
		self.maxBtn.show();
		self.minBtn.show();
	}

	function setupWithoutQuantity() {
		self.quantity.hide();
		self.quantityLabel.setText(getText('ui.common.quantity') + getText('ui.common.colon') + ' 1');
		self.maxBtn.hide();
		self.minBtn.hide();
	}

	function getFilteredItems(filter) {
		var filteredItems = {};
		var allItems = window.gui.playerData.inventory.objects;
		for (var id in allItems) {
			var item = allItems[id];
			if (filter(item)) {
				filteredItems[id] = item;
			}
		}
		return filteredItems;
	}

	var settings = {
		mount: {
			handleInput: function () {},
			setupUI: setupWithQuantity,
			filter: filterMount,
			confirmMessage: getMountMessage,
			confirmAction: feedMount
		},
		pet: {
			handleInput: function (params) {
				var item = params.item.item;
				foodItems = item.foodItems;
				footTypeItems = item.foodTypes;
			},
			setupUI: setupWithQuantity,
			filter: filterPet,
			confirmMessage: getLivingObjectMessage,
			confirmAction: feedItem
		},
		livingObject: {
			handleInput: function (params) {
				livingObjectCategory = params.item.livingObjectCategory;
			},
			setupUI: setupWithoutQuantity,
			filter: filterLivingObject,
			confirmMessage: getLivingObjectMessage,
			confirmAction: feedItem
		}
	};

	this.storageViewer = storageViewer;
	this.storageViewer.registerView(this, {
		manualOpening: true
	});

	this.on('slot-tap', function (slot) {
		this._selectItem(slot.itemInstance);
	});

	this.once('open', function () {
		this._createDom();
	});

	this.on('open', function (params) {
		params = params || {};

		this._reset();

		this.mode = params.mode;
		this.params = params;
		this.setting = settings[this.mode];

		this.setting.handleInput(params);
		this.setting.setupUI();

		// storage viewer
		var categoryItems = getFilteredItems(this.setting.filter);
		this.storageViewer.setItemList(categoryItems);

		// add filter to list of storageViewer filters
		this.storageViewer.addFilters([this.setting.filter]);
	});

	this.on('close', function () {
		this.storageViewer.removeFilter(this.setting.filter);
	});

	this.on('closed', function () {
		this.storageViewer.unloadContent();
	});

	this.on('itemQuantity', function (item) {
		this._selectItem(item);
	});

	this.on('itemRemoved', function () {
		this._reset();
	});
}
inherits(FeedWindow, Window);

FeedWindow.prototype.possessFeedItemForMount = function () {
	var itemList = window.gui.playerData.inventory.objects;
	var itemUids = Object.keys(itemList);
	for (var i = 0, len = itemUids.length; i < len; i += 1) {
		if (filterMount(itemList[itemUids[i]])) {
			return true;
		}
	}

	return false;
};

FeedWindow.prototype.possessFeedItemForPet = function (pet) {
	var itemList = window.gui.playerData.inventory.objects;
	var itemUids = Object.keys(itemList);

	var foodItems = pet.item.foodItems;
	var footTypeItems = pet.item.foodTypes;

	for (var i = 0, len = itemUids.length; i < len; i += 1) {
		var item = itemList[itemUids[i]];
		if (foodItems.indexOf(item.objectGID) !== -1 || footTypeItems.indexOf(item.item.typeId) !== -1) {
			return true;
		}
	}

	return false;
};

FeedWindow.prototype.possessFeedItemForLivingObject = function (livingObject) {
	var itemList = window.gui.playerData.inventory.objects;
	var itemUids = Object.keys(itemList);

	var livingObjectCategory = livingObject.livingObjectCategory;

	for (var i = 0, len = itemUids.length; i < len; i += 1) {
		var item = itemList[itemUids[i]];
		if (!item.livingObjectCategory && item.item.type.id === livingObjectCategory) {
			return true;
		}
	}

	return false;
};

FeedWindow.prototype._reset = function () {
	this.placeHolder.setText(getText('ui.common.selectItem'));
	this.itemBox.hide();
	this.confirmBtn.disable();
	this.quantity.setValue(1);
	this.quantity.disable();
	this.minBtn.disable();
	this.maxBtn.disable();
};

FeedWindow.prototype._createDom = function () {
	var self = this;

	this.viewerBox = this.windowBody.createChild('div', { className: 'viewer' });
	this.viewerBox.appendChild(this.storageViewer.storageUI);

	var itemBox = this.windowBody.createChild('div', { className: 'itemBox' });

	this.itemBox = itemBox.appendChild(new ItemBox({ showTitle: true }));

	this.placeHolder = new Placeholder(itemBox);

	var quantityBox = this.windowBody.createChild('div', { className: 'quantityBox' });
	this.quantityLabel = quantityBox.createChild('div', { className: 'label' });

	var quantity = this.quantity = quantityBox.appendChild(
		new NumberInputBox({ title: getText('ui.common.quantity') }));

	this.minBtn = quantityBox.appendChild(
		new Button({ text: getText('ui.common.minWord'), className: ['greenButton', 'minButton'] }, function () {
			quantity.setValue(1);
		}));

	this.maxBtn = quantityBox.appendChild(
		new Button({ text: getText('ui.common.maxWord'), className: ['greenButton', 'minButton'] }, function () {
			quantity.setValue(self.item.quantity);
		}));

	this.confirmBtn = this.windowBody.appendChild(
		new Button({ text: getText('ui.common.validation'), className: ['greenButton', 'confirm'] }));
	this.confirmBtn.on('tap', function () {
		var qty = quantity.getValue();

		window.gui.openConfirmPopup({
			title: getText('ui.popup.warning'),
			message: self.setting.confirmMessage(qty, self.item.item.nameId),
			cb: function (result) {
				if (!result) { return; }
				self.setting.confirmAction(qty, self.item.objectUID, self.params);
			}
		});
	});
};

FeedWindow.prototype._selectItem = function (item) {
	this.item = item;
	this.itemBox.displayItem(item);
	this.itemBox.show();
	this.placeHolder.setText(null);
	this.confirmBtn.enable();
	this.quantity.setValue(1);
	this.quantity.maxValue = item.quantity;
	this.quantity.enable();
	this.minBtn.enable();
	this.maxBtn.enable();
};

module.exports = FeedWindow;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/FeedWindow/index.js
 ** module id = 894
 ** module chunks = 0
 **/