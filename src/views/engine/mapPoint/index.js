/** @module mapPoint */


var constants = require('constants');
var CELL_WIDTH  = constants.CELL_WIDTH;
var CELL_HEIGHT = constants.CELL_HEIGHT;

var HORIZONTAL_OFFSET = constants.HORIZONTAL_OFFSET - CELL_WIDTH;
var VERTICAL_OFFSET = constants.VERTICAL_OFFSET - CELL_HEIGHT / 2;

var FIRST_CELL_I = 19;
var FIRST_CELL_OFFSET = FIRST_CELL_I + 0.225;

var SQRT2 = Math.sqrt(2);
var SQRT2_OVER2 = SQRT2 / 2;
var CELL_WIDTH_SCALE = SQRT2 / CELL_WIDTH;
var CELL_HEIGHT_SCALE = SQRT2 / CELL_HEIGHT;

/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * Converts grid coordinate into scene coordinate
 *
 * @param   {Object} gridPos - Grid coordinate
 * @returns {Object} (x, y) - Corresponding coordinate (x, y) on the screen
 */
function getCoordinateSceneFromGrid(gridPos) {
	var i = gridPos.x - FIRST_CELL_OFFSET;
	var j = gridPos.y;
	return {
		x: (SQRT2_OVER2 * i + SQRT2_OVER2 * j) / CELL_WIDTH_SCALE + CELL_WIDTH / 2 + HORIZONTAL_OFFSET,
		y: (SQRT2_OVER2 * j - SQRT2_OVER2 * i) / CELL_HEIGHT_SCALE + VERTICAL_OFFSET
	};
}
exports.getCoordinateSceneFromGrid = getCoordinateSceneFromGrid;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Get map point coordinates from an atouin cell id.
 *
 * @param {number} cellId - Cell id
 */
function getMapPointFromCellId(cellId) {
	var row = cellId % 14 - ~~(cellId / 28);
	var x = row + 19;
	var y = row + ~~(cellId / 14);
	return { x: x, y: y };
}

exports.getMapPointFromCellId = getMapPointFromCellId;


var mapPointToCellId = {};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Construct the map function from PathFinder matrix coordinate to Atouin cell id. */
function constructMapPoints() {
	for (var cellId = 0; cellId < 560; cellId++) {
		var coord = getMapPointFromCellId(cellId);
		mapPointToCellId[coord.x + '_' + coord.y] = cellId;
	}
}

constructMapPoints();
Object.freeze(mapPointToCellId);

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Get cell id from map point
 *
 * @param {number} x - x coordinate in map space
 * @param {number} y - y coordinate in map space
 *
 * @return {number} cellId
 */
function getCellIdFromMapPoint(x, y) {
	var cellId = mapPointToCellId[x + '_' + y];
	return cellId;
}

exports.getCellIdFromMapPoint = getCellIdFromMapPoint;


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Get all neighbour of a cell
 *
 * @param {number}  cellId
 * @param {Object} [allowDiagonal]
 *
 * @return {int[]} neighbour cells ids from middle right one, then clockwise.
 */
function getNeighbourCells(cellId, allowDiagonal) {
	allowDiagonal = allowDiagonal || false;
	var coord = getMapPointFromCellId(cellId);
	var x = coord.x;
	var y = coord.y;
	var neighbours = [];
	if (allowDiagonal) { neighbours.push(getCellIdFromMapPoint(x + 1, y + 1)); }
	neighbours.push(getCellIdFromMapPoint(x, y + 1));
	if (allowDiagonal) { neighbours.push(getCellIdFromMapPoint(x - 1, y + 1)); }
	neighbours.push(getCellIdFromMapPoint(x - 1, y));
	if (allowDiagonal) { neighbours.push(getCellIdFromMapPoint(x - 1, y - 1)); }
	neighbours.push(getCellIdFromMapPoint(x, y - 1));
	if (allowDiagonal) { neighbours.push(getCellIdFromMapPoint(x + 1, y - 1)); }
	neighbours.push(getCellIdFromMapPoint(x + 1, y));
	return neighbours;
}

exports.getNeighbourCells = getNeighbourCells;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Get orientation from a source cell id to a target cell id
 *
 * @param {number}  source - source cell id. PRECONDITION source:[0..559]
 * @param {number}  target - target cell id. PRECONDITION target:[0..559] && source != target
 * @param {boolean} [allowDiagonal = false]
 *
 * @return {number} orientation, number in the range [0..7]
 */
function getOrientation(source, target, allowDiagonal) {
	var sourcePos = getMapPointFromCellId(source);
	var targetPos = getMapPointFromCellId(target);

	var orientation;
	var angle = Math.atan2(sourcePos.y - targetPos.y, targetPos.x - sourcePos.x);

	if (allowDiagonal) {
		// normalize angle as an integer in range [0..16] and convert to direction
		angle = ~~(Math.floor(8 * angle / Math.PI) + 8);
		orientation = [3, 2, 2, 1, 1, 0, 0, 7, 7, 6, 6, 5, 5, 4, 4, 3, 3][angle];
	} else {
		// normalize angle as an integer in range [0..8] and convert to direction
		angle = ~~(Math.floor(4 * angle / Math.PI) + 4);
		orientation = [3, 1, 1, 7, 7, 5, 5, 3, 3][angle];
	}

	return orientation;
}

exports.getOrientation = getOrientation;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Distance between cells, in Manhattan distance (number of cells)
 *
 * @param {Number}  source - source cell id.
 * @param {Number}  target - target cell id.
 */
function getDistance(source, target) {
	source = getMapPointFromCellId(source);
	target = getMapPointFromCellId(target);
	return Math.abs(source.x - target.x) + Math.abs(source.y - target.y);
}

exports.getDistance = getDistance;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/mapPoint/index.js
 ** module id = 624
 ** module chunks = 0
 **/