require('./styles.less');
var inherits = require('util').inherits;
var WuiDom = require('wuidom');
var TradeGold = require('TradeSpace/TradeGold');
var ItemSlot = require('ItemSlot');
var MinMaxSelector = require('MinMaxSelector');
var helper = require('helper');
var getText = require('getText').getText;
var ProgressBar = require('ProgressBar');
var addTooltip = require('TooltipBox').addTooltip;
var dragManager = require('dragManager');

function TradeSpace(options) {
	options = options || {};
	WuiDom.call(this, 'div', { className: 'TradeSpace' });

	var self = this;
	this._isRemote = false;
	this._blinkDuration = options.blinkDuration || 5;
	this._blinkTimeout = null;
	this._currentUID = null;
	this._podsTooltip = new WuiDom('div');
	this._podsTooltipText = '';
	this._maxPods = 0;
	this._currentPods = 0;
	this._exchangePods = 0;
	this._podsPercent = 0;
	this._estimationPrice = {};

	this.selectedSlot = null;

	this._minMaxSelector = this.appendChild(new MinMaxSelector());
	this._minMaxSelector.setStyles({
		left: '20px',
		top: '50px'
	});
	this._minMaxSelector.on('confirm', function (result) {
		window.dofus.sendMessage('ExchangeObjectMoveMessage', {
			objectUID: self._currentUID,
			quantity: result * (this.fromInventory ? 1 : -1)
		});
	});

	this._tradeGold = this.appendChild(new TradeGold());

	this._tradeGold.on('kamaChange', function (value) {
		window.dofus.sendMessage('ExchangeObjectMoveKamaMessage', { quantity: value });
	});

	this._exchangePodsContent = this.createChild('div', { className: 'exchangePodsContent' });
	this._exchangePodsProgressBar = this._exchangePodsContent.appendChild(
		new ProgressBar({ className: 'exchangePodsProgressBar' })
	);

	addTooltip(this._exchangePodsProgressBar, self._podsTooltip);

	var slotBox = this.createChild('div', { className: 'slotBox' });
	if (options.dragInteraction) {
		dragManager.setDroppable(slotBox, ['tradeWithPlayerAndNPCInventory']);
		slotBox.on('drop', function (source) {
			var item = source.itemInstance;
			var quantity = source.getQuantity();

			if (quantity === 1) {
				return window.dofus.sendMessage('ExchangeObjectMoveMessage', {
					objectUID: item.objectUID,
					quantity: 1
				});
			}

			self._currentUID = item.objectUID;
			self._minMaxSelector.fromInventory = true;
			self._minMaxSelector.open({
				min: 1,
				max: quantity
			});
		});
	}

	this.canRemove = options.canRemove;

	this._allSlots = slotBox.createChild('div', { className: 'slots' });

	// estimation

	var estimationContent = this.createChild('div', { className: 'estimationContent' });
	estimationContent.createChild('div', {
		className: ['estimationLabel', 'half'],
		text: getText('ui.exchange.estimatedValue') + getText('ui.common.colon')
	});
	var estimationValueContent = estimationContent.createChild('div', { className: ['estimationValueContent', 'half'] });
	this._estimationValue = estimationValueContent.createChild('div', { className: 'estimationValue' });
	this._estimationWarning = estimationValueContent.createChild('div', { className: 'estimationWarning' });

	var estimationWarningToolTip = null;
	addTooltip(this._estimationWarning, function () {
		if (estimationWarningToolTip) {
			return estimationWarningToolTip;
		}
		estimationWarningToolTip = new WuiDom('div', { text: getText('ui.exchange.warning') });
		return estimationWarningToolTip;
	});
}


inherits(TradeSpace, WuiDom);
module.exports = TradeSpace;


TradeSpace.prototype.setAsRemote = function () {
	this._isRemote = true;
	this._tradeGold.setAsRemote();
};


TradeSpace.prototype.modifyKama = function (value) {
	if (this._isRemote) {
		this._tradeGold.blink(this._blinkDuration);
	}
	this._tradeGold.setKama(value);
};


TradeSpace.prototype.blink = function (duration) {
	duration = duration || 3;
	var self = this;

	window.clearTimeout(this._blinkTimeout);
	this._blinkTimeout = window.setTimeout(function () {
		self._allSlots.delClassNames('blink');
	}, duration * 1000);
	this._allSlots.addClassNames('blink');
};


TradeSpace.prototype.setEstimationPrice = function (value, params) {
	params = params || {};

	this._estimationValue.setText(helper.kamasToString(value));
	this._estimationValue.toggleClassName('warning', params.color);
	this._estimationWarning.setStyle('visibility', (params.warning) ? 'visible' : 'hidden');
};


TradeSpace.prototype.addAndModifyItem = function (itemInstance) {
	var self = this;
	var allSlots = this._allSlots;
	var slot;

	var UID = itemInstance.objectUID;
	var qty = itemInstance.quantity;

	function updateEstimatePrice() {
		var estimationPrice = self._estimationPrice[UID];
		var averagePriceDB = itemInstance.item.averagePrice;

		// -1 means no estimations
		if (averagePriceDB < 0) {
			return;
		}

		if (!estimationPrice) {
			estimationPrice = self._estimationPrice[UID] = {};
		}

		estimationPrice.averagePrice = itemInstance.item.averagePrice;
		estimationPrice.quantity = qty;
	}

	updateEstimatePrice();

	function remove() {
		if (self._isRemote || !self.canRemove) {
			return;
		}

		var itemInstance = slot.itemInstance;
		if (!itemInstance) {
			return;
		}

		self._currentUID = itemInstance.objectUID;
		var qty = itemInstance.quantity;

		if (qty === 1) {
			return window.dofus.sendMessage('ExchangeObjectMoveMessage', {
				objectUID: self._currentUID,
				quantity: -1
			});
		}

		self._minMaxSelector.fromInventory = false;
		self._minMaxSelector.open({
			min: 1,
			max: itemInstance.quantity
		});
	}

	function itemSlotCloseHandler(action) {
		if (action === 'remove') {
			remove();
		}
	}


	slot = allSlots.getChild('slot' + UID);
	if (!slot) { // add
		slot = allSlots.appendChild(new ItemSlot({ name: 'slot' + UID }));

		slot.setContextMenu('item', {
			item: slot.itemInstance,
			remove: self.canRemove,
			onClose: itemSlotCloseHandler,
			enableActions: false
		});

		if (self.canRemove) {
			slot.on('doubletap', remove);
			slot.on('tap', function () {
				if (self.selectedSlot) {
					self.selectedSlot.delClassNames('selected');
				}
				self.selectedSlot = this;
				self.selectedSlot.addClassNames('selected');
			});
		}
	}

	slot.setItem(itemInstance);
};


TradeSpace.prototype.removeItem = function (UID) {
	delete this._estimationPrice[UID];
	var slot = this._allSlots.getChild('slot' + UID);
	if (slot) {
		if (slot === this.selectedSlot) {
			this.selectedSlot = null;
		}
		slot.destroy();
	}
};


TradeSpace.prototype.getEstimationPrice = function () {
	var amountGold = this._tradeGold.getKama();
	var estimationPrice = this._estimationPrice;

	for (var key in estimationPrice) {
		var obj = estimationPrice[key];
		amountGold += (obj.quantity * obj.averagePrice);
	}

	return amountGold;
};


TradeSpace.prototype.toggleReady = function (isReady) {
	this._tradeGold.toggleReady(isReady);
	this._allSlots.toggleClassName('isReady', isReady);
};


TradeSpace.prototype.setPodsProgressBar = function () {
	var maxPods = this._maxPods;
	var currentPods = this._currentPods;
	var exchangePods = this._exchangePods;
	if (!maxPods) {
		return;
	}

	var podsPercent = this._podsPercent = Math.min(100, Math.floor(100 * (currentPods + exchangePods) / maxPods));
	this._exchangePodsProgressBar.setValue(this._podsPercent / 100);

	if (podsPercent <= 60) {
		this._exchangePodsProgressBar.replaceClassNames(['yellow', 'orange', 'red'], ['green']);
	} else if (podsPercent <= 70) {
		this._exchangePodsProgressBar.replaceClassNames(['green', 'orange', 'red'], ['yellow']);
	} else if (podsPercent <= 80) {
		this._exchangePodsProgressBar.replaceClassNames(['green', 'yellow', 'red'], ['orange']);
	} else {
		this._exchangePodsProgressBar.replaceClassNames(['green', 'yellow', 'orange'], ['red']);
	}

	this._podsTooltipText = getText('ui.common.player.weight',
		helper.kamasToString((currentPods + exchangePods), ''),
		helper.kamasToString(maxPods, '')
	);
	this._podsTooltip.setText(this._podsTooltipText);
};


TradeSpace.prototype.initializePods = function (currentValue, maxValue) {
	this._maxPods = maxValue;
	this._currentPods = currentValue;
	this._exchangePods = 0;
	this.setPodsProgressBar();
};


TradeSpace.prototype.NPCTradeMode = function () {
	this._exchangePodsContent.hide();
	this._tradeGold.setReadOnly(true);
};


TradeSpace.prototype.incrementExchangePodsQty = function (nbPods) {
	this._exchangePods += nbPods;
	this.setPodsProgressBar();
};


TradeSpace.prototype.isGoldOrItemToTrade = function () {
	if (this._tradeGold.getKama() > 0) {
		return true;
	}
	var children = this._allSlots.getChildren();

	for (var i = 0, len = children.length; i < len; i += 1) {
		var slot = children[i];
		if (slot.itemInstance) {
			return true;
		}
	}
	return false;
};


TradeSpace.prototype.reset = function () {
	this._tradeGold.reset();
	this._isRemote = false;
	this._currentUID = null;
	this._maxPods = 0;
	this._currentPods = 0;
	this._exchangePods = 0;
	this._podsPercent = 0;
	this._estimationPrice = {};
	this._exchangePodsContent.show();
	this._tradeGold.show();
	window.clearTimeout(this._blinkTimeout);
	this._allSlots.delClassNames('blink');
	this._podsTooltip.setText('');
	this._allSlots.clearContent();
	this.selectedSlot = null;
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/TradeSpace/index.js
 ** module id = 937
 ** module chunks = 0
 **/