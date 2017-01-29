require('./SerenityGauge.less');
var getText = require('getText').getText;
var inherits = require('util').inherits;
var TooltipBox = require('TooltipBox');
var WuiDom = require('wuidom');

// Serenity data
var SERENITY_MIN = -10000;
var GOOD_SERENITY_MIN = -2000;
var GOOD_SERENITY_MAX = 2000;
var SERENITY_MAX = 10000;

var MINIBAR_WIDTH = 73; // px
var MINIBAR_CURSOR_WIDTH = 50; // px


function SerenityGauge(isMini) {
	WuiDom.call(this, 'div', { className: 'serenityGauge' });
	if (isMini) { this.addClassNames('mini'); }

	this.isMini = isMini;

	if (!isMini) { this.createChild('div', { className: ['bigIcon', 'bigIcon_mad'] }); }

	var barWrapper = this.createChild('div', { className: 'barWrapper' });

	var serenityBar = this._serenityBar = barWrapper.createChild('div', { className: 'serenityBar' });

	this.zones = [];
	this._createColorZone('stamina', SERENITY_MIN, GOOD_SERENITY_MIN, getText('ui.mount.viewerTooltipZone1'));
	this._createColorZone('maturity', GOOD_SERENITY_MIN, GOOD_SERENITY_MAX, getText('ui.mount.viewerToolTipZone2'));
	this._createColorZone('love', GOOD_SERENITY_MAX, SERENITY_MAX, getText('ui.mount.viewerTooltipZone3'));

	this._serenityBarCursor = serenityBar.createChild('div', { className: 'cursor' });
	if (!isMini) {
		this._serenityValue = this._serenityBarCursor.createChild('div', { className: 'value' });
	}

	barWrapper.createChild('div', { className: 'background' });

	if (!isMini) { this.createChild('div', { className: ['bigIcon', 'bigIcon_happy'] }); }
}
inherits(SerenityGauge, WuiDom);
module.exports = SerenityGauge;


SerenityGauge.prototype._createColorZone = function (name, min, max, tooltip) {
	var zone = this._serenityBar.createChild('div', { className: ['colorZone', name] });
	if (!this.isMini) {
		zone.createChild('div', { className: 'icon' });
		TooltipBox.addTooltip(zone, getText('tablet.mount.serenityZoneTooltip', min, max, tooltip));
	}

	zone.name = name;
	zone.min = min;
	zone.max = max;

	this.zones.push(zone);
	this._serenityBar[name] = zone;
};

SerenityGauge.prototype.resize = function () {
	if (this.isMini) {
		this.serenityBarWidth = MINIBAR_WIDTH;
		this.serenityCursorOffset = -MINIBAR_CURSOR_WIDTH / 2;
	} else {
		this.serenityBarWidth = this._serenityBar.rootElement.clientWidth;
		this.serenityCursorOffset = -this._serenityBarCursor.rootElement.clientWidth / 2;
	}

	var fullRange = SERENITY_MAX - SERENITY_MIN;
	var maturity = this._serenityBar.maturity;
	var halfMaturityWidth = (maturity.max - maturity.min) / fullRange * this.serenityBarWidth / 2;

	var currentOffset = 0;
	var zones = this.zones;
	for (var i = 0; i < zones.length; i++) {
		var zone = zones[i];

		var percent = (zone.max - zone.min) / fullRange;
		var width = percent * this.serenityBarWidth;
		if (zone.name !== 'maturity') { width += halfMaturityWidth; }
		if (zone.name !== 'stamina') { currentOffset -= halfMaturityWidth; }

		zone.setStyle('left', currentOffset + 'px');
		zone.setStyle('width', width + 'px');

		currentOffset += width;
	}

	this._serenityBar.maturity.setStyles({
		borderBottomLeftRadius: halfMaturityWidth + 'px',
		borderTopRightRadius: halfMaturityWidth + 'px'
	});
};

SerenityGauge.prototype.setValue = function (serenity) {
	if (!this.isMini) {
		this._serenityValue.setText(serenity);
	}
	var percent = (serenity - SERENITY_MIN) / (SERENITY_MAX - SERENITY_MIN);
	var posCursor = percent * this.serenityBarWidth + this.serenityCursorOffset;
	this._serenityBarCursor.setStyle('left', posCursor + 'px');

	this._serenityBar.stamina.toggleClassName('disabled', serenity >= 0);
	this._serenityBar.maturity.toggleClassName('disabled', serenity < GOOD_SERENITY_MIN || serenity > GOOD_SERENITY_MAX);
	this._serenityBar.love.toggleClassName('disabled', serenity <= 0);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/MountDetails/SerenityGauge.js
 ** module id = 667
 ** module chunks = 0
 **/