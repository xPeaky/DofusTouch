require('./styles.less');
var getText = require('getText').getText;
var inherits = require('util').inherits;
var TooltipBox = require('TooltipBox');
var WuiDom = require('wuidom');


function ProgressBar(options) {
	options = options || {};

	WuiDom.call(this, 'div', { className: 'ProgressBar', name: options.name });
	this.addClassNames(options.className);

	this.barBg = this.createChild('div', { className: 'barBg' });
	this.barFill = this.createChild('div', { className: 'barFill' });
	this.barColor = this.barFill.createChild('div', { className: 'barColor' });

	// if options.vertical is not provided, progress bar is horizontal by default
	this.vertical = options.vertical || false;
	this.barFill.toggleClassName('vertical', this.vertical);

	if (options.tooltip) {
		this.tooltipText = options.tooltip;
		TooltipBox.addTooltip(this, this._tooltipHandler.bind(this));
	}

	this.setValue(options.value || 0);
}

inherits(ProgressBar, WuiDom);
module.exports = ProgressBar;


/**
 * Updates gauge's value
 *  @param {number} value - percentage (0.01 = 1%) or value if "max" is given
 *  @param {number} [max] - maximum value used for gauge progress & tooltip display
 *  @param {number} [percent] - if given, it overrides the value for gauge progress display
 */
ProgressBar.prototype.setValue = function (value, max, percent) {
	this.maxValue = max;
	if (max) {
		this.humanValue = value;
		if (percent !== undefined) {
			value = percent;
		} else {
			value = value / max;
		}
	} else {
		// We don't have a max; value is a percentage already
		this.humanValue = Math.round(value * 100);
	}
	// Here value is a percentage => convert it to a number (0.33332 becomes 33.332%)
	value *= 100;

	// Looks nicer in UI if values close to 0% but not ==0 are showed as "something"; same for 100%
	var epsilon = 5; // gauge's extremities being round, it is difficult to see small values
	if (value < epsilon && value > 0) { value = epsilon; }
	if (value > 100 - epsilon && value < 100) { value = 100 - epsilon; }
	value = Math.round(value);

	// Note: Hack for Android browser
	// Android browser will apply 100% 100% when one of the value is set to 0, make it to have at
	// least 1px when the value is 0.
	var maskSize = value ? value + '%' : '1px';

	this.barFill.setStyle('-webkit-mask-size', this.vertical ? '100% ' + maskSize : maskSize + ' 100%');
	this.barFill.setStyle('-webkit-mask-position', this.vertical ? '0 100%' : '0 0');
};

ProgressBar.prototype.setRange = function (low, high) {
	var value = high - low;
	var maskSize = value ? Math.round(value * 100) + '%' : '1px';
	var maskPos = low ? Math.round(low * 100) + '%' : '1px';
	this.barFill.setStyle('-webkit-mask-size', this.vertical ? '100% ' + maskSize : maskSize + ' 100%');
	this.barFill.setStyle('-webkit-mask-position', this.vertical ? '100% ' + maskPos : maskPos + ' 100%');
};

//TODO add the marker

ProgressBar.prototype._tooltipHandler = function () {
	var label = this.tooltipText + getText('ui.common.colon');
	if (this.maxValue) {
		return label + this.humanValue + ' / ' + this.maxValue;
	} else {
		return label + this.humanValue + '%';
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/ProgressBar/index.js
 ** module id = 641
 ** module chunks = 0
 **/