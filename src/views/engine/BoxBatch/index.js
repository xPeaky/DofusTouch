var inherits = require('util').inherits;
var Sprite   = require('Sprite');

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** @class BoxBatch
 *
 * @param {Object} params  - properties of the graphic
 * @param {Object} texture - position of graphic in atlas image
 */
function BoxBatch(params) {
	Sprite.call(this, params);

	this._boxes = params.boxes;
	this._boxByteSize = this.renderer.getNbBytesPerBox();
	this._bbox = [Infinity, -Infinity, Infinity, -Infinity];

	this._createVertexBuffer();
}
inherits(BoxBatch, Sprite);
module.exports = BoxBatch;

BoxBatch.prototype._createVertexBuffer = function () {
	var nBoxes = this._boxes.length;

	this._vertexBuffer = new ArrayBuffer(nBoxes * this._boxByteSize);
	this._positions    = new Float32Array(this._vertexBuffer);
	this._colorView    = new Uint32Array(this._vertexBuffer);

	var color = 0x40404040;
	for (var b = 0; b < nBoxes; b += 1) {
		var box = this._boxes[b];
		this._expandToFitBox(box);

		var boxBuffPos = b * this._boxByteSize / 4;

		// Triangle 1
		this._positions[boxBuffPos + 0] = box.x0;
		this._positions[boxBuffPos + 1] = box.y0;
		this._colorView[boxBuffPos + 3] = color;

		this._positions[boxBuffPos + 5] = box.x2;
		this._positions[boxBuffPos + 6] = box.y2;
		this._colorView[boxBuffPos + 8] = color;

		this._positions[boxBuffPos + 10] = box.x3;
		this._positions[boxBuffPos + 11] = box.y3;
		this._colorView[boxBuffPos + 13] = color;

		// Triangle 2
		this._positions[boxBuffPos + 15] = box.x0;
		this._positions[boxBuffPos + 16] = box.y0;
		this._colorView[boxBuffPos + 18] = color;

		this._positions[boxBuffPos + 20] = box.x1;
		this._positions[boxBuffPos + 21] = box.y1;
		this._colorView[boxBuffPos + 23] = color;

		this._positions[boxBuffPos + 25] = box.x2;
		this._positions[boxBuffPos + 26] = box.y2;
		this._colorView[boxBuffPos + 28] = color;
	}

	this._bbox[0] += this._x;
	this._bbox[1] += this._x;
	this._bbox[2] += this._y;
	this._bbox[3] += this._y;

	// Vertex buffer will have to be reloaded
	// Releasing the currently loaded one
	this.renderer.releaseBuffer(this.id);

	// Making sure the sprite will be updated
	this.forceRefresh();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Render method of the sprite grid consists in rendering a batch of boxes
 */
BoxBatch.prototype.draw = function () {
	this.renderer.drawBoxBatch(this.id);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Self expand bounding box to cover contents
 */
BoxBatch.prototype._expandToFitPoint = function (x, y) {
	// The bounding box is organized in
	// x1, x2, y1, y2 format
	if (this._bbox[0] > x) {
		this._bbox[0] = x;
	}

	if (this._bbox[2] > y) {
		this._bbox[2] = y;
	}

	if (this._bbox[1] < x) {
		this._bbox[1] = x;
	}

	if (this._bbox[3] < y) {
		this._bbox[3] = y;
	}
};

BoxBatch.prototype._expandToFitBox = function (box) {
	this._expandToFitPoint(box.x0, box.y0);
	this._expandToFitPoint(box.x1, box.y1);
	this._expandToFitPoint(box.x2, box.y2);
	this._expandToFitPoint(box.x3, box.y3);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Render method of Sprite overridden for performance
 */
BoxBatch.prototype.generateCurrentFrameData = function () {
	// Checking whether the vertex buffer is already loaded on the GPU
	var batchData = this.renderer.getBufferData(this.id);
	if (batchData === undefined) { // batchData should never be null
		// Loading the vertex buffer onto the GPU
		var batchId      = this.id;
		var vertexBuffer = this._positions;
		var prerender    = false;
		this.renderer.loadSpriteBuffer(batchId, vertexBuffer, null, this._bbox, prerender);
		this.renderer.lockBuffer(this.id);
	}

	return this._bbox;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/* Box batch stops being used, buffer is release */
BoxBatch.prototype.clear = function () {
	this.renderer.releaseBuffer(this.id);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/BoxBatch/index.js
 ** module id = 842
 ** module chunks = 0
 **/