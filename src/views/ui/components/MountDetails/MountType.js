require('./MountType.less');
var inherits = require('util').inherits;
var staticContent = require('staticContent');
var TooltipBox = require('TooltipBox');
var WuiDom = require('wuidom');


function genericTooltipHandler() {
	// "this" is the WuiDom
	return this.tooltipText;
}


function MountType() {
	WuiDom.call(this, 'div', { className: 'mountType' });

	this.color1 = this.createChild('div', { className: 'color' });
	this.color2 = this.createChild('div', { className: ['color', 'color2'] });

	TooltipBox.addTooltip(this, genericTooltipHandler);
}
inherits(MountType, WuiDom);
module.exports = MountType;


// lookString is like "{639||1=16766720,2=3329330,3=3329330|120}"
// in which case we want to return ["#ffd700", "#32cd32", "#32cd32"]
function parseColorsFromLook(lookString) {
	var colorString = lookString.split('|')[2];
	if (!colorString) { return []; }

	return colorString.split(',').map(function (oneColorStr) { // oneColorStr is "1=16766720"
		var colorInt = Number(oneColorStr.split('=')[1]);
		if (!colorInt && colorInt !== 0) { return null; } // Armored dragoturkey have #FFFFFF colors
		return '#' + colorInt.toString(16);
	});
}

MountType.prototype.setModel = function (model) {
	var self = this;

	staticContent.getData('Mounts', model, function (error, res) {
		if (error) { return console.error('Failed loading Mounts with id=', model); }

		var colors = parseColorsFromLook(res.look);
		self.color1.setStyle('backgroundColor', colors[0]);

		self.color2.setStyle('backgroundColor', colors[1]);
		self.color2.toggleDisplay(colors[1] !== colors[0]);

		self.tooltipText = res.nameId;
	});
};




/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/MountDetails/MountType.js
 ** module id = 665
 ** module chunks = 0
 **/