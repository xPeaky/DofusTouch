var MapGrid                 = require('MapRenderer/MapGrid');
var EventEmitter            = require('events.js').EventEmitter;
var inherit                 = require('util').inherits;
var atouin                  = require('atouin');
var constants               = require('constants');
var StatedElement           = require('StatedElement');
var assetPreloading         = require('assetPreloading');
var textureLoading          = require('textureLoading');
var animationManagerLoading = require('animationManagerLoading');
var Graphic                 = require('Graphic');
var SpriteBatch             = require('SpriteBatch');
var AnimatedGraphic         = require('AnimatedGraphic');
var arrow                   = require('./arrow.js');
var pingPicto               = require('./pingPicto.js');
var tapFeedback             = require('tapFeedback');
var pathFinder              = require('pathFinder');
var Zone                    = require('Zone');

var IMG_PATH = constants.IMG_PATH;
var BG_PATH  = constants.BACKGROUND_PATH;
var FG_PATH  = constants.FOREGROUND_PATH;

var HIGHLIGHT_DEFAULT_FILL   = { r: 255, g: 0, b: 0, a: 0.75 };
var HIGHLIGHT_DEFAULT_STROKE = { r: 0,   g: 0, b: 0, a: 1 };

var OBSTACLE_OPENED = 1;
var OBSTACLE_CLOSED = 2;

var DROPPED_OBJECT_SIZE = 52;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// We offset dropped objects a bit "above" the cell they are on to give an impression of perspective...
// It cannot be perfect because all object images are squares of the same size
// while the size of the object varies (e.g. small feather, big dofus, etc.)
var DROPPED_OBJECT_OFFSET_Y = -constants.CELL_HEIGHT / 4;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * Map change data informations are stored on each cell of the map.
 * It is a bit flag storing which cell on neighbour map are walkable.
 * There are 8 flags, first bit is for the right cell then going clockwise.
 *
 * So, for instance, to know if we can go to the upward map from a cell,
 * we should test if one of the flags 6, 7 or 8 are set.
 * Or equivalent, testing the value (mapChangeData & 224)
 * (224 is the bit mask with bit 6, 7 and 8 sets)
 *
 * Following are the bit mask for all 4 directions:
 */
var CHANGE_MAP_MASK_RIGHT  =  1 |  2 | 128;
var CHANGE_MAP_MASK_BOTTOM =  2 |  4 | 8;
var CHANGE_MAP_MASK_LEFT   =  8 | 16 | 32;
var CHANGE_MAP_MASK_TOP    = 32 | 64 | 128;

var NB_CELLS     = constants.NB_CELLS;
var CELL_HEIGHT  = constants.CELL_HEIGHT;

var BLOCK_PADDING = 2;
var BLOCK_WIDTH   = constants.CELL_WIDTH;
var BLOCK_HEIGHT  = Math.round(CELL_HEIGHT * 1.5);
var BLOCK_TEXTURE_WIDTH  = BLOCK_WIDTH  + BLOCK_PADDING;
var BLOCK_TEXTURE_HEIGHT = BLOCK_HEIGHT + BLOCK_PADDING;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
function createTacticBlockImage() {
	var blockImage = document.createElement('canvas');
	blockImage.width  = BLOCK_WIDTH;
	blockImage.height = BLOCK_HEIGHT;

	var ctx = blockImage.getContext('2d');

	ctx.clearRect(0, 0, BLOCK_WIDTH, BLOCK_HEIGHT);
	ctx.fillStyle   = '#5A523C';
	ctx.strokeStyle = '#CCCCCC';

	var px = [BLOCK_WIDTH / 2, BLOCK_WIDTH, BLOCK_WIDTH, BLOCK_WIDTH / 2,  0,  0];
	var py = [0,  CELL_HEIGHT / 2, CELL_HEIGHT, BLOCK_HEIGHT, CELL_HEIGHT, CELL_HEIGHT / 2];

	ctx.beginPath();
	ctx.moveTo(0, CELL_HEIGHT / 2);
	for (var i = 0; i < px.length; i++) {
		ctx.lineTo(px[i], py[i]);
	}
	ctx.closePath();
	ctx.fill();
	ctx.stroke();

	ctx.lineTo(BLOCK_WIDTH / 2, CELL_HEIGHT);
	ctx.lineTo(BLOCK_WIDTH, CELL_HEIGHT / 2);
	ctx.moveTo(BLOCK_WIDTH / 2, CELL_HEIGHT);
	ctx.lineTo(BLOCK_WIDTH / 2, BLOCK_HEIGHT);
	ctx.stroke();

	return blockImage;
}

//███████████████████████████████████████████████████████████
//███████████████████████████▄░██████████████████████████████
//█▄░▀▄▄▄█▀▄▄▄▄▀█▄░▀▄▄▀██▀▄▄▄▀░██▀▄▄▄▄▀█▄░▀▄▄▄█▀▄▄▄▄▀█▄░▀▄▄▄█
//██░█████░▄▄▄▄▄██░███░██░████░██░▄▄▄▄▄██░█████░▄▄▄▄▄██░█████
//█▀░▀▀▀██▄▀▀▀▀▀█▀░▀█▀░▀█▄▀▀▀▄░▀█▄▀▀▀▀▀█▀░▀▀▀██▄▀▀▀▀▀█▀░▀▀▀██
//███████████████████████████████████████████████████████████

/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @class MapRenderer
 */
function MapRenderer(mapScene, background) {
	EventEmitter.call(this);

	this.mapId      = null;
	this.map        = null;
	this.mapScene   = mapScene;
	this.background = background;
	this.grid       = new MapGrid();

	// For debugging purpose
	// document.body.appendChild(this.atlas);
	// this.atlas.style.position = 'absolute';
	// this.atlas.style.left = 10 + 'px';
	// this.atlas.style.top  = 10 + 'px';

	this.graphics       = [];
	this.tacticGraphics = [];
	this.statedElements = [];

	this.interactiveElements = {};
	this.identifiedElements  = {};
	this.objects             = {};
	this.animatedElements    = [];

	this.textureTacticBlock = this.mapScene.createTexture(
		createTacticBlockImage(), 'roleplayTacticBlock', 'linear', 'permanent');

	this.isReady     = false;
	this.isFightMode = false;
}
inherit(MapRenderer, EventEmitter);
module.exports = MapRenderer;

MapRenderer.prototype.initialize = function () {
	tapFeedback.initialize();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** setMap
 *
 * @param {Object} map - Map object
 */
MapRenderer.prototype.setMap = function (mapRequest, cb) {
	var mapData = mapRequest.mapData;
	this.map   = mapData;
	this.mapId = mapData.id;

	this.grid.initialize(mapData.cells, !this.isFightMode);
	this.loadMap(mapRequest, cb);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Remove reference to map and assets to be garbage collected
 *  while we load assets of the next map.
 *
 * @param {number} newMapId - new map id
 */
MapRenderer.prototype.releaseMap = function (newMapId) {
	if (newMapId === this.mapId) {
		// Map remains unchanged
		return;
	}

	this.mapScene.clean();

	this.isReady = false;

	this.graphics            = [];
	this.tacticGraphics      = [];
	this.statedElements      = [];
	this.interactiveElements = {};
	this.identifiedElements  = {};
	this.objects             = {};
	this.animatedElements    = [];
	this.mapId               = null;
	this.map                 = null;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Stop animation of animated elements on the map */
MapRenderer.prototype.stopAnimatedElements = function () {
	var animatedElements = this.animatedElements;
	for (var i = 0; i < animatedElements.length; i++) {
		animatedElements[i].stop();
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Start animation of all animated elements on the map */
MapRenderer.prototype.startAnimatedElements = function () {
	var animatedElements = this.animatedElements;
	for (var i = 0; i < animatedElements.length; i++) {
		animatedElements[i].animate();
	}
};

var previousMapAssetLoader = null;
function MapAssetLoader(mapRenderer, callback) {
	this.mapRenderer = mapRenderer;
	this.onLoadedCallback = callback;

	this.nAssetsLoaded = 0;
	this.nAssetsToLoad = 0;

	this.atlas = document.createElement('canvas');
	this.atlasContext = this.atlas.getContext('2d');

	this.obsolete = false;

	// Making previously created asset loader obsolete
	if (previousMapAssetLoader !== null) {
		previousMapAssetLoader.obsolete = true;
	}

	// Going through intermediary "self" variable in order to shut up the style checker
	var self = this;
	previousMapAssetLoader = self;
}

MapAssetLoader.prototype.notifyAssetAsLoaded = function () {
	this.nAssetsLoaded += 1;
	window.isoEngine.showLoadingProgress(this.nAssetsLoaded / this.nAssetsToLoad);
	if (this.nAssetsLoaded === this.nAssetsToLoad) {
		this.onLoadedCallback();
		this.onLoadedCallback = null; // To avoid holding on memory uselessly

		if (this.obsolete) {
			return;
		}

		this.mapRenderer.isReady = true;
		this.mapRenderer.emit('ready');
		this.obsolete = true;
	}
};

MapAssetLoader.prototype.loadStatedElement = function (mapElement) {
	var statedElement = new StatedElement(mapElement);

	var self = this;
	this.nAssetsToLoad += 1;
	animationManagerLoading.loadAnimationManager(statedElement, 'bone', mapElement.look + '/state', function onLoaded() {
		statedElement.changeState(statedElement.state, true);
		self.notifyAssetAsLoaded();
	});

	return statedElement;
};

MapAssetLoader.prototype.loadAnimatedGraphic = function (mapElement) {
	var sprite = new AnimatedGraphic(mapElement);

	var self = this;
	this.nAssetsToLoad += 1;
	animationManagerLoading.loadAnimationManager(sprite, 'bone', mapElement.look + '/motion', function onLoaded() {
		if (self.mapRenderer.isFightMode) {
			sprite.stop();
		} else {
			sprite.animate();
		}

		self.notifyAssetAsLoaded();
	});

	return sprite;
};

MapAssetLoader.prototype.loadAtlas = function (atlasLayout, spriteBatch) {
	this.atlas.width  = atlasLayout.width;
	this.atlas.height = atlasLayout.height;

	var graphicsInAtlas = atlasLayout.graphicsPositions;
	var graphicIds = Object.keys(graphicsInAtlas);
	var nGraphics = graphicIds.length;
	var nGraphicsLoaded = 0;

	this.nAssetsToLoad += nGraphics;

	var self = this;
	function onAtlasGraphicLoaded() {
		nGraphicsLoaded += 1;
		if (nGraphicsLoaded === nGraphics) {
			// Creating atlas texture
			var mapScene = self.mapRenderer.mapScene;
			var mapId = self.mapRenderer.mapId;
			var atlasTexture = mapScene.createTexture(self.atlas, 'mapAtlas' + mapId, 'linear');

			// Resetting atlas to save memory
			self.atlas.width  = 1;
			self.atlas.height = 1;

			spriteBatch.setTexture(atlasTexture);
		}

		// Notify atlas as loaded
		self.notifyAssetAsLoaded();
	}

	function loadAtlasGraphic(imageUrl, graphicInAtlas) {
		assetPreloading.loadImage(imageUrl, function (image) {
			if (self.obsolete) {
				return;
			}

			var sx = graphicInAtlas.sx;
			var sy = graphicInAtlas.sy;
			var sw = graphicInAtlas.sw;
			var sh = graphicInAtlas.sh;

			var cx = graphicInAtlas.cx || 0;
			var cy = graphicInAtlas.cy || 0;
			var cw = graphicInAtlas.cw || sw;
			var ch = graphicInAtlas.ch || sh;

			if (cx + cw > image.width) {
				cw = image.width - cx;
			}

			if (cy + ch > image.height) {
				ch = image.height - cy;
			}

			self.atlasContext.drawImage(image, cx, cy, cw, ch, sx, sy, sw, sh);
			onAtlasGraphicLoaded();
		});
	}

	for (var g = 0; g < graphicIds.length; g += 1) {
		var graphicId      = graphicIds[g];
		var graphicInAtlas = graphicsInAtlas[graphicId];

		var extention = graphicInAtlas.jpg ? 'jpg' : 'png';
		var fileName  = extention + '/' + graphicId + '.' + extention;
		var imageUrl  = IMG_PATH + fileName;

		loadAtlasGraphic(imageUrl, graphicInAtlas);
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Prepare the assets to display map layer
 *
 * @param {Object} map
 */
MapRenderer.prototype.loadMap = function (mapRequest, cb) {
	var mapData = mapRequest.mapData;
	var mapMsg  = mapRequest.msg;

	// Making a list stated elements allowed to be displayed
	var restrictedStatedElements = {};
	var statedElements = mapMsg.statedElements;
	for (var s = 0; s < statedElements.length; s++) {
		restrictedStatedElements[statedElements[s].elementId] = true;
	}

	this.graphics         = [];
	this.statedElements   = [];
	this.animatedElements = [];

	var mapAssetLoader = new MapAssetLoader(this, cb);
	mapAssetLoader.nAssetsToLoad += 1; // Adding dummy asset, that represent the execution of this function

	var spriteBatch = new SpriteBatch({
		id: 'mapSceneStaticSprites' + this.mapId,
		scene: this.mapScene,
		holdsStatics: true
	});

	this.graphics.push(spriteBatch);

	var atlasLayout = mapData.atlasLayout;
	var graphicsInAtlas = atlasLayout.graphicsPositions;
	mapAssetLoader.loadAtlas(atlasLayout, spriteBatch);

	// Adding attributes to graphic elements for rendering purposes
	var sprite;
	var mapElements = mapData.midgroundLayer;
	var cellIds  = Object.keys(mapElements);
	for (var c = 0; c < cellIds.length; c++) {
		var cellId = cellIds[c];
		var cellElements = mapElements[cellId];
		for (var e = 0; e < cellElements.length; e++) {
			var element = cellElements[e];
			element.position = parseInt(cellId, 10);
			element.layer = constants.MAP_LAYER_PLAYGROUND;

			// Adding scene to element parameters
			element.scene = this.mapScene;

			var hue = element.hue;
			hue[0] = 1 + hue[0] / 127;
			hue[1] = 1 + hue[1] / 127;
			hue[2] = 1 + hue[2] / 127;
			hue[3] = 1;
			if (element.look) {
				if (element.id && restrictedStatedElements[element.id]) {
					sprite = mapAssetLoader.loadStatedElement(element);
					this.statedElements.push(sprite);
				} else {
					if (element.anim) {
						sprite = mapAssetLoader.loadAnimatedGraphic(element);
						this.animatedElements.push(sprite);
						this.graphics.push(sprite);
					} else {
						console.warn('[MapRenderer.loadMap] Animated Graphic skipped', element);
						continue;
					}
				}
			} else if (element.g) {
				sprite = spriteBatch.addSprite(element, graphicsInAtlas[element.g]);
				if (element.isBoundingBox) {
					// Bounding boxes should still be visible to show interactive elements to the user
					// but should not block the view either
					sprite.alpha = 0.15;
					if (!element.id) {
						console.warn('[MapRenderer.loadMap] Element notified as a bounding box but has no id', element);
					}
				}
			} else {
				console.warn('[MapRenderer.loadMap] Element of unidentified type skipped', element);
				continue;
			}

			if (sprite.id) {
				this.identifiedElements[sprite.id] = sprite;
			}
		}
	}

	spriteBatch.finalize(atlasLayout.width, atlasLayout.height);

	var self = this;

	// Updating background with new texture
	var backgroundUrl = BG_PATH + mapData.id + '.jpg';
	mapAssetLoader.nAssetsToLoad += 1;
	textureLoading.loadTexture(backgroundUrl, function (texture) {
		self.background.updateMap(texture);
		mapAssetLoader.notifyAssetAsLoaded();
	}, this.mapScene.renderer, 'linear');

	// Creating foreground sprite
	if (mapData.foreground) {
		var foregroundGraphic = new Graphic({
			x: -constants.HORIZONTAL_OFFSET,
			y: -constants.VERTICAL_OFFSET,
			w:  constants.MAP_SCENE_WIDTH,
			h:  constants.MAP_SCENE_HEIGHT,
			scene: this.mapScene,
			layer: constants.MAP_LAYER_FOREGROUND
		});
		this.graphics.push(foregroundGraphic);

		var foregroundUrl = FG_PATH + mapData.id + '.png';
		mapAssetLoader.nAssetsToLoad += 1;
		textureLoading.loadTexture(foregroundUrl, function (texture) {
			if (texture.id === 'empty_texture') {
				// No texture, we do not want to show the empty texture
				// Simply removing the foreground
				foregroundGraphic.remove();

				var idx = self.graphics.indexOf(foregroundGraphic);
				if (idx !== -1) {
					self.graphics.splice(idx, 1);
				}
			} else {
				foregroundGraphic.texture = texture;
				foregroundGraphic.forceRefresh();
			}
			mapAssetLoader.notifyAssetAsLoaded();
		}, this.mapScene.renderer, 'linear');
	}

	mapAssetLoader.notifyAssetAsLoaded();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Switch game context to FIGHT mode */
MapRenderer.prototype.switchGameContextFight = function () {
	this.isFightMode = true;
	this.stopAnimatedElements();

	// set stated elements in collected states
	for (var s = 0; s < this.statedElements.length; s++) {
		var statedElement = this.statedElements[s];
		statedElement.changeState(1, true);
	}

	// remove all objects dropped on map's floor
	for (var cellId in this.objects) {
		this.objects[cellId].remove();
	}
	this.objects = {};

	// flatten grid
	if (!this.map) { return; }
	this.grid.initialize(this.map.cells, false);
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Hide all graphics in the display list */
MapRenderer.prototype.hideGraphics = function (graphics) {
	for (var i = 0; i < graphics.length; i++) {
		graphics[i].hide();
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Show all graphics in the display list */
MapRenderer.prototype.showGraphics = function (graphics) {
	for (var i = 0; i < graphics.length; i++) {
		graphics[i].show();
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Switch game context to ROLE_PLAY */
MapRenderer.prototype.switchGameContextRoleplay = function () {
	this.isFightMode = false;
	this.startAnimatedElements();

	// unflatten grid
	if (!this.map) { return; }
	this.grid.initialize(this.map.cells, true);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Toggle tactic mode */
MapRenderer.prototype.enableTacticMode = function () {
	this.hideGraphics(this.graphics);
	this.hideGraphics(this.statedElements);

	// map is not ready yet (e.g. reconnection in fight)
	if (!this.map || !this.map.cells) {
		this.once('ready', this.enableTacticMode);
		return;
	}

	this.tacticGraphics = [];

	var cells = this.map.cells;
	for (var cellId = 0; cellId < NB_CELLS; cellId++) {
		if (cells[cellId].l & 7) {
			// Not a block cell
			continue;
		}

		var coord = atouin.cellCoord[cellId];
		this.tacticGraphics.push(new Graphic(
			{
				position: cellId,
				hue: [1, 1, 1, 1],
				x: coord.x - BLOCK_TEXTURE_WIDTH / 2,
				y: coord.y - CELL_HEIGHT,
				g: 1,
				w: BLOCK_TEXTURE_WIDTH,
				h: BLOCK_TEXTURE_HEIGHT,
				scene: this.mapScene
			},
			this.textureTacticBlock
		));
	}

	this.showGraphics(this.tacticGraphics);
	this.background.toggleTacticMode(true);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Disable tactic mode */
MapRenderer.prototype.disableTacticMode = function () {
	this.hideGraphics(this.tacticGraphics);
	this.showGraphics(this.graphics);
	this.showGraphics(this.statedElements);
	this.background.toggleTacticMode(false);
};

//█████████████████████████████████████████████████
//████████▄░████████▄█████████████████▀████████████
//█▀▄▄▄▄▀██░▀▄▄▄▀█▄▄▄░█▀▄▄▄▄▀█▀▄▄▄▀░█▄░▄▄▄██▀▄▄▄▄░█
//█░████░██░████░████░█░▄▄▄▄▄█░███████░██████▄▄▄▄▀█
//█▄▀▀▀▀▄█▀░▄▀▀▀▄████░█▄▀▀▀▀▀█▄▀▀▀▀▄██▄▀▀▀▄█░▀▀▀▀▄█
//████████████████▀▀▀▄█████████████████████████████

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * Adding an object on ground
 *
 * @param {Object[]} objects
 *        {number} objects[*].objectGID
 *        {number} objects[*].cellId cell id
 *        {number} objects[*].asset  (browser only) asset to display item
 *        {number} objects[*].uri    (native only) path to asset file on disc
 */
MapRenderer.prototype.addObjects = function (objects) {
	if (!this.isReady) {
		var self = this;
		return this.once('ready', function () {
			self.addObjects(objects);
		});
	}

	for (var i = 0; i < objects.length; i++) {
		var object = objects[i];
		if (!object.img) {
			console.error('createObjectGfx: no img for ' + JSON.stringify(object));
			continue;
		}

		var coords = this.getCellSceneCoordinate(object.cellId);
		object.x = coords.x - DROPPED_OBJECT_SIZE / 2;
		object.y = coords.y - DROPPED_OBJECT_SIZE / 2 + DROPPED_OBJECT_OFFSET_Y;
		object.position = object.cellId;
		object.w = DROPPED_OBJECT_SIZE;
		object.h = DROPPED_OBJECT_SIZE;
		object.scene = this.mapScene;
		var texture = this.mapScene.createTexture(object.img, 'object:' + object.objectGID);
		var element = new Graphic(object, texture);
		this.objects[object.cellId] = element;
	}
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Remove an object from ground
 *
 * @param {number[]} cellIds - cell id
 */
MapRenderer.prototype.removeObjects = function (cellIds) {
	for (var i = 0; i < cellIds.length; i++) {
		var cellId = cellIds[i];
		var object = this.objects[cellId];
		if (!object) { continue; }
		object.remove();
		delete this.objects[cellId];
	}
};

//████████████████████████████████████████████████████████████████████████████████
//███▄████████████▀███████████████████████████████████▀███████▄███████████████████
//█▄▄░███▄░▀▄▄▀██▄░▄▄▄██▀▄▄▄▄▀█▄░▀▄▄▄█▀▄▄▄▄▀██▀▄▄▄▀░█▄░▄▄▄██▄▄░███▄░▄██▄░▄█▀▄▄▄▄▀█
//███░████░███░███░█████░▄▄▄▄▄██░█████▀▄▄▄▄░██░███████░███████░█████░██░███░▄▄▄▄▄█
//█▀▀░▀▀█▀░▀█▀░▀██▄▀▀▀▄█▄▀▀▀▀▀█▀░▀▀▀██▄▀▀▀▄░▀█▄▀▀▀▀▄██▄▀▀▀▄█▀▀░▀▀████░░████▄▀▀▀▀▀█
//████████████████████████████████████████████████████████████████████████████████

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Create interactive element map
 *
 * @param {Object[]} interactiveElements - interactive elements informations
 */
MapRenderer.prototype.setInteractiveElements = function (interactiveElements) {
	// convert array to a lookup table object
	this.interactiveElements = {};
	for (var i = 0, len = interactiveElements.length; i < len; i++) {
		var elem = interactiveElements[i];
		this.interactiveElements[elem.elementId] = elem;
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Update interactive elements data
 *
 * @param {Object[]} list - list of modified interactives elements
 *        {number}   list[*].elementId      - interactive element id
 *        {number}   list[*].elementTypeId  - interactive element type (-1 if none)
 *        {Object[]} list[*].enabledSkills  - visible skills list
 *        {Object[]} list[*].disabledSkills - visible but inactive skills list
 */
MapRenderer.prototype.updateInteractiveElements = function (list) {
	var interactiveElements = this.interactiveElements;
	for (var i = 0; i < list.length; i++) {
		var updatedElement = list[i];
		var interactiveElement = interactiveElements[updatedElement.elementId];
		if (!interactiveElement) {
			console.warn('Interactive element id ' + updatedElement.elementId + ' does not exist.');
			continue;
		}
		interactiveElement.disabledSkills = updatedElement.disabledSkills;
		interactiveElement.enabledSkills  = updatedElement.enabledSkills;
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Initialize state of statedElement in the map
 *
 * @param {Object[]} statedElements - list of stated element state
 *        {number}   statedElements[*].elementId     - element id
 *        {number}   statedElements[*].elementCellId - element position
 *        {number}   statedElements[*].elementState  - element state
 * @param {boolean}  isFightMode - in fight mode, stated element should be forced in state 1 at creation
 */
MapRenderer.prototype.setStatedElements = function (statedElementsData, isFightMode) {
	for (var i = 0, len = statedElementsData.length; i < len; i++) {
		var elemData = statedElementsData[i];
		var instance = this.identifiedElements[elemData.elementId];
		if (!instance) {
			console.warn('stated element not identified:' + elemData.elementId + ', cellId=' + elemData.elementCellId);
			continue;
		}
		if (!(instance instanceof StatedElement)) {
			continue;
		}

		if (isFightMode) {
			// force stated elements in "collected" state (1)
			instance.state = -1;
			instance.changeState(1);
		} else if (instance.changeState) {
			instance.changeState(elemData.elementState);
		} else {
			instance.state = elemData.elementState;
		}
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Update stated element states
 *
 * @param {Object[]} statedElements - updated stated element
 *        {number} statedElements[*].elementId     - element id
 *        {number} statedElements[*].elementCellId - element position
 *        {number} statedElements[*].elementState  - element state
 */
MapRenderer.prototype.updateStatedElements = function (statedElementsData) {
	var identifiedElements = this.identifiedElements;
	for (var i = 0, len = statedElementsData.length; i < len; i++) {
		var elemData = statedElementsData[i];
		var identifiedElement = identifiedElements[elemData.elementId];
		if (!identifiedElement) {
			console.warn('Identified element ' + elemData.elementId + ' not found.');
			continue;
		}
		if (!identifiedElement.changeState) {
			console.warn('Identified element ' + elemData.elementId + ' is not a stated element.');
			identifiedElement.state = elemData.elementState;
			continue;
		}
		identifiedElement.changeState(elemData.elementState);
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
MapRenderer.prototype.addArrowsOnCellsOneShot = function (cellIds, marginLeft, marginTop, arrowOrientation) {
	var positions = [];
	for (var i = 0; i < cellIds.length; i++) {
		positions[i] = this.getCellSceneCoordinate(cellIds[i]);
		positions[i].x += marginLeft || 0;
		positions[i].y += marginTop  || 0;
	}
	arrow.addArrowsOneShot(positions, cellIds, arrowOrientation, this.mapScene);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
MapRenderer.prototype.addTapFeedback = function (x, y) {
	tapFeedback.addTapFeedback({ x: x, y: y });
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
MapRenderer.prototype.addMovementFeedback = function (cellId) {
	var coords = this.getCellSceneCoordinate(cellId);
	tapFeedback.addMovementFeedback({ x: coords.x, y: coords.y, position: cellId });
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
MapRenderer.prototype.removeTapFeedback = function () {
	tapFeedback.removeTapFeedback();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
MapRenderer.prototype.removeMovementFeedback = function () {
	tapFeedback.removeMovementFeedback();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
MapRenderer.prototype.addArrowOnCell = function (cellId, marginLeft, marginTop, arrowOrientation, nIterations) {
	var position = this.getCellSceneCoordinate(cellId);
	position.x += marginLeft || 0;
	position.y += marginTop  || 0;

	arrow.addArrow(position, cellId, arrowOrientation, this.mapScene, nIterations);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
MapRenderer.prototype.addArrowOnGraphic = function (graphic, marginLeft, marginTop, arrowOrientation, nIterations) {
	if (!graphic || !graphic.bbox) {
		return console.warn('addArrowOnGraphic: invalid graphic entity');
	}
	var position = {
		x: (graphic.bbox[0] + graphic.bbox[1]) / 2 + (marginLeft || 0),
		y: (graphic.bbox[2] + graphic.bbox[3]) / 2 + (marginTop || 0)
	};
	arrow.addArrow(position, null, arrowOrientation, this.mapScene, nIterations);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
MapRenderer.prototype.addArrowsSequence = function (cellIds, marginLeft, marginTop, arrowOrientation) {
	var positions = [];
	for (var i = 0; i < cellIds.length; i++) {
		positions[i] = this.getCellSceneCoordinate(cellIds[i]);
		positions[i].x += marginLeft || 0;
		positions[i].y += marginTop  || 0;
	}
	arrow.addArrowsSequence(positions, cellIds, arrowOrientation, this.mapScene);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
MapRenderer.prototype.removeArrows = function () {
	arrow.removeArrows();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * @param {String} id
 * @param {number} cellId
 * @param {String} type
 */
MapRenderer.prototype.addPingPictoOnCell = function (id, cellId, type) {
	var position = this.getCellSceneCoordinate(cellId);
	pingPicto.addPingPicto(id, position, cellId, type);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * Remove a specific picto from this id
 * @param {String} id
 */
MapRenderer.prototype.removePingPicto = function (id) {
	pingPicto.removePingPicto(id);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * Remove all ping picto
 */
MapRenderer.prototype.removeAllPingPictos = function () {
	pingPicto.removeAllPingPictos();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * Highlight the cells
 * @param {String} id
 * @param {number[]} cellIds
 * @param {object}   fillColor - color of the cell (fill), by default red
 *        {number}   fillColor.r - red
 *        {number}   fillColor.g - green
 *        {number}   fillColor.b - blue
 *        {number}   fillColor.a - alpha
 * @param {object}   strokeColor - stroke color of the cell (stroke), by default black
 *        {number}   strokeColor.r - red
 *        {number}   strokeColor.g - green
 *        {number}   strokeColor.b - blue
 *        {number}   strokeColor.a - alpha
 */
MapRenderer.prototype.addCellHighlight = function (id, cellIds, fillColor, strokeColor) {
	fillColor   = fillColor   || HIGHLIGHT_DEFAULT_FILL;
	strokeColor = strokeColor || HIGHLIGHT_DEFAULT_STROKE;

	for (var i = 0, len = cellIds.length; i < len; i += 1) {
		var cellId = cellIds[i];

		// mark color
		var fill   = 'rgba(' + fillColor.r   + ',' + fillColor.g   + ',' + fillColor.b   + ',' + fillColor.a   + ')';
		var stroke = 'rgba(' + strokeColor.r + ',' + strokeColor.g + ',' + strokeColor.b + ',' + strokeColor.a + ')';

		// add zone
		window.background.addZone(new Zone([cellId], { color: fill, outline: stroke }), id);
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * Remove highlight cells associated of the given id
 * @param {String} id
 */
MapRenderer.prototype.deleteCellHighlight = function (id) {
	window.background.deleteZoneById(id);
};

//████████████████████████████████
//████████████████████████████████
//█▄░▀▄▀▀▄▀█▀▄▄▄▄▀██▄░▀▄▄▀████████
//██░██░██░█▀▄▄▄▄░███░███░████████
//█▀░▀█░▀█░█▄▀▀▀▄░▀██░▀▀▀▄████████
//██████████████████▀░▀███████████

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Obstacle on map are updated
 *
 * @param {Object[]} obstacles                   - obstacles list
 *        {number}   obstacles[*].obstacleCellId - position of obstacle
 *        {number}   obstacles[*].state          - state (1: OPENED, 2: CLOSED)
 */
MapRenderer.prototype.updateObstacles = function (obstacles) {
	if (!this.isReady) {
		var self = this;
		return this.once('ready', function () {
			self.updateObstacles(obstacles);
		});
	}
	var cells = this.map.cells;
	for (var i = 0, len = obstacles.length; i < len; i++) {
		var obstacle = obstacles[i];
		var cellId = obstacle.obstacleCellId;
		var cell = cells[cellId];

		var previousState = cell.l;
		if (obstacle.state === OBSTACLE_OPENED) {
			cell.l |= 1;
		} else if (obstacle.state === OBSTACLE_CLOSED) {
			cell.l &= 0xFE;
		}

		this.grid.updateCellState(cellId, cell, previousState);
		pathFinder.updateCellPath(cellId, cell);
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Return if players can walk on cell with specified id
 *
 * @param {number}  cellId      - a cell id, integer in the range [0..559]
 * @param {boolean} isFightMode - if set, check that flag 3 (nonWalkableDuringFight) is not set
 * @return {boolean} true if the cell is walkable, false otherwise
 */
MapRenderer.prototype.isWalkable = function (cellId, isFightMode) {
	var mask = isFightMode ? 5 : 1;
	return (this.map.cells[cellId].l & mask) === 1;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Return true if cell is inside a paddock
 *
 * @param {number} cellId - a cell id, integer in the range [0..559]
 * @return {boolean} true if the cell is inside a paddock, false otherwise
 */
MapRenderer.prototype.isFarmCell = function (cellId) {
	return (this.map.cells[cellId].l & 32) === 32;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Return true if cell is more than 40% visible (not hidden by another sprite)
 *
 * @param {number} cellId - a cell id, integer in the range [0..559]
 * @return {boolean} true if the cell is more than 40% visible
 */
MapRenderer.prototype.isVisibleCell = function (cellId) {
	return (this.map.cells[cellId].l & 64) === 64;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Get a cell "change map" flags (to know which neighbour map can be reach from this cell)
 *
 * @param {Number} cellId - a cell id, integer in the range [0..559]
 * @return {object}
 */
MapRenderer.prototype.getChangeMapFlags = function (cellId) {
	var mapChangeData = this.map.cells[cellId].c || 0;
	if (mapChangeData === 0) { return {}; }
	return {
		left:   mapChangeData & CHANGE_MAP_MASK_LEFT   && (cellId % 14 === 0),
		right:  mapChangeData & CHANGE_MAP_MASK_RIGHT  && (cellId % 14 === 13),
		top:    mapChangeData & CHANGE_MAP_MASK_TOP    && (cellId < 28),
		bottom: mapChangeData & CHANGE_MAP_MASK_BOTTOM && (cellId > 531)
	};
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Get the first detected "change map" flag if any
 *
 * @param {Number} cellId - a cell id, integer in the range [0..559]
 * @return {string}       - a flag direction ('left', 'right', 'top', 'bottom') or null
 */
MapRenderer.prototype.getFirstMapFlag = function (cellId) {
	var flags = this.getChangeMapFlags(cellId);
	if (flags.left)   { return 'left';   } else
	if (flags.right)  { return 'right';  } else
	if (flags.top)    { return 'top';    } else
	if (flags.bottom) { return 'bottom'; }
	return null;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Get cell id from coordinates in scene.
 *
 * @param  {number} x - Scene x coordinate in pixel
 * @param  {number} y - Scene y coordinate in pixel
 * @return {number} cellId - Cell id, a number between 0 and 559.
 */
MapRenderer.prototype.getCellId = function (x, y) {
	return this.grid.getCellAtSceneCoordinate({ x: x, y: y });
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Get (x, y) scene coordinate of a cell
 *
 * @param {Number} cellId - a cell id, integer in the range [0..559]
 */
MapRenderer.prototype.getCellSceneCoordinate = function (cellId) {
	// get raw position of the cell
	var position = atouin.getCellCoord(cellId);
	// add cell elevation
	if (this.isReady) {
		position.y -= this.map.cells[cellId].f || 0;
	}

	return position;
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/MapRenderer/index.js
 ** module id = 1013
 ** module chunks = 0
 **/