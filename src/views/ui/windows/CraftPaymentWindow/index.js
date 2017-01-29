require('./styles.less');
var inherits = require('util').inherits;
var Window = require('Window');
var getText = require('getText').getText;
var Button = require('Button').DofusButton;
var windowsManager = require('windowsManager');
var PaymentSlotsKamas = require('CraftPaymentWindow/PaymentSlotsKamas');
var PaymentTypeEnum = require('PaymentTypeEnum');
var dragManager = require('dragManager');
var MinMaxSelector = require('MinMaxSelector');
var itemManager = require('itemManager');

function CraftPaymentWindow() {
	this._positionInfoNormal = { left: 'c', bottom: '10%', width: 550, height: 165 };
	this._positionInfoOnSuccess = { left: 'c', bottom: '10%', width: 550, height: 225 };

	Window.call(this, {
		className: 'CraftPaymentWindow',
		title: getText('ui.common.payment'),
		positionInfo: this._positionInfoNormal,
		customClose: true
	});

	var self = this;
	var gui = window.gui;

	this._domCreated = false;
	this._readOnly = false;

	this.closeButton.on('tap', function () {
		self.hide();
	});

	function open() {
		windowsManager.open('craftPayment');
	}

	gui.on('ExchangeGoldPaymentForCraftMessage', function (msg) {
		var goldSum = msg.goldSum;

		if (msg.onlySuccess) {
			self._successPayment.setKama(goldSum);
		} else {
			self._normalPayment.setKama(goldSum);
		}
		open();
	});

	gui.on('ExchangeItemPaymentForCraftMessage', function (msg) {
		itemManager.createItemInstances(msg.object, function (error, instances) {
			if (error) {
				return console.error('PaymentWindow: ExchangeItemPaymentForCraftMessage cannot createItemInstances', error);
			}
			var instance = instances.array[0];
			if (msg.onlySuccess) {
				self._successPayment.addItem(instance);
			} else {
				self._normalPayment.addItem(instance);
			}
			open();
		});
	});

	gui.on('ExchangeModifiedPaymentForCraftMessage', function (msg) {
		itemManager.createItemInstances(msg.object, function (error, instances) {
			if (error) {
				return console.error('PaymentWindow: ExchangeModifiedPaymentForCraftMessage cannot createItemInstances', error);
			}
			var instance = instances.array[0];
			if (msg.onlySuccess) {
				self._successPayment.modifyItem(instance);
			} else {
				self._normalPayment.modifyItem(instance);
			}
			open();
		});
	});

	gui.on('ExchangeRemovedPaymentForCraftMessage', function (msg) {
		if (msg.onlySuccess) {
			self._successPayment.removeItem(msg.objectUID);
		} else {
			self._normalPayment.removeItem(msg.objectUID);
		}
		open();
	});

	gui.on('ExchangeClearPaymentForCraftMessage', function (msg) {
		if (msg.paymentType === PaymentTypeEnum.PAYMENT_ON_SUCCESS_ONLY) {
			self._successPayment.clearPayment();
		}
		if (msg.paymentType === PaymentTypeEnum.PAYMENT_IN_ANY_CASE) {
			self._normalPayment.clearPayment();
		}
		self.hide();
	});

	this.once('open', function () {
		if (!self._domCreated) {
			self._createDom();
		}
	});

	this.on('close', function () {
		self._normalPayment.reset();
		self._successPayment.reset();
		self._readOnly = false;
	});
}


inherits(CraftPaymentWindow, Window);
module.exports = CraftPaymentWindow;


CraftPaymentWindow.prototype._createDom = function () {
	var self = this;
	var currentUID = null;
	var paymentType = PaymentTypeEnum.PAYMENT_IN_ANY_CASE;

	this._minMaxSelector = this.appendChild(new MinMaxSelector());
	this._minMaxSelector.setStyles({
		left: '20px',
		top: '30px'
	});

	var windowBody = this.windowBody;

	var normalPayment = this._normalPayment = windowBody.appendChild(
		new PaymentSlotsKamas(PaymentTypeEnum.PAYMENT_IN_ANY_CASE)
	);
	var successPayment = this._successPayment = windowBody.appendChild(
		new PaymentSlotsKamas(PaymentTypeEnum.PAYMENT_ON_SUCCESS_ONLY)
	);

	function moveItem(quantity) {
		window.dofus.sendMessage('ExchangeItemObjectAddAsPaymentMessage', {
			paymentType: paymentType,
			bAdd: true,
			objectToMoveId: currentUID,
			quantity: quantity
		});
	}

	this._minMaxSelector.on('confirm', moveItem);

	function selectSlot(UID, quantity) {
		currentUID = UID;

		if (quantity === 1) {
			return moveItem(1);
		}

		self._minMaxSelector.open({
			min: 1,
			max: quantity
		});
	}

	function onDrop(slot) {
		if (self._readOnly) {
			return;
		}
		paymentType = this.paymentType;
		var itemInstance = slot.itemInstance;
		var displayedQuantity = slot.getQuantity();
		selectSlot(itemInstance.objectUID, displayedQuantity);
	}

	dragManager.setDroppable(normalPayment, ['craftInventory']);
	normalPayment.on('drop', onDrop);
	normalPayment.paymentType = PaymentTypeEnum.PAYMENT_IN_ANY_CASE;
	this._addDragEvents(normalPayment);

	dragManager.setDroppable(successPayment, ['craftInventory']);
	successPayment.on('drop', onDrop);
	successPayment.paymentType = PaymentTypeEnum.PAYMENT_ON_SUCCESS_ONLY;
	this._addDragEvents(successPayment);


	normalPayment.on('kamaChange', function (kama) {
		window.dofus.sendMessage('ExchangeItemGoldAddAsPaymentMessage',
			{ paymentType: PaymentTypeEnum.PAYMENT_IN_ANY_CASE, quantity: kama }
		);
	});

	successPayment.on('kamaChange', function (kama) {
		window.dofus.sendMessage('ExchangeItemGoldAddAsPaymentMessage',
			{ paymentType: PaymentTypeEnum.PAYMENT_ON_SUCCESS_ONLY, quantity: kama }
		);
	});

	var confirmBtn = windowBody.appendChild(
		new Button(getText('ui.common.confirm'), { className: 'confirmBtn' })
	);
	confirmBtn.on('tap', function () {
		self.hide();
	});

	self._domCreated = true;
};


CraftPaymentWindow.prototype.setForCrafter = function (isCrafter) {
	if (!this._domCreated) {
		this._createDom();
	}
	this._normalPayment.setReadonly(isCrafter);
	this._successPayment.setReadonly(isCrafter);
	this._readOnly = isCrafter;
};


CraftPaymentWindow.prototype.setOnSuccess = function (onSuccess) {
	if (!this._domCreated) {
		this._createDom();
	}
	this._successPayment.toggleDisplay(onSuccess);
	if (onSuccess) {
		this.positionInfo = this._positionInfoOnSuccess;
	} else {
		this.positionInfo = this._positionInfoNormal;
	}
};


CraftPaymentWindow.prototype._addDragEvents = function (paymentWD) {
	var self = this;
	var paymentArea = paymentWD;

	function onDrag(source, select) {
		if (!paymentArea) {
			return;
		}
		paymentArea.selectSlots(select);
	}

	dragManager.on('dragStart', self.localizeEvent(function (slot, source, tap) {
		onDrag(tap.source, true);
	}));

	dragManager.on('dragEnd', self.localizeEvent(function (slot, source, tap) {
		onDrag(tap.source, false);
	}));
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/CraftPaymentWindow/index.js
 ** module id = 928
 ** module chunks = 0
 **/