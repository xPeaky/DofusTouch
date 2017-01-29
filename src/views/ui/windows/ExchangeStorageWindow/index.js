require('./styles.less');
var Button = require('Button');
var setDroppable = require('dragManager').setDroppable;
var ExchangeTypeEnum = require('ExchangeTypeEnum');
var getText = require('getText').getText;
var inherits = require('util').inherits;
var itemManager = require('itemManager');
var MinMaxSelector = require('MinMaxSelector');
var positionHelper = require('positionHelper');
var Window = require('Window');
var windowsManager = require('windowsManager');


function ExchangeStorageWindow(storageViewer) {
	Window.call(this, {
		className: 'ExchangeStorageWindow',
		positionInfo: { left: '0.5%', bottom: '3%', width: '30%', height: '94%' }
	});

	var selectedItem, minMaxMode, toInventory;

	var viewer = storageViewer;
	viewer.registerView(this, {
		rightArrow: true
	});

	function moveItem(quantity) {
		window.dofus.sendMessage('ExchangeObjectMoveMessage', {
			objectUID: selectedItem.objectUID,
			quantity: toInventory ? quantity : -quantity
		});
	}

	var minMaxSelector = this.minMaxSelector = window.gui.windowsContainer.appendChild(new MinMaxSelector());
	minMaxSelector.on('confirm', function (quantity) {
		if (minMaxMode === 'items') {
			moveItem(quantity);
		} else {
			// move the kamas from bank to inventory
			window.dofus.sendMessage('ExchangeObjectMoveKamaMessage', { quantity: -quantity });
		}
	});

	var withdrawButton = this.windowBody.appendChild(
		new Button({ className: 'greenButton', text: getText('tablet.exchange.withdraw') }));
	withdrawButton.addClassNames('withdrawButton');
	withdrawButton.on('tap', function () {
		var kamas = viewer.kamasValue;
		if (!kamas) { return; }

		var exchangeInventoryWindow = windowsManager.getWindow('exchangeInventory');
		exchangeInventoryWindow.closeMinMaxSelector();

		positionHelper.positionNextTo(minMaxSelector, withdrawButton);
		minMaxMode = 'kamas';
		minMaxSelector.open({
			min: 1,
			max: kamas
		});
	});

	this.on('open', function (msg) {
		var title;
		switch (msg.exchangeType) {
		case ExchangeTypeEnum.TAXCOLLECTOR:
			title = getText('ui.common.taxCollector');
			break;
		case ExchangeTypeEnum.STORAGE:
			title = getText('ui.common.storage');
			break;
		case ExchangeTypeEnum.MOUNT:
			title = getText('ui.common.ride');
			break;
		default: // Olivier: finding this default here but no idea if this happens
			console.warn('Unexpected exchangeType value:', msg.exchangeType);
			title = getText('ui.common.storage');
		}
		this.setTitle(title);

		// Content below StorageViewer needs to be re-appened each time
		// TODO: for example, pass the destination container to storageViewer.registerView
		this.windowBody.appendChild(withdrawButton);

		withdrawButton.setEnable(!!viewer.kamasValue);
		// No deposit/withdraw in Mount's inventory. TODO: do same for TAXCOLLECTOR?
		withdrawButton.toggleDisplay(msg.exchangeType !== ExchangeTypeEnum.MOUNT);
	});

	this.on('close', function () {
		minMaxSelector.closeMinMax();
	});

	this.on('kamasUpdated', function (kamas) {
		if (!withdrawButton.isVisible()) { return; }
		withdrawButton.setEnable(!!kamas);
	});

	this.on('rightArrow-tap', function (position) {
		window.gui.openContextualMenu('storage', {
			toInventory: true,
			viewer: viewer
		}, {
			x: position.x,
			y: position.y
		});
	});

	function selectSlot(slot, x, y, inventory) {
		toInventory = inventory || false;
		selectedItem = slot.itemInstance;
		if (selectedItem.quantity === 1) {
			return moveItem(1);
		}

		minMaxMode = 'items';
		minMaxSelector.open({
			min: 1,
			max: selectedItem.quantity,
			x: x,
			y: y
		});
	}

	this.on('slot-doubletap', selectSlot);

	setDroppable(this, ['exchangeInventory']);
	this.on('drop', function (slot, sourceId, tap) {
		selectSlot(slot, tap.x, tap.y, true);
	});

	var gui = window.gui;

	gui.on('ExchangeStartedWithStorageMessage', function (msg) {
		viewer.setMaxWeight(msg.storageMaxSlot);
		windowsManager.openDialog(['exchangeInventory', 'exchangeStorage'], msg);
	});

	gui.on('ExchangeStartedMountStockMessage', function (msg) {
		windowsManager.openDialog(['exchangeInventory', 'exchangeStorage'], { exchangeType: ExchangeTypeEnum.MOUNT });

		itemManager.createItemInstances(msg.objectsInfos, function (error, itemInstances) {
			if (error) {
				return console.error(error);
			}

			viewer.setItemList(itemInstances.map);
		});
	});

	gui.on('ExchangeStartedMessage', function (msg) {
		if (msg.exchangeType === ExchangeTypeEnum.TAXCOLLECTOR) {
			windowsManager.openDialog(['exchangeInventory', 'exchangeStorage'], msg);
		}
	});

	gui.on('StorageInventoryContentMessage', function (msg) {
		viewer.setKamas(msg.kamas);
		viewer.setWeight(msg.objects.length);

		itemManager.createItemInstances(msg.objects, function (error, itemInstances) {
			if (error) {
				return console.error(error);
			}

			viewer.setItemList(itemInstances.map);
		});
	});

	gui.on('StorageKamasUpdateMessage', function (msg) {
		viewer.setKamas(msg.kamasTotal);
	});

	gui.on('ExchangeWeightMessage', function (msg) {
		viewer.setWeight(msg.currentWeight, msg.maxWeight);
	});

	function addItems(items) {
		itemManager.createItemInstances(items, function (error, itemInstances) {
			if (error) {
				return console.error(error);
			}

			viewer.addItems(itemInstances.map);
			viewer.setWeight(Object.keys(viewer.itemList).length);
		});
	}
	gui.on('StorageObjectUpdateMessage', function (msg) {
		addItems([msg.object]);
	});

	gui.on('StorageObjectsUpdateMessage', function (msg) {
		addItems(msg.objectList);
	});

	gui.on('StorageObjectRemoveMessage', function (msg) {
		viewer.removeItem(msg.objectUID);
		viewer.setWeight(viewer.weight - 1);
	});

	gui.on('StorageObjectsRemoveMessage', function (msg) {
		viewer.removeItems(msg.objectUIDList);
		viewer.setWeight(viewer.weight - msg.objectUIDList.length);
	});
}
inherits(ExchangeStorageWindow, Window);
module.exports = ExchangeStorageWindow;

ExchangeStorageWindow.prototype.closeMinMaxSelector = function () {
	this.minMaxSelector.closeMinMax();
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/ExchangeStorageWindow/index.js
 ** module id = 814
 ** module chunks = 0
 **/