require('./styles.less');
var BidHouseSellerBox = require('./bidHouseSellerBox.js');
var BidHouseBuyerBox = require('./bidHouseBuyerBox.js');
var Button = require('Button');
var connectionManager = require('dofusProxy/connectionManager.js');
var ExchangeBox = require('./exchangeBox.js');
var getText = require('getText').getText;
var helper = require('helper');
var inherits = require('util').inherits;
var ItemBox = require('ItemBox');
var itemManager = require('itemManager');
var ObjectErrorEnum = require('ObjectErrorEnum');
var Window = require('Window');
var windowsManager = require('windowsManager');
var shopHelper = require('shopHelper');

var MIN_WIDTH = 410;

var MIN_HEIGHT = 392;
var BID_SELLER_HEIGHT = 424;

// When we send ExchangeBuyMessage, server does not reply if item became unavailable (race condition)
var ExchangeMsgTimeOut = 10000;


/**
 * @class TradeItemWindow
 * @desc  Window for items trading
 */
function TradeItemWindow() {
	Window.call(this, {
		className: 'tradeItemWindow',
		noCloseButton: true,
		fixed: true, // we make it movable using windowsManager.makeMovable
		positionInfo: { width: MIN_WIDTH, height: MIN_HEIGHT }
	});

	this._setupEvents();

	this.mode = '';
	this.item = null;
	this.msg = null;
	this.itemDescription = null;
	this.settingBox = null;
	this.selection = null;
	this.tradeItemConfirm = null;
	this.isTradePending = false;
	this.tradeTimeout = null;

	this.on('open', function (params) {
		this.tradeItemConfirm = null;
		this.isTradePending = false;
		this.tradeTimeout = null;
		if (!this.itemDescription) { this._createDom(); }
		this.buyHardSoftDiv.hide();

		switch (this.msg._messageType) {
		case 'ExchangeStartOkNpcShopMessage':
		case 'ExchangeStartOkHumanVendorMessage':
		case 'ExchangeShopStockStartedMessage':
			this.settingBox = this.exchangeBox;
			if (params.mode === 'buy-human') { this.buyHardSoftDiv.show(); }
			windowsManager.arrangeOpeningWindow(this.id, { rightOf: 'tradeStorage', height: MIN_HEIGHT });
			break;
		case 'ExchangeStartedBidSellerMessage':
			this.settingBox = this.bidHouseSellerBox;
			this.settingBox.setDescriptorData(this.msg.sellerDescriptor);
			windowsManager.arrangeOpeningWindow(this.id, { rightOf: 'tradeStorage', height: BID_SELLER_HEIGHT });
			break;
		case 'ExchangeStartedBidBuyerMessage':
			this.settingBox = this.bidHouseBuyerBox;
			this.settingBox.setDescriptorData(this.msg.buyerDescriptor);
			this.buyHardSoftDiv.show();
			windowsManager.arrangeOpeningWindow(this.id, { rightOf: 'bidHouseShop', height: '100%' });
			break;
		default:
			return;
		}

		this._setContent(params.mode, params.item, params.currency);
	});

	this.on('close', function () {
		this.item = null;
		this.selection = null;
		this.isTradePending = false;
		window.clearTimeout(this.tradeTimeout);
		this._closeTradeConfirmWindow();
	});
	this.on('closed', function () {
		this.settingBox.hide(); // hiding this before closing animation messes-up the flex layout
	});
}
inherits(TradeItemWindow, Window);
module.exports = TradeItemWindow;


TradeItemWindow.minWidth = MIN_WIDTH;


function getTokenIfAny(tokenId, cb) {
	if (!tokenId) {
		return cb(null);
	}
	itemManager.getItems([tokenId], function (error, tokens) {
		if (error) { return console.error('Failed to get token ' + tokenId + ' for trade: ' + error); }

		return cb(tokens[0]);
	});
}

TradeItemWindow.prototype._setupEvents = function () {
	var self = this;
	var gui = window.gui;

	/**
	 * @event module:protocol/inventoryExchanges.client_ExchangeStartOkNpcShopMessage
	 * @desc  Message sent when exchange with a npc shop has been accepted
	 *
	 * @param {Object} msg
	 * @param {number} msg.npcSellerId - Contextual Id for NPC
	 * @param {number} msg.tokenId - Generic id for the object which is used as currency, 0 for kamas
	 * @param {Object[]} msg.objectsInfos - List of info about objects being sold
	 */
	connectionManager.on('ExchangeStartOkNpcShopMessage', function (msg) {
		self.msg = msg;
		getTokenIfAny(msg.tokenId, function (token) {
			if (token) { msg.token = token; }
			windowsManager.openDialog(['tradeInventory', 'tradeStorage'], msg);
		});
	});

	/**
	 * @event module:protocol/inventoryExchanges.client_ExchangeStartOkHumanVendorMessage
	 * @desc  Message sent when exchange with your another human vendor was accepted
	 *
	 * @param {Object} msg
	 * @param {number} msg.sellerId - Merchant id
	 * @param {Object[]} msg.objectsInfos - List of info about objects being sold
	 */
	connectionManager.on('ExchangeStartOkHumanVendorMessage', function (msg) {
		self.msg = msg;
		windowsManager.openDialog(['wallet', 'tradeStorage'], msg);
	});

	/**
	 * @event module:protocol/inventoryExchanges.client_ExchangeShopStockStartedMessage
	 * @desc  Message sent when exchange with your own merchant stock was accepted
	 *
	 * @param {Object} msg
	 * @param {Object[]} msg.objectsInfos - List of info about objects being sold
	 */
	connectionManager.on('ExchangeShopStockStartedMessage', function (msg) {
		self.msg = msg;
		windowsManager.openDialog(['tradeInventory', 'tradeStorage', 'tradeMode'], msg);
	});

	/**
	 * @event module:protocol/inventoryExchanges.client_ExchangeStartedBidSellerMessage
	 *
	 * @param {Object} msg.sellerDescriptor
	 * @param {Array} msg.objectsInfos - objects being bought sold by the player
	 *  { object {ItemInstance}, objectPrice {number}, unsoldDelay {number} }

	 * @param {number} msg.sellerDescriptor.maxItemLevel
	 * @param {number} msg.sellerDescriptor.maxItemPerAccount
	 * @param {number} msg.sellerDescriptor.npcContextualId
	 * @param {Array} msg.sellerDescriptor.quantities - items batch possibilities (ie: [1, 10, 100])
	 * @param {number} msg.sellerDescriptor.taxPercentage
	 * @param {number} msg.sellerDescriptor.unsoldDelay - number in hour an item is sold in the bid house
	 */
	connectionManager.on('ExchangeStartedBidSellerMessage', function (msg) {
		self.msg = msg;
		windowsManager.openDialog(['tradeInventory', 'tradeStorage'], msg);
	});

	/**
	 * @event module:protocol/inventoryExchanges.client_ExchangeStartedBidBuyerMessage
	 *
	 * @param {object} msg - msg
	 * @param {Object} msg.buyerDescriptor
	 * @param {number} msg.buyerDescriptor.maxItemLevel
	 * @param {number} msg.buyerDescriptor.maxItemPerAccount
	 * @param {number} msg.buyerDescriptor.npcContextualId
	 * @param {Array} msg.buyerDescriptor.quantities - items batch possibilities (ie: [1, 10, 100])
	 * @param {number} msg.buyerDescriptor.taxPercentage
	 * @param {number} msg.buyerDescriptor.unsoldDelay - number in hour an item is sold in the bid house
	 */
	connectionManager.on('ExchangeStartedBidBuyerMessage', function (msg) {
		self.msg = msg;
		windowsManager.openDialog(['wallet', 'bidHouseShop'], msg);
	});

	// The error code that can be returned by the server when it's about an exchange
	var exchangeErrorMessages = {
		1: getText('ui.exchange.cantExchange'),
		2: getText('ui.exchange.cantExchangeCharacterOccupied'),
		3: getText('ui.exchange.cantExchangeCharacterJobNotEquiped'),
		4: getText('ui.craft.notNearCraftTable'),
		5: getText('ui.exchange.cantExchangeCharacterOverloaded'),
		6: getText('ui.exchange.cantExchangeCharacterNotSuscriber'),
		7: getText('ui.exchange.cantExchangeCharacterRestricted'),
		8: getText('ui.exchange.cantExchangeBuyError'),
		9: getText('ui.exchange.cantExchangeSellError'),
		10: getText('ui.exchange.cantExchangeMountPaddockError'),
		11: getText('ui.bidhouse.itemNotInBigStore')
	};
	/**
	 * @event module:protocol/inventoryExchanges.client_ExchangeErrorMessage
	 * @desc Event that gets fired when an error occurs during an exchange (purchase, etc...).
	 *
	 * @param {Object} msg
	 * @param {number} msg.errorType
	 */
	connectionManager.on('ExchangeErrorMessage', function (msg) {
		var errorMsg = exchangeErrorMessages[msg.errorType];
		if (!self._concludeTrade(false, errorMsg)) {
			gui.openSimplePopup(errorMsg);
		}
	});

	/**
	* ObjectErrorMessage is coming for various reasons (see Inventory component too).
	* It also comes when your inventory is full and you try to buy an object from NPC or human
	*/
	connectionManager.on('ObjectErrorMessage', function (msg) {
		if (msg.reason === ObjectErrorEnum.INVENTORY_FULL) {
			self._concludeTrade(false); // NB: Inventory already logs 'ui.objectError.InventoryFull' in Chat
		}
	});

	connectionManager.on('exchangeBidHouseBuyError', function (/*msg*/) {
		self._concludeTrade(false, getText('tablet.purchaseInHardCcyError'));
	});

	connectionManager.on('exchangeHumanBuyError', function (/*msg*/) {
		self._concludeTrade(false, getText('tablet.purchaseInHardCcyError'));
	});

	connectionManager.on('exchangeBidHouseBuySuccess', function (/*msg*/) {
		this.send('moneyGoultinesAmountRequest');
		// NB: _concludeTrade will be called in ExchangeBidHouseBuyResultMessage below
	});

	connectionManager.on('exchangeHumanBuySuccess', function (/*msg*/) {
		this.send('moneyGoultinesAmountRequest');
		// NB: _concludeTrade will be called in ExchangeBuyOkMessage below
	});

	connectionManager.on('ExchangeBidHouseBuyResultMessage', function (msg) {
		// NB: if msg.bought is true this is a success and the error message below is not used
		self._concludeTrade(msg.bought, getText('tablet.tradeItemFailed'));
	});

	/**
	 * @event module:protocol/inventoryExchanges.client_ExchangeBuyOkMessage
	 * @desc  Message received when buying from human/NPC is OK
	 */
	connectionManager.on('ExchangeBuyOkMessage', function () {
		self._concludeTrade(true);
		windowsManager.close(self.id);
	});

	/**
	 * @event module:protocol/inventoryExchanges.client_ExchangeSellOkMessage
	 * @desc  Message received when selling to NPC is OK
	 */
	connectionManager.on('ExchangeSellOkMessage', function () {
		self._concludeTrade(true);
		windowsManager.close(self.id);
	});

	// Also received in TradeStorageWindow
	connectionManager.on('ExchangeBidHouseItemAddOkMessage', function () {
		self._concludeTrade(true);
	});
};

/**
 * Starts a trade. _concludeTrade must be called later to conclude it.
 */
TradeItemWindow.prototype._beginTrade = function () {
	this.isTradePending = true;

	this.tradeTimeout = window.setTimeout(function (self) {
		self._tradeTimedOut();
	}, ExchangeMsgTimeOut, this);
};

/**
 * Concludes a trade started with _beginTrade. Does nothing if no trade was pending.
 * @param {boolean} isSuccess - true if trade succeeded (in this case errorMsg param is ignored)
 * @param {string} [errorMsg] - optional error message. In some cases you want to cancel a trade without message.
 * @return {boolean} - false if no pending trade (e.g. _concludeTrade was already called)
 */
TradeItemWindow.prototype._concludeTrade = function (isSuccess, errorMsg) {
	if (!this.tradeTimeout) { return false; } // if already concluded, we are safe to ignore

	this.isTradePending = false;

	window.clearTimeout(this.tradeTimeout);
	this.tradeTimeout = null;

	this._closeTradeConfirmWindow();

	if (!isSuccess && errorMsg) {
		window.gui.openSimplePopup(errorMsg);
	}
	return true;
};

/**
 * Called when a pending trade times out => we consider it failed, at least for user feedback.
 */
TradeItemWindow.prototype._tradeTimedOut = function () {
	this._concludeTrade(false, getText('tablet.tradeItemTimeout'));
};

TradeItemWindow.prototype.getCurrentItem = function () {
	return this.selection ? this.selection.item : this.item;
};

/**
 * Called by exchangeBox or bidHouseBuyerBox when the currently selected item changes.
 * This allows us to enable/disable the buy buttons (kama & goultines).
 * @param {object|null} selection - information on the currently selected item or null
 *             {object} selection.item
 *             {object} selection.amountSoft
 *             {object} selection.amountHard - if not available, "buy in Goultines" button will be disabled
 *             {object} selection.qty
 */
TradeItemWindow.prototype.updateSelection = function (selection) {
	if (selection) {
		var inventory = window.gui.playerData.inventory;
		this.buySoftBtn.setEnable(inventory.kamas >= selection.amountSoft);
		this.buySoftBtnLabel.setText(helper.intToString(selection.amountSoft));

		// Buy in hard currency always enabled unless rate is unknown; we will propose to buy more if needed
		this.buyHardBtn.setEnable(!!selection.amountHard);
		this.buyHardBtnLabel.setText(selection.amountHard ? helper.intToString(selection.amountHard) : '');

		if (selection.item !== this.itemDescription.item) {
			this.itemDescription.displayItem(selection.item);
		}
	} else {
		this.buySoftBtn.disable();
		this.buyHardBtn.disable();
		var buy = getText('ui.common.buy');
		this.buySoftBtnLabel.setText(buy);
		this.buyHardBtnLabel.setText(buy);

		this._closeTradeConfirmWindow();
	}

	this.selection = selection;
};

/**
 * Called to update available human BUY quantity in real time.
 * @param {number} availableQty - available quantity
 */
TradeItemWindow.prototype.updateHumanBuyQuantityRealtime = function (availableQty) {
	// If transaction is already in process, ignore - it is too late to change anything
	if (this.isTradePending) { return; }

	// If we can still buy what we want, we can ignore too
	if (availableQty >= this.selection.qty) { return; }

	var item = this.selection.item;
	window.gui.chat.logMsg(getText('tablet.tradeItemQtyChanged', item.getName(), availableQty));
	if (!availableQty) {
		// 0 item available now; close this window
		windowsManager.close(this.id);
	} else {
		// There is still some, but not as much as user saw when he selected the item
		// Update display using available quantity
		item.quantity = availableQty;
		this.settingBox.updateSettingBox(this, item);
		// If player was about to buy, do no let him confirm
		this._closeTradeConfirmWindow();
	}
};

TradeItemWindow.prototype.updateBidHouseBuyPriceRealtime = function (amountSoft, amountHard) {
	if (!this.tradeItemConfirm || this.isTradePending) { return; }

	var price = this.isHardCcyTrade ? amountHard : amountSoft;

	// If price went over the initial price we wanted, do not let user confirm it
	if (price > this.initialPrice) {
		return this._closeTradeConfirmWindow();
	}

	this.currentPrice = price;
	this.tradeItemConfirm.updatePriceRealtime(price);
};

/**
 * @param {object} params - parameters for TradeItemConfirm.confirmTrade function
 * @param {function} cb - only called when user confirms the trade; no parameters
 */
TradeItemWindow.prototype._confirmTrade = function (params, cb) {
	this.isHardCcyTrade = !!params.amountHard;
	this.initialPrice = this.currentPrice = params.amountHard || params.amountSoft;
	this.tradeItemConfirm = windowsManager.getWindow('tradeItemConfirm');

	var self = this;
	this.tradeItemConfirm.confirmTrade(params, function (result) {
		if (!result) { return; }
		self._beginTrade();
		cb();
	});
};

TradeItemWindow.prototype._closeTradeConfirmWindow = function () {
	if (!this.tradeItemConfirm) { return; }

	this.tradeItemConfirm = null;
	windowsManager.close('tradeItemConfirm');
};

/** Buy current item in goultines from bid house or human */
TradeItemWindow.prototype._buyInGoultines = function () {
	var selection = this.selection;
	var item = selection.item;
	var amountHard = selection.amountHard;
	var amountSoft = selection.amountSoft;
	var quantity = selection.qty;
	//var unitPrice = Math.ceil((amountHard / quantity) * 100) / 100;
	var isBuyHuman = this.mode === 'buy-human';

	// If we need to buy more goultines, propose it now
	var hardCcyMissing = amountHard - window.gui.playerData.inventory.goultines;
	if (hardCcyMissing > 0) {
		return shopHelper.openNotEnoughHardCurrencyPopup(hardCcyMissing);
	}

	this._confirmTrade({ itemInstance: item, amountHard: amountHard, qty: quantity }, function () {
		// If OK, we will receive exchangeHumanBuySuccess + ExchangeBuyOkMessage...
		//               ...or exchangeBidHouseBuySuccess + ExchangeBidHouseBuyResultMessage
		window.dofus.send(isBuyHuman ? 'exchangeHumanBuyRequest' : 'exchangeBidHouseBuyRequest', {
			uid: item.objectUID,
			qty: quantity,
			amountHard: amountHard,
			amountSoft: amountSoft
		});
	});
};

/** Buy current item in kamas from bid house or human */
TradeItemWindow.prototype._buyInKamas = function () {
	var selection = this.selection;
	var item = selection.item;
	var quantity = selection.qty;
	var isBuyHuman = this.mode === 'buy-human';
	var self = this;

	this._confirmTrade({ itemInstance: item, amountSoft: selection.amountSoft, qty: quantity }, function () {
		if (isBuyHuman) {
			// We will receive ExchangeBuyOkMessage if OK
			window.dofus.sendMessage('ExchangeBuyMessage', {
				objectToBuyId: item.objectUID,
				quantity: quantity
			});
		} else {
			// We will receive ExchangeBidHouseBuyResultMessage if OK
			window.dofus.sendMessage('ExchangeBidHouseBuyMessage', {
				uid: item.objectUID,
				qty: quantity,
				price: self.currentPrice
			});
		}
	});
};

TradeItemWindow.prototype.buyItemFromNpc = function (itemInstance, quantity, unitPrice) {
	unitPrice = unitPrice || itemInstance.item.price;

	this._confirmTrade({
		itemInstance: itemInstance,
		amountSoft: unitPrice * quantity,
		qty: quantity,
		token: this.msg.token
	}, function () {
		// We will receive ExchangeBuyOkMessage if OK
		// If not, ObjectErrorMessage might come instead
		window.dofus.sendMessage('ExchangeBuyMessage', {
			objectToBuyId: itemInstance.item.id,
			quantity: quantity
		});
	});
};

TradeItemWindow.prototype.sellItemToNpc = function (itemInstance, quantity, unitPrice) {
	unitPrice = unitPrice || itemInstance.item.price;

	this._confirmTrade({
		isSell: true,
		itemInstance: itemInstance,
		amountSoft: unitPrice * quantity,
		qty: quantity
	}, function () {
		// We will receive ExchangeSellOkMessage if OK
		window.dofus.sendMessage('ExchangeSellMessage', {
			objectToSellId: itemInstance.objectUID,
			quantity: quantity
		});
	});
};

TradeItemWindow.prototype.sellItemInMyShop = function (itemInstance, quantity, unitPrice) {
	// We will receive ExchangeShopStockMovementUpdatedMessage if OK
	window.dofus.sendMessage('ExchangeObjectMovePricedMessage', {
		objectUID: itemInstance.objectUID,
		quantity: quantity,
		price: unitPrice
	});
};

TradeItemWindow.prototype.removeItemQuantityFromMyShop = function (itemInstance, quantity) {
	// We will receive ExchangeShopStockMovementUpdatedMessage
	// ...or ExchangeShopStockMovementRemovedMessage if quantity in my shop reached 0
	window.dofus.sendMessage('ExchangeObjectMoveMessage', {
		objectUID: itemInstance.objectUID,
		quantity: -quantity
	});
};

TradeItemWindow.prototype.modifyItemPriceInMyShop = function (itemInstance, quantity, unitPrice) {
	// We will receive ExchangeShopStockMovementUpdatedMessage if OK
	window.dofus.sendMessage('ExchangeObjectModifyPricedMessage', {
		objectUID: itemInstance.objectUID,
		quantity: quantity,
		price: unitPrice
	});
};

TradeItemWindow.prototype.sellInBidHouse = function (itemInstance, price, quantity, fee) {
	// We check the price to be sure - but sellBtn should be disabled if price is not set
	if (price <= 0) { return window.gui.openSimplePopup(getText('ui.error.invalidPrice')); }

	this._confirmTrade({
		isSell: true,
		itemInstance: itemInstance,
		amountSoft: price,
		qty: quantity,
		fee: fee
	}, function () {
		// We will receive ExchangeBidHouseItemAddOkMessage if OK
		window.dofus.sendMessage('ExchangeObjectMovePricedMessage', {
			objectUID: itemInstance.objectUID,
			quantity: quantity,
			price: price
		});
	});
};

TradeItemWindow.prototype.removeFromBidHouse = function (itemInstance, price, quantity) {
	window.gui.openConfirmPopup({
		title: getText('ui.popup.warning'),
		message:  getText('ui.bidhouse.doUWithdrawItemBigStore',
			quantity + ' x ' + itemInstance.item.nameId,
			helper.kamasToString(price / quantity)),
		cb: function (result) {
			if (!result) { return; }
			// We will receive ExchangeBidHouseItemRemoveOkMessage if OK
			window.dofus.sendMessage('ExchangeObjectMoveMessage', {
				objectUID: itemInstance.objectUID,
				quantity: -quantity,
				price: price
			});
		}
	});
};

// TODO uncomment when the server versions handles price modification
// TradeItemWindow.prototype.modifyInBidHouse = function (item, price, quantity, fees) {
// 	if (price === item.objectPrice) { return; }
// 	popupContent = getText ('ui.bidhouse.doUModifyPriceInMarket',
// 		quantity + ' x ' + item.item.nameId,
// 		helper.kamasToString(item.objectPrice),
// 		helper.kamasToString(price),
// 		helper.kamasToString(fees));
// 		*/
// 	message = 'ExchangeObjectModifyPricedMessage';
// };

TradeItemWindow.prototype._createDom = function () {
	this.itemDescription = this.windowBody.appendChild(new ItemBox({ showTitle: true, withCraftBtn: true }));
	windowsManager.makeMovable(this, this.itemDescription.getChildren()[0]);

	this.exchangeBox = this.windowBody.appendChild(new ExchangeBox());
	this.bidHouseSellerBox = this.windowBody.appendChild(new BidHouseSellerBox());
	this.bidHouseBuyerBox = this.windowBody.appendChild(new BidHouseBuyerBox());

	this._createBuyHardSoftButtons();

	this.errorBox = this.windowBody.createChild('div', { className: 'errorBox' });
	this.errorText = this.errorBox.createChild('div', { className: 'errorText' });
};

TradeItemWindow.prototype._createBuyHardSoftButtons = function () {
	var buttons = this.buyHardSoftDiv = this.windowBody.createChild('div', { className: 'buyHardSoftButtons' });
	var self = this;

	this.buyHardBtn = buttons.appendChild(
		new Button({ className: ['button', 'buyHardBtn'], text: getText('ui.common.buy'), addIcon: true },
			function () { self._buyInGoultines(); }));
	this.buyHardBtnLabel = this.buyHardBtn.getChildren()[0];

	this.buySoftBtn = buttons.appendChild(
		new Button({ className: ['greenButton', 'buySoftBtn'], text: getText('ui.common.buy'), addIcon: true },
			function () { self._buyInKamas(); }));
	this.buySoftBtnLabel = this.buySoftBtn.getChildren()[0];
};

TradeItemWindow.prototype.displayItem = function (mode, item, currency) {
	if (this.openState) {
		this._setContent(mode, item, currency);
	} else {
		windowsManager.open(this.id, { mode: mode, item: item, currency: currency });
	}
};

TradeItemWindow.prototype._setContent = function (mode, item, currency) {
	if (mode === this.mode && item === this.item) {
		return;
	}
	this.mode = mode;
	this.item = item;
	var itemData = item.item || item;
	var itemDetails =
		itemData.nameId +
		' (' + itemData.id + ') ' +
		getText('ui.common.short.level') + ' ' +
		itemData.level;

	this.errorBox.hide();

	this.setTitle(itemDetails);
	this.itemDescription.displayItem(item);
	this.settingBox.updateSettingBox(this, item, currency);

	if (!this.errorBox.isVisible()) { this.settingBox.show(); }
};

TradeItemWindow.prototype.showError = function (msg) {
	this.errorText.setHtml(msg);
	this.errorBox.show();
	this.settingBox.hide();
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/TradeItemWindow/index.js
 ** module id = 816
 ** module chunks = 0
 **/