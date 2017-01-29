var EmblemLogo = require('EmblemLogo');
var getText    = require('getText').getText;
var inherits   = require('util').inherits;
var WuiDom     = require('wuidom');

function TooltipIcon(icon, iconsSprite) {
	WuiDom.call(this, 'div', { className: 'WorldMapIcon' });
	var dimensions = icon.dimensions;
	var height = Math.min(dimensions.h, 30);
	var width = Math.floor(dimensions.w * height / dimensions.h);
	var canvas = this.createChild('canvas', { className: 'icon' });
	canvas.rootElement.width = width;
	canvas.rootElement.height = height;
	canvas.setStyle('minWidth', width + 'px');

	var context = canvas.rootElement.getContext('2d');
	context.drawImage(iconsSprite, dimensions.sx, dimensions.sy, dimensions.sw, dimensions.sh, 0, 0, width, height);

	if (icon.infoData.nameIdOverRideFunc) {
		this.createChild('div', { className: 'description', text: icon.infoData.nameIdOverRideFunc() });
	} else {
		this.createChild('div', { className: 'description', text: icon.infoData.nameId.replace('\\n ', '\n') });
	}
}
inherits(TooltipIcon, WuiDom);


function WorldMapTooltip() {
	WuiDom.call(this, 'div', { className: 'WorldMapTooltip' });

	// common part
	this.coordinates = this.createChild('div');
	this.subAreaName = this.createChild('div');

	// when hovering a map with no icons
	this.subArea = this.createChild('div', { className: 'subArea' });
	this.level = this.subArea.createChild('div');
	this.alliance = this.subArea.createChild('div', { className: 'alliance' });
	this.allianceEmblem = this.alliance.appendChild(new EmblemLogo({ width: 28, height: 28 }));
	this.allianceName = this.alliance.createChild('div');

	// when hovering some content
	this.icons = this.createChild('div', { className: 'icons' });
}
inherits(WorldMapTooltip, WuiDom);
module.exports = WorldMapTooltip;

WorldMapTooltip.prototype.setCoordinates = function (i, j) {
	this.coordinates.setText(getText('ui.common.coordinatesSmall') + ' ' +  i + ',' + j);
};

WorldMapTooltip.prototype.displayIcons = function () {
	this.icons.show();
	this.subArea.hide();
};

WorldMapTooltip.prototype.setIcons = function (icons, iconsSprite) {
	this._icons = icons;
	this.icons.clearContent();
	for (var i = 0, len = icons.length; i < len; i += 1) {
		this.icons.appendChild(new TooltipIcon(icons[i], iconsSprite));
	}
};

WorldMapTooltip.prototype.unsetAlliance = function () {
	this.alliance.hide();
};

WorldMapTooltip.prototype.setAlliance = function (alliance) {
	this.allianceName.setText(alliance.allianceName + ' [' + alliance.allianceTag + ']');
	this.allianceEmblem.setValue(alliance.allianceEmblem, true);
	this.alliance.show();
};

WorldMapTooltip.prototype.unsetSubArea = function () {
	this.subAreaName.hide();
};

WorldMapTooltip.prototype.displayCoordinates = function () {
	this.subAreaName.hide();
	this.icons.hide();
	this.subArea.hide();
};

WorldMapTooltip.prototype.setSubArea = function (subArea) {
	this.subAreaName.setText(subArea.nameId);
	this.level.setText(getText('ui.common.averageLevel') + ' ' + subArea.level);
	this.subAreaName.show();
};

WorldMapTooltip.prototype.displaySubArea = function () {
	this.icons.hide();
	this.subArea.show();
};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/WorldMapTooltip/index.js
 ** module id = 408
 ** module chunks = 0
 **/