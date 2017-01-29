'use strict';

var constants = require('constants');
var mapPoint = require('mapPoint');

var CELL_WIDTH  = constants.CELL_WIDTH;
var CELL_HEIGHT = constants.CELL_HEIGHT;

var HORIZONTAL_OFFSET = constants.HORIZONTAL_OFFSET - CELL_WIDTH;
var VERTICAL_OFFSET = constants.VERTICAL_OFFSET - CELL_HEIGHT / 2;

var FIRST_CELL_I = 19;
var FIRST_CELL_OFFSET = FIRST_CELL_I + 0.225;

var SQRT2 = Math.sqrt(2);
var SQRT2_OVER2 = SQRT2 / 2;
var CELL_WIDTH_SCALE  = SQRT2 / CELL_WIDTH;
var CELL_HEIGHT_SCALE = SQRT2 / CELL_HEIGHT;

var GRID_WIDTH  = 33;
var GRID_HEIGHT = 34;

var N_CELLS_PER_ROW  = 14;
var N_CELLS_PER_ROW2 = 2 * N_CELLS_PER_ROW;

/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @class
 * @classDesc Correspond to one element in the MapGrid,
 *            stores all the cells and their relative bounds for a given cellId
 */
function GridData() {
	this.cells  = [];
	this.bounds = [];
	this.cellId = undefined;
}

/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @class
 * @classDesc Stores cells per position in the grid with respect to their height.
 *            Also contains a few methods to convert coordinates (from scene and grid positions or cell Id)
 */
function MapGrid() {
	this.grid = [];
	this.scenePositions = [];
}

module.exports = MapGrid;

/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @desc   Converts cell id into grid coordinate
 *
 * @param   {number} cellId - Cell id
 * @returns {Object} (i, j) - Corresponding coordinate in the grid
 */
MapGrid.prototype.getCoordinateGridFromCellId = function (cellId) {
	var row = cellId % N_CELLS_PER_ROW - ~~(cellId / N_CELLS_PER_ROW2);
	var i = row + FIRST_CELL_I;
	var j = row + ~~(cellId / N_CELLS_PER_ROW);

	return { i: i, j: j };
};

/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @desc   Converts grid coordinate into cell id
 *
 * @param   {Object} gridPos - Coordinate in the grid
 * @returns {number} cellId  - Corresponding cell id
 */
MapGrid.prototype.getCoordinateCellIdFromGrid = function (gridPos) {
	return this.grid[gridPos.i][gridPos.j].cellId;
};

/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @desc   Converts scene coordinate into grid coordinate
 *
 * @param   {Object} scenePos       - Scene coordinate
 * @returns {Object} (i, j, dx, dy) - Corresponding coordinate (i, j) in the grid with offset (dx, dy)
 *                                    with respect to top left corner of the cell
 */
MapGrid.prototype.getCoordinateGridFromScene = function (scenePos) {
	var x0 = (scenePos.x - HORIZONTAL_OFFSET) * CELL_WIDTH_SCALE;
	var y0 = (scenePos.y - VERTICAL_OFFSET)   * CELL_HEIGHT_SCALE;

	var x1 = SQRT2_OVER2 * x0 - SQRT2_OVER2 * y0 + FIRST_CELL_OFFSET;
	var y1 = SQRT2_OVER2 * x0 + SQRT2_OVER2 * y0;

	var i = Math.max(0, Math.min(GRID_WIDTH  - 1, ~~x1));
	var j = Math.max(0, Math.min(GRID_HEIGHT - 1, ~~y1));
	return { i: i, j: j, dx: x1 - i, dy: y1 - j };
};

/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @desc   Converts grid coordinate into scene coordinate
 *
 * @param   {Object} gridPos - Grid coordinate
 * @returns {Object} (x, y) - Corresponding coordinate (x, y) on the scene
 */
MapGrid.prototype.getCoordinateSceneFromGrid = function (gridPos) {
	var i = gridPos.i - FIRST_CELL_OFFSET;
	var j = gridPos.j;
	return {
		x: (SQRT2_OVER2 * i + SQRT2_OVER2 * j) / CELL_WIDTH_SCALE + CELL_WIDTH / 2 + HORIZONTAL_OFFSET,
		y: (SQRT2_OVER2 * j - SQRT2_OVER2 * i) / CELL_HEIGHT_SCALE + VERTICAL_OFFSET
	};
};

/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @desc   Converts cell id into scene coordinate
 *
 * @param   {number} cellId - Cell id
 * @returns {Object} (x, y) - Corresponding coordinate on the scene
 */
MapGrid.prototype.getSceneCoordinateFromCellId = function (cellId) {
	return this.getCoordinateSceneFromGrid(this.getCoordinateGridFromCellId(cellId));
};

/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @desc   Get cells at given scene coordinate.
 *         If no cell at coordinate then returns closest cell with it's distance to the scene coordinate.
 *
 * @param   {Object} scenePos     - Scene coordinate
 * @returns {Object} (cell, dist) - Corresponding cell and its distance to scene coordinate
 */
MapGrid.prototype.getCellAtSceneCoordinate = function (scenePos) {
	var gridPos = this.getCoordinateGridFromScene(scenePos);
	var gridData = this.grid[gridPos.i][gridPos.j];

	var cells = gridData.cells;
	if (cells.length === 0) {
		// No cell at given location, returning the closest one
		return this.getClosestCell(gridPos, scenePos);
	}

	var x = gridPos.dx;
	var y = gridPos.dy;
	var bounds = gridData.bounds;
	for (var c = 0, nBounds = bounds.length; c < nBounds; c += 1) {
		// iterating through bounds of cells in decreasing order of their z-index
		var bbox = bounds[c];
		if ((bbox[0] <= x) && (x <= bbox[1]) && (bbox[2] <= y) && (y <= bbox[3])) {
			return { cell: cells[c], dist: 0 };
		}
	}

	// No cell has been selected at given location
	// Returning the closest one
	return this.getClosestCell(gridPos, scenePos);
};


/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @desc   Update closestCellData with closest cell from point (x, y)
 *
 * @param   {Array} cells - All cells for a given grid position
 * @param   {Array} scenePositions - Scene coordinates per cell
 * @param   {Array} x - x component of the coordinate to get distance from
 * @param   {Array} y - y component of the coordinate to get distance from
 * @param   {Object} closestCellData - Data to update with new closest cell info if new closest cell found
 */
function updateMinDist(cells, scenePositions, x, y, closestCellData) {
	for (var c = 0; c < cells.length; c += 1) {
		var cellId = cells[c];
		var scenePos = scenePositions[cellId];
		var dx = (scenePos.x - x) * CELL_WIDTH_SCALE;
		var dy = (scenePos.y - y) * CELL_HEIGHT_SCALE;
		var dist = dx * dx + dy * dy;
		if (dist < closestCellData.dist) {
			closestCellData.dist = dist;
			closestCellData.cell = cellId;
		}
	}
}

/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @desc   Get closest cell to the given scene coordinate. Algorithm starts searching from given grid Position
 *
 * @param   {Object} gridPos - Grid coordinate
 * @param   {Object} scenePos - Scene coordinate
 * @returns {Object} (cell, dist) - Closest cell to scene coordinate and its distance to scene coordinate
 */
MapGrid.prototype.getClosestCell = function (gridPos, scenePos) {
	var i = gridPos.i;
	var j = gridPos.j;
	var x = scenePos.x;
	var y = scenePos.y;

	var k0, k1, l0, l1;
	var d = 0;
	var closestCellData = {
		cell: -1,
		dist: Infinity
	};

	while (closestCellData.cell === -1) {
		l0 = Math.max(j - d, 0);
		l1 = Math.min(j + d, GRID_HEIGHT - 1);
		k1 = Math.min(i + d, GRID_WIDTH  - 1);
		for (k0 = Math.max(i - d, 0); k0 <= k1; k0 += 1) {
			updateMinDist(this.grid[k0][l0].cells, this.scenePositions, x, y, closestCellData);
			updateMinDist(this.grid[k0][l1].cells, this.scenePositions, x, y, closestCellData);
		}

		k0 = Math.max(i - d, 0);
		k1 = Math.min(i + d, GRID_WIDTH  - 1);
		l1 = Math.min(j + d - 1, GRID_HEIGHT - 1);
		for (l0 = Math.max(j - d + 1, 0); l0 <= l1; l0 += 1) {
			updateMinDist(this.grid[k0][l0].cells, this.scenePositions, x, y, closestCellData);
			updateMinDist(this.grid[k1][l0].cells, this.scenePositions, x, y, closestCellData);
		}
		d += 1;
	}

	return closestCellData;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * Look for closest cell in a zone after a tap.
 * NB: This is used in FIGHT only => cell's altitude is not handled here.
 *
 * @param   {number} cellId - Cell tapped
 * @param   {number} x - Scene coordinate X
 * @param   {number} y - Scene coordinate Y
 * @param   {Array} zone - array of cell IDs in the zone (the list of valid cells)
 * @returns {number|null} - Closest cell ID OR null if x,y is farther than 1 cell away from any cell in the zone
 */
MapGrid.prototype.getNearbyCellInZone = function (cellId, x, y, zone) {
	if (zone[cellId] !== undefined) {
		return cellId;
	}

	var closestCell = null;
	var validNeighbours = [];
	var neighbours = mapPoint.getNeighbourCells(cellId, /*allowDiagonal=*/true);
	for (var i = 0; i < neighbours.length; i++) {
		if (neighbours[i] !== undefined && zone[neighbours[i]] !== undefined) {
			validNeighbours.push(neighbours[i]);
		}
	}

	var minDist = Infinity;
	for (i = 0; i < validNeighbours.length; i++) {
		var cell = validNeighbours[i];
		var scenePos = this.scenePositions[cell];
		var dx = (scenePos.x - x) * CELL_WIDTH_SCALE;
		var dy = (scenePos.y - y) * CELL_HEIGHT_SCALE;
		var dist = dx * dx + dy * dy;
		if (dist < minDist) {
			minDist = dist;
			closestCell = cell;
		}
	}
	return closestCell; // will be null if validNeighbours is empty
};

MapGrid.prototype.updateCellState = function (cellId, cell, previousState) {
	var newState = cell.l;
	if ((newState & 1) === 0) {
		// Shouldn't be accessible
		if ((previousState & 1) !== 0) {
			// Is accessible
			// Making it inaccessible
			this._removeCell(cellId, cell);
		}
	} else {
		// Should be accessible
		if ((previousState & 1) === 0) {
			// Is inaccessible
			// Making it accessible
			this._addCell(cellId, cell);
		}
	}
};

function removeCell(gridData, cellId) {
	var idx = gridData.cells.indexOf(cellId);
	if (idx !== -1) {
		gridData.cells.splice(idx, 1);
		gridData.bounds.splice(idx, 1);
	}
}

MapGrid.prototype._removeCell = function (cellId, cell) {
	delete this.scenePositions[cellId];

	var height = this.useAltitude && cell.f || 0;
	var gridPos = this.getCoordinateGridFromCellId(cellId);
	if (height === 0) {
		// Cell appears only in one slot in the grid
		removeCell(this.grid[gridPos.i][gridPos.j], cellId);
	} else {
		// Cell appears in up to 4 slots in the grid
		var ratio = height / CELL_HEIGHT;

		var i0 = Math.floor(gridPos.i + ratio);
		var j0 = Math.floor(gridPos.j - ratio);

		if (i0 >= GRID_WIDTH || j0 >= GRID_HEIGHT) {
			return;
		}

		var i1 = i0 + 1;
		var j1 = j0 + 1;

		if (i1 < 0 || j1 < 0) {
			return;
		}

		if (i0 >= 0) {
			if (j0 >= 0) { removeCell(this.grid[i0][j0], cellId); }
			if (j1 < GRID_HEIGHT) { removeCell(this.grid[i0][j1], cellId); }
		}

		if (i1 < GRID_WIDTH) {
			if (j0 >= 0) { removeCell(this.grid[i1][j0], cellId); }
			if (j1 < GRID_HEIGHT) { removeCell(this.grid[i1][j1], cellId); }
		}
	}
};

MapGrid.prototype._addCell = function (cellId, cell) {
	/* jslint maxstatements: 60 */
	var gridData;

	var gridPos = this.getCoordinateGridFromCellId(cellId);
	this.grid[gridPos.i][gridPos.j].cellId = cellId;

	var height = this.useAltitude && cell.f || 0;
	var scenePos = this.getCoordinateSceneFromGrid(gridPos);
	scenePos.y -= height;
	this.scenePositions[cellId] = scenePos;
	if (height === 0) {
		gridData = this.grid[gridPos.i][gridPos.j];
		gridData.cells.push(cellId);
		gridData.bounds.push([0, 1, 0, 1]);
	} else {
		var ratio = height / CELL_HEIGHT;

		var x = gridPos.i + ratio;
		var y = gridPos.j - ratio;

		var i0 = Math.floor(x);
		var j0 = Math.floor(y);

		if (i0 >= GRID_WIDTH || j0 >= GRID_HEIGHT) {
			return;
		}

		var i1 = i0 + 1;
		var j1 = j0 + 1;

		if (i1 < 0 || j1 < 0) {
			return;
		}

		var dx = x - i0;
		var dy = y - j0;

		if (i0 >= 0) {
			if (j0 >= 0) {
				gridData = this.grid[i0][j0];
				gridData.cells.push(cellId);
				gridData.bounds.push([dx, 1, dy, 1]);
			}

			if (j1 < GRID_HEIGHT) {
				gridData = this.grid[i0][j1];
				gridData.cells.push(cellId);
				gridData.bounds.push([dx, 1, 0, dy]);
			}
		}

		if (i1 < GRID_WIDTH) {
			if (j0 >= 0) {
				gridData = this.grid[i1][j0];
				gridData.cells.push(cellId);
				gridData.bounds.push([0, dx, dy, 1]);
			}

			if (j1 < GRID_HEIGHT) {
				gridData = this.grid[i1][j1];
				gridData.cells.push(cellId);
				gridData.bounds.push([0, dx, 0, dy]);
			}
		}
	}
};

/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @desc   Initializes grid with list of cells for a given cell id.
 * Each cell has a physical location on the scene with respect to the cells layout when its height is 0.
 * This algorithm computes which cells, considering their height, overlap with the physical location
 * of a cell of id 'cellId' of height 0 and store them in a grid.
 * This allows to quickly find cells at a given position (either using grid coordinates, scene coordinates or cell id).
 *
 * @param {Array} cellList - List of cells and their heights
 * @param {boolean} useAltitude - Should grid use cell altitude (grid is flatten during fight).
 */
MapGrid.prototype.initialize = function (cellList, useAltitude) {
	this.cellList = cellList;
	this.useAltitude = useAltitude;

	this.grid = [];
	this.scenePositions = [];
	for (var i = 0; i < GRID_WIDTH; i += 1) {
		var row  = new Array(GRID_HEIGHT);
		this.grid[i] = row;
		for (var j = 0; j < GRID_HEIGHT; j += 1) {
			row[j] = new GridData();
		}
	}

	for (var cellId = cellList.length - 1; cellId >= 0; cellId -= 1) {
		var cell = cellList[cellId];
		if ((cell.l & 1) === 0) {
			// Ignoring unwalkable cells (bit 1 set to 0)
			continue;
		}

		this._addCell(cellId, cell);
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/MapRenderer/MapGrid/index.js
 ** module id = 1014
 ** module chunks = 0
 **/