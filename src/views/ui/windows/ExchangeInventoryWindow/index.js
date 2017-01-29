require('./styles.less');
var DofusButton = require('Button').DofusButton;
var ExchangeTypeEnum = require('ExchangeTypeEnum');
var getText = require('getText').getText;
var inherits = require('util').inherits;
var itemManager = require('itemManager');
var MinMaxSelector = require('MinMaxSelector');
var positionHelper = require('positionHelper');
var setDroppable = require('dragManager').setDroppable;
var Window = require('Window');
var windowsManager = require('windowsManager');


function ExchangeInventoryWindow(storageViewer) {
	Window.call(this, {
		title: getText('ui.common.inventory'),
		className: 'ExchangeInventoryWindow',
		positionInfo: { right: '0.5%', bottom: '3%', width: '30%', height: '94%' }
	});

	var selectedItem, minMaxMode, toStorage, exchangeType;

	storageViewer.registerView(this, {
		leftArrow: true
	});

	function moveItem(quantity) {
		window.dofus.sendMessage('ExchangeObjectMoveMessage', {
			objectUID: selectedItem.objectUID,
			quantity: toStorage ? -quantity : quantity
		});
	}

	var minMaxSelector = this.minMaxSelector = window.gui.windowsContainer.appendChild(new MinMaxSelector());
	minMaxSelector.on('confirm', function (quantity) {
		if (minMaxMode === 'items') {
			moveItem(quantity);
		} else {
			// move the kamas from inventory to bank
			window.dofus.sendMessage('ExchangeObjectMoveKamaMessage', { quantity: quantity });
		}
	});

	var depositButton = this.windowBody.appendChild(new DofusButton(getText('tablet.exchange.deposit')));
	depositButton.addClassNames('depositButton');
	depositButton.on('tap', function () {
		var kamas = storageViewer.kamasValue;
		if (!kamas) { return; }

		var exchangeStorageWindow = windowsManager.getWindow('exchangeStorage');
		exchangeStorageWindow.closeMinMaxSelector();

		positionHelper.positionNextTo(minMaxSelector, depositButton);
		minMaxMode = 'kamas';
		minMaxSelector.open({
			min: 1,
			max: kamas
		});
	});

	function selectSlot(slot, x, y, storage) {
		toStorage = storage || false;
		selectedItem = slot.itemInstance;
		if (selectedItem.quantity === 1) {
			return moveItem(1, toStorage);
		}

		minMaxMode = 'items';
		minMaxSelector.open({
			min: 1,
			max: selectedItem.quantity,
			x: x,
			y: y
		});
	}

	this.on('open', function (msg) {
		exchangeType = msg.exchangeType;
		if (exchangeType === ExchangeTypeEnum.STORAGE) {
			storageViewer.addFilters([itemManager.unlinkedItemsFilter]);
		}
		storageViewer.filterList();
		storageViewer.resetDisplay();

		// Content below StorageViewer needs to be re-appened each time
		// See TODO in ExchangeStorageWindow for way to do this better in the future.
		this.windowBody.appendChild(depositButton);

		depositButton.toggleDisplay(msg.exchangeType !== ExchangeTypeEnum.MOUNT); // no deposit on Mount inventory
		depositButton.setEnable(!!storageViewer.kamasValue);
	});

	this.on('close', function () {
		if (exchangeType === ExchangeTypeEnum.STORAGE) {
			storageViewer.removeFilter(itemManager.unlinkedItemsFilter);
		}
		minMaxSelector.closeMinMax();
		exchangeType = null;
	});

	this.on('kamasUpdated', function (kamas) {
		if (!depositButton.isVisible()) { return; }
		depositButton.setEnable(!!kamas);
	});

	this.on('slot-doubletap', selectSlot);

	this.on('leftArrow-tap', function (position) {
		window.gui.openContextualMenu('storage', {
			toInventory: false,
			viewer: storageViewer
		}, {
			x: position.x,
			y: position.y
		});
	});

	setDroppable(this, ['exchangeStorage']);
	this.on('drop', function (slot, sourceId, tap) {
		selectSlot(slot, tap.x, tap.y, true);
	});
}
inherits(ExchangeInventoryWindow, Window);
module.exports = ExchangeInventoryWindow;

ExchangeInventoryWindow.prototype.closeMinMaxSelector = function () {
	this.minMaxSelector.closeMinMax();
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/ExchangeInventoryWindow/index.js
 ** module id = 812
 ** module chunks = 0
 **/