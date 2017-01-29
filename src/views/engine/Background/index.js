var constants            = require('constants');
var atouin               = require('atouin');
var inherits             = require('util').inherits;
var Graphic              = require('Graphic');
var Line                 = require('Line');
var Box                  = require('Box');
var LineBatch            = require('LineBatch');
var BoxBatch             = require('BoxBatch');
var GridAnimator         = require('GridAnimator');
var LightColumn          = require('LightColumn');
var Tween                = require('TINAlight').Tween;
var CellIdOverlay        = require('CellIdOverlay');

var CELL_WIDTH           = constants.CELL_WIDTH;
var CELL_HEIGHT          = constants.CELL_HEIGHT;
var GRID_ALTITUDE_OFFSET = constants.GRID_ALTITUDE_OFFSET;
var MAP_LAYER_BACKGROUND = constants.MAP_LAYER_BACKGROUND;

var CELL_HALF_WIDTH      = CELL_WIDTH / 2;
var CELL_HALF_HEIGHT     = CELL_HEIGHT / 2;

var COLOR_TACTICAL_BACKGROUND = [0, 0, 0, 1];
var COLOR_TACTICAL_TILE       = [0.569, 0.522, 0.38, 1];
var COLOR_GRID_LINE           = [0.8, 0.8, 0.8, 0.8];

/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @class Background
 * @desc  map background and grid rendering
 *
 */
function Background(params) {
	Graphic.call(this, params, params.scene.renderer.getEmptyTexture());
	this.zones   = [];

	this.displayGrid   = false;
	this.tacticalMode  = false;
	this.isFightMode   = false;

	this.gridLines     = null;
	this.tacticalBoxes = null;
	this.gridAnimator = null;
	this.isDebugMode = false;
}
inherits(Background, Graphic);
module.exports = Background;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Reset all data and clear canvas */
Background.prototype.resetAndClear = function () {
	this.displayGrid = false;
	this.isFightMode = false;
};

Background.prototype.clear = function () {
	if (this.texture) {
		this.texture.release();
		this.texture = null;
	} else {
		console.warn('[Background.clear] Clearing background although no texture was ever set');
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Release map data. This function is called when user change map, before asset preloading */
Background.prototype.releaseMap = function () {
	this.deleteAllZones();

	if (this.gridLines) {
		this.gridLines.remove();
		this.gridLines = null;
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Update map with new data
 *
 * @param {ElementHandle} bgTexture - reference to the texture handle of the background image
 */
Background.prototype.updateMap = function (bgTexture) {
	// Background graphic is kept and updated instead of being trashed, we need to reset this flag
	//   to be sure that Sprite.remove() will do his clearing job the next time the sprite removed.
	this._cleared = false;

	this.texture = bgTexture;
	this.show();
	if (!this.gridLines) { this.generateWalkableGrid(); }
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
Background.prototype.changeGameContext = function (isFightMode) {
	this.isFightMode = isFightMode;
	// force update walkable grid as walkable cells are different in fight mode
	this.generateWalkableGrid();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Toggle grid display */
Background.prototype.toggleGrid = function (visibility) {
	if (this.displayGrid === visibility) { return; }
	this.displayGrid = visibility;

	if (this.gridLines === null) { return; }

	if (visibility) {
		this.gridLines.show();
		Tween(this.gridLines, ['alpha']).to({ alpha: 1.0 }, 20).start();
	} else {
		var self = this;
		Tween(this.gridLines, ['alpha']).to({ alpha: 0.0 }, 15).start().onFinish(function () {
			if (self.gridLines) {
				self.gridLines.hide();
			}
		});
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Toggle tactic mode */
Background.prototype.toggleTacticMode = function (isTacticMode) {
	if (this.tacticalBoxes !== null) {
		if (isTacticMode) {
			this.tacticalBoxes.show();
			this.tacticalBackground.show();
			this.hide();
		} else {
			this.tacticalBoxes.hide();
			this.tacticalBackground.hide();
			this.show();
		}
	}

	this.tacticalMode = isTacticMode;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
Background.prototype.generateWalkableGrid = function () {
	if (!this.gridAnimator) {
		this.gridAnimator = new GridAnimator();
	}
	var mapRenderer = window.isoEngine.mapRenderer;
	if (!mapRenderer.map || !mapRenderer.map.cells) { return; }

	// Update line batch for grid lines
	var cells = mapRenderer.map.cells;
	var showAltitude = !this.isFightMode;

	var existingLines = {};

	var greyBoxes = [];
	var gridLines = [];
	for (var cellId = 0; cellId < constants.NB_CELLS; cellId++) {
		var walkable = mapRenderer.isWalkable(cellId, this.isFightMode);
		if (!walkable) { continue; }

		var cell = cells[cellId];
		var coord = atouin.cellCoord[cellId];

		var altitude = (showAltitude && cell.f || 0) + GRID_ALTITUDE_OFFSET;
		var x0 = coord.x;
		var x1 = x0 - CELL_HALF_WIDTH;
		var x2 = x0 + CELL_HALF_WIDTH;

		var y0 = coord.y - altitude;
		var y1 = y0 + CELL_HALF_HEIGHT;
		var y2 = y0 + CELL_HEIGHT;

		var lineId0 = x0 + '.' + y0 + '-' + x2 + '.' + y1;
		var lineId1 = x0 + '.' + y2 + '-' + x2 + '.' + y1;
		var lineId2 = x0 + '.' + y2 + '-' + x1 + '.' + y1;
		var lineId3 = x0 + '.' + y0 + '-' + x1 + '.' + y1;

		if (existingLines[lineId0] === undefined) {
			existingLines[lineId0] = true;
			gridLines.push(new Line(x0, y0, x2, y1));
		}

		if (existingLines[lineId1] === undefined) {
			existingLines[lineId1] = true;
			gridLines.push(new Line(x2, y1, x0, y2));
		}

		if (existingLines[lineId2] === undefined) {
			existingLines[lineId2] = true;
			gridLines.push(new Line(x0, y2, x1, y1));
		}

		if (existingLines[lineId3] === undefined) {
			existingLines[lineId3] = true;
			gridLines.push(new Line(x1, y1, x0, y0));
		}
		var box = new Box(x0, y0, x2, y1, x0, y2, x1, y1);
		box.cellId = cellId;

		greyBoxes.push(box);
	}

	if (this.gridLines) { this.gridLines.remove(); }
	if (this.tacticalBackground) { this.tacticalBackground.remove(); }
	if (this.tacticalBoxes) { this.tacticalBoxes.remove(); }

	this.gridLines = new LineBatch({
		scene: window.isoEngine.mapScene,
		x: 0,
		y: 0,
		position: 3,
		lines: gridLines,
		lineWidth: 2,
		hue: COLOR_GRID_LINE,
		layer: MAP_LAYER_BACKGROUND,
		id: 'combatGrid'
	});

	this.gridLines.alpha = 0.0;

	if (!this.displayGrid) {
		this.gridLines.hide();
	} else {
		this.gridLines.show();
		Tween(this.gridLines, ['alpha']).to({ alpha: 1.0 }, 20).start();
	}

	this.tacticalBackground = new BoxBatch({
		scene: window.isoEngine.mapScene,
		x: 0,
		y: 0,
		position: -4,
		boxes: [
			new Box(
				-CELL_WIDTH, -CELL_HEIGHT,
				-CELL_WIDTH, this.h,
				this.w,      this.h,
				this.w,      -CELL_HEIGHT
			)
		],
		hue: COLOR_TACTICAL_BACKGROUND,
		layer: MAP_LAYER_BACKGROUND,
		id: 'tacticalBackground'
	});

	this.tacticalBoxes = new BoxBatch({
		scene: window.isoEngine.mapScene,
		x: 0,
		y: 0,
		position: -3,
		boxes: greyBoxes,
		hue: COLOR_TACTICAL_TILE,
		layer: MAP_LAYER_BACKGROUND,
		id: 'tacticalBoxes'
	});

	if (!this.tacticalMode) {
		this.tacticalBoxes.hide();
		this.tacticalBackground.hide();
	}

	if (this.isDebugMode) {
		this.initDebugOverlay();
		this.cellIdOverlay.clear();
		this.cellIdOverlay.generateOverlay();
	}
};

Background.prototype.setGridColor = function (color) {
	this.gridLines.hue = color;
};

Background.prototype.initDebugOverlay = function () {
	if (!this.cellIdOverlay) {
		var cellIdOverlayParams = {
			scene: this.scene,
			layer: constants.MAP_LAYER_FOREGROUND,
			position: 1,
			x: -constants.HORIZONTAL_OFFSET,
			y: -constants.VERTICAL_OFFSET,
			w: constants.MAP_SCENE_WIDTH,
			h: constants.MAP_SCENE_HEIGHT,
			id: 'cellIdOverlay'
		};
		this.cellIdOverlay = new CellIdOverlay(cellIdOverlayParams);
	}
};

/**
* @param {string} fillStyle - overRide default fillStyle, ex: 'blue'
*/
Background.prototype.toggleDebugMode = function (fillStyle) {
	this.isDebugMode = !this.isDebugMode;
	this.initDebugOverlay();
	if (this.isDebugMode) {
		this.cellIdOverlay.generateOverlay(fillStyle);
	} else {
		this.cellIdOverlay.clear();
	}
};

/**
 * @param {array} cells - list of cellids
 * @param {string} color - color to change cells
 */
Background.prototype.highlightDebugCells = function (cells, color) {
	if (this.isDebugMode && this.cellIdOverlay) {
		this.cellIdOverlay.colorCells(cells, color);
	}
};

//████████████████████████████████████
//████████████████████████████████████
//█░▄▄░▄█▀▄▄▄▄▀█▄░▀▄▄▀██▀▄▄▄▄▀█▀▄▄▄▄░█
//██▀▄███░████░██░███░██░▄▄▄▄▄██▄▄▄▄▀█
//█░▀▀▀░█▄▀▀▀▀▄█▀░▀█▀░▀█▄▀▀▀▀▀█░▀▀▀▀▄█
//████████████████████████████████████

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Delete all zones */
Background.prototype.deleteAllZones = function () {
	for (var i = 0; i < this.zones.length; i++) {
		this.zones[i].destroy();
	}
	this.zones = [];
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Add a new zone in the list
 *
 * @param {Zone} zone - zone object to add
 */
Background.prototype.addZone = function (zone, id) {
	this.zones.push(zone);
	zone.id = id;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Remove a zone from the list
 *
 * @param {Zone} zone - zone object to remove
 */
Background.prototype.deleteZone = function (zone) {
	zone.destroy();
	var index = this.zones.indexOf(zone);
	if (index === -1) { return console.warn('Removing a non existing zone'); }
	this.zones.splice(index, 1);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Remove zones by its id
 *
 * @param {number|string} id - zone id
 * @param {Function}  [onDelete] - optional function called before each zone is removed
 */
Background.prototype.deleteZoneById = function (id, onDelete) {
	var i = 0;
	while (i < this.zones.length) {
		if (this.zones[i].id === id) {
			if (onDelete) { onDelete(this.zones[i]); }
			this.zones[i].destroy();
			this.zones.splice(i, 1);
		} else {
			i++;
		}
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Get data of a zone by its id
 *
 * @param {number|string} id - zone id
 */
Background.prototype.getDataOfZoneId = function (id) {
	for (var i = 0; i < this.zones.length; i++) {
		if (this.zones[i].id === id) {
			return this.zones[i].data;
		}
	}
	return null;
};

var touchOffset = 10;

Background.prototype.colorCurrentDragCell = function (x, y, slot) {
	if (!slot.data) {
		return;
	}
	// offset x and y for more friendly drag, maybe it is better to offset in canvas coords...
	var canvasCoord = window.foreground.convertScreenToCanvasCoordinate(x, y - touchOffset);
	var sceneCoord = window.isoEngine.mapScene.convertCanvasToSceneCoordinate(canvasCoord.x, canvasCoord.y);
	var cellObj = window.isoEngine.mapRenderer.getCellId(sceneCoord.x, sceneCoord.y);
	var cellId = cellObj.cell;
	window.isoEngine.cellHover(cellId, slot.data.id);
};

Background.prototype.dragCellRelease = function (x, y, slot) {
	if (this.isFightMode) {
		if (!slot.data) {
			return;
		}
		var cellObj = screenToSceneCellId(x, y - touchOffset);
		window.isoEngine.cellHoverRelease(cellObj.cell);
	}
};

Background.prototype.addGridAnimation = function (cellInfos) {
	return this.gridAnimator.addGridAnimation(cellInfos);
};

Background.prototype.removeGridLayer = function (layer) {
	if (this.gridAnimator) {
		this.gridAnimator.removeGridLayer(layer);
	} else {
		this.gridAnimator = new GridAnimator();
	}
};

var targetIndicators = [];

Background.prototype.addTargetHighLights = function (cellId, x, y, startLook, endLook, startHidden) {
	var targetIndicator = new LightColumn(cellId, x, y);
	targetIndicators.push(targetIndicator);
	targetIndicator.animate(startLook, endLook);
	if (startHidden) {
		targetIndicator.hide();
	}
};

Background.prototype.removeTargetHighlights = function () {
	targetIndicators.forEach(function (targetIndicator) {
		if (targetIndicator.stopped === false) {
			targetIndicator.stop();
			targetIndicator.remove();
		}
	});
	targetIndicators = [];
};

Background.prototype.hideTargetHighlights = function () {
	targetIndicators.forEach(function (targetIndicator) {
		targetIndicator.hide();
	});
};

Background.prototype.showTargetHighlights = function () {
	targetIndicators.forEach(function (targetIndicator) {
		targetIndicator.show();
	});
};

function screenToSceneCellId(x, y) {
	var canvasCoord = window.foreground.convertScreenToCanvasCoordinate(x, y);
	var sceneCoord = window.isoEngine.mapScene.convertCanvasToSceneCoordinate(canvasCoord.x, canvasCoord.y);
	return window.isoEngine.mapRenderer.getCellId(sceneCoord.x, sceneCoord.y);
}


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/Background/index.js
 ** module id = 1022
 ** module chunks = 0
 **/