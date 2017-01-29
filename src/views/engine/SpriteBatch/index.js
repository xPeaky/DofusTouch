var inherits       = require('util').inherits;
var Sprite         = require('Sprite');
var SpriteAbstract = require('SpriteAbstract');

var LAST_CELL_POSITION = require('constants').NB_CELLS;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** @class SpriteBatch
 *
 * @param {Object} params - properties of the icon batch
 */
function SpriteBatch(params) {
	Sprite.call(this, params);

	this._updatedSprites = [];
	this._atlasTexture = null;

	// Size of an icon in bytes, in the vertex buffer
	this._spriteByteSize = this.renderer.getNbBytesPerSprite();

	// Vertex buffer
	this._vertexBuffer = null;
	this._floatView    = null;
	this._longView     = null;

	// Graphics composing the batch
	this._sprites = [];

	this._vertexBufferCreated = false;

	// Position in the vertex buffer where elements are for a given z-index position
	this._vertexBufferIndexPerPosition = new Array(LAST_CELL_POSITION + 1);
}
inherits(SpriteBatch, Sprite);
module.exports = SpriteBatch;

SpriteBatch.prototype.holdsStatics = true;

SpriteBatch.prototype.setTexture = function (texture) {
	this._atlasTexture = texture;
	this._updatedSprites.push(this);
	this.forceRefresh();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Custom render method for icon batch, renders all the icons with a fixed scale regardless of zoom level
 */
SpriteBatch.prototype.draw = function (fromElement, toElement) {
	if (this._atlasTexture === null) {
		return;
	}

	if (fromElement.layer > this.layer || toElement.layer < this.layer) {
		return;
	}

	var fromPosition;
	if (fromElement.layer < this.layer) {
		fromPosition = 0;
	} else {
		fromPosition = Math.round(fromElement.position);
		if (fromPosition < 0) {
			fromPosition = 0;
		} else if (fromPosition > LAST_CELL_POSITION) {
			fromPosition = LAST_CELL_POSITION;
		}
	}

	var toPosition;
	if (toElement.layer > this.layer) {
		toPosition = LAST_CELL_POSITION;
	} else {
		toPosition = Math.round(toElement.position);
		if (toPosition < 0) {
			toPosition = 0;
		} else if (toPosition > LAST_CELL_POSITION) {
			toPosition = LAST_CELL_POSITION;
		}
	}

	var fromVertex = this._vertexBufferIndexPerPosition[fromPosition];
	var toVertex   = this._vertexBufferIndexPerPosition[toPosition];
	if (fromVertex !== toVertex) {
		this.renderer.drawSpriteSubBatch(this.id, fromVertex, toVertex);
	}
};

function SpriteStatic(graphicData, graphicInAtlas, batch) {
	SpriteAbstract.call(this, graphicData);

	this.batch    = batch;
	this.renderer = batch.renderer;

	// Computing position of the 4 corners of the graphic on the scene
	var cx = graphicData.cx || 0;
	var cy = graphicData.cy || 0;

	var x = graphicData.x;
	var y = graphicData.y;

	var sx = graphicData.sx || 1;
	var sy = graphicData.sy || 1;

	var w = graphicData.cw;
	var h = graphicData.ch;

	var x0 = -cx * sx;
	var y0 = -cy * sy;

	var x1 = (w - cx) * sx;
	var y1 = -cy * sy;

	var x2 = -cx * sx;
	var y2 = (h - cy) * sy;

	var x3 = (w - cx) * sx;
	var y3 = (h - cy) * sy;

	var rotation = graphicData.rotation || 0;
	if (rotation !== 0) {
		var cos = Math.cos(rotation);
		var sin = Math.sin(rotation);

		var x0tmp = x0;
		var x1tmp = x1;
		var x2tmp = x2;
		var x3tmp = x3;

		x0 = x0 * cos - y0 * sin;
		y0 = x0tmp * sin + y0 * cos;

		x1 = x1 * cos - y1 * sin;
		y1 = x1tmp * sin + y1 * cos;

		x2 = x2 * cos - y2 * sin;
		y2 = x2tmp * sin + y2 * cos;

		x3 = x3 * cos - y3 * sin;
		y3 = x3tmp * sin + y3 * cos;
	}

	this.x0 = x0 + x;
	this.y0 = y0 + y;

	this.x1 = x1 + x;
	this.y1 = y1 + y;

	this.x2 = x2 + x;
	this.y2 = y2 + y;

	this.x3 = x3 + x;
	this.y3 = y3 + y;

	// Computing bounding box of the graphic
	this.bbox[0] = Math.min(this.x0, this.x1, this.x2, this.x3);
	this.bbox[1] = Math.max(this.x0, this.x1, this.x2, this.x3);
	this.bbox[2] = Math.min(this.y0, this.y1, this.y2, this.y3);
	this.bbox[3] = Math.max(this.y0, this.y1, this.y2, this.y3);

	// Position of the graphic in the atlas texture
	this.graphicInAtlas = graphicInAtlas;

	this.spriteIndex = 0;
}
inherits(SpriteStatic, SpriteAbstract);

SpriteStatic.prototype.isWithinBounds = function (x, y) {
	return (this.bbox[0] <= x) && (x <= this.bbox[1]) && (this.bbox[2] <= y) && (y <= this.bbox[3]);
};

SpriteStatic.prototype.render = function () {
	if (this.batch._atlasTexture === null) {
		return;
	}

	this.renderer.drawSpriteSubBatch(this.batch.id, this.spriteIndex * 6, this.spriteIndex * 6 + 6);
};

SpriteStatic.prototype.forceRefresh = function () {
	if (this.isOutdated === false) {
		this.isOutdated = true;
		this.batch._updatedSprites.push(this);
		this.batch.forceRefresh();
	}
};

SpriteBatch.prototype.addSprite = function (spriteData, graphicInAtlas) {
	var sprite = new SpriteStatic(spriteData, graphicInAtlas, this);
	this._sprites.push(sprite);
	return sprite;
};

SpriteBatch.prototype.finalize = function (atlasWidth, atlasHeight) {
	this._createVertexBuffer(atlasWidth, atlasHeight);
	this._updatedSprites.push(this);
	this.forceRefresh();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Render method of Sprite overridden for performance
 */
SpriteBatch.prototype.refreshAnimation = function (areasToRefresh) {
	this.isOutdated = false;
	if (this._updatedSprites.length === 0) {
		// animation does not need to be refreshed
		return;
	}

	for (var s = 0; s < this._updatedSprites.length; s += 1) {
		var sprite = this._updatedSprites[s];
		this._updateSpriteHighlight(sprite);
		if (areasToRefresh !== undefined) {
			areasToRefresh.push(sprite.bbox.slice());
		}
		sprite.isOutdated = false;
	}

	// Checking whether the vertex buffer is already loaded on the GPU
	var batchId   = this.id;
	var batchData = this.renderer.getBufferData(batchId);
	if (batchData === undefined) { // batchData should never be null
		var texture = this._atlasTexture;
		if (texture !== null && this._vertexBufferCreated) {
			// Loading the vertex buffer onto the GPU
			var vertexBuffer = this._floatView;
			var prerender    = false;
			this.renderer.loadSpriteBuffer(batchId, vertexBuffer, texture, this.bbox, prerender);
			this.renderer.lockBuffer(batchId);
		}
	}

	this._updatedSprites.length = 0;
};

SpriteBatch.prototype._updateSpriteHighlight = function (sprite) {
	var byteOffset   = sprite.spriteIndex * this._spriteByteSize;
	var spriteOffset = byteOffset / 4;
	var colorView    = this._longView.subarray(spriteOffset, spriteOffset + this._spriteByteSize / 4);
	var tint         = sprite.tint;

	// Clamping color components in [-128, 127]
	var cmr = Math.max(-128, Math.min(127, tint[0] * 64));
	var cmg = Math.max(-128, Math.min(127, tint[1] * 64));
	var cmb = Math.max(-128, Math.min(127, tint[2] * 64));
	var cma = Math.max(-128, Math.min(127, tint[3] * 64));

	var cm = ((cma << 24) & 0xff000000) + ((cmb << 16) & 0xff0000) + ((cmg << 8) & 0xff00) + (cmr & 0xff);

	colorView[3]  = colorView[8]  = colorView[13] = cm;
	colorView[18] = colorView[23] = colorView[28] = cm;

	this.renderer.updateVertexBuffer(this.id, colorView, byteOffset);
};

SpriteBatch.prototype._createVertexBuffer = function (atlasWidth, atlasHeight) {
	this._vertexBuffer = new ArrayBuffer(this._spriteByteSize * this._sprites.length);
	this._floatView    = new Float32Array(this._vertexBuffer);
	this._longView     = new Uint32Array(this._vertexBuffer);

	var positions     = this._floatView;
	var textCoordView = this._longView;
	var colorView     = this._longView;

	var xMin =  Infinity;
	var xMax = -Infinity;
	var yMin =  Infinity;
	var yMax = -Infinity;

	var position = 0;
	for (var s = 0; s < this._sprites.length; s += 1) {
		var sprite = this._sprites[s];
		var graphicInAtlas = sprite.graphicInAtlas;
		var spriteOffset = s * this._spriteByteSize / 4;

		sprite.spriteIndex = s;
		while (position < sprite._position) {
			this._vertexBufferIndexPerPosition[position] = s * 6;
			position += 1;
		}
		this._vertexBufferIndexPerPosition[position] = s * 6 + 6;

		// Updating bounds of sprite batch
		var bbox = sprite.bbox;
		if (bbox[0] < xMin) { xMin = bbox[0]; }
		if (bbox[1] > xMax) { xMax = bbox[1]; }
		if (bbox[2] < yMin) { yMin = bbox[2]; }
		if (bbox[3] > yMax) { yMax = bbox[3]; }

		positions[spriteOffset + 0]  = sprite.x0;
		positions[spriteOffset + 1]  = sprite.y0;

		positions[spriteOffset + 5]  = sprite.x2;
		positions[spriteOffset + 6]  = sprite.y2;

		positions[spriteOffset + 10] = sprite.x3;
		positions[spriteOffset + 11] = sprite.y3;

		positions[spriteOffset + 15] = sprite.x0;
		positions[spriteOffset + 16] = sprite.y0;

		positions[spriteOffset + 20] = sprite.x3;
		positions[spriteOffset + 21] = sprite.y3;

		positions[spriteOffset + 25] = sprite.x1;
		positions[spriteOffset + 26] = sprite.y1;

		var tx0 = (graphicInAtlas.sx / atlasWidth) * 0xffff & 0xffff;
		var ty0 = (graphicInAtlas.sy / atlasHeight) * 0xffff0000 & 0xffff0000;
		var tx1 = ((graphicInAtlas.sx + graphicInAtlas.sw) / atlasWidth) * 0xffff & 0xffff;
		var ty1 = ((graphicInAtlas.sy + graphicInAtlas.sh) / atlasHeight) * 0xffff0000 & 0xffff0000;

		textCoordView[spriteOffset + 2]  = tx0 + ty0;
		textCoordView[spriteOffset + 7]  = tx0 + ty1;
		textCoordView[spriteOffset + 12] = tx1 + ty1;
		textCoordView[spriteOffset + 17] = tx0 + ty0;
		textCoordView[spriteOffset + 22] = tx1 + ty1;
		textCoordView[spriteOffset + 27] = tx1 + ty0;

		var tint = sprite.tint;

		// Clamping color components in [-128, 127]
		var cmr = Math.max(-128, Math.min(127, tint[0] * 64));
		var cmg = Math.max(-128, Math.min(127, tint[1] * 64));
		var cmb = Math.max(-128, Math.min(127, tint[2] * 64));
		var cma = Math.max(-128, Math.min(127, tint[3] * 64));

		var cm = ((cma << 24) & 0xff000000) + ((cmb << 16) & 0xff0000) + ((cmg << 8) & 0xff00) + (cmr & 0xff);

		colorView[spriteOffset + 3]  = colorView[spriteOffset + 8]  = colorView[spriteOffset + 13] = cm;
		colorView[spriteOffset + 18] = colorView[spriteOffset + 23] = colorView[spriteOffset + 28] = cm;

		// Color addition set to 0
		colorView[spriteOffset + 4]  = colorView[spriteOffset + 9]  = colorView[spriteOffset + 14] = 0;
		colorView[spriteOffset + 19] = colorView[spriteOffset + 24] = colorView[spriteOffset + 29] = 0;
	}

	while (position <= LAST_CELL_POSITION) {
		this._vertexBufferIndexPerPosition[position] = s * 6;
		position += 1;
	}

	this.bbox[0] = xMin;
	this.bbox[1] = xMax;
	this.bbox[2] = yMin;
	this.bbox[3] = yMax;

	this._vertexBufferCreated = true;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/* Graphic batch stops being used, buffer is release */
SpriteBatch.prototype.clear = function () {
	this.renderer.releaseBuffer(this.id);

	if (this._atlasTexture) {
		this._atlasTexture.release();
	}
};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/SpriteBatch/index.js
 ** module id = 1016
 ** module chunks = 0
 **/