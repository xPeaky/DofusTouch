require('./styles.less');
var inherits = require('util').inherits;
var Button = require('Button');

var SOFT_CURRENCY = 'soft';
var HARD_CURRENCY = 'hard';

function SwitchCurrencyButton(options) {
	var self = this;
	options = options || {};

	this.currency = SOFT_CURRENCY;

	Button.call(this, options, function () {
		self.toggleCurrency();
	});
	this.addClassNames('button', 'SwitchCurrencyButton', SOFT_CURRENCY);
}
inherits(SwitchCurrencyButton, Button);
module.exports = SwitchCurrencyButton;

SwitchCurrencyButton.prototype.toggleCurrency = function () {
	this.setCurrency(this.currency === SOFT_CURRENCY ? HARD_CURRENCY : SOFT_CURRENCY);
};

SwitchCurrencyButton.prototype.setCurrency = function (currency) {
	if (this.currency === currency) {
		return;
	}

	var previousCurrency = this.currency;
	this.currency = currency;

	this.replaceClassNames([previousCurrency], [this.currency]);

	if (this.currency === HARD_CURRENCY) {
		return this.emit('switchToHard');
	}
	return this.emit('switchToSoft');
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/SwitchCurrencyButton/index.js
 ** module id = 774
 ** module chunks = 0
 **/