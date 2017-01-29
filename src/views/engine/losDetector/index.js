/** @module losDetector */
var mapPoint           = require('mapPoint');
var getMapPointFromCellId = mapPoint.getMapPointFromCellId;

/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @method module:losDetector.getCellDistance
 * @desc   Get the distance, in cell, between two cells.
 *
 * @param {number} a - cell id
 * @param {number} b - cell id
 *
 * @return {number} distance in cell
 */
function getCellDistance(a, b) {
	var coordA = getMapPointFromCellId(a);
	var coordB = getMapPointFromCellId(b);
	var distance = Math.abs(coordA.x - coordB.x) + Math.abs(coordA.y - coordB.y);
	return distance;
}

module.exports.getCellDistance = getCellDistance;


/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @method module:losDetector.getDistance
 * @desc   Get the distance, between two cells
 *
 * @param {number} a - cell id
 * @param {number} b - cell id
 *
 * @return {number} distance
 */
function getDistance(a, b) {
	var coordA = getMapPointFromCellId(a);
	var coordB = getMapPointFromCellId(b);
	var dx = coordA.x - coordB.x;
	var dy = coordA.y - coordB.y;
	var distance = Math.sqrt(dx * dx + dy * dy);
	return distance;
}

module.exports.getDistance = getDistance;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/losDetector/index.js
 ** module id = 1053
 ** module chunks = 0
 **/