/**
 * Holds all the information needed to animate a grid cell
 * @constructor
 * @param {number} cellId - the cell id of the target cell
 * @param {number} distanceToPlayer - the distance the target cell is from the player
 * @param {object} transformState - the final state that you want to animate to
**/
function CellInfo(cellId, distanceToPlayer, transformState) {
	this.cellId = cellId;
	this.distanceToPlayer = distanceToPlayer;
	this.transformState = transformState;
}
module.exports = CellInfo;


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/grid/CellInfo/index.js
 ** module id = 65
 ** module chunks = 0
 **/