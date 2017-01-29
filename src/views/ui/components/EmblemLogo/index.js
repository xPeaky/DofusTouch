require('./styles.less');
var addTooltip = require('TooltipBox').addTooltip;
var assetPreloading = require('assetPreloading');
var Canvas = require('Canvas');
var getText = require('getText').getText;
var helper = require('helper');
var inherits = require('util').inherits;

// default brightest color in the default background
var r = 227;
var g = 223;
var b = 189;

var SYMBOL_SCALE = 0.5;
var CROWN_SCALE = 0.35;

function EmblemLogo(options) {
	options = options || {};

	Canvas.call(this, { className: 'EmblemLogo' });
	this.addClassNames(options.className);

	var self = this;
	this.width = options.width || 100;
	this.height = options.height || 100;

	this.images = {
		crownImage: null,
		backgroundShape: null,
		symbolShape: null
	};

	this.symbolWidth = Math.round(this.width * SYMBOL_SCALE);
	this.symbolHeight = Math.round(this.height * SYMBOL_SCALE);
	this.symbolPosX = Math.round((this.width - this.symbolWidth) / 2);
	this.symbolPosY = Math.round((this.height - this.symbolHeight) / 2);

	this.crownWidth = Math.round(this.width * CROWN_SCALE);
	this.crownHeight = Math.round(this.height * CROWN_SCALE);
	this.crownPosX = 0;
	this.crownPosY = 0;

	// canvas element for temporary drawing
	var tempCanvas = new Canvas();
	tempCanvas.width = this.width;
	tempCanvas.height = this.height;
	this.tempCtx = tempCanvas.getContext();

	addTooltip(this, function () {
		if (!self.isLeader) { return; }
		return getText('ui.guild.right.leader');
	});
}

inherits(EmblemLogo, Canvas);
module.exports = EmblemLogo;

EmblemLogo.prototype._generateEmblem = function () {
	var images = this.images;
	if (!images.backgroundShape || !images.symbolShape) { return; }

	var ctx = this.getContext();
	var tempCtx = this.tempCtx;

	ctx.clearRect(0, 0, this.width, this.height);
	ctx.drawImage(images.backgroundShape, 0, 0, this.width, this.height);

	var i, backgroundColor = this.backgroundColor;

	if (backgroundColor) {
		var background = ctx.getImageData(0, 0, this.width, this.height);
		var bgPixel = background.data;

		var tintR = backgroundColor[0] / r;
		var tintG = backgroundColor[1] / g;
		var tintB = backgroundColor[2] / b;

		for (i = 0; i < bgPixel.length; i += 4) {
			bgPixel[i] *= tintR;
			bgPixel[i + 1] *= tintG;
			bgPixel[i + 2] *= tintB;
		}

		ctx.putImageData(background, 0, 0);
	}

	tempCtx.clearRect(0, 0, this.width, this.height);
	tempCtx.drawImage(images.symbolShape, this.symbolPosX, this.symbolPosY, this.symbolWidth, this.symbolHeight);

	var symbolColor = this.symbolColor;

	if (symbolColor) {
		var symbol = tempCtx.getImageData(0, 0, this.width, this.height);
		var symbolPixel = symbol.data;

		for (i = 0; i < symbolPixel.length; i += 4) {
			if (symbolPixel[i + 3] === 0) { continue; }

			symbolPixel[i] = symbolColor[0];
			symbolPixel[i + 1] = symbolColor[1];
			symbolPixel[i + 2] = symbolColor[2];
		}

		tempCtx.putImageData(symbol, 0, 0);
	}

	ctx.drawImage(tempCtx.canvas, 0, 0, this.width, this.height);

	if (this.isLeader) {
		ctx.drawImage(images.crownImage, this.crownPosX, this.crownPosY, this.crownWidth, this.crownHeight);
	}
};

EmblemLogo.prototype.setValue = function (options, dec2rgb, callback) {
	var self = this;
	var imageToLoad = [];
	var ids = [];

	dec2rgb = dec2rgb || options.dec2rgb;

	if (options.hasOwnProperty('guild')) {
		dec2rgb = true;
		this.isLeader = options.guild.allianceLeader;
		options = options.guild.guildEmblem;
	}

	if (options.hasOwnProperty('backgroundColor')) {
		this.backgroundColor = dec2rgb ?
			helper.hexToRgb((+options.backgroundColor).toString(16)) : options.backgroundColor;
	}

	if (options.hasOwnProperty('symbolColor')) {
		this.symbolColor = dec2rgb ?
			helper.hexToRgb((+options.symbolColor).toString(16)) : options.symbolColor;
	}

	if (options.hasOwnProperty('backgroundShape')) {
		var backgroundShape = 'gfx/emblems/icons/' +
			(options.isAlliance ? 'backalliance' : 'back') + '/' + options.backgroundShape + '.png';
		imageToLoad.push(backgroundShape);
		ids.push('backgroundShape');
	}

	if (options.hasOwnProperty('symbolShape')) {
		var symbolShape = 'gfx/emblems/icons/up/' + options.symbolShape + '.png';
		imageToLoad.push(symbolShape);
		ids.push('symbolShape');
	}

	if (this.isLeader && !this.images.crownImage) {
		imageToLoad.push('ui/tx_crown.png');
		ids.push('crownImage');
	}

	assetPreloading.loadImages(imageToLoad, null, function (images) {
		if (!self || !self.rootElement) {
			// the component has been destroy
			if (typeof callback === 'function') {
				callback();
			}
			return;
		}

		for (var i = 0; i < ids.length; i += 1) {
			self.images[ids[i]] = images[i];
		}

		self._generateEmblem();
		if (typeof callback === 'function') {
			callback();
		}
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/EmblemLogo/index.js
 ** module id = 288
 ** module chunks = 0
 **/