var SpriteBox  = require('SpriteBox');
var Sprite     = require('Sprite');
var inherits   = require('util').inherits;
var constants  = require('constants');
var atouin     = require('atouin');
var Box        = require('Box');

var CELL_WIDTH           = constants.CELL_WIDTH;
var CELL_HEIGHT          = constants.CELL_HEIGHT;
var CELL_HALF_WIDTH      = CELL_WIDTH / 2;
var CELL_HALF_HEIGHT     = CELL_HEIGHT / 2;

// The GridFeedbackOverlay is a single sprite.
// It draws the result state of all of the spriteboxes it contains.
// All spriteboxes get a chunk of the GridFeedbackOverlays's vertex buffer.
// SpriteBox transforms are all calculated internally, in SpriteBox.

function GridFeedbackOverlay() {
	var params = {
		scene: window.isoEngine.mapScene,
		position: 1,
		hue: [0.0, 0.0, 0.0, 0.0],
		layer: -1,
		id: 'gridFeedbackOverlay'
	};
	Sprite.call(this, params);
	this._bbox = [Infinity, -Infinity, Infinity, -Infinity];  // is often directly controlled by GridAnimator
	this._boxByteSize = this.renderer.getNbBytesPerBox();
	this.createGrid();
	this.forceRefresh();

	this._updated = false;
}
inherits(GridFeedbackOverlay, Sprite);
module.exports = GridFeedbackOverlay;

GridFeedbackOverlay.prototype.createGrid = function () {
	this.spriteBoxes = [];
	this._vertexBuffer = new ArrayBuffer(constants.NB_CELLS * this._boxByteSize);
	for (var cellId = 0; cellId < constants.NB_CELLS; cellId++) {
		var coord = atouin.cellCoord[cellId];
		var x0 = coord.x;
		var x1 = x0 - CELL_HALF_WIDTH;
		var x2 = x0 + CELL_HALF_WIDTH;
		var y0 = coord.y - constants.GRID_ALTITUDE_OFFSET;
		var y1 = y0 + CELL_HALF_HEIGHT;
		var y2 = y0 + CELL_HEIGHT;

		var box = new Box(x0, y0, x2, y1, x0, y2, x1, y1); // wacky use of x y notation.
		//bbox is handled by GridAnimator
		var arrayOffset = cellId * this._boxByteSize;
		var vertexBuffer = new Float32Array(this._vertexBuffer, arrayOffset, this._boxByteSize / 4);
		var colorBuffer = new Uint32Array(this._vertexBuffer, arrayOffset, this._boxByteSize / 4);
		var spriteBox = new SpriteBox(cellId, box, vertexBuffer, colorBuffer, this);
		this.spriteBoxes[spriteBox.cellId] = spriteBox;
	}
};

//TODO: do this faster
//TODO: only do for visible boxes
GridFeedbackOverlay.prototype._expandToFitPoint = function (x, y) {
	// x1, x2, y1, y2 format
	if (this._bbox[0] > x) {
		this._bbox[0] = x;
	}

	if (this._bbox[1] < x) {
		this._bbox[1] = x;
	}

	if (this._bbox[2] > y) {
		this._bbox[2] = y;
	}

	if (this._bbox[3] < y) {
		this._bbox[3] = y;
	}
};

GridFeedbackOverlay.prototype._expandToFitBox = function (box) {
	this._expandToFitPoint(box.x0, box.y0);
	this._expandToFitPoint(box.x1, box.y1);
	this._expandToFitPoint(box.x2, box.y2);
	this._expandToFitPoint(box.x3, box.y3);
};

GridFeedbackOverlay.prototype.draw = function () {
	this.renderer.drawBoxBatch(this.id);
};

// we have to override this because we handle our own transforms
GridFeedbackOverlay.prototype.render = function () {
	this.renderer.save();
	// Rendering
	this.draw(this.renderer);
	this.renderer.restore();
};

GridFeedbackOverlay.prototype.remove = function () {
	// never remove
};

GridFeedbackOverlay.prototype.generateCurrentFrameData = function () {
	if (this._updated) {
		this.renderer.releaseBuffer(this.id);
		this._updated = false;
	}

	// Checking whether the vertex buffer is already loaded on the GPU
	var batchData = this.renderer.getBufferData(this.id);
	if (batchData === undefined) { // batchData should never be null
		// Loading the vertex buffer onto the GPU
		var batchId      = this.id;
		var prerender    = false;
		this.renderer.loadSpriteBuffer(batchId, this._vertexBuffer, null, this._bbox, prerender);
		this.renderer.lockBuffer(this.id);
	}

	return this._bbox;
};

GridFeedbackOverlay.prototype.clear = function () {
	this.renderer.releaseBuffer(this.id);
};





/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/grid/GridFeedbackOverlay/index.js
 ** module id = 1024
 ** module chunks = 0
 **/