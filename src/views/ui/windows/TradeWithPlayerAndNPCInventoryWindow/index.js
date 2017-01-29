require('./styles.less');
var inherits = require('util').inherits;
var itemManager = require('itemManager');
var Window = require('Window');
var getText = require('getText').getText;
var MinMaxSelector = require('MinMaxSelector');

function TradeWithPlayerAndNPCInventoryWindow(storageViewer) {
	Window.call(this, {
		title: getText('ui.common.inventory'),
		className: 'TradeWithPlayerAndNPCInventoryWindow',
		positionInfo: { right: '0.5%', top: '2%', width: '23.2%', height: '95%' }
	});

	this.storageViewer = storageViewer;
	storageViewer.registerView(this, {
		manualReset: true
	});

	var objectUID;
	var inventory = window.gui.playerData.inventory;
	var gui = window.gui;

	// that variable is to reset all the item if you cancel the exchange
	// because the server is not sending us the ExchangeObjectRemovedMessage
	var UIDToClean = {};

	var minMaxSelector = this.appendChild(new MinMaxSelector());
	minMaxSelector.setStyles({
		left: '-100px',
		top: '100px'
	});
	minMaxSelector.on('confirm', function (result) {
		window.dofus.sendMessage('ExchangeObjectMoveMessage', {
			objectUID: objectUID,
			quantity: result
		});
	});

	function cleanOnTradeItem() {
		for (var uid in UIDToClean) {
			storageViewer.resetItemQuantity(uid);
		}
		UIDToClean = {};
	}

	function updateDisplayedQuantity(msg) {
		if (msg.remote) {
			return;
		}
		var objectUID = msg.object.objectUID;
		var inventoryItem = inventory.objects[objectUID];

		storageViewer.setItemQuantity(objectUID, inventoryItem.quantity - msg.object.quantity);
		UIDToClean[objectUID] = true;
	}

	function objectRemoved(msg) {
		if (msg.remote) {
			return;
		}
		var objectUID = msg.objectUID;
		storageViewer.resetItemQuantity(objectUID);
		delete UIDToClean[objectUID];
	}

	// manage if the message will be trigger or ignore
	gui.on('ExchangeObjectRemovedMessage', this.localizeEvent(objectRemoved));
	gui.on('ExchangeObjectAddedMessage', this.localizeEvent(updateDisplayedQuantity));
	gui.on('ExchangeObjectModifiedMessage', this.localizeEvent(updateDisplayedQuantity));

	this.on('open', function () {
		storageViewer.addFilters([itemManager.unlinkedItemsFilter]);
		storageViewer.filterList();
		storageViewer.resetDisplay();
	});

	this.on('close', function () {
		storageViewer.removeFilter(itemManager.unlinkedItemsFilter);
		minMaxSelector.hide();
		cleanOnTradeItem();
	});

	this.on('slot-doubletap', function (slot) {
		var itemData = slot.itemInstance;
		objectUID = itemData.objectUID;
		var displayedQuantity = slot.getQuantity();

		if (displayedQuantity === 1) {
			return window.dofus.sendMessage('ExchangeObjectMoveMessage', {
				objectUID: objectUID,
				quantity: 1
			});
		}

		minMaxSelector.open({
			min: 1,
			max: displayedQuantity
		});
	});
}

inherits(TradeWithPlayerAndNPCInventoryWindow, Window);
module.exports = TradeWithPlayerAndNPCInventoryWindow;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/TradeWithPlayerAndNPCInventoryWindow/index.js
 ** module id = 943
 ** module chunks = 0
 **/