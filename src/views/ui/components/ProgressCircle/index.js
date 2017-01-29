var getText = require('getText').getText;
var inherits = require('util').inherits;
var TooltipBox = require('TooltipBox');
var WuiDom   = require('wuidom');

var DEFAULT_SIZE = 50;


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Display a circle shaped progress gauge
 *
 * @param {Object} params              - parameters
 *        {number}  params.size        - size of the canvas (both width and height, as it is square)
 *        {number}  params.color       - color of gauge; e.g. "#ff2100"
 *        {number} [params.bgColor]    - color of gauge's background; if not given we do not draw it
 *        {number}  params.thickness   - gauge's thickness in px
 *        {number}  params.bgThickness - gauge's background's thickness in px
 *        {number} [params.className]  - additional CSS class to add to the component
 */
function ProgressCircle(params) {
	params = params || {};

	WuiDom.call(this, 'div', { className: 'ProgressCircle' });
	this.addClassNames(params.className);

	this.size = params.size || DEFAULT_SIZE;
	this.thickness = params.thickness || Math.round(this.size * 0.15);
	this.bgThickness = params.bgThickness || this.thickness + 2;
	this.color = params.color || '#EEE';
	this.bgColor = params.bgColor; // no default here; we will not draw if bgColor not given

	if (params.tooltip) {
		this.tooltipText = params.tooltip;
		TooltipBox.addTooltip(this, this._tooltipHandler.bind(this));
	}

	this.radius   = (this.size - this.bgThickness) / 2;
	this.center   = this.size / 2;

	var canvas    = this.createChild('canvas', { className: 'canvas' }).rootElement;
	canvas.width  = this.size;
	canvas.height = this.size;

	canvas.style.width  = this.size + 'px';
	canvas.style.height = this.size + 'px';

	this._ctx = canvas.getContext('2d');
}

inherits(ProgressCircle, WuiDom);
module.exports = ProgressCircle;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** set progress value and update circle drawing
 *
 * @param {number} percent - percentage value (between 0 and 1)
 */
ProgressCircle.prototype.setValue = function (value, max) {
	var percent;
	if (max) {
		this.value = value;
		percent = value / max;
	} else {
		// We don't have a max; value is a percentage only
		this.value = value;
		percent = value;
	}
	this.maxValue = max;

	var ctx = this._ctx;
	this._ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

	if (this.bgColor) { this._drawArc(this.bgThickness, this.bgColor, 1); }
	this._drawArc(this.thickness, this.color, percent);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
ProgressCircle.prototype._drawArc = function (lineWidth, color, percent) {
	// Make sure we show "small values": if less than 1% away from 0 or 100 we round it to 1%
	if (percent < 0.01 && percent !== 0) { percent = 0.01; }
	if (percent > 0.99 && percent !== 1) { percent = 0.99; }

	var ctx = this._ctx;

	ctx.lineWidth   = lineWidth;
	ctx.strokeStyle = color;

	ctx.beginPath();
	ctx.arc(this.center, this.center, this.radius, -0.5 * Math.PI, (2 * percent - 0.5) * Math.PI, false);
	ctx.stroke();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
ProgressCircle.prototype._tooltipHandler = function () {
	var label = this.tooltipText + getText('ui.common.colon');
	if (this.maxValue) {
		return label + this.value + ' / ' + this.maxValue;
	} else {
		return label + this.value + '%';
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/ProgressCircle/index.js
 ** module id = 663
 ** module chunks = 0
 **/