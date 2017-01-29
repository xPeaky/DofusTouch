require('./styles.less');
var inherits = require('util').inherits;
var WuiDom = require('wuidom');
var dragManager = require('dragManager');
var NumberInputBox = require('NumberInputBox');
var ItemSlot = require('ItemSlot');
var getText = require('getText').getText;
var Button = require('Button');
var PaymentTypeEnum = require('PaymentTypeEnum');


function PaymentSlotsKamas(paymentType) {
	WuiDom.call(this, 'div', { className: 'PaymentSlotsKamas' });

	var self = this;

	this._MAX_SLOTS = 5;

	this._currentKama = 0;
	this._currentItems = [];
	this._currentPage = 1;
	this._readOnly = false;
	this._paymentType = paymentType;

	var itemsContent = this.createChild('div', { className: 'itemsContent' });

	this._previousBtn = itemsContent.appendChild(new Button({ className: ['previousBtn', 'arrow'] }, function () {
		self._currentPage -= 1;
		self._updateItems();
	}));

	var itemsSlotsAndLabel = itemsContent.createChild('div', { className: 'itemsSlotsAndLabel' });

	// if payment on success add label
	if (paymentType === PaymentTypeEnum.PAYMENT_ON_SUCCESS_ONLY) {
		itemsSlotsAndLabel.createChild('div', { className: 'itemsLabel', text: getText('ui.craft.additionalPayment') });
	}

	var itemsSlots = this._itemsSlots = itemsSlotsAndLabel.createChild('div', { className: 'itemsSlots' });
	for (var i = 0; i < this._MAX_SLOTS; i += 1) {
		var slot = itemsSlots.appendChild(new ItemSlot());
		slot.itemUI = {
			width: 40,
			height: 40,
			onDragClassName: 'slot'
		};
		dragManager.setDraggable(slot, slot.itemUI, 'craftPayment', { slot: slot });
		dragManager.disableDrag(slot);
	}

	this._nextBtn = itemsContent.appendChild(new Button({ className: ['nextBtn', 'arrow'] }, function () {
		self._currentPage += 1;
		self._updateItems();
	}));

	// pages

	var pagesContent = this.createChild('div', { className: 'pagesContent' });
	this._pagesCount = pagesContent.createChild('div', { className: 'pagesCount' });

	this._updatePagesCount();

	// Kamas

	var kamaContent = this.createChild('div', { className: 'kamaContent' });
	kamaContent.createChild('div', { className: 'kamaLabel', text: getText('ui.common.kamas') });
	var input = this._numberInput = kamaContent.appendChild(
		new NumberInputBox({ minValue: 0, title: getText('ui.common.kamas') }));

	input.on('focus', function () {
		input.maxValue = window.gui.playerData.inventory.kamas;
	});
	input.on('change', function (kama) {
		if (self._currentKama !== kama) {
			self._currentKama = kama;
			self.emit('kamaChange', kama);
		}
	});
}


inherits(PaymentSlotsKamas, WuiDom);
module.exports = PaymentSlotsKamas;


PaymentSlotsKamas.prototype.setKama = function (value) {
	this._numberInput.setValue(value);
	this._numberInput.blur();
};


PaymentSlotsKamas.prototype.setReadonly = function (readonly) {
	this._numberInput.setReadonly(readonly);
	this._itemsSlots.toggleClassName('disable', readonly);
	this._readOnly = readonly;
};


PaymentSlotsKamas.prototype.selectSlots = function (select) {
	if (this._readOnly) {
		select = false;
	}
	var children = this._itemsSlots.getChildren();
	for (var i = 0, len = children.length; i < len; i += 1) {
		children[i].toggleClassName('selected', select);
	}
};


PaymentSlotsKamas.prototype._getPageMax = function () {
	return parseInt(this._currentItems.length / this._MAX_SLOTS, 10) + 1;
};


PaymentSlotsKamas.prototype._updatePagesCount = function () {
	var pageMax = this._getPageMax();
	if (this._currentPage > pageMax) {
		this._currentPage = pageMax;
	}
	if (this._currentPage < 1) {
		this._currentPage = 1;
	}
	var currentPage = this._currentPage;
	this._pagesCount.setText(currentPage + '/' + pageMax);

	if (currentPage >= pageMax) {
		this._nextBtn.disable();
	} else {
		this._nextBtn.enable();
	}

	if (currentPage <= 1) {
		this._previousBtn.disable();
	} else {
		this._previousBtn.enable();
	}
};



PaymentSlotsKamas.prototype._getItemIndex = function (UID) {
	var currentItems = this._currentItems;

	for (var i = 0, len = currentItems.length; i < len; i += 1) {
		var itemIntance = currentItems[i];
		if (!itemIntance) {
			continue;
		}
		var itemUID = itemIntance.objectUID;
		if (itemUID === UID) {
			return i;
		}
	}
	return null;
};



PaymentSlotsKamas.prototype.addItem = function (itemIntance) {
	this._currentItems.push(itemIntance);
	this._updateItems();
};


PaymentSlotsKamas.prototype.modifyItem = function (givenItemIntance) {
	var index = this._getItemIndex(givenItemIntance.objectUID);
	if (index === null) {
		return;
	}
	this._currentItems[index] = givenItemIntance;
	// get the page where the item is to switch to that page
	this._currentPage = parseInt(index / this._MAX_SLOTS, 10) + 1;
	this._updateItems();
};


PaymentSlotsKamas.prototype.removeItem = function (UID) {
	var index = this._getItemIndex(UID);
	if (index === null) {
		return;
	}
	this._currentItems.splice(index, 1);
	this._updateItems();
};


PaymentSlotsKamas.prototype._updateItems = function () {
	this._updatePagesCount();

	var itemSlots = this._itemsSlots.getChildren();
	var currentPage = this._currentPage - 1;

	for (var i = 0, len = itemSlots.length; i < len; i += 1) {
		var itemIndex = i + (currentPage * this._MAX_SLOTS);
		var itemSlot = itemSlots[i];
		var item = this._currentItems[itemIndex];
		if (!item) {
			delete itemSlot.paymentType;
			itemSlot.unset();
			dragManager.disableDrag(itemSlot);
			continue;
		}
		itemSlot.setItem(item);
		itemSlot.itemUI.backgroundImage = itemSlot.getImage();
		itemSlot.paymentType = this._paymentType;

		if (this._readOnly) {
			dragManager.disableDrag(itemSlot);
		} else {
			dragManager.enableDrag(itemSlot);
		}
	}
};


PaymentSlotsKamas.prototype.clearPayment = function () {
	this._currentKama = 0;
	this._currentPage = 1;
	this._numberInput.setValue('');
	this._currentItems = [];
	this._updateItems();
};


PaymentSlotsKamas.prototype.reset = function () {
	this._readOnly = false;
	this.clearPayment();
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/CraftPaymentWindow/PaymentSlotsKamas/index.js
 ** module id = 930
 ** module chunks = 0
 **/