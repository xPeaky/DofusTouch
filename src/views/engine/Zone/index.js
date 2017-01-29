var atouin    = require('atouin');
var outline   = require('./outline.js');
var constants = require('constants');
var Colors    = require('colorHelper');
var LineBatch = require('LineBatch');
var BoxBatch  = require('BoxBatch');

var GRID_ALTITUDE_OFFSET = constants.GRID_ALTITUDE_OFFSET;
var CELL_WIDTH           = constants.CELL_WIDTH;
var CELL_HEIGHT          = constants.CELL_HEIGHT;
var CELL_HALF_WIDTH      = CELL_WIDTH / 2;
var CELL_HALF_HEIGHT     = CELL_HEIGHT / 2;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** @class
 *
 * @param {number[]} cellIds         - cell ids of zone
 * @param {Object}   options         - options
 * @param {string}   options.color   - fill color
 * @param {string}   options.outline - outline color
 */
var NextZoneId = 1;
function Zone(cellIds, options) {
	options = options || {};

	// --- Class Data
	this.id         = null;
	this.outline    = options.outline || false;
	this.color      = options.color;
	this.data       = options.data || null;
	this.gfx        = null;
	this._boxBatch  = null;
	this._lineBatch = null;

	// --- Empty Zone Check
	if (!this.outline && !this.color) {
		console.error('[Zone] It is not possible to create a zone without colors and outline');
		return;
	}

	// --- Generate Visuals
	if (this.outline) {
		var lines = outline.getZoneOutlines(cellIds);
		this._lineBatch = new LineBatch({
			scene: window.isoEngine.mapScene,
			x: 0,
			y: 0,
			position: 5,
			lines: lines,
			lineWidth: 4,
			hue: Colors.anyToColorArray(this.outline),
			layer: constants.MAP_LAYER_BACKGROUND,
			id: 'zoneOutline' + NextZoneId++
		});
	}

	if (this.color) {
		var boxes = [];
		for (var i = 0; i < cellIds.length; i++) {
			var coord = atouin.cellCoord[cellIds[i]];

			var altitude = GRID_ALTITUDE_OFFSET;

			var x = coord.x;
			var y = coord.y - altitude;

			boxes.push(
				{
					x0: x,                   y0: y,
					x1: x + CELL_HALF_WIDTH, y1: y + CELL_HALF_HEIGHT,
					x2: x,                   y2: y + CELL_HEIGHT,
					x3: x - CELL_HALF_WIDTH, y3: y + CELL_HALF_HEIGHT
				}
			);
		}

		this._boxBatch = new BoxBatch({
			scene: window.isoEngine.mapScene,
			x: 0,
			y: 0,
			position: 1,
			boxes: boxes,
			hue: Colors.anyToColorArray(this.color),
			layer: constants.MAP_LAYER_BACKGROUND,
			id: 'zoneColor' + NextZoneId++
		});
	}
}

module.exports = Zone;


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** destroy zone object */
Zone.prototype.destroy = function () {
	if (this.gfx !== null) {
		this.gfx.remove();
	}
	if (this._lineBatch) {
		this._lineBatch.remove();
		this._lineBatch = null;
	}
	if (this._boxBatch) {
		this._boxBatch.remove();
		this._boxBatch = null;
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/Zone/index.js
 ** module id = 1020
 ** module chunks = 0
 **/