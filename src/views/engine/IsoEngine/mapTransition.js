var constants  = require('constants');
var IsoEngine  = require('./main.js');
var pathFinder = require('pathFinder');

var assetPreloading = require('assetPreloading');
var templateLoading = require('templateLoading');

var Tween            = require('TINAlight').Tween;
var easing           = require('TINAlight').easing;
var Graphic          = require('Graphic');
var AnimatedGraphic  = require('AnimatedGraphic');
var AnimationManager = require('AnimationManager');

var AtlasAnimationTemplate = require('AtlasAnimationTemplate');

var connectionManager = require('dofusProxy/connectionManager.js');

var TRANSITION_RESOLUTION = 1200;

// Parameters of the user character walking out of the screen during the transition
var WALKING_DISTANCE = 100;
var WALKING_DURATION = 20;


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Holds the different elements to display a loading progress bar
 *
 * @param {Objet} scene - Scene the loading progress is displayed in
 */
function LoadingProgress(scene) {
	this.progressEgg = new AnimatedGraphic({
		scene: scene,
		position: 5,
		alpha: 1,
		x: scene.w / 2,
		y: scene.h / 2,
		isHudElement: true,
		id: 'loadingProgressEgg'
	});

	// Instantiating an animation manager with an empty template
	// The animation manager will remain but the template will be replaced when loading the loader's assets
	this.progressEgg.setAnimManager(new AnimationManager(this.progressEgg, new AtlasAnimationTemplate(''), 1.7, 0));
	this.progressEggFrameTween = new Tween(this.progressEgg.animManager, ['frame']);
	this.hide();
}

LoadingProgress.prototype.loadAssets = function (cb) {
	var animationManager = this.progressEgg.animManager;
	var textureCache     = this.progressEgg.renderer;

	templateLoading.loadTemplate('loader', 'loadingLogo', '', function (template) {
		animationManager.template = template;
		animationManager.assignSymbol({ base: 'loadeur', direction: -1 }, false);
		animationManager.tween.stop();
		animationManager.frame = 0;
		cb();
	}, textureCache, 'archivable');
};

LoadingProgress.prototype.hide = function () {
	this.progressEgg.hide();
	this.progressEgg.animManager.clear();
};

LoadingProgress.prototype.show = function () {
	this.progressEgg.show();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Initialisation of the loading progress system, should only need to be called once
 *
 */
IsoEngine.prototype._initLoadingProgress = function () {
	this._loadingProgress = new LoadingProgress(this.mapScene);
	this._resetTransition();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Resets transition related properties
 */
IsoEngine.prototype._resetTransition = function () {
	this._loadingFadeInTransitionRunning  = false;
	this._loadingProgressVisible = false;
	this._waitingForMessage = false;
	this._mapLoadingMessage = null;
	this._isMapLoading = false;
	this._mapSceneTransitionGraphic = null;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** To display the given loading progress ratio
 *
 * @param {Number} ratio - Progress ratio in [0, 1]
 */
IsoEngine.prototype.showLoadingProgress = function (ratio) {
	var progressEgg = this._loadingProgress.progressEgg;
	var nbFrames = progressEgg.animManager.nbFrames;

	if (this._loadingProgressVisible === false) {
		this._loadingProgressVisible = true;

		progressEgg.x = this.mapScene.w / 2;
		progressEgg.y = this.mapScene.h / 2;
		this._loadingProgress.show();

		this._loadingProgress.progressEggFrameTween.reset()
			.from({ frame: 0.0 })
			.to({ frame: 0.4 * nbFrames }, 30, easing.polyIn, 2)
			.start();
	} else {
		this._loadingProgress.progressEggFrameTween.reset()
			.from({ frame: progressEgg.animManager.frame })
			.to({ frame: (ratio * 0.7 + 0.4) * nbFrames }, 5)
			.start();
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** To hide the progress bar
 *
 */
IsoEngine.prototype._hideLoadingProgress = function () {
	this._loadingProgressVisible = false;
	this._loadingProgress.hide();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Called when disconnecting
 *
 */
IsoEngine.prototype.mapTransitionDisconnect = function () {
	if (this._mapSceneTransitionGraphic) {
		this._mapSceneTransitionGraphic.remove();
		this._resetTransition();
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** To make the user actor walk in the given direction with respect to the map side he goes to
 * If reverse is true, the actor will walk backward
 *
 * @param {Number} mapSide - side of the map the user is walking to
 * @param {Boolean} reverse - whether to reverse the walking direction
 */
IsoEngine.prototype._makeUserActorWalkInDirection = function (mapSide, reverse) {
	this.makeActorWalkInDirection(this.actorManager.userActor, mapSide, reverse);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** To make an actor walk in the given direction with respect to the map side he goes to
 * If reverse is true, the actor will walk backward
 *
 * @param {Number} mapSide - side of the map the user is walking to
 * @param {Boolean} reverse - whether to reverse the walking direction
 */
IsoEngine.prototype.makeActorWalkInDirection = function (actor, mapSide, reverse, cb) {
	if (!actor) {
		console.error(new Error('makeActorWalkInDirection: actor is ' + actor));
		if (cb) { cb(); }
		return;
	}

	var walkingDirection;
	switch (mapSide) {
		case 'top':    walkingDirection = 6; break;
		case 'bottom': walkingDirection = 2; break;
		case 'left':   walkingDirection = 4; break;
		case 'right':  walkingDirection = 0; break;
		default:       walkingDirection = 0; break;
	}

	var angle = constants.ANGLE_PER_DIRECTION[walkingDirection];
	if (reverse) {
		angle += Math.PI;
	}

	var dx = Math.cos(angle) * WALKING_DISTANCE;
	var dy = Math.sin(angle) * WALKING_DISTANCE;

	actor.walkToSceneCoordinate(actor.x + dx, actor.y + dy, walkingDirection, WALKING_DURATION, cb);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** To launch the map transition
 *
 * @param {Number} mapSide - Side of the map involved in the transition
 */
IsoEngine.prototype.launchMapTransition = function (mapSide) {
	var self = this;
	this._loadingProgress.loadAssets(function () {
		self.mapScene.setShader('mapTransition');
		self.emit('launchMapTransition', mapSide);
		if (self._activateMapScene()) {
			// Scene is activating
			// No map is currently showing on the scene

			// Initiating the loading of the map without playing the fade in transition
			self._loadingProgress.progressEgg.alpha = 1;
			self.mapScene.renderingParams.ratio = 1.0;
			self._saveImageForTransition('black');
			self._startLoading();
		} else {
			if (self._loadingFadeInTransitionRunning === false) {
				if (self._isMapLoading) {
					self._startLoading();
				} else {
					if (mapSide) {
						// Making the user walk out
						self._makeUserActorWalkInDirection(mapSide, false);
					}

					// Running the fade in transition
					self._runLoadingFadeInTransition();
				}
			}
		}
	});
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** To cancel the map transition
 *
 * @param {Number} mapSide - Side of the map involved in the transition
 */
IsoEngine.prototype.cancelMapTransition = function (mapSide) {
	this.emit('cancelMapTransition', mapSide);
	this.actorManager.userActor.setOnScreenPosition(this.actorManager.userActor.position);
	this._makeUserActorWalkInDirection(mapSide, true);
	if (this._waitingForMessage) {
		this._runLoadingFadeOutTransition();
	}
	this._mapLoadingMessage = null;
	this._waitingForMessage = false;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** To save an image that will be used for making the transition between two maps
 *
 * @param {String} imageChoice - Type of image to save for the transition
 */
IsoEngine.prototype._saveImageForTransition = function (imageChoice) {
	var textureW = TRANSITION_RESOLUTION;
	var textureH = textureW * this.mapScene.h / this.mapScene.w;

	var renderer = this.mapScene.renderer;
	var renderTarget = renderer.startTextureUsage(textureW, textureH, 1, null, 'linear');

	// Start texture rendering
	renderer.startTextureRendering(renderTarget, 0, textureW, 0, textureH, false);

	if (imageChoice === 'black') {
		this.mapScene.clear(0.0, 0.0, 0.0, 1.0);
	} else {
		// Rendering scene into the texture
		var ratio = textureW / this.mapScene.w;
		renderer.save();
		renderer.scale(ratio, ratio);
		this.mapScene.render();
		renderer.restore();
	}

	// Stop texture rendering
	var deleteFrameBuffer = true;
	renderer.stopTextureRendering(deleteFrameBuffer);

	if (this._mapSceneTransitionGraphic === null) {
		this._mapSceneTransitionGraphic = new Graphic({
			w: this.mapScene.w,
			h: this.mapScene.h,
			scene: this.mapScene,
			position: 0,
			isHudElement: true,
			alpha: 1
		}, renderTarget.texture);
	} else {
		this._mapSceneTransitionGraphic.clear();
		this._mapSceneTransitionGraphic.texture = renderTarget.texture;
		this._mapSceneTransitionGraphic.show();
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** To run the fade in transition
 *
 */
IsoEngine.prototype._runLoadingFadeInTransition = function () {
	this._loadingFadeInTransitionRunning = true;
	this._waitingForMessage = true;

	this.showLoadingProgress(0);

	Tween(this._loadingProgress.progressEgg, ['alpha', 'scaleX', 'scaleY'])
		.from({ alpha: 0.0, scaleX: 0.8, scaleY: 0.8 })
		.to({ alpha: 1.0, scaleX: 1.0, scaleY: 1.0 }, 15, easing.backOut, 1.5)
		.start();

	this.mapScene.renderingParams.ratio = 0.0;
	var self = this;
	Tween(this.mapScene.renderingParams, ['ratio'])
		.from({ ratio: 0.0 })
		.to({ ratio: 1.0 }, 15, easing.polyInOut, 3)
		.start()
		.onFinish(function startLoading() {
			self._saveImageForTransition('current');
			self._loadingFadeInTransitionRunning = false;
			self._startLoading();
		});
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** To run the fade out transition
 *
 */
IsoEngine.prototype._runLoadingFadeOutTransition = function () {
	var self = this;
	var mapScene = this.mapScene;

	Tween(this._loadingProgress.progressEgg, ['alpha', 'scaleX', 'scaleY'])
		.from({ alpha: 1.0, scaleX: 1.0, scaleY: 1.0 })
		.to({ alpha: 0.0, scaleX: 0.8, scaleY: 0.8 }, 10, easing.backIn, 1.5)
		.start();

	Tween(this._mapSceneTransitionGraphic, ['alpha'])
		.from({ alpha: 1 })
		.to({ alpha: 0 }, 10)
		.onFinish(function () {
			if (self._mapSceneTransitionGraphic !== null) {
				self._mapSceneTransitionGraphic.remove();
				self._mapSceneTransitionGraphic = null;
			}
		})
		.start();

	Tween(mapScene.renderingParams, ['ratio'])
		.from({ ratio: 1.0 })
		.to({ ratio: 0.0 }, 25, easing.polyInOut, 2)
		.onFinish(function () {
			mapScene.setShader('unfiltering');
			mapScene.renderingParams.ratio = 0.15;
			self._hideLoadingProgress();
		})
		.start();

	// Making user actor walk into the map
	this.makeActorWalkIn(this.actorManager.userActor);
};

IsoEngine.prototype.makeActorWalkIn = function (actor, maxBorderDistance, cb) {
	maxBorderDistance = maxBorderDistance || 100;
	var mapScene = this.mapScene;

	// Determining what side of the map the actor is on
	var currentX = actor.x;
	var currentY = actor.y;
	var distL = Math.abs(mapScene.l - currentX);              // distance to left side of the map
	var distR = Math.abs(mapScene.l + mapScene.w - currentX); // distance to right side of the map
	var distT = Math.abs(mapScene.t - currentY);              // distance to top side of the map
	var distB = Math.abs(mapScene.t + mapScene.h - currentY); // distance to bottom side of the map

	var onLeft   = (distL < maxBorderDistance);
	var onRight  = (distR < maxBorderDistance);
	var onTop    = (distT < maxBorderDistance);
	var onBottom = (distB < maxBorderDistance);

	var walkingDirection;
	if (onLeft) {
		if (onTop) { // top left
			walkingDirection = 1;
		} else if (onBottom) { // bottom left
			walkingDirection = 7;
		} else { // left
			walkingDirection = 0;
		}
	} else if (onRight) {
		if (onTop) { // top right
			walkingDirection = 3;
		} else if (onBottom) { // bottom right
			walkingDirection = 5;
		} else { // right
			walkingDirection = 4;
		}
	} else if (onTop) { // top
		walkingDirection = 2;
	} else if (onBottom) { // bottom
		walkingDirection = 6;
	} else {
		// Heuristic:
		// If the actor is not close to any side of the map
		// Then it does not walk into the map, he just appears where he is supposed to be
		return;
	}

	// var walkingDirection = actor.animSymbol.direction;
	var actorWalkingRotation = constants.ANGLE_PER_DIRECTION[walkingDirection];
	actor.x -= Math.cos(actorWalkingRotation) * WALKING_DISTANCE;
	actor.y -= Math.sin(actorWalkingRotation) * WALKING_DISTANCE;
	actor.walkToSceneCoordinate(currentX, currentY, walkingDirection, WALKING_DURATION, cb);
};



//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Load and update map when receiving map informations data from the server.
 *  This function is executed when user change map (and only if mapId has changed)
 *
 * @param {Object} msg - MapComplementaryInformationsDataMessage
 */
IsoEngine.prototype.loadMap = function (msg) {
	// foreground is unlocked only if we timed-out. See #hangingChangeMap logic.
	if (this.changeMapTimeout) {
		window.clearTimeout(this.changeMapTimeout);
		this.changeMapTimeout = null;
	} else {
		window.foreground.lock('loadMap');
	}

	this._mapLoadingMessage = msg;
	if (this._loadingFadeInTransitionRunning === false) {
		if (this._waitingForMessage) {
			this._startLoading();
		} else {
			this.launchMapTransition();
		}
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Reload map informations
 *
 */
IsoEngine.prototype.reloadMap = function (msg) {
	if (!this.mapRenderer.isReady) {
		// Two `MapComplementaryInformationsDataMessage` for same map has been consecutively sent
		// by the server. We should wait that the previous message is processed before executing reload.
		var self = this;
		this.mapRenderer.once('ready', function () {
			self.reloadMap(msg);
		});
		return;
	}
	this._updateMapInfoData(msg, {
		noMovementWaitReset: true
	});
	window.foreground.show();
	window.foreground.unlock('loadMap');
	this.actorManager.updateMapInfoData(msg);
	this.emit('mapLoaded', { isReload: true });
	if (this.interactiveBlink) {
		this.highlightInteractivesWithDifferentType();
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** To initiate the loading of the map
 *
 */
var requestedMapData = null;
var lastRequestedMapId = null;
IsoEngine.prototype._startLoading = function () {
	var msg = this._mapLoadingMessage;
	if (msg === null) {
		return;
	}

	this._mapLoadingMessage = null;
	this._waitingForMessage = false;

	this.actorManager.pause();

	var mapId = msg.mapId;
	if (mapId === lastRequestedMapId) {
		// Requesting to load the same map that is currently loading
		return;
	}

	this.releaseMap(lastRequestedMapId);
	lastRequestedMapId = mapId;
	this._isMapLoading = true;

	var self = this;
	var mapJsonPath = constants.MAP_PATH + mapId + '.json';
	assetPreloading.loadJson(mapJsonPath, function (mapData) {
		if (mapData === constants.EMPTY_JSON) {
			return window.dofus.disconnect('ASSET_MISSING');
		}

		if (mapData.id !== lastRequestedMapId) {
			// Another map was requested to load
			return;
		}

		if (requestedMapData === null) {
			requestedMapData = { msg: msg, mapData: mapData };
			self._loadMapAssets();
		} else {
			requestedMapData = { msg: msg, mapData: mapData };
		}
	});
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** To load the map assets
 *
 */
IsoEngine.prototype._loadMapAssets = function () {
	var msg     = requestedMapData.msg;
	var mapData = requestedMapData.mapData;
	// enrichStatedElements(msg, mapData);

	var self = this;
	this.mapRenderer.setMap(requestedMapData, function readyMapForInteraction() {
		if (requestedMapData !== null && lastRequestedMapId !== mapData.id) {
			// Another map was requested to load
			self._loadMapAssets();
			return;
		}

		// TODO: load actors before readying the map?
		window.foreground.show();
		window.foreground.unlock('loadMap');
		pathFinder.fillPathGrid(mapData);
		self._updateMapInfoData(msg);
		self.actorManager.updateMapInfoData(msg);
		self.actorManager.unpause();
		self.actorManager.userActor.moving = false;

		// Now that the map has been loaded and created, we can unlock all the messages
		connectionManager.unlockMessages();

		self.emit('mapLoaded');

		self._runLoadingFadeOutTransition();

		if (self.interactiveBlink) {
			self.highlightInteractivesWithDifferentType();
		}

		lastRequestedMapId = null;
		requestedMapData = null;
		self._isMapLoading = false;
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/IsoEngine/mapTransition.js
 ** module id = 1059
 ** module chunks = 0
 **/