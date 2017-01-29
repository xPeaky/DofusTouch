var inherits = require('util').inherits;
var Sprite   = require('Sprite');

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * @class Text sprite using a bitmap font
 *
 * @param {object} params              - params
 * @param {object} params.bitmapFont   - bitmap font to use to display the text
 * @param {string} params.text         - text to display
 * @param {string} params.fallbackText - text to display if given text is not displayable with given bitmap texture
 * @param {array}  params.color        - additive color to apply to the bitmap texture,
 *                                       in [r, g, b, a] format, with r, g, b, a within [-1, 1]
 */
var textSpriteCount = 0;
function TextSprite(params) {
	params.id = 'textSpriteCount' + (textSpriteCount++);
	Sprite.call(this, params);

	var bitmapFont = params.bitmapFont;
	this.characterDimensions = bitmapFont.dimensions;
	this.texture = bitmapFont.texture;

	this._characterByteSize = this.renderer.getNbBytesPerSprite();
	this._bbox = [Infinity, -Infinity, Infinity, -Infinity];

	// Creating vertex buffer with respect to given text
	var text = params.text;
	if (typeof text === 'number') {
		text = text.toString();
	}

	// Checking that we have all the characters in the map
	for (var i = 0; i < text.length; i += 1) {
		if (text[i] === ' ' || this.characterDimensions[text[i]]) { continue; }
		if (params.fallbackText || params.fallbackText === 0) {
			console.error(new Error('TextSprite: character ' + text[i] + ' not in bitmap font: using fallback text'));
			text = params.fallbackText;
			if (typeof text === 'number') { text = text.toString(); }
			params.fallbackText = null;
			i = -1;
		} else {
			console.error(new Error('TextSprite: character ' + text[i] + ' not in bitmap font: replacing with a "."'));
			text = text.substr(0, i) + '.' + text.substr(i + 1);
		}
	}

	// Computing text with and height
	this.textWidth  = 0;
	this.textHeight = 0;

	var spaceWidth = 30;
	var c, character, dimensions;
	for (c = 0; c < text.length; c += 1) {
		character = text[c];
		if (character === ' ') {
			this.textWidth += spaceWidth;
		} else {
			dimensions = this.characterDimensions[character];
			this.textWidth += dimensions.w;
			if (dimensions.h > this.textHeight) {
				this.textHeight = dimensions.h;
			}
		}
	}

	var offsetX = -this.textWidth  / 2;
	var offsetY = -this.textHeight / 2;

	// Computing bounding box
	this._bbox[0] = offsetX;
	this._bbox[1] = offsetX + this.textWidth;
	this._bbox[2] = offsetY;
	this._bbox[3] = offsetY + this.textHeight;

	// Computing position of each character
	this.characterPositions = [];
	for (c = 0; c < text.length; c += 1) {
		character = text[c];
		if (character === ' ') {
			offsetX += spaceWidth;
		} else {
			dimensions = this.characterDimensions[character];
			var dy = (this.textHeight - dimensions.h) / 2;
			this.characterPositions[c] = { x: offsetX, y: offsetY + dy };

			offsetX += dimensions.w;
		}
	}

	this._createVertexBuffer(text, params.color);
}
inherits(TextSprite, Sprite);
module.exports = TextSprite;

TextSprite.prototype._createVertexBuffer = function (text, color) {
	var nCharacters = text.length;

	this._vertexBuffer = new ArrayBuffer(nCharacters * this._characterByteSize);
	this._floatView    = new Float32Array(this._vertexBuffer);
	this._longView     = new Uint32Array(this._vertexBuffer);

	var positions     = this._floatView;
	var textCoordView = this._longView;
	var colorView     = this._longView;

	var textureWidth  = this.texture.element.width;
	var textureHeight = this.texture.element.height;
	for (var c = 0; c < text.length; c += 1) {
		var character = text[c];
		if (character === ' ') {
			continue;
		}

		var position = this.characterPositions[c];
		var dimensions = this.characterDimensions[character];

		var spriteOffset = c * this._characterByteSize / 4;

		var x0 = position.x;
		var x1 = position.x + dimensions.w;

		var y0 = position.y;
		var y1 = position.y + dimensions.h;

		positions[spriteOffset + 0]  = x0;
		positions[spriteOffset + 1]  = y0;

		positions[spriteOffset + 5]  = x0;
		positions[spriteOffset + 6]  = y1;

		positions[spriteOffset + 10] = x1;
		positions[spriteOffset + 11] = y1;

		positions[spriteOffset + 15] = x0;
		positions[spriteOffset + 16] = y0;

		positions[spriteOffset + 20] = x1;
		positions[spriteOffset + 21] = y1;

		positions[spriteOffset + 25] = x1;
		positions[spriteOffset + 26] = y0;

		var tx0 = (dimensions.x / textureWidth)  * 0xffff & 0xffff;
		var ty0 = (dimensions.y / textureHeight) * 0xffff0000 & 0xffff0000;
		var tx1 = ((dimensions.x + dimensions.w) / textureWidth)  * 0xffff & 0xffff;
		var ty1 = ((dimensions.y + dimensions.h) / textureHeight) * 0xffff0000 & 0xffff0000;

		textCoordView[spriteOffset + 2]  = tx0 + ty0;
		textCoordView[spriteOffset + 7]  = tx0 + ty1;
		textCoordView[spriteOffset + 12] = tx1 + ty1;
		textCoordView[spriteOffset + 17] = tx0 + ty0;
		textCoordView[spriteOffset + 22] = tx1 + ty1;
		textCoordView[spriteOffset + 27] = tx1 + ty0;

		// Color multiplication, set to 1
		var cm = 0x40404040;
		colorView[spriteOffset + 3]  = colorView[spriteOffset + 8]  = colorView[spriteOffset + 13] = cm;
		colorView[spriteOffset + 18] = colorView[spriteOffset + 23] = colorView[spriteOffset + 28] = cm;

		// Color addition

		// Clamping color components in [-128, 127]
		var car = Math.max(-128, Math.min(127, color[0] * 128));
		var cag = Math.max(-128, Math.min(127, color[1] * 128));
		var cab = Math.max(-128, Math.min(127, color[2] * 128));
		var caa = Math.max(-128, Math.min(127, color[3] * 128));

		var ca = ((caa << 24) & 0xff000000) + ((cab << 16) & 0xff0000) + ((cag << 8) & 0xff00) + (car & 0xff);
		colorView[spriteOffset + 4]  = colorView[spriteOffset + 9]  = colorView[spriteOffset + 14] = ca;
		colorView[spriteOffset + 19] = colorView[spriteOffset + 24] = colorView[spriteOffset + 29] = ca;
	}

	// Vertex buffer will have to be reloaded
	// Releasing the currently loaded one
	this.renderer.releaseBuffer(this.id);

	// Making sure the sprite will be updated
	this.forceRefresh();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Render label in scene */
TextSprite.prototype.draw = function () {
	this.renderer.drawSpriteBatch(this.id);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Render method of Sprite overridden for performance
 */
TextSprite.prototype.generateCurrentFrameData = function () {
	// Checking whether the vertex buffer is already loaded on the GPU
	var batchData = this.renderer.getBufferData(this.id);
	if (batchData === undefined) { // batchData should never be null
		// Loading the vertex buffer onto the GPU
		var vertexBuffer = this._floatView;
		var prerender    = false;
		this.renderer.loadSpriteBuffer(this.id, vertexBuffer, this.texture, this.bbox, prerender);
		this.renderer.lockBuffer(this.id);
	}

	return this._bbox;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/* Line batch stops being used, buffer is release */
TextSprite.prototype.clear = function () {
	this.renderer.releaseBuffer(this.id);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/TextSprite/index.js
 ** module id = 1042
 ** module chunks = 0
 **/