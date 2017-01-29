var AnimationTemplate = require('AnimationTemplate');
var inherits = require('util').inherits;

function AtlasAnimationTemplate(id) {
	AnimationTemplate.call(this, id);
}
inherits(AtlasAnimationTemplate, AnimationTemplate);
module.exports = AtlasAnimationTemplate;

AtlasAnimationTemplate.prototype.merge = function () {
	console.error(new Error('[AtlasAnimationTemplate.merge]' +
		'It is not possible to merge a template with an atlas template'));
};

AtlasAnimationTemplate.prototype.unmerge = function () {
	console.error(new Error('[AtlasAnimationTemplate.merge]' +
		'It is not impossible to merge a template with an atlas template and therefore to unmerge'));
};

AtlasAnimationTemplate.prototype.generateTemplate = function (textureHandle, animationHandle) {
	this.animationHandle = animationHandle;

	this.texture = textureHandle;
	this.symbols = animationHandle.element;

	var symbolIds = Object.keys(this.symbols);
	for (var i = 0; i < symbolIds.length; i += 1) {
		var symbol = this.symbols[symbolIds[i]];
		if (symbol.className) {
			this.exposedSymbols[symbol.className] = symbol;
		}
	}

	this.isEmpty = (symbolIds.length === 0);
};

function Sprite(texture, vertexPos, textureCoord, color) {
	this.color        = color;
	this.texture      = texture;
	this.vertexPos    = vertexPos;
	this.textureCoord = textureCoord;
}

// N.B Code of AtlasAnimationTemplate.prepareAnimationFrame could be simplified
//     using the AtlasAnimationTemplate.createSprites method but it would have
//     a non-neglectable impact on performance as transformations
//     would have to be applied on each sprite vertex
AtlasAnimationTemplate.prototype.prepareAnimationFrame = function (animationName, frame, tints, scaleX, scaleY) {
	var symbol = this.getSymbol(animationName);
	if (!symbol) {
		console.warn('Symbol ' + animationName + ' not registered in character\'s template');
		return [];
	}

	if (symbol.isAnim) {
		var frames = symbol.frames;
		if (frame >= 0 && frame <= frames.length) {
			symbol = frames[frame];
		}
	}

	var vertexPos = symbol.vertexPos;

	var x0 = vertexPos[0] * scaleX;
	var y0 = vertexPos[1] * scaleY;
	var x1 = vertexPos[2] * scaleX;
	var y1 = vertexPos[3] * scaleY;

	var colorMatrix = [1, 1, 1, 1, 0, 0, 0, 0];
	var vertices = [x0, y0, x1, y0, x0, y1, x1, y1];

	var sprite = new Sprite(symbol.texture, vertices, symbol.textureCoord, colorMatrix);
	return [sprite];
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/AtlasAnimationTemplate/index.js
 ** module id = 258
 ** module chunks = 0
 **/