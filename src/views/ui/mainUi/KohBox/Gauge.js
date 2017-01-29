var addTooltip = require('TooltipBox').addTooltip;
var inherits = require('util').inherits;
var WuiDom = require('wuidom');

function Gauge(colors, width) {
	WuiDom.call(this, 'div', { className: 'Gauge' });
	this.createChild('div', { className: 'barBg' });

	var barBox = this.createChild('div', { className: 'barBox' });

	this.bars = [];
	for (var i = 0, len = colors.length; i < len; i += 1) {
		var container = barBox.createChild('div', { className: 'barContainer' });
		container.createChild('div', { className: ['bar', colors[i]] });

		container.tooltip = barBox.createChild('div', { className: 'tooltip' });
		container.tooltipContent = new WuiDom('div');
		addTooltip(container.tooltip, container.tooltipContent, { openOnTap: true });

		this.bars.push(container);
	}

	this.width = width;
}

inherits(Gauge, WuiDom);
module.exports = Gauge;

Gauge.prototype.setValues = function (values) {
	var leftOffset = 0;
	for (var i = 0, len = this.bars.length; i < len; i += 1) {
		var value = values[i];
		var container = this.bars[i];

		var weight = Math.floor(this.width * value.weight);
		container.setStyles({
			'-webkit-mask-position': leftOffset + 'px 0',
			'-webkit-mask-size': weight + 'px 100%'
		});
		container.tooltip.setStyles({
			left: leftOffset + 'px',
			width: weight + 'px'
		});
		leftOffset += weight;

		container.tooltipContent.setText(value.tooltip);
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/mainUi/KohBox/Gauge.js
 ** module id = 485
 ** module chunks = 0
 **/