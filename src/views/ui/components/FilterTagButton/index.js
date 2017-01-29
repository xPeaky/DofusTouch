require('./styles.less');
var Button = require('Button');
var inherits = require('util').inherits;


function FilterTagButton(label, tapHandler) {
	Button.call(this, { className: 'filterTagButton' }, tapHandler);

	this._labelElement = this.createChild('div', { className: 'btnText', label: label });
	this.createChild('div', { className: 'cross', text: 'x' });
}
inherits(FilterTagButton, Button);
module.exports = FilterTagButton;


FilterTagButton.prototype.setLabel = function (label) {
	this._labelElement.setText(label);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/FilterTagButton/index.js
 ** module id = 320
 ** module chunks = 0
 **/