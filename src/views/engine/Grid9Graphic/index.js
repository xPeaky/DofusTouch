var inherits = require('util').inherits;
var Sprite   = require('Sprite');

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** @class */
var grid9ScaleCount = 0;
function Grid9Graphic(params) {
	params.id = 'grid9ScaleCount' + (grid9ScaleCount++);
	Sprite.call(this, params);

	this._spriteByteSize = this.renderer.getNbBytesPerSprite();
	this._bbox = [Infinity, -Infinity, Infinity, -Infinity];

	this.controlPoints = params.controlPoints;

	var c0 = this.controlPoints[0];
	var c3 = this.controlPoints[3];

	// Computing width and height
	this.w = c3.x - c0.x;
	this.h = c3.y - c0.y;

	// Computing bounding box
	this._bbox[0] = c0.x;
	this._bbox[1] = c3.x;
	this._bbox[2] = c0.y;
	this._bbox[3] = c3.y;

	this.texture = params.texture;
	this._createVertexBuffer();
}
inherits(Grid9Graphic, Sprite);
module.exports = Grid9Graphic;

Grid9Graphic.prototype._populateSpriteVertexBuffer = function (spriteIndex, x0, u0, x1, u1, y0, v0, y1, v1) {
	var positions     = this._floatView;
	var textCoordView = this._longView;
	var colorView     = this._longView;

	var textureWidth  = this.texture.element.width;
	var textureHeight = this.texture.element.height;

	var spriteOffset = spriteIndex * this._spriteByteSize / 4;

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

	var tx0 = (u0 / textureWidth) * 0xffff & 0xffff;
	var tx1 = (u1 / textureWidth) * 0xffff & 0xffff;

	var ty0 = (v0 / textureHeight) * 0xffff0000 & 0xffff0000;
	var ty1 = (v1 / textureHeight) * 0xffff0000 & 0xffff0000;

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

	// Unnecessary, buffer already filled with 0s by default
	// // Color addition
	// var ca = 0x00000000;
	// colorView[spriteOffset + 4]  = colorView[spriteOffset + 9]  = colorView[spriteOffset + 14] = ca;
	// colorView[spriteOffset + 19] = colorView[spriteOffset + 24] = colorView[spriteOffset + 29] = ca;
};

Grid9Graphic.prototype._createVertexBuffer = function () {
	this._vertexBuffer = new ArrayBuffer(9 * this._spriteByteSize);
	this._floatView    = new Float32Array(this._vertexBuffer);
	this._longView     = new Uint32Array(this._vertexBuffer);

	var c0 = this.controlPoints[0];
	var c1 = this.controlPoints[1];
	var c2 = this.controlPoints[2];
	var c3 = this.controlPoints[3];

	// Populating vertex buffer with 9 sprites as follow:
	// _____________________
	// |  1  |   2   |  3  |
	// _____________________
	// |  4  |   5   |  6  |
	// _____________________
	// |  7  |   8   |  9  |
	// _____________________
	this._populateSpriteVertexBuffer(0, c0.x, c0.u, c1.x, c1.u, c0.y, c0.v, c1.y, c1.v); // 1
	this._populateSpriteVertexBuffer(1, c1.x, c1.u, c2.x, c2.u, c0.y, c0.v, c1.y, c1.v); // 2
	this._populateSpriteVertexBuffer(2, c2.x, c2.u, c3.x, c3.u, c0.y, c0.v, c1.y, c1.v); // 3
	this._populateSpriteVertexBuffer(3, c0.x, c0.u, c1.x, c1.u, c1.y, c1.v, c2.y, c2.v); // 4
	this._populateSpriteVertexBuffer(4, c1.x, c1.u, c2.x, c2.u, c1.y, c1.v, c2.y, c2.v); // 5
	this._populateSpriteVertexBuffer(5, c2.x, c2.u, c3.x, c3.u, c1.y, c1.v, c2.y, c2.v); // 6
	this._populateSpriteVertexBuffer(6, c0.x, c0.u, c1.x, c1.u, c2.y, c2.v, c3.y, c3.v); // 7
	this._populateSpriteVertexBuffer(7, c1.x, c1.u, c2.x, c2.u, c2.y, c2.v, c3.y, c3.v); // 8
	this._populateSpriteVertexBuffer(8, c2.x, c2.u, c3.x, c3.u, c2.y, c2.v, c3.y, c3.v); // 9

	// Vertex buffer will have to be reloaded
	// Releasing the currently loaded one
	this.renderer.releaseBuffer(this.id);

	// Making sure the sprite will be updated
	this.forceRefresh();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Render label in scene */
Grid9Graphic.prototype.draw = function () {
	this.renderer.drawSpriteBatch(this.id);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Render method of Sprite overridden for performance
 */
Grid9Graphic.prototype.generateCurrentFrameData = function () {
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
Grid9Graphic.prototype.clear = function () {
	this.renderer.releaseBuffer(this.id);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/Grid9Graphic/index.js
 ** module id = 1049
 ** module chunks = 0
 **/