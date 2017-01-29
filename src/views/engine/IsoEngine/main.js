var inherits            = require('util').inherits;
var EventEmitter        = require('events.js').EventEmitter;
var constants           = require('constants');
var animationController = require('animationController');
var Scene               = require('Scene');
var MapRenderer         = require('MapRenderer');
var Background          = require('Background');
var ActorManager        = require('ActorManager');
var fightSequence       = require('fightSequence');
var GameContextEnum     = require('GameContextEnum');
var templateLoading     = require('templateLoading');
var windowsManager      = require('windowsManager');
var modelLoading        = require('modelLoading');
var ActionQueue         = require('ActionQueue');
var gameOptions         = require('gameOptions');
var connectionManager   = require('dofusProxy/connectionManager.js');

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Main manager and renderer for map, actors and elements displayed on map.
 *
 * @author  Cedric Stoquer
 */
function IsoEngine() {
	EventEmitter.call(this);

	// Creation of roleplay canvas
	var canvasRoleplay = document.createElement('canvas');
	canvasRoleplay.id = 'engineCanvas';
	var dofusBody = document.getElementById('dofusBody');
	dofusBody.appendChild(canvasRoleplay);

	// Creation of the roleplay scene
	this.mapScene = new Scene({
		// Scene canvas
		canvas: canvasRoleplay,

		// Scene name
		name: 'mapScene',

		// Scene dimensions parameters
		l: -constants.HORIZONTAL_OFFSET,
		t: -constants.VERTICAL_OFFSET,
		w: constants.MAP_SCENE_WIDTH,
		h: constants.MAP_SCENE_HEIGHT,

		canvasWidth:  0,
		canvasHeight: 0,

		// Scene aspect parameters
		maxZoom:      constants.MAX_ZOOM_MAP,
		pixelRatio:   constants.PIXEL_RATIO,
		textureRatio: constants.PRERENDER_RATIO_MAP,
		cameraAcceleration: 1.15,

		// Scene renderer parameters
		nbCacheableSprites:     constants.MAX_SPRITES_BUFFER_MAP,
		textureMemoryCacheSize: constants.MAX_TEXTURE_MEMORY_MAP,
		prerenderQualityRatio:  constants.PRERENDER_RATIO_MAP,

		adjustToCanvasRatio: true,
		usePrecisionRendering: true
	});

	// Creation of the roleplay scene's background
	var backgroundParams = {
		scene: this.mapScene,
		layer: constants.MAP_LAYER_BACKGROUND,
		position: -1,
		x: -constants.HORIZONTAL_OFFSET,
		y: -constants.VERTICAL_OFFSET,
		w: constants.MAP_SCENE_WIDTH,
		h: constants.MAP_SCENE_HEIGHT,
		id: 'mapBackground'
	};

	// TODO: remove reference to WebGL Renderer
	this.renderer     = this.mapScene.renderer;
	this.background   = new Background(backgroundParams);
	this.actorManager = new ActorManager({ isoEngine: this, scene: this.mapScene });
	this.mapRenderer  = new MapRenderer(this.mapScene, this.background);

	this.highlightedElements = {};

	this.gameContext = GameContextEnum.ROLE_PLAY;
	this.isInGame    = false;

	this.isMovementWaitingForConfirmation = false;
	this.endMovementCallback = null;
	this.isMovementCanceled = false;

	this.actionQueue = new ActionQueue();

	// Starting the game loop
	animationController.start();
	this.mapScene.camera.setZoom(0); // Setting to smallest zoom level

	this._initGridOverlayLayers();

	this._previousTurn = false;
	this._isUserTurn = false;

	var self = this;
	var background = this.background;

	this.on('GameFightStartMessage', function () {
		self._resetFightPositionLayer();
	});

	this.on('GameFightEndMessage', function () {
		self._resetFightPositionLayer();
		self._resetSpellRangeLayer();
		self._resetSpellEffectLayer();
		self._resetWalkLayer();
		self._resetWalkAreaLayer();
		self._resetEnemyWalkAreaLayer();

		background.removeTargetHighlights();
		window.foreground.confirmBox.close();
		this._isUserTurn = false;
	});

	this._initLoadingProgress();

	this.bitmapFonts = null;

	// Tweens of the currently or lastly displayed banner
	this._currentBannerTweens = {
		backTween: null,
		textTween: null
	};
}
inherits(IsoEngine, EventEmitter);
module.exports = IsoEngine;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Loading font data to display point variations */
IsoEngine.prototype._loadBitmapFonts = function () {
	if (this.bitmapFonts === null) {
		var self = this;
		modelLoading.loadModel('bitmapFonts', 'atlas', function (bitmapFontDimensions, bitmapFontImage) {
			var bitmapFontTexture = self.mapScene.createTexture(bitmapFontImage, 'atlas', 'mimap', 'permanent');
			self.bitmapFonts = {
				characters: {
					dimensions: bitmapFontDimensions.characters,
					texture: bitmapFontTexture
				},
				numbers: {
					dimensions: bitmapFontDimensions.numbers,
					texture: bitmapFontTexture
				}
			};
		});
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Called when other views are ready */
IsoEngine.prototype.initialize = function (options) {
	if (!options.config) { return; }
	window.Config = options.config;
	fightSequence.initialize(this);
	this.mapRenderer.initialize();
	this.actionQueue.initialize();
	templateLoading.loadMissingTemplatesInfo();
	this._loadBitmapFonts();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Activates the map scene for rendering
 *
 * @return {boolean} whether the method actually changed the activation state of the map scene
 */
IsoEngine.prototype._activateMapScene = function () {
	if (this.isInGame === false) {
		animationController.addScene(this.mapScene);
		animationController.addScene(this.actorManager);
		this.isInGame = true;
		return true;
	}

	return false;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Deactivate the map scene for rendering
 *
 * @return {boolean} whether the method actually changed the activation state of the map scene
 */
IsoEngine.prototype._deactivateMapScene = function () {
	if (this.isInGame === true) {
		this.mapScene.clear(0.0, 0.0, 0.0, 0.0);
		animationController.removeScene(this.mapScene);
		animationController.removeScene(this.actorManager);
		this.clearUserMovementZone();
		this.background.resetAndClear();
		this.releaseMap();
		this.interactiveDisconnect();
		this.isInGame = false;
		return true;
	}

	return false;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Disconnection */
IsoEngine.prototype.disconnect = function () {
	// Unlocking messages before disctonnecting
	// They could have been locked if disconnecting while changing map
	connectionManager.unlockMessages();

	this.emit('disconnect');
	this._deactivateMapScene();
	this.mapTransitionDisconnect();
	if (this.background && this.background.gridAnimator) {
		this.background.gridAnimator.clear();
	}

	this.clearPendingMovement();
	this.actionQueue.clear();
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Transmit a message emitted by websocket on IsoEngine object
 *
 * @param  {Object} msg - message to transmit
 */
IsoEngine.prototype.transmitMessage = function (msg) {
	this.emit(msg._messageType, msg);
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Main manager and renderer for map, actors and elements displayed on map.
 */
IsoEngine.prototype.releaseMap = function (mapId) {
	if (this.isInGame === false) { return; }

	if (this.gameContext !== GameContextEnum.FIGHT) {
		this.actorManager.removeAllActors();
	}

	this.cleanupChallenges();
	this.background.releaseMap();
	this.mapRenderer.releaseMap(mapId);
	this.actionQueue.clear();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
IsoEngine.prototype.changeGameContext = function (gameContextId) {
	this.gameContext = gameContextId;

	this.mapRenderer.removeMovementFeedback();
	this.clearHighlights();
	this.clearPendingMovement();
	this.actionQueue.clear();

	var isFightMode = gameContextId === GameContextEnum.FIGHT;
	if (isFightMode) {
		this.cleanupChallenges();
		animationController.removeScene(this.actorManager);
		this.mapRenderer.switchGameContextFight();
	} else {
		animationController.addScene(this.actorManager);
		this.actorManager.userActor.show();
		this.clearUserMovementZone();
		this.mapRenderer.switchGameContextRoleplay();
		// cleanup mark zones (glyph and trap)
		this.background.deleteAllZones();
	}
	window.background.changeGameContext(isFightMode);
	this.toggleGrid();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Toggles the grid based on gameOptions and FightMode
 */
IsoEngine.prototype.toggleGrid = function () {
	var isFightMode = this.gameContext === GameContextEnum.FIGHT;
	window.background.toggleGrid(isFightMode || gameOptions.alwaysShowGrid);
};

IsoEngine.prototype.setInteractiveBlink = function (enable) {
	this.interactiveBlink = enable;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Update map informations data.
 *
 * @param {Object} msg - MapComplementaryInformationsDataMessage
 */
IsoEngine.prototype._updateMapInfoData = function (msg, options) {
	this.mapRenderer.setStatedElements(msg.statedElements, this.gameContext === GameContextEnum.FIGHT);
	this.addChallenges(msg.fights);
	this.mapRenderer.setInteractiveElements(msg.interactiveElements);
	this.mapRenderer.updateObstacles(msg.obstacles);
	if (!options || !options.noMovementWaitReset) {
		this.isMovementWaitingForConfirmation = false;
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Called when we just reconnected - quick reco = we just lost connection for a few seconds
 *    and when the server is rejecting a user movement (GameMapNoMovementMessage)
 */
IsoEngine.prototype.onQuickReconnection = function (cb) {
	// If we were not connected to game (e.g. character creation), do nothing
	if (!window.gui.isConnected) {
		return cb && cb();
	}
	// If in fight do nothing
	if (window.gui.playerData && window.gui.playerData.isFighting) {
		return cb && cb();
	}

	this.endMovementCallback = null;
	this.isMovementCanceled = false;
	this.isMovementWaitingForConfirmation = false;
	this.mapRenderer.removeMovementFeedback();

	// if currently in a dialog we do nothing (foreground is already locked, actually)
	if (windowsManager.isDialogActive()) {
		return cb && cb();
	}

	// We block the user actor until we receive what we need from server
	window.foreground.lock('quickReconnection');

	this.lastMoveRequestTime = null; // we are not actually waiting for a confirmation but for the map update
	this.actorManager.pause();

	window.dofus.sendMessage('MapInformationsRequestMessage', { mapId: this.mapRenderer.mapId });

	var self = this;
	this.once('mapLoaded', function () {
		window.foreground.unlock('quickReconnection');
		if (self.userPreviousPosition) {
			var position  = self.userPreviousPosition;
			window.dofus.sendMessage('GameMapMovementCancelMessage', { cellId: position });
			var userActor = self.actorManager.userActor;
			userActor.noMovement();
			userActor.setDisposition(position, userActor.direction);
		}
		self.actorManager.unpause();
		return cb && cb();
	});
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Command to attack an actor.
 *
 * @param {number} actorId
 */
IsoEngine.prototype.attackActor = function (actorId) {
	var actors = this.actorManager.actors;
	var actor = actors[actorId];
	if (!actor) { return; }
	var cellId = actor.cellId;
	this._movePlayerOnMap(cellId);
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Resize canvas used for render map, background and grid.
 *  This function is called once on native to set dimensions of map relatively to Gui,
 *  on browser, this function is called when user resize the browser window.
 *
 * @param {Object} dimensions -
 */
IsoEngine.prototype.updateDimensions = function (dimensions) {
	this.mapScene.setCanvasDimensions(dimensions.mapWidth, dimensions.mapHeight,
		dimensions.mapLeft, dimensions.mapTop, 'absolute');
	this.mapScene.camera.setZoom(0); // Setting to smallest zoom level
	if (this.isInGame) {
		this.mapScene.requireCompleteRefresh();
	}
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** User tap somewhere on the map in fight to use an item
 * @private
 *
 * @param {number}  x       - x coordinate of point tappen on map canvas
 * @param {number}  y       - y coordinate of point tappen on map canvas
 * @param {number}  itemUID - item UID
 */
IsoEngine.prototype.useItem = function (x, y, itemUID) {
	var mapScenePosition = this.mapScene.convertCanvasToSceneCoordinate(x, y);
	var cellId = this.mapRenderer.getCellId(mapScenePosition.x, mapScenePosition.y).cell;
	var actors = this.actorManager.occupiedCells[cellId];
	if (actors && actors.length && actors[0].actorId >= 0) {
		window.dofus.sendMessage('ObjectUseOnCharacterMessage',
			{ characterId: actors[0].actorId, objectUID: itemUID }
		);
	} else {
		window.dofus.sendMessage('ObjectUseOnCellMessage',
			{ cells: cellId, objectUID: itemUID }
		);
	}
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

IsoEngine.prototype.toggleTacticMode = function (isTacticMode) {
	if (isTacticMode) {
		this.mapRenderer.enableTacticMode();
	} else {
		this.mapRenderer.disableTacticMode();
	}
};

IsoEngine.prototype.sendToFightSequence = function (msg) {
	this.emit(msg._messageType, msg);
};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/IsoEngine/main.js
 ** module id = 1012
 ** module chunks = 0
 **/