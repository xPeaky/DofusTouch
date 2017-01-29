var constants = require('constants');

var CELL_WIDTH  = constants.CELL_WIDTH;
var CELL_HEIGHT = constants.CELL_HEIGHT;

//████████████████████████████████████████████████████████████████████████████████
//█████████████████████████████████▄ ████▄████████████████████▀███████████████████
//█▀▄▄▄▀ █▀▄▄▄▄▀█▀▄▄▄▄▀█▄ ▀▄▄▄█▀▄▄▄▀ ██▄▄ ███▄ ▀▄▄▀██▀▄▄▄▄▀██▄ ▄▄▄██▀▄▄▄▄▀█▀▄▄▄▄ █
//█ ██████ ████ █ ████ ██ █████ ████ ████ ████ ███ ██▀▄▄▄▄ ███ █████ ▄▄▄▄▄██▄▄▄▄▀█
//█▄▀▀▀▀▄█▄▀▀▀▀▄█▄▀▀▀▀▄█▀ ▀▀▀██▄▀▀▀▄ ▀█▀▀ ▀▀█▀ ▀█▀ ▀█▄▀▀▀▄ ▀██▄▀▀▀▄█▄▀▀▀▀▀█ ▀▀▀▀▄█
//████████████████████████████████████████████████████████████████████████████████
/**
 * getCellCoord - Get cell scene coordinates from id.
 *
 * @param {Number} cellId - Cell id, a number between 0 and 559
 * @return {Object} coordinates - Coordinates on scene { x: x, y: y }
 */
function getCellCoord(cellId) {
	var x = cellId % 14;
	var y = Math.floor(cellId / 14);
	x += (y % 2) * 0.5;

	return {
		x: x * CELL_WIDTH,
		y: y * 0.5 * CELL_HEIGHT
	};
}
module.exports.getCellCoord = getCellCoord;

/**
 * constructCellCoordMap - for better performances, we store all cells coordinates in memory
 *
 * @return {Array} coordinates
 */
var coordinates = [];
function constructCellCoordMap() {
	for (var i = 0; i < 560; i += 1) {
		coordinates.push(getCellCoord(i));
	}
	Object.freeze(coordinates);
	return coordinates;
}

module.exports.cellCoord = constructCellCoordMap();



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/common/atouin/index.js
 ** module id = 612
 ** module chunks = 0
 **/