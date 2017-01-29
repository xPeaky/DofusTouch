require('./GaugeIcon.less');
var helper = require('helper');
var inherits = require('util').inherits;
var ProgressCircle = require('ProgressCircle');
var WuiDom = require('wuidom');

var GAUGE_SIZE = 40; // px; must match the height of .gaugeIcon .icon
var GAUGE_THICKNESS = 2.5; // px; thickness
var GAUGE_MIN_THICKNESS = 2; // px; under this size it might become hard to see

var GRAY_GAUGE_COLOR = '#222';

var DEFAULT_COLOR = {
	energy: '#ffcc00',
	stamina: '#ebae23',
	maturity: '#0099ff',
	love: '#ff1e1e'
};

var DEFAULT_ENABLE = {
	stamina: 0.75,
	maturity: 1, // 100%
	love: 0.75
};
var MIN_ENABLE_PERCENT = 0.001;


function GaugeIcon(name, valueName, options) {
	WuiDom.call(this, 'div', { className: ['gaugeIcon', name] });

	options = options || {};
	this.name = name;

	this.createChild('div', { className: 'icon' });

	var size = options.size || GAUGE_SIZE;
	var thickness = options.thickness || (size < GAUGE_SIZE ? GAUGE_MIN_THICKNESS : GAUGE_THICKNESS);

	this.progressCircle = this.appendChild(new ProgressCircle({
		size: size,
		thickness: thickness,
		color: options.color || DEFAULT_COLOR[name],
		bgColor: options.bgColor || GRAY_GAUGE_COLOR,
		tooltip: valueName
	}));

	this.valueElt = options.withoutLabel ? null : this.createChild('div', { className: 'value', text: '' });
}
inherits(GaugeIcon, WuiDom);
module.exports = GaugeIcon;


GaugeIcon.prototype.setValue = function (value, max, enabledPercent) {
	enabledPercent = enabledPercent || DEFAULT_ENABLE[this.name] || MIN_ENABLE_PERCENT;

	if (this.valueElt) { this.valueElt.setText(helper.intToString(value)); }

	var isEnabled = (max && enabledPercent) ? value >= max * enabledPercent : true;
	this.toggleClassName('enabled', isEnabled);

	this.progressCircle.setValue(value, max);
};

// Usually the label is the value; you can replace it using this method.
GaugeIcon.prototype.setLabel = function (text) {
	this.valueElt.setText(text);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/MountDetails/GaugeIcon.js
 ** module id = 661
 ** module chunks = 0
 **/