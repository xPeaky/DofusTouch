require('./styles.less');
var inherits = require('util').inherits;
var WuiDom   = require('wuidom');

function ItemDetailsBox(title) {
	WuiDom.call(this, 'div', { className: 'itemDetailsBox' });

	this._createDom(title);
}
inherits(ItemDetailsBox, WuiDom);
module.exports = ItemDetailsBox;

ItemDetailsBox.prototype._createDom = function (title) {
	var header = this.createChild('div', { className: 'header' });
	header.createChild('div', { className: 'title', text: title });
	header.createChild('div', { className: 'titleCorner' });
	this._content = this.createChild('div', { className: 'content' });
};

ItemDetailsBox.prototype.clearContent = function () {
	this._content.clearContent();
};

ItemDetailsBox.prototype.addRow = function (text, classNames) {
	classNames = classNames || [];
	classNames.push('row');
	this._content.createChild('div', { className: classNames, text: text });
};

ItemDetailsBox.prototype.hasRow = function () {
	return this._content.getChildCount() > 0;
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/MarketWindow/ShopWindow/itemDetailsView/itemDetailsBox.js
 ** module id = 972
 ** module chunks = 0
 **/