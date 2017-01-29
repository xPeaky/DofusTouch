var inherits = require('util').inherits;
var getText = require('getText').getText;
var CraftingWindow = require('CraftingWindow');
var CraftResultEnum = require('CraftResultEnum');
var windowsManager = require('windowsManager');


function CraftingMultiWindow() {
	CraftingWindow.call(this);

	var self = this;
	var gui = window.gui;

	this._mySlotElems = null;
	this._targetSlotElems = null;
	this._craftResultBox = null;
	this._isReady = false;
	this._isCrafter = true;

	var otherName = '';
	var exchangeStep = 0;

	function incrementStep() {
		exchangeStep += 1;
	}

	function onExchangeReady(msg) {
		var ready = msg.ready;
		var buttonMerge = self._buttonMerge;

		self._craftResultBox.toggleReady(ready);
		self._mySlotElems.toggleReady(ready);
		self._targetSlotElems.toggleReady(ready);

		if (!ready) { // not ready
			buttonMerge.setText(getText('ui.common.merge'));
			self._isReady = false;
		} else if (gui.playerData.id === msg.id) { // I am ready
			buttonMerge.setText(getText('ui.common.cancel'));
			self._restoreMergeStopButtons();
		}
	}

	// overwrite _updateSlotElems
	this._updateSlotElems = function (nbCase) {
		self._updateMySlotElems(nbCase);

		var isSignatureSlot = (nbCase === 9); // lvl100 === 8 + 1 signature slot

		self._targetSlotElems.setPlayerName(otherName);
		self._targetSlotElems.setNbSlots();
		self._targetSlotElems.setAsRemote();

		var isCrafter = self._isCrafter;

		// set the signature slot to the crafter
		self._mySlotElems.toggleSignatureSlot(isSignatureSlot && isCrafter);
		self._targetSlotElems.toggleSignatureSlot(isSignatureSlot && !isCrafter);
	};

	// overwrite onResultEvents
	this._onResultEvents = function (msg) {
		// reset exchange ready
		onExchangeReadyResetDefault();

		self._stopBtn.enable();
		self._buttonMerge.disable();

		self._onResult(msg, function (err, data) {
			if (err) {
				return console.error('Crafting multi: onResult error', err);
			}

			var message = data.message;
			var craftResult = data.craftResult;
			var objectInfo = data.objectInfo;
			var objectName = data.objectName;

			// CRAFT_SUCCESS
			if (craftResult === CraftResultEnum.CRAFT_SUCCESS) {
				if (self._isCrafter) {
					message = getText('ui.craft.successTarget', objectName, otherName);
				} else {
					message = getText('ui.craft.successOther', otherName, objectName);
				}
			}

			self.giveTheResult(objectInfo, message);
		});
	};

	function onExchangeReadyResetDefault() {
		self._craftResultBox.toggleReady(false);
		self._mySlotElems.toggleReady(false);
		self._targetSlotElems.toggleReady(false);
		self._buttonMerge.setText(getText('ui.common.merge'));
		self._isReady = false;
	}

	function onEvents(msg) {
		var messageType = msg._messageType;

		// if it's another msg and the window is not open -> return
		if (!self.openState) {
			return;
		}

		switch (messageType) {
		case 'ExchangeObjectAddedMessage':
		case 'ExchangeObjectModifiedMessage':

		case 'ExchangeObjectRemovedMessage':

		case 'ExchangeGoldPaymentForCraftMessage':
		case 'ExchangeItemPaymentForCraftMessage':
		case 'ExchangeModifiedPaymentForCraftMessage':
		case 'ExchangeRemovedPaymentForCraftMessage':
		case 'ExchangeClearPaymentForCraftMessage':
			incrementStep();
			break;
		case 'ExchangeIsReadyMessage':
			onExchangeReady(msg);
			break;
		}
	}

	gui.on('ExchangeObjectAddedMessage', onEvents);
	gui.on('ExchangeObjectModifiedMessage', onEvents);
	gui.on('ExchangeObjectRemovedMessage', onEvents);

	// on payment message need to increment the step
	gui.on('ExchangeGoldPaymentForCraftMessage', onEvents);
	gui.on('ExchangeItemPaymentForCraftMessage', onEvents);
	gui.on('ExchangeModifiedPaymentForCraftMessage', onEvents);
	gui.on('ExchangeRemovedPaymentForCraftMessage', onEvents);
	gui.on('ExchangeClearPaymentForCraftMessage', onEvents);

	gui.on('ExchangeIsReadyMessage', onEvents);

	this.on('close', function () {
		self._isCrafter = true;
		otherName = '';
		exchangeStep = 0;
		onExchangeReadyResetDefault();
	});


	// overwrite buttonMergeAction
	this._buttonMergeAction = function () {
		// confirm exchange
		var nbIngredients = self._mySlotElems.getGivenIngredientsInfo().length;
		nbIngredients += self._targetSlotElems.getGivenIngredientsInfo().length;
		if (nbIngredients < 1) {
			return;
		}

		self._isReady = !self._isReady;
		window.dofus.sendMessage('ExchangeReadyMessage', {
			ready: self._isReady,
			step: exchangeStep
		});
	};
}

inherits(CraftingMultiWindow, CraftingWindow);
module.exports = CraftingMultiWindow;

CraftingMultiWindow.prototype._onOpen = function (params) {
	CraftingWindow.prototype._onOpen.call(this, params);

	windowsManager.close('cancel', { keepDialog: true });

	this._isCrafter = params.isCrafter;

	// msg is the ExchangeStartOk message from the server
	var msg = params.msg;

	this._targetSlotElems.setCrafterJobLevel(msg.skillId, msg.crafterJobLevel, msg.enrichData.jobName);
	this._targetSlotElems.show();
	this._paymentButton.show();

	var craftPaymentWindow = windowsManager.getWindow('craftPayment');
	craftPaymentWindow.setForCrafter(params.isCrafter);
	// hide the on success part
	craftPaymentWindow.setOnSuccess(false);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/CraftingMultiWindow/index.js
 ** module id = 916
 ** module chunks = 0
 **/