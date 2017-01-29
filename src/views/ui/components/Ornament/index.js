require('./styles.less');
var async = require('async');
var Canvas = require('Canvas');
var EmblemLogo = require('EmblemLogo');
var inherits = require('util').inherits;
var modelLoading = require('modelLoading');
var staticContent = require('staticContent');
var WuiDom = require('wuidom');
var AlignmentSideEnum = require('AlignmentSideEnum');

var MIN_TEXT_WIDTH  = 160;
var MIN_TEXT_HEIGHT = 40;

var GUILD_FONT_SIZE = 16;
var NAME_FONT_SIZE = 16;
var TITLE_FONT_SIZE = 19;
var GUILD_FONT = GUILD_FONT_SIZE + 'px ' + 'Arial';
var NAME_FONT = NAME_FONT_SIZE + 'px ' + 'Arial';
var TITLE_FONT = TITLE_FONT_SIZE + 'px ' + 'Arial';

var TEXTBOX_MARGIN = 10;
var TEXT_MARGIN_TOP = 5;

var EMBLEM_SIZE = 40;
var EMBLEM_MARGIN = 10;
var EMBLEM_TOTAL_WIDTH = EMBLEM_SIZE + EMBLEM_MARGIN;


function Ornament(domOptions, options) {
	options = options || {};

	WuiDom.call(this, 'div', domOptions);
	this.addClassNames('Ornament');

	this._charName = null;
	this._title = null;
	this._titleId = null;
	this._ornamentId = null;
	this._ornamentAssetId = null;
	this._guild = null;
	this._gender = null;
	this._alliance = null;
	this._alignment = null;

	this._scaleFactor = options.scaleFactor || 1;

	var alignmentWingsWrapper = this.createChild('div', { className: 'alignmentWingsWrapper' });
	this._alignmentWingsContainer = alignmentWingsWrapper.createChild('div', { className: 'alignmentWingsContainer' });

	var alignmentTailWrapper = this.createChild('div', { className: 'alignmentTailWrapper' });
	this._alignmentTailContainer = alignmentTailWrapper.createChild('div', { className: 'alignmentTailContainer' });

	this._canvas = this.appendChild(new Canvas());
	this._ctx = this._canvas.getContext();

	this._width  = this._canvas.width  = 400;
	this._height = this._canvas.height = 400;

	this._guildEmblem = new EmblemLogo({ width: 40, height: 40 });
	this._allianceEmblem = new EmblemLogo({ width: 40, height: 40 });
}

inherits(Ornament, WuiDom);
module.exports = Ornament;

Ornament.prototype.setAttributes = function (attributes) {
	attributes = attributes || {};
	this._charName = attributes.hasOwnProperty('charName') ? attributes.charName : null;
	this._guild = attributes.hasOwnProperty('guild') ? attributes.guild : null;
	this._alliance = attributes.hasOwnProperty('alliance') ? attributes.alliance : null;
	this._alignment = attributes.hasOwnProperty('alignmentInfos') ? attributes.alignmentInfos : null;

	// We can pass in the ornamentAssetId or ornamentId, the component will retrieve the
	// ornamentAssetId using the ornamentId
	this._ornamentId = attributes.hasOwnProperty('ornamentId') ? attributes.ornamentId : null;
	this._ornamentAssetId = attributes.hasOwnProperty('ornamentAssetId') ? attributes.ornamentAssetId : null;

	// We can pass in the title or titleId and gender, the component will retrieve the
	// title using the titleId and gender
	this._title = attributes.hasOwnProperty('title') ? attributes.title : null;
	this._titleId = attributes.hasOwnProperty('titleId') ? attributes.titleId : null;
	this._gender = attributes.hasOwnProperty('gender') ? attributes.gender : null;
};

Ornament.prototype.changeAttributes = function (attributes) {
	attributes = attributes || {};
	for (var id in attributes) {
		if (this.hasOwnProperty('_' + id)) {
			this['_' + id] = attributes[id];
		}
	}
};

Ornament.prototype.display = function () {
	var self = this;
	var ctx  = this._ctx;

	ctx.clearRect(0, 0, this._width, this._height);

	this._preload(function (error) {
		if (error) { return console.error(error); }
		self._calculateDimension();


		if (!self._ornamentAssetId || (self._alignment && self._alignment.alignmentGrade !== 0)) {
			self._resizeCanvas(self._textWidth, self._textHeight, 0, 0);
			self._displayText();
			self.emit('rendered');
			return;
		}

		self._displayTextAndOrnament();
		self.emit('rendered');
	});
};

Ornament.prototype._loadOrnament = function (callback) {
	var self = this;
	async.series([
		function getOrnamentAssetId(cb) {
			if (!self._ornamentId) {
				return cb();
			}
			staticContent.getData('Ornaments', self._ornamentId, function (error, ornamentData) {
				if (error) { return cb(error); }
				self._ornamentAssetId = ornamentData.assetId;
				cb();
			});
		},
		function loadModel(cb) {
			if (!self._ornamentAssetId) {
				return cb();
			}

			modelLoading.loadModel('ornaments', 'ornament_' + self._ornamentAssetId, function (jsonData, image) {
				self._jsonObj = jsonData;
				self._image   = image;
				cb();
			});
		}
	], callback);
};

Ornament.prototype._preload = function (callback) {
	var self = this;
	async.parallel([
		function loadOrnament(cb) {
			self._loadOrnament(cb);
		},
		function loadTitle(cb) {
			if (!self._titleId) {
				return cb();
			}
			staticContent.getData('Titles', self._titleId, function (error, titleData) {
				if (error) { return cb(error); }
				self._title = self._gender ? titleData.nameFemaleId : titleData.nameMaleId;
				cb();
			});
		},
		function loadGuildEmblem(cb) {
			if (!self._guild || !self._guild.guildEmblem) { return cb(); }
			self._guildEmblem.setValue(self._guild.guildEmblem, true, cb);
		},
		function loadAllianceEmblem(cb) {
			if (!self._alliance || !self._alliance.allianceEmblem) { return cb(); }
			self._allianceEmblem.setValue(self._alliance.allianceEmblem, true, cb);
		}
	], callback);
};

Ornament.prototype._calculateDimension = function () {
	var ctx = this._ctx;
	var widthList = [], textWidth = 0, textHeight = 0;

	ctx.font = NAME_FONT;
	this._nameWidth = ctx.measureText(this._charName).width;
	widthList.push(this._nameWidth);

	textHeight = NAME_FONT_SIZE;

	if (this._guild) {
		var guildText = this._guild.guildName;
		ctx.font = GUILD_FONT;
		this._guildNameWidth = ctx.measureText(guildText).width;
		widthList.push(this._guildNameWidth + EMBLEM_TOTAL_WIDTH);
		widthList.push(this._nameWidth + EMBLEM_TOTAL_WIDTH);

		textHeight += TEXT_MARGIN_TOP + GUILD_FONT_SIZE;
	}

	if (this._alliance) {
		widthList.push(this._guildNameWidth + (2 * EMBLEM_TOTAL_WIDTH));
		widthList.push(this._nameWidth + (2 * EMBLEM_TOTAL_WIDTH));
	}

	if (this._title) {
		ctx.font   = TITLE_FONT;
		var titleText  = '<< ' + this._title + ' >>';
		var titleWidth = ctx.measureText(titleText).width;
		widthList.push(titleWidth);

		textHeight += TEXT_MARGIN_TOP + TITLE_FONT_SIZE;
	}

	textWidth = Math.max.apply(null, widthList) + (TEXTBOX_MARGIN * 2);
	textHeight += (TEXTBOX_MARGIN * 2);

	textWidth = Math.round(textWidth);
	textHeight = Math.round(textHeight);

	this._textWidth = Math.max(textWidth, MIN_TEXT_WIDTH);
	this._textHeight = Math.max(textHeight, MIN_TEXT_HEIGHT);
	this._diffWidth = this._textWidth - MIN_TEXT_WIDTH;
	this._diffHeight = this._textHeight - MIN_TEXT_HEIGHT;
};

Ornament.prototype._displayText = function () {
	var self = this;
	var ctx = this._ctx;

	var textWidth = this._textWidth;
	var textHeight = this._textHeight;

	// text background
	ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';

	var radius = 5;
	ctx.beginPath();
	ctx.moveTo(radius, 0);
	ctx.lineTo(textWidth - radius, 0);
	ctx.quadraticCurveTo(textWidth, 0, textWidth, radius);
	ctx.lineTo(textWidth, textHeight - radius);
	ctx.quadraticCurveTo(textWidth, textHeight, textWidth - radius, textHeight);
	ctx.lineTo(radius, textHeight);
	ctx.quadraticCurveTo(0, textHeight, 0, textHeight - radius);
	ctx.lineTo(0, radius);
	ctx.quadraticCurveTo(0, 0, radius, 0);
	ctx.closePath();
	ctx.fill();

	ctx.textAlign = 'center';

	var maxTextWidth = Math.max(this._guildNameWidth || 0, this._nameWidth);
	var totalWidth = maxTextWidth + (this._guild ? EMBLEM_TOTAL_WIDTH : 0) + (this._alliance ? EMBLEM_TOTAL_WIDTH : 0);
	var halfMaxTextWidth = Math.round(maxTextWidth / 2);

	// calculate the starting position of the text
	var x = Math.round((textWidth - totalWidth) / 2) + (this._guild ? EMBLEM_TOTAL_WIDTH : 0);
	var y = TEXTBOX_MARGIN;

	if (this._guild) {
		var guildText = this._guild.guildName;
		ctx.font = GUILD_FONT;
		ctx.fillStyle = '#ffffff';
		y += GUILD_FONT_SIZE;
		ctx.fillText(guildText, x + halfMaxTextWidth, y);
		y += TEXT_MARGIN_TOP;
	}

	if (this._charName) {
		ctx.font = NAME_FONT;
		ctx.fillStyle = '#ffffff';
		y += NAME_FONT_SIZE;
		ctx.fillText(this._charName, x + halfMaxTextWidth, y);
		y += TEXT_MARGIN_TOP;
	}

	if (this._title) {
		ctx.font = TITLE_FONT;
		ctx.fillStyle = '#00B346';
		var titleText  = '<< ' + this._title + ' >>';
		y += TITLE_FONT_SIZE;
		ctx.fillText(titleText, Math.round(textWidth / 2), y);
	}

	if (this._guild) {
		ctx.drawImage(this._guildEmblem.getContext().canvas, x - EMBLEM_TOTAL_WIDTH, TEXTBOX_MARGIN, 40, 40);
	}

	if (this._alliance) {
		ctx.drawImage(this._allianceEmblem.getContext().canvas, x + maxTextWidth + EMBLEM_MARGIN, TEXTBOX_MARGIN, 40, 40);
	}

	if (this._alignment &&
		this._alignment.alignmentSide !== AlignmentSideEnum.ALIGNMENT_NEUTRAL &&
		this._alignment.alignmentGrade !== 0) {
		var alignmentModule = window.gui.playerData.alignment;

		alignmentModule.getTopWings(this._alignment, function (wingsInfos) {
			self._alignmentWingsContainer.setStyles({
				backgroundImage: wingsInfos.backgroundImage,
				left: wingsInfos.left,
				top: wingsInfos.top,
				width: wingsInfos.width,
				height: wingsInfos.height
			});
		});

		alignmentModule.getBottomWings(this._alignment, function (wingsBottomInfos) {
			if (wingsBottomInfos) {
				self._alignmentTailContainer.setStyles({
					backgroundImage: wingsBottomInfos.backgroundImage,
					left: wingsBottomInfos.left,
					top: wingsBottomInfos.top,
					width: wingsBottomInfos.width,
					height: wingsBottomInfos.height
				});
			} else {
				self._alignmentTailContainer.setStyle('backgroundImage', 'none');
			}
		});
	} else {
		self._alignmentWingsContainer.setStyle('backgroundImage', 'none');
		self._alignmentTailContainer.setStyle('backgroundImage', 'none');
	}
};

Ornament.prototype._displayTextAndOrnament = function () {
	var ctx = this._ctx;
	var diffWidth = this._diffWidth;
	var diffHeight = this._diffHeight;
	var jsonObj = this._jsonObj;
	var image = this._image;
	var halfDiffWidth = Math.round(diffWidth / 2);
	var halfDiffHeight = Math.round(diffHeight / 2);

	for (var i in jsonObj.symbols) {
		var symbol = jsonObj.symbols[i];
		if (!symbol.isAnim) { continue; }

		this._resizeOrnament(symbol);

		for (var j = symbol.children.length - 1; j >= 0; j--) {
			var child = symbol.children[j];
			var graphicId = child.id;
			var graphic = jsonObj.symbols[graphicId];
			var matrixId = child.matrices[0];
			var matrix = jsonObj.matrices[matrixId];
			var m0 = matrix[0];
			var m1 = matrix[1];
			var m2 = matrix[2];
			var m3 = matrix[3];
			var m4 = matrix[4];
			var m5 = matrix[5];

			switch (child.name) {
				case 'left':
					m5 += halfDiffHeight;
					break;
				case 'right':
					m4 += diffWidth;
					m5 += halfDiffHeight;
					break;
				case 'picto':
					m4 += halfDiffWidth;
					break;
				case 'top':
					m4 += halfDiffWidth;
					break;
				case 'bottom':
					m4 += halfDiffWidth;
					m5 += diffHeight;
					break;
			}

			ctx.save();
			ctx.transform(m0, m1, m2, m3, m4, m5);
			if (child.name === 'bg') {
				// this image is the text container
				this._displayText();

				var ratioX = graphic.sw / graphic.w;
				var ratioY = graphic.sh / graphic.h;
				var lw = MIN_TEXT_WIDTH  * 0.5 - graphic.x;
				var th = MIN_TEXT_HEIGHT * 0.5 - graphic.y;
				var rw = graphic.w + graphic.x - MIN_TEXT_WIDTH  * 0.5;
				var bh = graphic.h + graphic.y - MIN_TEXT_HEIGHT * 0.5;
				// top left corner
				ctx.drawImage(
					image,
					// crop start
					graphic.sx,
					graphic.sy,
					// crop size
					lw * ratioX,
					th * ratioY,
					// position
					graphic.x,
					graphic.y,
					// size
					lw,
					th
				);
				// top right corner
				ctx.drawImage(
					image,
					// crop start
					graphic.sx + lw * ratioX,
					graphic.sy,
					// crop size
					rw * ratioX,
					th * ratioY,
					// position
					graphic.x + lw + diffWidth,
					graphic.y,
					// size
					rw,
					th
				);
				// bottom left corner
				ctx.drawImage(
					image,
					// crop start
					graphic.sx,
					graphic.sy + th * ratioY,
					// crop size
					lw * ratioX,
					bh * ratioY,
					// position
					graphic.x,
					graphic.y + th + diffHeight,
					// size
					lw,
					bh
				);
				// bottom right corner
				ctx.drawImage(
					image,
					// crop start
					graphic.sx + lw * ratioX,
					graphic.sy + th * ratioY,
					// crop size
					rw * ratioX,
					bh * ratioY,
					// position
					graphic.x + lw + diffWidth,
					graphic.y + th + diffHeight,
					// size
					rw,
					bh
				);
				// top bar
				ctx.drawImage(
					image,
					// crop start
					graphic.sx + lw * ratioX,
					graphic.sy,
					// crop size
					1 * ratioX,
					th * ratioY,
					// position
					graphic.x + lw,
					graphic.y,
					// size
					diffWidth,
					th
				);
				// bottom bar
				ctx.drawImage(
					image,
					// crop start
					graphic.sx + lw * ratioX,
					graphic.sy + th * ratioY,
					// crop size
					1 * ratioX,
					bh * ratioY,
					// position
					graphic.x + lw,
					graphic.y + th + diffHeight,
					// size
					diffWidth,
					bh
				);
				// left bar
				ctx.drawImage(
					image,
					// crop start
					graphic.sx,
					graphic.sy + th * ratioY,
					// crop size
					lw * ratioX,
					1 * ratioY,
					// position
					graphic.x,
					graphic.y + th,
					// size
					lw,
					diffHeight
				);
				// right bar
				ctx.drawImage(
					image,
					// crop start
					graphic.sx + lw * ratioX,
					graphic.sy + th * ratioY,
					// crop size
					lw * ratioX,
					1 * ratioY,
					// position
					graphic.x + lw + diffWidth,
					graphic.y + th,
					// size
					lw,
					diffHeight
				);
			} else {
				ctx.drawImage(
					image,
					// crop start
					graphic.sx,
					graphic.sy,
					// crop size
					graphic.sw,
					graphic.sh,
					// position
					graphic.x,
					graphic.y,
					// size
					graphic.w,
					graphic.h
				);
			}
			ctx.restore();
		}
	}
};

Ornament.prototype._resizeCanvas = function (w, h, tx, ty) {
	var ctx = this._ctx;
	this._width  = w * this._scaleFactor;
	this._height = h * this._scaleFactor;
	this._canvas.width  = this._width;
	this._canvas.height = this._height;
	ctx.clearRect(0, 0, this._width, this._height);
	ctx.scale(this._scaleFactor, this._scaleFactor);
	ctx.translate(tx, ty);
	this.emit('sizeChanged');
};

Ornament.prototype._resizeOrnament = function (symbol) {
	var top    =  Infinity;
	var left   =  Infinity;
	var right  = -Infinity;
	var bottom = -Infinity;
	for (var j = symbol.children.length - 1; j >= 0; j--) {
		var child = symbol.children[j];
		var graphicId = child.id;
		var graphic = this._jsonObj.symbols[graphicId];
		var matrixId = child.matrices[0];
		var matrix = this._jsonObj.matrices[matrixId];
		var x = matrix[4] + graphic.x;
		var y = matrix[5] + graphic.y;

		top    = Math.min(top, y);
		left   = Math.min(left, x);
		right  = Math.max(right, x + graphic.w);
		bottom = Math.max(bottom, y + graphic.h);
	}

	var w = Math.round(right - left + this._diffWidth);
	var h = Math.round(bottom - top + this._diffHeight);
	this._resizeCanvas(w, h, -left, -top);
};

Ornament.prototype.getHeight = function () {
	return this._height;
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/Ornament/index.js
 ** module id = 286
 ** module chunks = 0
 **/