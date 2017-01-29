require('./styles.less');
var async               = require('async');
var inherits            = require('util').inherits;
var WuiDom              = require('wuidom');
var Scene               = require('Scene');
var constants           = require('constants');
var Graphic             = require('Graphic');
var Line                = require('Line');
var Box                 = require('Box');
var LineBatch           = require('LineBatch');
var BoxBatch            = require('BoxBatch');
var textureLoading      = require('textureLoading');
var modelLoading        = require('modelLoading');
var staticContent       = require('staticContent');
var TINAlight           = require('TINAlight');
var animationController = require('animationController');
var ChunkParams         = require('./ChunkParams.js');

// helper
var worldMapConstants   = require('./worldMapConstants.js');
var SUBAREA_COLOR       = worldMapConstants.SUBAREA_COLOR;
var VIEW_MARGIN         = worldMapConstants.VIEW_MARGIN;
var CHUNK_WIDTH         = worldMapConstants.CHUNK_WIDTH;
var CHUNK_HEIGHT        = worldMapConstants.CHUNK_HEIGHT;

// icon
var Icon                = require('./Icon.js');
var IconBatchData       = require('./IconBatchData.js');
var IconBatch           = require('IconBatch');
var IconCluster         = require('./IconCluster.js');

// ui
var addTooltip          = require('TooltipBox').addTooltip;
var entityManager       = require('socialEntityManager');
var contextualMenus     = require('contextualMenus');
var getPosition         = require('tapHelper').getPosition;
var helper              = require('helper');
var transformBehavior   = require('transformBehavior');
var position            = require('tapHelper').position;
var tapBehavior         = require('tapBehavior');
var WorldMapTooltip     = require('WorldMapTooltip');

var Tween  = TINAlight.Tween;
var easing = TINAlight.easing;

function WorldMap() {
	WuiDom.call(this, 'div', { className: 'WorldMap' });

	this.canvas = this.createChild('canvas', { className: ['WorldMap', 'canvas'] }).rootElement;

	// Scene to display the world map into
	this._scene = new Scene({
		// Scene canvas
		canvas: this.canvas,

		// Scene name
		name: 'worldMapScene',

		// Scene dimensions parameters
		l: 0,
		t: 0,
		w: 1,
		h: 1,

		// Scene aspect parameters
		pixelRatio:   constants.PIXEL_RATIO,
		textureRatio: constants.PRERENDER_RATIO_WORLDMAP,

		// Scene renderer parameters
		nbCacheableSprites:       constants.MAX_SPRITES_BUFFER_WORLDMAP,
		textureMemoryCacheSize:   constants.MAX_TEXTURE_MEMORY_WORLDMAP,
		prerenderQualityRatio:    constants.PRERENDER_RATIO_WORLDMAP
	});

	this._nZonesHorizontally = 0;
	this._nZonesVertically   = 0; // TODO: do we need this?

	this._worldMapWidth  = 1;
	this._worldMapHeight = 1;
	this.cropPosition = { x: 0, y: 0, width: 1, height: 1 };
	this._topLeftZoneCoordinate = null;

	this._worldMapId   = 0;
	this._worldMapData = null;
	this._isLoadingWorldMapData = false;

	this._zoomLevels = [];

	this._chunkSprites      = {};
	this._chunkBatchIndexes = {};
	this._chunkBatchCurrent = 0;

	this._fullMapSprite = null;
	this._subAreaSprite = null;

	// get MapPositions data
	this._subAreaData            = {};
	this._subAreaIdPerCoordinate = {};

	this._gridSprite = null;
	this._zoneHighlight = null;

	this.dimensions = { width: 0, height: 0 };

	this._iconsInfo = {}; // Icon info obtained from static data
	this._iconsImage = null;
	this._iconBatchData = new IconBatchData(this);
}
inherits(WorldMap, WuiDom);
module.exports = WorldMap;

WorldMap.prototype.preloadGenericAssets = function (cb) {
	var self = this;

	staticContent.getAllDataMap(['SubAreaIdPerCoordinate', 'SubAreasWorldMapData', 'Hints'], function (error, mapData) {
		if (error) { return cb(error); }
		self._subAreaIdPerCoordinate = mapData.SubAreaIdPerCoordinate;
		self._subAreaData            = mapData.SubAreasWorldMapData;
		self._iconsInfo              = mapData.Hints;

		// Fetching icons
		modelLoading.loadModel('icon', 'assets', function (iconsData, iconsImage) {
			self._iconsImage = iconsImage;
			var iconsTexture = self._scene.createTexture(iconsImage, 'worldMapIcons', 'linear', 'permanent');
			self._iconBatchData.createIconModels(iconsData, iconsTexture);
			cb();
		});
	});
};

WorldMap.prototype.stopMovingWorldMap = function () {
	this._scene.camera.stopMoving();
	this._loadChunksInView();
};

WorldMap.prototype.centerToPosition = function (coordinates) {
	if (!this._worldMapData) {
		return;
	}
	var viewCenterInScene = this._convertGridToSceneCoordinate(coordinates.posX, coordinates.posY);
	this._scene.camera.follow(viewCenterInScene);
	this._loadChunksInView();
};

WorldMap.prototype.centerToMyPosition = function () {
	if (!this._worldMapData) {
		return;
	}
	var userCoordinates = window.gui.playerData.position.coordinates;
	this.centerToPosition(userCoordinates);
};

WorldMap.prototype.setDimensions = function (width, height) {
	this.dimensions.width  = width;
	this.dimensions.height = height;

	this.cropPosition.width  = width;
	this.cropPosition.height = height;

	this.setStyles({ width: width + 'px', height: height + 'px' });
	this.setCanvasDimensions(width, height);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Initialization of a new world map
 */
WorldMap.prototype.initialize = function (viewCenterInGrid, cb) {
	var currentWorldMapId = window.gui.playerData.position.worldmapId;
	if (this._worldMapId === currentWorldMapId) {
		// Wolrd map already loaded
		if (this._isLoadingWorldMapData) {
			console.warn('[WorldMap.initialize]', 'Initialisation already launched');
		} else {
			this._display();
		}
		return cb();
	}

	if (this._isLoadingWorldMapData) {
		console.warn('[WorldMap.initialize]',
			'Initialisation of a world map of another id is already launched',
			'Asked ', currentWorldMapId, 'Loading', this._worldMapId);
		return cb();
	}

	if (this._fullMapSprite !== null) {
		console.warn('[WorldMap.initialize]',
			'Loading data for a new world map while previous map was not cleared.',
			'Automatically clearing the previous world map.');
		this.clear();
	}

	// Setting id of the current world
	this._worldMapId = currentWorldMapId || 1;
	this._isLoadingWorldMapData = true;

	// Getting World Map Data corresponding to given id
	var worldMapData = this._worldMapData = window.gui.databases.WorldMaps[this._worldMapId];

	// Making sure the player hasn't changed map in the meanwhile
	// TODO: may be do this higher up the function flow?
	if (window.gui.playerData.position.worldmapId !== this._worldMapId) {
		// Reinitialising the initialisation of the world map
		return this.initialize(viewCenterInGrid, cb);
	}

	// Setting world map dimensions
	this._worldMapData = worldMapData;

	// HACK 1. TODO: figure out what is going on, i.e the worldmap 3 dimension is too big by a factor of 2
	if (this._worldMapId === 3) {
		this._worldMapWidth  = worldMapData.totalWidth  / 2;
		this._worldMapHeight = worldMapData.totalHeight / 2;
	} else {
		this._worldMapWidth  = worldMapData.totalWidth;
		this._worldMapHeight = worldMapData.totalHeight;
	}

	this._zoneWidth  = worldMapData.mapWidth;
	this._zoneHeight = worldMapData.mapHeight;

	var userCoordinates = window.gui.playerData.position.coordinates;

	// Center the view on my character coordinates
	var viewCenterInGridX = viewCenterInGrid.posX || userCoordinates.posX;
	var viewCenterInGridY = viewCenterInGrid.posY || userCoordinates.posY;

	var viewCenterInScene = this._convertGridToSceneCoordinate(viewCenterInGridX, viewCenterInGridY);

	// Fetching all zoom levels for this world and parse to float
	var zoomLevels = worldMapData.zoom;

	// Removing useless zoom levels
	var zoomPrevious   = parseFloat(zoomLevels[0]);
	var zoomConsidered = parseFloat(zoomLevels[1]); // Zoom considered for addition

	this._zoomLevels = [zoomPrevious];
	for (var z = 2; z < zoomLevels.length; z += 1) {
		var zoomCurrent = parseFloat(zoomLevels[z]);

		if (zoomCurrent * 2 < zoomPrevious) {
			// The gap between the current zoom and the previous zoom is too big
			// The considered zoom is added in between
			this._zoomLevels.push(zoomConsidered);
			zoomPrevious = zoomConsidered;
			zoomConsidered = zoomCurrent;
		} else {
			zoomConsidered = zoomCurrent;
		}
	}
	this._zoomLevels.push(zoomConsidered);

	// Setting maximum zoom level
	this._scene.camera.setZoomMax(this._zoomLevels[0]);

	// Updating scene dimension
	this._scene.setDimensions(0, 0, this._worldMapWidth, this._worldMapHeight);

	// Centering scene on user coordinates
	// By default setting to maximum zoom level
	this._scene.camera.setZoom(this._zoomLevels[0]);
	this._scene.camera.setPosition(viewCenterInScene.x, viewCenterInScene.y);

	// Computing coordinate of top left zone
	this._topLeftZoneCoordinate = this.convertSceneToGridCoordinate(0, 0);

	// Initiating the loading of the full, low resolution world map asset
	var self = this;
	var worldMapFullUrl = constants.WORLDMAP_PATH + this._worldMapId + '-full.jpg';
	textureLoading.loadTexture(worldMapFullUrl, function (worldMapTextureFull) {
		// Creating sprite to display full world map
		self._fullMapSprite = new Graphic({
				scene: self._scene,
				x: 0,
				y: 0,
				w: self._worldMapWidth,
				h: self._worldMapHeight,
				layer: -1
			},
			worldMapTextureFull
		);

		// Preparing grid
		self._prepareGrid();

		// Preparing icons
		self._prepareIcons();

		// Finally displaying the world map
		self._display();

		// Setting as loaded
		self._isLoadingWorldMapData = false;

		cb();

		self.emit('loaded');
	}, this._scene.renderer, 'linear');
};

WorldMap.prototype.isLoading = function () {
	return this._isLoadingWorldMapData;
};

WorldMap.prototype._display = function () {
	// Loading all chunks that are visible
	this._loadChunksInView();

	// Showing the scene
	animationController.addScene(this._scene);
};

WorldMap.prototype._prepareGrid = function () {
	if (this._gridSprite !== null) {
		this._gridSprite.remove();
	}

	var zw = this._zoneWidth;  // grid cell width
	var zh = this._zoneHeight; // grid cell height

	var x = this._worldMapData.origineX % zw;
	var y = this._worldMapData.origineY % zh;

	var n = Math.floor((this._worldMapWidth  - x) / zw);
	var m = Math.floor((this._worldMapHeight - y) / zh);

	this._nZonesHorizontally = n;
	this._nZonesVertically   = m;   // TODO: do we need this?

	var nLinesVertical   = n + 1;
	var nLinesHorizontal = m + 1;

	var w = nLinesVertical   * zw;
	var h = nLinesHorizontal * zh;

	var lines = [];

	for (var i = 0; i < nLinesVertical; i += 1) {
		var dx = i * zw;
		lines.push(new Line(dx, -y, dx, h - y));
	}

	for (var j = 0; j < nLinesHorizontal; j += 1) {
		var dy = j * zh;
		lines.push(new Line(-x, dy, w - x, dy));
	}

	this._gridSprite = new LineBatch({
		scene: this._scene,
		x: x,
		y: y,
		lines: lines,
		alpha: 0,
		lineWidth: 1 * constants.PIXEL_RATIO,
		hue: [0.85, 0.85, 0.85, 0.8],
		layer: 2,
		id: 'worldMapGrid' + this._worldMapId
	});

	// By default the grid does not show
	this._gridSprite.hide();

	// Initializing grid tween
	this._gridTween = new Tween(this._gridSprite, ['alpha']);

	// Creating zone highlight with correct dimension
	var userCoordinates = window.gui.playerData.position.coordinates;
	var userPosition = this._convertGridToSceneCoordinate(userCoordinates.posX, userCoordinates.posY);

	var highlightOutline = [
		{ x0: -zw / 2, y0: -zh / 2, x1: -zw / 2, y1: -zh / 4 },
		{ x0: -zw / 2, y0: -zh / 2, x1: -zw / 4, y1: -zh / 2 },

		{ x0:  zw / 2, y0:  zh / 4, x1:  zw / 2, y1:  zh / 2 },
		{ x0:  zw / 4, y0:  zh / 2, x1:  zw / 2, y1:  zh / 2 },

		{ x0:  zw / 2, y0: -zh / 4, x1:  zw / 2, y1: -zh / 2 },
		{ x0:  zw / 2, y0: -zh / 2, x1:  zw / 4, y1: -zh / 2 },

		{ x0: -zw / 2, y0:  zh / 4, x1: -zw / 2, y1:  zh / 2 },
		{ x0: -zw / 4, y0:  zh / 2, x1: -zw / 2, y1:  zh / 2 }
	];

	this._zoneHighlight = new LineBatch({
		scene: this._scene,
		x: userPosition.x,
		y: userPosition.y,
		w: zw,
		h: zh,
		lines: highlightOutline,
		lineWidth: 4 * constants.PIXEL_RATIO,
		hue: [0.1, 0.1, 0.1, 1],
		layer: 3,
		id: 'worldMapHighlight' + this._worldMapId
	});

	// By default the highlight does not show
	this._zoneHighlight.hide();

	this._zoneHighlightTween = new Tween(this._zoneHighlight, ['x', 'y']);
};

WorldMap.prototype.setHighlightOn = function (i, j) {
	if (this._isLoadingWorldMapData) {
		// No information to possibly highlight the map
		return;
	}

	var position = this._convertGridToSceneCoordinate(i, j);

	if (this._zoneHighlight.isDisplayed) {
		if (this._zoneHighlightTween.starting || this._zoneHighlightTween.playing) {
			this._zoneHighlightTween.stop();
		}

		this._zoneHighlightTween.reset()
			.from({ x: this._zoneHighlight.x, y: this._zoneHighlight.y })
			.to({ x: position.x, y: position.y }, 16, easing.polyOut, 9)
			.start();
	} else {
		this._zoneHighlight.show();
		this._zoneHighlight.x = position.x;
		this._zoneHighlight.y = position.y;
	}
};

WorldMap.prototype.hideHighlight = function () {
	if (!this._zoneHighlight) {
		return;
	}

	if (this._zoneHighlightTween.starting || this._zoneHighlightTween.playing) {
		this._zoneHighlightTween.stop();
	}

	this._zoneHighlight.hide();
};

WorldMap.prototype.setGridVisibility = function (visible) {
	if (!this._gridTween) {
		return;
	}

	if (this._gridTween.playing) {
		this._gridTween.stop();
	}

	// Making sure the tween has no "on finish" callbacks
	this._gridTween.removeOnFinish();

	var alpha = this._gridSprite.isDisplayed ? this._gridSprite.alpha : 0;
	if (visible) {
		// Fading grid in
		this._gridSprite.show();
		this._gridTween.reset().from({ alpha: alpha }).to({ alpha: 1 }, 4);
	} else {
		// Fading grid out
		this._gridTween.reset().from({ alpha: alpha }).to({ alpha: 0 }, 4);

		var gridSprite = this._gridSprite;
		this._gridTween.onFinish(function () {
			gridSprite.hide();
		});
	}
	this._gridTween.start();
};

WorldMap.prototype.getSubAreaAtGridCoordinate = function (i, j) {
	// Fetching compressed coordinates corresponding to (i, j)
	var cc = this._convertGridCoordinateToCompressedCoordinate(i, j);

	var subAreaId = this._subAreaIdPerCoordinate[this._worldMapId][cc];
	while (subAreaId === undefined) {
		cc -= 1;
		subAreaId = this._subAreaIdPerCoordinate[this._worldMapId][cc];
	}

	if (subAreaId === null) {
		return;
	}

	return this._subAreaData[subAreaId];
};

WorldMap.prototype.convertGridCoordinateToZoneId = function (i, j) {
	return (j - this._topLeftZoneCoordinate.j) * this._nZonesHorizontally + (i - this._topLeftZoneCoordinate.i);
};

WorldMap.prototype.convertSceneToGridCoordinate = function (x, y) {
	return {
		i: Math.floor((x - this._worldMapData.origineX) / this._zoneWidth),
		j: Math.floor((y - this._worldMapData.origineY) / this._zoneHeight)
	};
};

WorldMap.prototype.convertCanvasToGridCoordinate = function (x, y) {
	var scenePosition = this._scene.convertCanvasToSceneCoordinate(x, y);
	return this.convertSceneToGridCoordinate(scenePosition.x, scenePosition.y);
};


WorldMap.prototype.setVisibilityOfSubArea = function (subAreaId, visible, color) {
	var subAreaData = this._subAreaData[subAreaId];
	if (subAreaData === undefined) { // Should never be null
		console.warn('[WorldMap.setVisbilityOfSubArea] Trying to set visibility of undefined sub-area.');
		return;
	}

	if (!visible) {
		if (this._subAreaSprite === null) {
			// TODO: keep warning?
			// console.warn('[WorldMap.setVisbilityOfSubArea] Trying to hide a sub-area that is not visible.');
			return;
		}

		var subAreaSprite = this._subAreaSprite;
		this._subAreaSprite = null;

		Tween(subAreaSprite, ['alpha'])
			.from({ alpha: 1 })
			.to({ alpha: 1 }, 5)
			.start()
			.onFinish(function () {
				// Removing the sprite from the scene
				subAreaSprite.remove();
			});

		return;
	}

	var spriteId = 'subAreaOverlay' + subAreaId;
	if (this._subAreaSprite !== null && this._subAreaSprite.id === spriteId) {
		return;
	}

	// Constructing the shape of the sub-area overlay
	// Coordinates (i,j) correspond to zone coordinates on the grid
	// Coordinates (x,y) correspond to the coordinates of the sub area in the scene

	var boxes = [];
	var xMin = Infinity;
	var yMin = Infinity;
	var xMax = -Infinity;
	var yMax = -Infinity;

	var zonesToHighlight = {};
	var zoneGridPositions = subAreaData.gridPositions[this._worldMapId];
	for (var p = 0; p < zoneGridPositions.length; p += 2) {
		var i = zoneGridPositions[p];
		var j = zoneGridPositions[p + 1];

		var mapPosHash = i + ':' + j;
		if (zonesToHighlight[mapPosHash] === undefined) {
			zonesToHighlight[mapPosHash] = true;
		} else {
			// console.log('Adding zone', gridPosition);
			// Current zone is already in the list of zones to highlight
			continue;
		}

		var scenePosition = this._convertGridToSceneCoordinate(i, j);
		var x = scenePosition.x - this._zoneWidth / 2;
		var y = scenePosition.y - this._zoneHeight / 2;
		boxes.push(
			new Box(
				x,                   y,
				x + this._zoneWidth, y,
				x + this._zoneWidth, y + this._zoneHeight,
				x,                   y + this._zoneHeight
			)
		);

		if (x < xMin) { xMin = x; }
		if (x > xMax) { xMax = x; }
		if (y < yMin) { yMin = y; }
		if (y > yMax) { yMax = y; }
	}

	if (this._subAreaSprite !== null) {
		this._subAreaSprite.remove();
	}

	this._subAreaSprite = new BoxBatch({
		scene: this._scene,
		x: 0,
		y: 0,
		boxes: boxes,
		hue: color || SUBAREA_COLOR,
		layer: 1,
		id: 'subAreaOverlay' + subAreaId
	});

	Tween(this._subAreaSprite, ['alpha'])
		.from({ alpha: 0 })
		.to({ alpha: 1 }, 4)
		.start();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Moving world map view center and zoom
 *
 * @param {number} cx - center of transformation in x
 * @param {number} cy - center of transformation in y
 * @param {number} tx - translation in x
 * @param {number} ty - translation in y
 * @param {number} scale - scaling ratio
 */
WorldMap.prototype.move = function (cx, cy, tx, ty, scale) {
	this._scene.move(cx, cy, tx, ty, scale);

	// Trigger loading of all chunks in view
	this._loadChunksInView();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Adds momentum to map movement as the map is not being moved manually anymore
 */
WorldMap.prototype.addInertia = function (sx, sy) {
	this._scene.camera.addInertia(sx, sy, 0.8);
	this._loadChunksInView();
};

WorldMap.prototype._getZoomLevel = function (zoom) {
	// Determining assets zoom levels corresponding to the selected zoom
	var chunkZoomBelow;
	var chunkZoomAbove = this._zoomLevels[0];
	for (var z = 1; z < this._zoomLevels.length; z += 1) {
		chunkZoomBelow = this._zoomLevels[z];
		// For performance reasons the level of zoom of the chunks that will be loaded
		// can be up to 20% too small with respect to the actual zoom value, therefore losing some quality
		// but it can reduce up to 50% the number of chunks to load
		if (zoom >= chunkZoomBelow * 1.2) {
			break;
		}
		chunkZoomAbove = chunkZoomBelow;
	}

	// Returning smallest sufficient zoom level
	return chunkZoomAbove;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Initiate the loading of map chunks
 */
WorldMap.prototype._loadChunksInView = function () {
	var zoom = this._scene.camera.zoomTarget;
	if (zoom === undefined) {
		return;
	}

	if ((this._zoomLevels.length === 0) || (zoom * 1.5 <= this._zoomLevels[this._zoomLevels.length - 1])) {
		// The chunk zoom level is smaller than the smallest zoom levels for which assets are available
		// No chunk should be shown, only the full size map

		// Removing all the chunk sprites
		this._clearChunks();
		return;
	}

	// Updating index of currently loading chunk batch
	this._chunkBatchCurrent += 1;

	// The chunk zoom values corresponds to the camera zoom
	var chunkZoom = this._getZoomLevel(zoom);

	// Computing bounds of the field of view in scene coordinates
	var camera = this._scene.camera;

	var viewL, viewR, viewT, viewB;
	var destL = camera.followee.x - camera.fovW / 2 * VIEW_MARGIN;
	if (destL < 0) {
		viewL = 0;
		viewR = Math.min(camera.fovW * VIEW_MARGIN, this._worldMapWidth);
	} else {
		var destR = camera.followee.x + camera.fovW / 2 * VIEW_MARGIN;
		if (destR > this._worldMapWidth) {
			viewL = Math.max(this._worldMapWidth - camera.fovW * VIEW_MARGIN, 0);
			viewR = this._worldMapWidth;
		} else {
			viewL = destL;
			viewR = destR;
		}
	}

	var destT = camera.followee.y - camera.fovH / 2 * VIEW_MARGIN;
	if (destT < 0) {
		viewT = 0;
		viewB = Math.min(camera.fovH * VIEW_MARGIN, this._worldMapHeight);
	} else {
		var destB = camera.followee.y + camera.fovH / 2 * VIEW_MARGIN;
		if (destB > this._worldMapHeight) {
			viewT = Math.max(this._worldMapHeight - camera.fovH * VIEW_MARGIN, 0);
			viewB = this._worldMapHeight;
		} else {
			viewT = destT;
			viewB = destB;
		}
	}

	// Computing bounds of the view in terms of chunk coordinates
	var topLeftChunkCoord     = this._convertSceneToChunkCoordinate(chunkZoom, viewL, viewT);
	var bottomRightChunkCoord = this._convertSceneToChunkCoordinate(chunkZoom, viewR, viewB);

	// Computing indexes of the bounding chunks
	var chunkIdxLeft   = topLeftChunkCoord.k;
	var chunkIdxRight  = bottomRightChunkCoord.k;
	var chunkIdxTop    = topLeftChunkCoord.l;
	var chunkIdxBottom = bottomRightChunkCoord.l;

	// Computing a list of all the chunks in the scene view
	var chunksData = [];
	var nbChunksAcrossWidth  = chunkZoom * this._worldMapWidth  / CHUNK_WIDTH;
	var nbChunksAcrossHeight = chunkZoom * this._worldMapHeight / CHUNK_HEIGHT;

	var nbChunksAcrossWidthCeiled  = Math.ceil(nbChunksAcrossWidth);
	var nbChunksAcrossHeightCeiled = Math.ceil(nbChunksAcrossHeight);

	// Making sure the chunk indexes do not overflow
	// Can happen in some rare cases where the worldmap dimension is a multiple of the zone dimension
	if (chunkIdxRight === nbChunksAcrossWidth && nbChunksAcrossWidth === nbChunksAcrossWidthCeiled) {
		chunkIdxRight  -= 1;
	}

	if (chunkIdxBottom === nbChunksAcrossHeight && nbChunksAcrossHeight === nbChunksAcrossHeightCeiled) {
		chunkIdxBottom -= 1;
	}

	var chunkId, chunkSprite;
	var c, chunkIds = Object.keys(this._chunkSprites);
	for (c = 0; c < chunkIds.length; c += 1) {
		// Setting chunk id to null as a marker for removal
		this._chunkSprites[chunkIds[c]].id = null;
	}

	for (var l = chunkIdxTop; l <= chunkIdxBottom; l += 1) {
		for (var k = chunkIdxLeft; k <= chunkIdxRight; k += 1) {
			chunkId = this._worldMapId + '-' + chunkZoom + '-' + (l * nbChunksAcrossWidthCeiled + k + 1).toString();
			chunkSprite = this._chunkSprites[chunkId];
			if (chunkSprite !== undefined) {
				// Not necessary to create a new graphic for the given chunk, one already exists
				// Resetting its sprite id to unmark it for removal
				chunkSprite.id = chunkId;
				continue;
			}

			if (this._chunkBatchIndexes[chunkId] !== undefined) {
				// Chunk image is already loading
				// A graphic will be created when the image is done loading
				// Updating batch index
				this._chunkBatchIndexes[chunkId] = this._chunkBatchCurrent;
				continue;
			}

			var chunkPath = constants.WORLDMAP_PATH + chunkId + '.jpg';

			// Computing distance to view center
			var dk = l - (chunkIdxTop  + chunkIdxBottom) / 2;
			var dl = k - (chunkIdxLeft + chunkIdxRight)  / 2;
			var distanceToViewCenter = Math.sqrt(dk * dk + dl * dl);

			var chunkTexture = this._scene.holdTexture(chunkId);
			var chunkParams  = new ChunkParams(k, l,
				chunkZoom,
				chunkId,
				chunkPath,
				chunkTexture,
				this._scene,
				distanceToViewCenter
			);

			if (chunkTexture === undefined) {
				// Requiring texture to be loaded
				chunksData.push(chunkParams);
				this._chunkBatchIndexes[chunkId] = this._chunkBatchCurrent;
			} else {
				// Texture already in memory
				this._createChunkGraphic(chunkParams);
			}
		}
	}

	// Removing all the chunk sprites that are not required to display the current scene view
	for (c = 0; c < chunkIds.length; c += 1) {
		chunkId = chunkIds[c];
		chunkSprite = this._chunkSprites[chunkId];
		if (chunkSprite.id === null) {
			// Sprite is marked for removal

			// Removing from the scene
			chunkSprite.remove();

			// Removing from list of displayed chunk sprites
			delete this._chunkSprites[chunkId];
		}
	}

	// Simple heuristic
	// Sorting chunks so that chunks closest to the center are loaded first
	chunksData.sort(function (a, b) {
		return a.distToViewCenter - b.distToViewCenter;
	});

	var self = this;
	function loadChunkTexture(chunkParams, cb) {
		var chunkBatchIdx = self._chunkBatchIndexes[chunkParams.id];
		if (chunkBatchIdx !== self._chunkBatchCurrent) {
			// Chunk not required anymore
			delete self._chunkBatchIndexes[chunkParams.id];
			return cb();
		}

		textureLoading.loadTexture(chunkParams.path, function (chunkTexture) {
			var chunkBatchIdx = self._chunkBatchIndexes[chunkParams.id];

			// The current chunk is notified as being loaded
			// by being removed from batch indexes
			delete self._chunkBatchIndexes[chunkParams.id];

			if (chunkBatchIdx !== self._chunkBatchCurrent) {
				// Chunk not required anymore
				// Releasing the texture
				chunkTexture.release();
				return cb();
			}

			// Creating chunk texture from its image
			chunkParams.texture = chunkTexture;

			// Generating the chunk sprite
			self._createChunkGraphic(chunkParams);
			cb();
		}, self._scene.renderer, 'linear');
	}

	async.eachLimit(chunksData, 5, loadChunkTexture, function (error) {
		if (error) { console.error('Chunk textures not loaded correctly', error); }
	});
};

WorldMap.prototype._createChunkGraphic = function (chunkParams) {
	// Fixing chunk dimension with respect to image size
	chunkParams.w *= chunkParams.texture.element.width  / CHUNK_WIDTH;
	chunkParams.h *= chunkParams.texture.element.height / CHUNK_HEIGHT;

	// Saving the chunk sprite in a map for fast access
	this._chunkSprites[chunkParams.id] = new Graphic(chunkParams, chunkParams.texture);
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Remove all chunks on the scene
 */
WorldMap.prototype._clearChunks = function () {
	var chunkIds = Object.keys(this._chunkSprites);
	for (var c = 0; c < chunkIds.length; c += 1) {
		var chunkSprite = this._chunkSprites[chunkIds[c]];

		// Removing from the scene
		chunkSprite.remove();
	}
	this._chunkSprites = {};
};

/**
 * Convert grid coordinate to compressed grid coordinates
 * @param {number} i
 * @param {number} j
 * @return {number}
 */
WorldMap.prototype._convertGridCoordinateToCompressedCoordinate = function (i, j) {
	return (((i < 0) ? (0x8000 | (i & 0x7FFF)) : (i & 0x7FFF)) << 16) +
			((j < 0) ? (0x8000 | (j & 0x7FFF)) : (j & 0x7FFF));
};

/**
 * Convert grid coordinate to scene coordinate
 * @param {number} i
 * @param {number} j
 * @return {{x: number, y: number}}
 */
WorldMap.prototype._convertGridToSceneCoordinate = function (i, j) {
	var x = this._worldMapData.origineX + (i * this._zoneWidth)  + this._zoneWidth  / 2;
	var y = this._worldMapData.origineY + (j * this._zoneHeight) + this._zoneHeight / 2;

	return { x: x, y: y };
};

/**
 * Convert scene coordinate to chunk index
 * @param {number} zoom
 * @param {number} x
 * @param {number} y
 * @return {{ k: number, l: number }}
 */
WorldMap.prototype._convertSceneToChunkCoordinate = function (zoom, x, y) {
	var k = Math.floor(zoom * x / CHUNK_WIDTH);
	var l = Math.floor(zoom * y / CHUNK_HEIGHT);

	return { k: k, l: l };
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Setting dimensions of the scene's canvas
 *
 * @param {number} w - new width
 * @param {number} h - new height
 */
WorldMap.prototype.setCanvasDimensions = function (w, h) {
	this._scene.setCanvasDimensions(w, h);
	this._loadChunksInView();
};

WorldMap.prototype.stopRefreshing = function () {
	animationController.removeScene(this._scene);
};

WorldMap.prototype.crop = function (cropX, cropY, cropW, cropH) {
	this.cropPosition.x = cropX;
	this.cropPosition.y = cropY;
	this.cropPosition.width = cropW;
	this.cropPosition.height = cropH;
	this._scene.crop(cropX, cropY, cropW, cropH);
	this._loadChunksInView();
};

WorldMap.prototype.resetCropping = function () {
	this.cropPosition.x = this.cropPosition.y = 0;
	this.cropPosition.width = this.dimensions.width;
	this.cropPosition.height = this.dimensions.height;
	this._scene.resetCropping();
	this._loadChunksInView();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Removes all sprites on scene
 */
WorldMap.prototype.clear = function () {
	this._scene.clean();
	this._scene.clear();

	this._worldMapId     = 0;
	this._fullMapSprite  = null;
	this._chunkSprites   = {};
	this._zoomLevels     = [];
	this._worldMapData   = null;

	this._iconBatchData.clearIconBatch();
};

// Icon

WorldMap.prototype._prepareIcons = function () {
	this._iconBatchData.reset();
	this._iconBatchData.createIconsFromInfo(this._iconsInfo, this._worldMapId);
	// this._iconBatchData.createIconsFromInfo(this._iconsInfo, null);

	this._iconBatchData.iconBatch = new IconBatch({
		id: 'iconWorldMap_' + this._worldMapId,

		x: 0,
		y: 0,
		w: this._worldMapWidth,
		h: this._worldMapHeight,

		layer: 4,
		scene: this._scene,

		iconsData: this._iconBatchData
	});

	var userCoordinates = window.gui.playerData.position.coordinates;
	var userPosCoordinates = this._convertGridToSceneCoordinate(userCoordinates.posX, userCoordinates.posY);

	// Adding user position icon to batch
	var userIconId = 'userPosition';
	var userPositionIcon = new Icon(userIconId, userIconId, {
			color: [1.0, 1.1, 2.0, 1.0],
			clusterId: userIconId
		},
		this._iconBatchData.iconDimensions.myPosition
	);


	// Creating an icon cluster especially for the user position
	var iconCluster = new IconCluster(userIconId, userPosCoordinates.x, userPosCoordinates.y);
	this._iconBatchData.addCluster(iconCluster);

	iconCluster.add(userPositionIcon);
	userPositionIcon.cluster = iconCluster;

	this._iconBatchData.addIcon(userPositionIcon);

	this.emit('iconsPrepared');
};

WorldMap.prototype.hasIcon = function (iconId) {
	return this._iconBatchData.hasIcon(iconId);
};

WorldMap.prototype.getIcon = function (iconId) {
	return this._iconBatchData.getIcon(iconId);
};

WorldMap.prototype.addIcon = function (iconInfo, gfxId) {
	return this._iconBatchData.createIcon(iconInfo, gfxId);
};

WorldMap.prototype.removeIcon = function (iconId) {
	if (this._iconBatchData === null) {
		var self = this;
		this.on('iconsPrepared', function () {
			self._iconBatchData.removeIcon(iconId);
		});
		return;
	}

	this._iconBatchData.removeIcon(iconId);
};

WorldMap.prototype.setVisibilityOfIconType = function (type, visible) {
	if (this._iconBatchData === null) {
		var self = this;
		this.on('iconsPrepared', function () {
			self._iconBatchData.setVisibilityOfIconType(type, visible);
		});
		return;
	}

	this._iconBatchData.setVisibilityOfIconType(type, visible);
};

WorldMap.prototype.setIconPosition = function (iconId, i, j) {
	if (this._iconBatchData === null) {
		var self = this;
		this.on('iconsPrepared', function () {
			self._iconBatchData.setIconPosition(iconId, i, j);
		});
		return;
	}

	this._iconBatchData.setIconPosition(iconId, i, j);
};

// these don't appear to be used
WorldMap.prototype.convertZoneIdToGridCoordinate = function (zoneId) {
	var j = Math.floor(zoneId / this._nZonesHorizontally);
	var topLeft = this._topLeftZoneCoordinate;
	return { i: zoneId - j * this._nZonesHorizontally + topLeft.i, j: j + topLeft.j };
};

WorldMap.prototype.getSubAreaAtCanvasCoordinate = function (x, y) {
	var gridCoordinate = this.convertCanvasToGridCoordinate(x, y);
	return this.getSubAreaAtGridCoordinate(gridCoordinate.i, gridCoordinate.j);
};

WorldMap.prototype.getIconsAtCanvasCoordinate = function (x, y) {
	var gridCoordinate = this.convertCanvasToGridCoordinate(x, y);
	var zoneId = this.convertGridCoordinateToZoneId(gridCoordinate.i, gridCoordinate.j);
	return this._iconBatchData.getClusterIcons(zoneId);
};

// ui

WorldMap.prototype.setupUI = function (mapWindow) {
	this._setupMapTransform();
	this._setupMapTooltip(mapWindow);
};

WorldMap.prototype._setupMapTransform = function () {
	transformBehavior(this, /*sensitivity=*/'HIGH');

	var curTimeT,
		averageDx = 0,
		averageDy = 0;

	this.on('transformStart', function () {
		curTimeT = Date.now();
		averageDx = 0;
		averageDy = 0;
	});

	this.on('transform', function (centerX, centerY, deltaX, deltaY, scale) {
		curTimeT = Date.now();

		// Weighted average of delta (x,y)
		averageDx = 0.5 * averageDx + 0.5 * -deltaX;
		averageDy = 0.5 * averageDy + 0.5 * -deltaY;

		this.move(centerX, centerY, -deltaX, -deltaY, scale);
	});

	this.on('transformEnd', function () {
		if (Date.now() - curTimeT > 100) {
			// Inertia not added if no slide happened for more than 200ms
			return;
		}

		this.addInertia(averageDx, averageDy);
	});
};

WorldMap.prototype._setupMapTooltip = function (mapWindow) {
	tapBehavior(this);

	var gui = window.gui;
	var self = this;

	var tooltip = gui.tooltipBox;
	var worldMapTooltip = new WorldMapTooltip();
	var posX, posY, posAdjustedX, posAdjustedY, posI, posJ, boundingBox;
	var tooltipIn;

	this.on('tap', function () {
		if (!self._worldMapData) { return; }
		var coord = self.convertCanvasToGridCoordinate(posAdjustedX, posAdjustedY);
		var zoneId = this.convertGridCoordinateToZoneId(coord.i, coord.j);
		coord.icons = this._iconBatchData.getClusterIcons(zoneId);
		gui.openContextualMenu('map', coord);
		self.setHighlightOn(coord.i, coord.j);
	});

	var mapMenu = contextualMenus.getContextMenu('map');
	mapMenu.on('open', function (params) {
		generateTooltipContent(mapMenu.worldMapTooltip, params.i, params.j);
	});
	mapMenu.on('close', function (params) {
		if (params !== 'reopen') {
			self.hideHighlight();
		}
	});

	var sceneCoordinate = {};
	var scrollTween = new Tween(sceneCoordinate, ['x', 'y']);
	scrollTween.onFinish(function () {
		self._loadChunksInView();
	});
	var autoSpeed = 50;

	function updateAdjustedPosition(touch) {
		if (!boundingBox) {
			boundingBox = self.rootElement.getBoundingClientRect();
		}

		posX = touch.x;
		posY = touch.y;
		posAdjustedX = posX - boundingBox.left;
		posAdjustedY = posY - boundingBox.top;

		if (!tooltipIn) {
			return;
		}

		var boundX = null, boundY = null;
		var xPos = posAdjustedX - self.cropPosition.x;
		var touchLimit = Math.min(self.cropPosition.width * 0.1, 50);
		var gapX = 0;
		if (xPos < touchLimit) {
			boundX = 0;
			gapX = xPos;
		} else if (xPos > self.cropPosition.width - touchLimit) {
			boundX = self._worldMapWidth;
			gapX = self.cropPosition.width - xPos;
		}

		var yPos = posAdjustedY - self.cropPosition.y;
		var gapY = 0;
		if (yPos < touchLimit) {
			boundY = 0;
			gapY = yPos;
		} else if (yPos > self.cropPosition.height - touchLimit) {
			boundY = self._worldMapHeight;
			gapY = self.cropPosition.height - yPos;
		}

		if (boundX === null && boundY === null) {
			if (scrollTween.playing) {
				scrollTween.stop();
				self._loadChunksInView();
			}
		} else {
			sceneCoordinate.x = self._scene.camera.x;
			sceneCoordinate.y = self._scene.camera.y;
			self._scene.camera.follow(sceneCoordinate);

			var scrollFrom = {
				x: sceneCoordinate.x,
				y: sceneCoordinate.y
			};

			var scrollTo = {};
			var longestDistance = 0;
			var speed = autoSpeed;
			if (boundX === null) {
				scrollTo.x = sceneCoordinate.x;
			} else {
				scrollTo.x = boundX;
				if (Math.abs(boundX - sceneCoordinate.x) > longestDistance) {
					longestDistance = Math.abs(boundX - sceneCoordinate.x);
					speed = autoSpeed * (touchLimit - gapX) / touchLimit;
				}
			}

			if (boundY === null) {
				scrollTo.y = sceneCoordinate.y;
			} else {
				scrollTo.y = boundY;
				if (Math.abs(boundY - sceneCoordinate.y) > longestDistance) {
					longestDistance = Math.abs(boundY - sceneCoordinate.y);
					speed = autoSpeed * (touchLimit - gapY) / touchLimit;
				}
			}

			if (!scrollTween.playing) {
				scrollTween.start(false);
			}

			scrollTween.reset().from(scrollFrom).to(scrollTo, longestDistance / speed);
			self._loadChunksInView();
		}
	}

	this.on('dom.touchstart', function (e) {
		this.stopMovingWorldMap();
		updateAdjustedPosition(getPosition(e));
	});

	function updateBoundingBox() {
		boundingBox = self.rootElement.getBoundingClientRect();
	}

	mapWindow.on('positioned', updateBoundingBox);
	mapWindow.on('resize', updateBoundingBox);

	function generateTooltipContent(worldMapTooltip, posI, posJ) {
		var subArea = worldMapTooltip.subAreaData;
		var newSubArea = self.getSubAreaAtGridCoordinate(posI, posJ);

		worldMapTooltip.setCoordinates(posI, posJ);

		if (!newSubArea) {
			if (subArea) {
				self.setVisibilityOfSubArea(subArea.id, false);
				subArea = null;
			}
			worldMapTooltip.unsetSubArea();
		} else if (newSubArea && newSubArea !== subArea) {
			if (subArea) {
				self.setVisibilityOfSubArea(subArea.id, false);
			}

			worldMapTooltip.subAreaData = subArea = newSubArea;
			worldMapTooltip.setSubArea(subArea);

			var prism = entityManager.entities.prism[subArea.id];
			if (prism && prism.prism) {
				var alliance = prism.getAlliance();

				worldMapTooltip.setAlliance(alliance);
				var bgColor = helper.hexToRgb((+alliance.allianceEmblem.backgroundColor).toString(16));
				self.setVisibilityOfSubArea(subArea.id, true, [bgColor[0] / 255, bgColor[1] / 255, bgColor[2] / 255, 0.25]);
			} else {
				worldMapTooltip.unsetAlliance();
				self.setVisibilityOfSubArea(subArea.id, true, [1, 0, 0, 0.25]);
			}
		}

		var icons = self._iconBatchData.getClusterIcons(self.convertGridCoordinateToZoneId(posI, posJ));
		if (icons) {
			worldMapTooltip.setIcons(icons, self._iconsImage);
			worldMapTooltip.displayIcons();
		} else if (subArea) {
			worldMapTooltip.displaySubArea();
		} else {
			worldMapTooltip.displayCoordinates();
		}
	}

	function updateTooltipContent() {
		if (scrollTween.playing) { return; }
		var gridCoordinates = self.convertCanvasToGridCoordinate(posAdjustedX, posAdjustedY);
		if ((posI === gridCoordinates.i && posJ === gridCoordinates.j) || !tooltipIn) {
			return tooltip.positionAt(posX, posY);
		}

		posI = gridCoordinates.i;
		posJ = gridCoordinates.j;

		self.setHighlightOn(posI, posJ);

		generateTooltipContent(worldMapTooltip, posI, posJ);

		tooltip.positionAt(posX, posY);
	}

	addTooltip(this, worldMapTooltip, { position: position });

	function updateTooltip(e) {
		updateAdjustedPosition(getPosition(e));
		updateTooltipContent();
	}

	this.on('tooltipOn', function () {
		tooltipIn = true;
		self.stopMovingWorldMap();
		updateAdjustedPosition(position);
		updateTooltipContent();
		gui.wBody.on('dom.touchmove', updateTooltip);
	});

	this.on('tooltipOut', function () {
		tooltipIn = false;
		gui.wBody.removeListener('dom.touchmove', updateTooltip);

		var subArea = worldMapTooltip.subAreaData;

		if (subArea) { self.setVisibilityOfSubArea(subArea.id, false); }
		self.hideHighlight();

		if (scrollTween.playing) {
			scrollTween.stop();
		}
		subArea = posI = posJ = null;
	});
};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/WorldMapWindow/WorldMap/index.js
 ** module id = 835
 ** module chunks = 0
 **/