var mapPoint  = require('mapPoint');
var constants = require('constants');
var Line      = require('Line');

var GRID_ALTITUDE_OFFSET = constants.GRID_ALTITUDE_OFFSET;
var CELL_WIDTH           = constants.CELL_WIDTH;
var CELL_HEIGHT          = constants.CELL_HEIGHT;
var POST_H_OFFSET        = 0.325;
var POST_V_OFFSET        = 1.338;
var FIRST_CELL_OFFSET    = 20.225;
var HORIZONTAL_OFFSET    = constants.HORIZONTAL_OFFSET - CELL_WIDTH  / 2 - POST_H_OFFSET;
var VERTICAL_OFFSET      = constants.VERTICAL_OFFSET   - CELL_HEIGHT / 2 - POST_V_OFFSET;
var SQRT2                = Math.sqrt(2);
var SQRT2_OVER2          = SQRT2 / 2;
var CELL_WIDTH_SCALE     = SQRT2 / CELL_WIDTH;
var CELL_HEIGHT_SCALE    = SQRT2 / CELL_HEIGHT;


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Return coordinates in Scene space form a point in mapPoint space.
 *
 * @param {number[]} coords - the two coordinates i, j of cell in mapPoint space
 */
function getCoordinateSceneFromGrid(coords) {
	var i = SQRT2_OVER2 * (coords[0] - FIRST_CELL_OFFSET);
	var j = SQRT2_OVER2 * coords[1];
	var x = (i + j) / CELL_WIDTH_SCALE + HORIZONTAL_OFFSET;
	var y = (j - i) / CELL_HEIGHT_SCALE + VERTICAL_OFFSET;
	x = ~~Math.round(x);
	y = ~~Math.round(y * 2) / 2 - GRID_ALTITUDE_OFFSET;
	return { x: x, y: y };
}


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Add an edge in the polygon edge list.
 *  If edge id already exist, they cancel, since edge is inside the polygon.
 *
 * @param {string} edgeId - edge id
 * @param {Object} edges  - the current list of edges
 */
function addEdge(edgeId, edges) {
	if (edges[edgeId]) {
		delete edges[edgeId];
	} else {
		edges[edgeId] = true;
	}
}


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Add the edges of a cell to the list of edges.
 *  An edge id is defined by the coordinate of bottom cell (horizontal) or right cell (vertical).
 *  Id is a string formated like: "x:y:H" or "x:y:V" where x and y are coordinate of cell.
 *
 * @param {number} cellId - cell id
 * @param {Object} edges  - the current list of edges
 */
function addCellEdges(cellId, edges) {
	var mp = mapPoint.getMapPointFromCellId(cellId);

	addEdge(mp.x + ':' + mp.y + ':H', edges); // top edge
	addEdge((mp.x + 1) + ':' + mp.y + ':V', edges); // right edge
	addEdge(mp.x + ':' + (mp.y + 1) + ':H', edges); // bottom edge
	addEdge(mp.x + ':' + mp.y + ':V', edges); // left edge
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** From a list of cell ids, return a list of lines that outline the zone covered by cells.
 *
 * @param {number[]} cells - list of cell ids
 *
 * @return {Array[]} an array of lines
 */
function getZoneOutlines(cells) {
	// get edges of all cells
	var edges = {};
	for (var c = 0; c < cells.length; c++) {
		addCellEdges(cells[c], edges);
	}
	edges = Object.keys(edges);

	// compute vertices coordinates
	var lines = [];
	for (var e = 0; e < edges.length; e++) {
		var edge = edges[e].split(':');
		edge[0] = ~~edge[0];
		edge[1] = ~~edge[1];

		var edgePoint1 = getCoordinateSceneFromGrid(edge);

		if (edge[2] === 'H') {
			edge[0] += 1;
		} else {
			edge[1] += 1;
		}

		var edgePoint2 = getCoordinateSceneFromGrid(edge);
		lines.push(new Line(edgePoint1.x, edgePoint1.y, edgePoint2.x, edgePoint2.y));
	}

	return lines;
}

module.exports.getZoneOutlines = getZoneOutlines;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/Zone/outline.js
 ** module id = 1021
 ** module chunks = 0
 **/