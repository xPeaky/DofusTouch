var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;

function MyShop() {
	EventEmitter.call(this);

	this._itemList = {};
}

inherits(MyShop, EventEmitter);
module.exports = MyShop;

MyShop.prototype.initialize = function (/*gui*/) {
	var connectionManager = window.dofus.connectionManager;
	var self = this;

	function selling(objectGID, quantity) {
		self._itemList[objectGID] = quantity;
	}

	connectionManager.on('ExchangeShopStockMovementUpdatedMessage', function (msg) {
		if (!msg.objectInfo) { return; }
		selling(msg.objectInfo.objectGID, msg.objectInfo.quantity);
	});

	connectionManager.on('ExchangeShopStockStartedMessage', function (msg) {
		if (!msg.objectsInfos) { return; }
		for (var i = 0; i < msg.objectsInfos.length; i++) {
			selling(msg.objectsInfos[i].objectGID, msg.objectsInfos[i].quantity);
		}
	});
};

MyShop.prototype.getItemSellableAmount = function (objectGID) {
	var alreadySelling = this._itemList[objectGID] || 0;
	var inInventory = window.gui.playerData.inventory.quantityList[objectGID] || 0;
	return alreadySelling + inInventory;
};

MyShop.prototype.disconnect = function () {
	this._itemList = {};
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/PlayerData/MyShop.js
 ** module id = 544
 ** module chunks = 0
 **/