require('./styles.less');
var inherits = require('util').inherits;
var Window = require('Window');
var getText = require('getText').getText;
var windowsManager = require('windowsManager');
var TradeSpace = require('TradeSpace');
var Button = require('Button').DofusButton;
var itemManager = require('itemManager');

var BLINK_DURATION = 2;

function TradeWithNPCWindow() {
	Window.call(this, {
		className: 'TradeWithNPCWindow',
		title: '',
		positionInfo: { left: '0.5%', top: '2%', width: '612px', height: '300px' }
	});

	var self = this;
	var gui = window.gui;

	var confirmButtonTimeout;

	this._npcName = '';
	this._domCreated = false;
	this._npcTradeSpace = null;
	this._myTradeSpace = null;
	this._buttonConfirm = null;
	this._exchangeStep = 0;

	function open() {
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

		self.setTitle(self._npcName + ' <-> ' + gui.playerData.characterBaseInformations.name);

		self._myTradeSpace.NPCTradeMode();

		self._npcTradeSpace.setAsRemote();
		self._npcTradeSpace.NPCTradeMode();

		updateAveragePrice();

		windowsManager.continueDialog(['tradeWithNPC', 'tradeWithPlayerAndNPCInventory']);
	}

	function updateAveragePrice() {
		var npcEstimation = self._npcTradeSpace.getEstimationPrice();
		var myEstimation = self._myTradeSpace.getEstimationPrice();

		var color = false;
		var npcWarn = false;
		var myWarn = false;
		if (myEstimation > 0 && myEstimation >= (2 * npcEstimation)) {
			color = true;
			myWarn = true;
		}
		if (npcEstimation > 0 && npcEstimation >= (2 * myEstimation)) {
			color = true;
			npcWarn = true;
		}

		self._npcTradeSpace.setEstimationPrice(npcEstimation, { color: color, warning: npcWarn });
		self._myTradeSpace.setEstimationPrice(myEstimation, { color: color, warning: myWarn });
	}

	function checkAcceptButtonAndTimeout() {
		updateAveragePrice();

		window.clearTimeout(confirmButtonTimeout);
		confirmButtonTimeout = window.setTimeout(function () {
			if (self._npcTradeSpace.isGoldOrItemToTrade()) {
				self._buttonConfirm.enable();
			}
		}, BLINK_DURATION * 1000);
		self._buttonConfirm.disable();
	}

	function addAndModifyObject(msg) {
		var remote = msg.remote;
		var object = msg.object;
		var UID = object.objectUID;
		// var newQty = object.quantity;

		// every time there is an object changes increment the step
		self._exchangeStep += 1;

		itemManager.createItemInstances(object, function (error, itemInstances) {
			if (error) {
				return console.error(error);
			}
			var itemInstance = itemInstances.map[UID];

			if (remote) {
				self._npcTradeSpace.addAndModifyItem(itemInstance);
				self._npcTradeSpace.blink(BLINK_DURATION);
			} else {
				self._myTradeSpace.addAndModifyItem(itemInstance);
			}

			checkAcceptButtonAndTimeout();
		});
	}

	function objectRemoved(msg) {
		var remote = msg.remote;
		var UID = msg.objectUID;

		// every time there is an object changes increment the step
		self._exchangeStep += 1;

		if (remote) {
			self._npcTradeSpace.removeItem(UID);
			self._npcTradeSpace.blink(BLINK_DURATION);
		} else {
			self._myTradeSpace.removeItem(UID);
		}

		checkAcceptButtonAndTimeout();
	}

	function clear() {
		self._npcTradeSpace.reset();
		self._myTradeSpace.reset();
		self._buttonConfirm.disable();
		self._exchangeStep = 0;
	}

	function kamaModified(msg) {
		// every time there is an object/kama changes increment the step
		self._exchangeStep += 1;

		if (msg.remote) {
			self._npcTradeSpace.modifyKama(msg.quantity);
		} else {
			self._myTradeSpace.modifyKama(msg.quantity);
		}
	}

	gui.on('ExchangeStartOkNpcTradeMessage', open);
	gui.on('ExchangeKamaModifiedMessage', this.localizeEvent(kamaModified));
	gui.on('ExchangeObjectAddedMessage', this.localizeEvent(addAndModifyObject));
	gui.on('ExchangeObjectModifiedMessage', this.localizeEvent(addAndModifyObject));
	gui.on('ExchangeObjectRemovedMessage', this.localizeEvent(objectRemoved));

	this.on('closed', clear);
}


inherits(TradeWithNPCWindow, Window);
module.exports = TradeWithNPCWindow;

TradeWithNPCWindow.prototype.prepareExchange = function (npcName) {
	this._npcName = npcName;
};

TradeWithNPCWindow.prototype._createDom = function () {
	var self = this;
	var content = this.windowBody;

	var otherCharacterSpace = content.createChild('div', { className: ['otherCharacterSpace', 'tradeSpace'] });
	this._npcTradeSpace = otherCharacterSpace.appendChild(
		new TradeSpace({ blinkDuration: BLINK_DURATION })
	);

	var mySpace = content.createChild('div', { className: ['mySpace', 'tradeSpace'] });
	this._myTradeSpace = mySpace.appendChild(
		new TradeSpace({ blinkDuration: BLINK_DURATION })
	);

	var tradeButtons = content.createChild('div', { className: 'tradeButtons' });
	this._buttonConfirm = tradeButtons.appendChild(
		new Button(getText('ui.common.validation'), { className: 'buttonConfirm', disable: true })
	);
	this._buttonConfirm.on('tap', function () {
		window.dofus.sendMessage('ExchangeReadyMessage', {
			ready: true,
			step: self._exchangeStep
		});
	});
	var buttonCancel = tradeButtons.appendChild(
		new Button(getText('ui.common.cancel'), { className: 'buttonCancel' })
	);
	buttonCancel.on('tap', function () {
		windowsManager.close(self.id);
	});

	this._domCreated = true;
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/TradeWithNPCWindow/index.js
 ** module id = 941
 ** module chunks = 0
 **/