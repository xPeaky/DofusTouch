require('./styles.less');
var Button = require('Button');
var getText = require('getText').getText;
var helper = require('helper');
var inherits = require('util').inherits;
var Window = require('Window');
var windowsManager = require('windowsManager');
var WuiDom = require('wuidom');


function TradeItemConfirmWindow() {
	Window.call(this, {
		title: getText('ui.common.confirm'),
		className: 'TradeItemConfirmWindow',
		positionInfo: {
			left: 'c', top: 'c', width: 350, height: 300,
			isModal: true
		}
	});

	this._reset();

	this.on('open', this._onOpen);
	this.on('close', this._onClose);
}
inherits(TradeItemConfirmWindow, Window);
module.exports = TradeItemConfirmWindow;


TradeItemConfirmWindow.prototype._reset = function () {
	this.cb = null;
	this.itemLabel = null;
	this.itemImg = null;
	this.itemQuantity = null;
	this.buyBtn = null;
	this.buyBtnLabel = null;
};

TradeItemConfirmWindow.prototype._onOpen = function () {
	if (!this.itemLabel) { this._createContent(); }
};

TradeItemConfirmWindow.prototype._onClose = function () {
	this.cb(false);
};

TradeItemConfirmWindow.prototype.freeContent = function () {
	this.windowBody.clearContent();
	this._reset();
};

TradeItemConfirmWindow.prototype._createContent = function () {
	var itemLabelBox = this.windowBody.createChild('div', { className: 'itemLabelBox' });
	var twoColumns = this.windowBody.createChild('div', { className: 'twoColumns' });

	this.itemLabel = itemLabelBox.createChild('div', { className: 'itemLabel' });

	var leftCol = twoColumns.createChild('div', { className: 'leftCol' });
	var itemContainer = leftCol.createChild('div', { className: 'itemContainer' });
	this.itemImg = itemContainer.createChild('div', { className: 'itemImg' });
	this.itemQuantity = itemContainer.createChild('div', { className: 'itemQuantity' });

	var rightCol = twoColumns.createChild('div', { className: 'rightCol' });
	var self = this;
	var btnAndFee = rightCol.createChild('div', { className: 'btnAndFee' });
	this.buyBtn = btnAndFee.appendChild(
		new Button({ addIcon: true, className: ['buyBtn', 'greenButton'] }, function () {
			this.disable();
			self.cb(true);
		}));
	var icon = this.buyBtnIcon = this.buyBtn.getChildren()[0];
	this.buyBtnLabel = this.buyBtn.insertChildBefore(new WuiDom('div', { className: 'btnLabel' }), icon);
	this.buyBtnAmount = this.buyBtn.insertChildBefore(new WuiDom('div', { className: 'btnAmount' }), icon);

	this.feeAmount = btnAndFee.createChild('div', { className: 'feeAmount' });
};

/**
 * Opens the confirm trade window to confirm the buying of an item.
 * @param {object} params
 * @param     {boolean} [params.isSell] - default is a "buy"
 * @param     {ItemInstance} params.itemInstance - item bought
 * @param     {number} [params.amountHard] - pass this for confirming a buying using HARD currency
 * @param     {number} [params.amountSoft] - pass this for confirming a buying using SOFT currency or TOKEN
 * @param     {ItemInstance} [params.token] - pass this for a buying using TOKEN
 * @param     {number} params.qty - number of items bought
 * @param     {number} [params.fee] - optional fee (for a sell)
 * @param {function} cb - will be called with a single boolean parameter; true means "confirmed"
 */
TradeItemConfirmWindow.prototype.confirmTrade = function (params, cb) {
	windowsManager.open(this.id);

	var itemInstance = params.itemInstance;
	this.itemLabel.setText(itemInstance.getName());
	this.itemImg.setStyle('backgroundImage', itemInstance.getProperty('image'));
	this.itemQuantity.setText(params.qty !== 1 ? 'x' + params.qty : '');

	this.buyBtnLabel.setText(getText(params.isSell ? 'ui.common.sell' : 'ui.common.buy').toUpperCase());
	this.buyBtnAmount.setText(helper.intToString(params.amountHard || params.amountSoft));
	this.buyBtn.toggleClassName('hardCcy', !!params.amountHard);
	this.buyBtn.toggleClassName('softCcy', !params.amountHard); // NB: params.amountSoft == 0 kama is valid

	var image = params.token ? params.token.getProperty('image') : null;
	this.buyBtnIcon.setStyle('backgroundImage', image);

	this.feeAmount.setText(params.fee ?
		getText('tablet.salesFee') + getText('ui.common.colon') + helper.kamasToString(params.fee) :
		'');

	this.cb = cb;
};

/** Called if the amount changes while the Confirm window is already displayed */
TradeItemConfirmWindow.prototype.updatePriceRealtime = function (amount) {
	this.buyBtnAmount.setText(helper.intToString(amount));
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/TradeItemConfirmWindow/index.js
 ** module id = 821
 ** module chunks = 0
 **/