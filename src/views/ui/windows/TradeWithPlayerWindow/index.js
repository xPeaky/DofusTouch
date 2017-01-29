require('./styles.less');
var inherits = require('util').inherits;
var Window = require('Window');
var getText = require('getText').getText;
var windowsManager = require('windowsManager');
var ExchangeTypeEnum = require('ExchangeTypeEnum');
var TradeSpace = require('TradeSpace');
var Button = require('Button').DofusButton;
var itemManager = require('itemManager');
var mutualPopup = require('mutualPopup');

var BLINK_DURATION = 2;

function TradeWithPlayerWindow() {
	Window.call(this, {
		className: 'TradeWithPlayerWindow',
		title: '',
		positionInfo: { left: '0.5%', top: '2%', width: '612px', height: '350px' }
	});

	var self = this;
	var gui = window.gui;
	var myId;
	var myName;
	this._targetInfo = {};
	var sourceName;
	var targetName;

	var exchangeOtherCharacterName;
	var sourceCurrentPods;
	var targetCurrentPods;
	var sourceMaxPods;
	var targetMaxPods;
	var itemsMap = {};

	var confirmButtonTimeout;

	this._domCreated = false;
	this._otherCharacterTradeSpace = null;
	this._myTradeSpace = null;
	this._buttonConfirm = null;
	this._iConfirmed = false;
	this._exchangeStep = 0;

	function initializationPopup(msg) {
		if (msg.exchangeType !== ExchangeTypeEnum.PLAYER_TRADE) {
			return;
		}
		var playerData = gui.playerData;
		myId = playerData.id;
		myName = playerData.characterBaseInformations.name;

		var data = mutualPopup.setupNames(self._targetInfo.targetId, msg.source);
		if (!data) {
			return console.error('TradeWithPlayer: setupNames');
		}

		sourceName = data.sourceName;
		targetName = data.targetName;

		mutualPopup.setupCancelPopupTexts({
			title: getText('ui.exchange.requestInProgress'),
			message: getText('ui.exchange.requestInProgress')
		});
		mutualPopup.setupConfirmPopupTexts({
			title: getText('ui.exchange.exchangeRequest'),
			message: getText('ui.exchange.resquestMessage', sourceName)
		});

		mutualPopup.askingExchangePopup();
	}

	function open(msg) {
		if (msg.exchangeType !== ExchangeTypeEnum.PLAYER_TRADE) {
			return;
		}

		windowsManager.close('cancel', { keepDialog: true });

		if (!self._domCreated) {
			self._createDom();
		}

		gui.once('ExchangeLeaveMessage', function (msg) {
			var success = msg.success;
			var message;

			if (success) {
				message = getText('ui.exchange.success');
			} else {
				message = getText('ui.exchange.cancel');
			}
			gui.chat.logMsg(message);
		});

		if (msg.firstCharacterId === myId) {
			sourceCurrentPods = msg.firstCharacterCurrentWeight;
			targetCurrentPods = msg.secondCharacterCurrentWeight;
			sourceMaxPods = msg.firstCharacterMaxWeight;
			targetMaxPods = msg.secondCharacterMaxWeight;

			exchangeOtherCharacterName = targetName;
		} else {
			targetCurrentPods = msg.firstCharacterCurrentWeight;
			sourceCurrentPods = msg.secondCharacterCurrentWeight;
			targetMaxPods = msg.firstCharacterMaxWeight;
			sourceMaxPods = msg.secondCharacterMaxWeight;

			exchangeOtherCharacterName = sourceName;
		}
		self.setTitle(exchangeOtherCharacterName + ' <-> ' + myName);

		self._myTradeSpace.initializePods(sourceCurrentPods, sourceMaxPods);

		self._otherCharacterTradeSpace.setAsRemote();
		self._otherCharacterTradeSpace.initializePods(targetCurrentPods, targetMaxPods);

		updateAveragePrice();

		windowsManager.continueDialog(['tradeWithPlayer', 'tradeWithPlayerAndNPCInventory']);
	}

	function updateAveragePrice() {
		var otherCharaEstimation = self._otherCharacterTradeSpace.getEstimationPrice();
		var myEstimation = self._myTradeSpace.getEstimationPrice();

		var color = false;
		var otherPlayerWarn = false;
		var myWarn = false;
		if (myEstimation > 0 && myEstimation >= (2 * otherCharaEstimation)) {
			color = true;
			myWarn = true;
		}
		if (otherCharaEstimation > 0 && otherCharaEstimation >= (2 * myEstimation)) {
			color = true;
			otherPlayerWarn = true;
		}

		self._otherCharacterTradeSpace.setEstimationPrice(otherCharaEstimation, {
			color: color,
			warning: otherPlayerWarn
		});
		self._myTradeSpace.setEstimationPrice(myEstimation, { color: color, warning: myWarn });
	}

	function checkAcceptButtonAndTimeout() {
		updateAveragePrice();

		window.clearTimeout(confirmButtonTimeout);
		confirmButtonTimeout = window.setTimeout(function () {
			if (self._myTradeSpace.isGoldOrItemToTrade() ||
				self._otherCharacterTradeSpace.isGoldOrItemToTrade()) {
				self._buttonConfirm.enable();
			}
		}, BLINK_DURATION * 1000);
		self._buttonConfirm.disable();
	}

	function kamaModified(msg) {
		// every time there is an object/kama changes increment the step
		self._exchangeStep += 1;

		if (msg.remote) {
			self._otherCharacterTradeSpace.modifyKama(msg.quantity);
		} else {
			self._myTradeSpace.modifyKama(msg.quantity);
		}

		checkAcceptButtonAndTimeout();
	}

	function addAndModifyObject(msg) {
		var remote = msg.remote;
		var object = msg.object;
		var UID = object.objectUID;
		var newQty = object.quantity;

		// every time there is an object/kama changes increment the step
		self._exchangeStep += 1;

		self._toggleConfirmForMe(false);

		itemManager.createItemInstances(object, function (error, itemInstances) {
			if (error) {
				return console.error(error);
			}
			var itemInstance = itemInstances.map[UID];

			var itemWeight = itemInstance.weight;
			var itemMap = itemsMap[UID];
			if (!itemMap) {
				itemMap = itemsMap[UID] = {};
			}

			var previousQty = itemMap.quantity || 0;
			itemMap.weight = itemWeight;
			itemMap.quantity = newQty;

			var itemPods = itemWeight * (newQty - previousQty);

			if (remote) {
				self._otherCharacterTradeSpace.addAndModifyItem(itemInstance);
				self._otherCharacterTradeSpace.blink(BLINK_DURATION);
				self._otherCharacterTradeSpace.incrementExchangePodsQty(-itemPods);
				self._myTradeSpace.incrementExchangePodsQty(itemPods);
			} else {
				self._myTradeSpace.addAndModifyItem(itemInstance);
				self._otherCharacterTradeSpace.incrementExchangePodsQty(itemPods);
				self._myTradeSpace.incrementExchangePodsQty(-itemPods);
			}

			checkAcceptButtonAndTimeout();
		});
	}

	function objectRemoved(msg) {
		var remote = msg.remote;
		var UID = msg.objectUID;

		// every time there is an object/kama changes increment the step
		self._exchangeStep += 1;

		self._toggleConfirmForMe(false);

		var itemMap = itemsMap[UID];
		if (!itemMap) {
			console.warn('TradeWithPlayer: no itemMap for', UID);
		}

		var itemPods = itemMap.weight * itemMap.quantity;
		itemsMap[UID] = {};

		if (remote) {
			self._otherCharacterTradeSpace.removeItem(UID);
			self._otherCharacterTradeSpace.blink(BLINK_DURATION);
			self._otherCharacterTradeSpace.incrementExchangePodsQty(itemPods);
			self._myTradeSpace.incrementExchangePodsQty(-itemPods);
		} else {
			self._myTradeSpace.removeItem(UID);
			self._otherCharacterTradeSpace.incrementExchangePodsQty(-itemPods);
			self._myTradeSpace.incrementExchangePodsQty(itemPods);
		}

		checkAcceptButtonAndTimeout();
	}

	function exchangeReady(msg) {
		var id = msg.id;
		var ready = msg.ready;

		if (id === myId) { // me
			self._toggleConfirmForMe(ready);
		} else { // other character
			self._otherCharacterTradeSpace.toggleReady(ready);
		}
	}

	function clear() {
		self.targetInfo = {};
		itemsMap = {};
		self._otherCharacterTradeSpace.reset();
		self._myTradeSpace.reset();
		self._toggleConfirmForMe(false);
		self._otherCharacterTradeSpace.toggleReady(false);
		self._buttonConfirm.disable();
		self._exchangeStep = 0;
	}

	gui.on('ExchangeRequestedTradeMessage', initializationPopup);
	gui.on('ExchangeStartedWithPodsMessage', open);

	gui.on('ExchangeKamaModifiedMessage', this.localizeEvent(kamaModified));
	gui.on('ExchangeObjectAddedMessage', this.localizeEvent(addAndModifyObject));
	gui.on('ExchangeObjectModifiedMessage', this.localizeEvent(addAndModifyObject));
	gui.on('ExchangeObjectRemovedMessage', this.localizeEvent(objectRemoved));
	gui.on('ExchangeIsReadyMessage', this.localizeEvent(exchangeReady));

	this._toggleConfirmForMe = function (ready) {
		self._iConfirmed = ready;
		self._myTradeSpace.toggleReady(ready);
		if (ready) {
			self._buttonConfirm.disable();
		} else {
			self._buttonConfirm.enable();
		}
	};

	this.on('close', clear);
}


inherits(TradeWithPlayerWindow, Window);
module.exports = TradeWithPlayerWindow;


TradeWithPlayerWindow.prototype._createDom = function () {
	var self = this;
	var content = this.windowBody;

	var otherCharacterSpace = content.createChild('div', { className: ['otherCharacterSpace', 'tradeSpace'] });
	this._otherCharacterTradeSpace = otherCharacterSpace.appendChild(
		new TradeSpace({ blinkDuration: BLINK_DURATION })
	);

	var mySpace = content.createChild('div', { className: ['mySpace', 'tradeSpace'] });
	this._myTradeSpace = mySpace.appendChild(
		new TradeSpace({ blinkDuration: BLINK_DURATION, dragInteraction: true, canRemove: true })
	);

	var tradeButtons = content.createChild('div', { className: 'tradeButtons' });
	this._buttonConfirm = tradeButtons.appendChild(
		new Button(getText('ui.common.validation'), { className: 'buttonConfirm', disable: true })
	);
	this._buttonConfirm.on('tap', function () {
		if (self._iConfirmed) {
			return;
		}
		window.dofus.sendMessage('ExchangeReadyMessage', {
			ready: true,
			step: self._exchangeStep
		});
	});
	var buttonCancel = tradeButtons.appendChild(
		new Button(getText('ui.common.cancel'), { className: 'buttonCancel' })
	);
	buttonCancel.on('tap', function () {
		if (self._iConfirmed) {
			return window.dofus.sendMessage('ExchangeReadyMessage', {
				ready: false,
				step: self._exchangeStep
			});
		}
		windowsManager.close(self.id);
	});

	this._domCreated = true;
};


TradeWithPlayerWindow.prototype.prepareMakeExchange = function (target) {
	this._targetInfo = target;
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/TradeWithPlayerWindow/index.js
 ** module id = 935
 ** module chunks = 0
 **/