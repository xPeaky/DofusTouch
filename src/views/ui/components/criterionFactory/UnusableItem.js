var Criterion = require('./Criterion.js');
var getText = require('getText').getText;
var inherits = require('util').inherits;

function UnusableItem(data) {
	Criterion.call(this, data);

	this._text = getText('ui.criterion.unusableItem');
}
inherits(UnusableItem, Criterion);

UnusableItem.prototype.isRespected = function () {
	return true;
};

UnusableItem.prototype.getText = function () {
	return this._text;
};

module.exports = UnusableItem;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/criterionFactory/UnusableItem.js
 ** module id = 383
 ** module chunks = 0
 **/