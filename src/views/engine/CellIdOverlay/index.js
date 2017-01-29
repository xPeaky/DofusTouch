var constants            = require('constants');
var atouin               = require('atouin');
var inherits             = require('util').inherits;
var Graphic              = require('Graphic');

var CELL_WIDTH           = constants.CELL_WIDTH;
var CELL_HEIGHT          = constants.CELL_HEIGHT;
var GRID_ALTITUDE_OFFSET = constants.GRID_ALTITUDE_OFFSET;
var CELL_HALF_WIDTH      = CELL_WIDTH / 2;

function CellIdOverlay(params) {
	Graphic.call(this, params);

	this.indexText        = document.createElement('canvas');
	this.indexText.width  = params.w;
	this.indexText.height = params.h;
	this.indexTextContext = this.indexText.getContext('2d');
	this.indexTextContext.font = '20px Verdana';
	this.indexTextContext.fillStyle = 'rgba(0,0,0,0.6)';
	this.indexTextContext.textAlign = 'center';
}
inherits(CellIdOverlay, Graphic);
module.exports = CellIdOverlay;

/**
 * @param {string} fillStyle - overRide default fillStyle, ex: 'blue'
 */
CellIdOverlay.prototype.generateOverlay = function (fillStyle) {
	this._generateOverlay(fillStyle);
};

CellIdOverlay.prototype._generateOverlay = function (fillStyle, colorCells, color) {
	var mapRenderer = window.isoEngine.mapRenderer;
	if (!mapRenderer.map || !mapRenderer.map.cells) { return; }

	var cells = mapRenderer.map.cells;
	if (typeof fillStyle === 'string') {
		this.indexTextContext.fillStyle = fillStyle;
	}

	this.indexTextContext.clearRect(0, 0, this.indexText.width, this.indexText.height);

	for (var cellId = 0; cellId < constants.NB_CELLS; cellId++) {
		var walkable = mapRenderer.isWalkable(cellId, window.background.isFightMode);
		if (!walkable) { continue; }

		var cell = cells[cellId];
		var coord = atouin.cellCoord[cellId];

		var altitude = cell.f ? cell.f + GRID_ALTITUDE_OFFSET : GRID_ALTITUDE_OFFSET; // if it has alt, add it
		var x = coord.x;
		var y = coord.y - altitude;

		if (colorCells && colorCells.indexOf(cellId) >= 0) {
			var origFillStyle = this.indexTextContext.fillStyle;
			this.indexTextContext.fillStyle = color;
			this.indexTextContext.fillText(cellId, x + CELL_HALF_WIDTH + 10, y + CELL_HEIGHT);
			this.indexTextContext.fillStyle = origFillStyle;
		} else {
			this.indexTextContext.fillText(cellId, x + CELL_HALF_WIDTH + 10, y + CELL_HEIGHT);
		}
	}

	if (this.texture) {
		this.texture.release();
	}
	this.texture = window.isoEngine.mapScene.createTexture(this.indexText);
	this.show();
};

CellIdOverlay.prototype.clear = function () {
	if (this.texture) {
		this.texture.release();
		this.texture = null;
	} else {
		console.warn('[CellIdOverlay.clear] Clearing CellIdOverlay although no texture was ever set');
	}
	this.hide();
};

/**
 * @param {array} cells - array of cellids to override color on
 * @param {string} color - canvas 2d context fillStyle
 */
CellIdOverlay.prototype.colorCells = function (cells, color) {
	this._generateOverlay(null, cells, color);
};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/CellIdOverlay/index.js
 ** module id = 1028
 ** module chunks = 0
 **/