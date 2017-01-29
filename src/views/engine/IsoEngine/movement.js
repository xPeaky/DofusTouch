
var IsoEngine         = require('./main.js');
var pathFinder        = require('pathFinder');
var compressPath      = pathFinder.compressPath;
var GameContextEnum   = require('GameContextEnum');
var windowsManager    = require('windowsManager');
var getText           = require('getText').getText;
var connectionManager = require('dofusProxy/connectionManager.js');

/**
 * Max time between our ChangeMap request and our reception of "mapComplementaryInformationsData".
 * A delay over 2 seconds is already quite bad.
 * Impact of a too short timeout: user will be able to "move" around old map until we get a response.
 * Impact of a too long timeout: user stuck longer when map change is refused (e.g. our bug OR map 99614726).
 * NB: This is NOT the time it take to load the map.
 */
var CHANGE_MAP_TIMEOUT = 3000;

var MAX_SERVER_LAG_BEFORE_SPLASHSCREEN = 1000;


IsoEngine.prototype.onArrived = function (destination) {
	window.dofus.sendMessage('GameMapMovementConfirmMessage', null);
	this.mapRenderer.removeMovementFeedback();
	if (this.endMovementCallback) {
		var emCb = this.endMovementCallback;
		this.endMovementCallback = null;
		emCb(null, destination);
	}
};

/** Actor current movement is canceled by user */
IsoEngine.prototype.cancelUserActorMovement = function (cb) {
	if (this.isMovementWaitingForConfirmation) {
		if (this.lastMoveRequestTime && !windowsManager.isDialogActive() &&
			Date.now() - this.lastMoveRequestTime > MAX_SERVER_LAG_BEFORE_SPLASHSCREEN) {
			window.gui.connectionSplashScreen.onStateChange('UNSTABLE');
		}
		this.endMovementCallback = cb;
		this.isMovementCanceled = true;
		return;
	}
	this.isMovementCanceled = false;

	var userActor = this.actorManager.userActor;
	if (!userActor.moving) {
		this.endMovementCallback = cb;
		return this.onArrived();
	}

	this.mapRenderer.removeMovementFeedback();
	this.endMovementCallback = null;
	userActor.cancelMovement(cb);
};

// Called when server confirms the path of the user actor.
// NB: in roleplay mode, userActor doesn't wait for GameMapMovementMessage before moving.
IsoEngine.prototype.roleplayUserActorMovement = function (keyMovements) {
	var finalPosition = keyMovements[keyMovements.length - 1];
	var userActor = this.actorManager.userActor;

	this.isMovementWaitingForConfirmation = false;
	window.gui.connectionSplashScreen.onStateChange('CONNECTED');
	window.gui.emit('checkServerLag', 'roleplayUserActorMovement', 'stop');

	// Was the move canceled before we get the server confirm?
	if (this.isMovementCanceled) {
		return this.cancelUserActorMovement(this.endMovementCallback);
	}
	// Did actor already finish moving (or is he just standing for an unknown reason)?
	if (!userActor.moving) {
		// we check if user's current cell is part of the path that the server sent us
		var userStandsOnServerPath = null;
		for (var i = 0; i < keyMovements.length; i++) {
			if (keyMovements[i] === userActor.cellId) {
				userStandsOnServerPath = i;
				break;
			}
		}
		if (userStandsOnServerPath !== null) {
			// user is standing on the server path... is it the final cell?
			if (userActor.cellId === finalPosition) {
				userActor.setDisposition(finalPosition);
				return this.onArrived(finalPosition);
			}
			// let's catch up the path starting from the current cell
			var path = keyMovements.slice(userStandsOnServerPath);
			userActor.setPath(path);
			userActor.setCellPosition(path[path.length - 1]);
		} else {
			// If final position is not correct, we force it to match the server info
			if (userActor.cellId !== finalPosition) {
				userActor.setDisposition(finalPosition);
			}
			return this.onArrived(finalPosition);
		}
	}

	// Actor is still moving... We will confirm our move to server as soon we arrive there...
	this.removeAllListeners('arrived');
	this.once('arrived', this.onArrived);

	var newPath = [];
	if (userActor.isPathMatchingServerPath(keyMovements, newPath)) {
		return;
	} else if (newPath.length !== 0) {
		// Switch our path to the one proposed by server
		this.endMovementCallback = null;
		var self = this;
		return userActor.switchPath(newPath, function () {
			self.emit('arrived', finalPosition);
		});
	} else {
		// No way to reconcile the path with server; we simply "reappear" there
		userActor.noMovement();
		userActor.setDisposition(finalPosition);
		this.endMovementCallback = null;
		return this.onArrived(finalPosition);
	}
};

// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * @method  _movePlayerOnMap
 * @private
 *
 * @desc   Create path and animation of user actor to make it move on map.
 *         A callback function can be provided to be called once the animation ends.
 *
 * @param {number}   cellId           - position where to move user character
 * @param {boolean}  stopNextToTarget - whether the actor should stop one cell away from the target
 * @param {Function} [cb]             - optional callback function
 * @return {number|null}  planned destination cellId or null if no movement possible
 */
IsoEngine.prototype._movePlayerOnMap = function (cellId, stopNextToTarget, cb) {
	if (!cb || typeof cb !== 'function') { cb = function () {}; }

	// Mutant is a transformation (item * 8169). Mutants do not have inventory limit
	if (window.gui.playerData.inventory.isOverloaded() && !window.gui.playerData.isMutant()) {
		window.gui.chat.logMsg(getText('tablet.inventoryFullCannotMove'));
		return;
	}

	stopNextToTarget = stopNextToTarget || false;
	var userActor = this.actorManager.userActor;
	var source = userActor.cellId;
	if (source === cellId) {
		cb(null, cellId);
		return cellId;
	}

	// find a path from actual position to the tapped cell
	var map  = this.mapRenderer.map;
	var occupiedCells = this.actorManager.occupiedCells;
	var canMoveDiagonally = userActor.canMoveDiagonally;
	var path = pathFinder.getPath(source, cellId, occupiedCells, canMoveDiagonally, stopNextToTarget);

	if (path.length <= 1) {
		cb(new Error('_movePlayerOnMap noPath:' + source + ':' + cellId));
		return null;
	}

	// send request to the server and wait for the response.
	this.isMovementWaitingForConfirmation = true;
	this.lastMoveRequestTime = Date.now();
	window.gui.emit('checkServerLag', 'roleplayUserActorMovement', 'start');
	window.dofus.sendMessage('GameMapMovementRequestMessage', { keyMovements: compressPath(path), mapId: map.id });

	// create and trigger player animation
	var destination = path[path.length - 1];
	var self = this;

	this.mapRenderer.addMovementFeedback(destination);

	this.endMovementCallback = cb;
	userActor.setPath(path, { cb: function () {
		self.emit('arrived', destination);
	} });

	var camera = this.mapScene.camera;
	camera.setAcceleration(1);

	userActor.pathTween.removeOnUpdate();
	userActor.onMovementUpdate = function () {
		camera.moveTo(userActor.x, userActor.y);
	};
	userActor.pathTween.onUpdate(userActor.onMovementUpdate);

	this.userPreviousPosition = userActor.cellId;
	userActor.setCellPosition(destination);
	return destination;
};

// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * @method  cancelCameraMovement
 *
 * @desc    Stop the camera tweener started when the user actor is moving.
 */
IsoEngine.prototype.cancelCameraMovement = function () {
	var userActor = this.actorManager.userActor;
	userActor.pathTween.removeOnUpdate(userActor.onMovementUpdate);
};


// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * @method noMovement
 *
 * @desc   Movement request message has been refused, current user movement has
 *         to be cancel and user actor returned to his previous position.
 */
IsoEngine.prototype.noMovement = function () {
	if (this.gameContext === GameContextEnum.FIGHT) { return; }
	console.warn('[ISO ENGINE] previous movement request has been refused, canceling movement');

	// Block player moves until we receive the refreshed map info
	this.onQuickReconnection();
};

// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Get the cellId with correct changeMap flag at specified map canvas position
 *
 * @param  {number} x - tapped x coordinates (map canvas)
 * @param  {number} y - tapped y coordinates (map canvas)
 * @param  {String} direction - 'right' || 'left' || 'top' || 'bottom'
 *
 * @return {number} - the cellId if x,y corresponds to a map-change cell, or -1 otherwise
 */
IsoEngine.prototype.getChangeMapCellAt = function (x, y, direction) {
	var scenePosition = this.mapScene.convertCanvasToSceneCoordinate(x, y);
	if (!this.mapRenderer.isReady) {
		return -1;
	}
	var cellData = this.mapRenderer.getCellId(scenePosition.x, scenePosition.y);
	return this.mapRenderer.getChangeMapFlags(cellData.cell)[direction] ? cellData.cell : -1;
};

IsoEngine.prototype._requestMapChange = function (mapId, mapSide) {
	window.foreground.lock('loadMap');
	window.dofus.sendMessage('ChangeMapMessage', { mapId: mapId });
	this.launchMapTransition(mapSide);

	// Hanging ChangeMap logic (search tag #hangingChangeMap for other parts)
	var self = this;
	this.changeMapTimeout = window.setTimeout(function () {
		// Map change failed
		connectionManager.unlockMessages();

		self.changeMapTimeout = null;
		var foreground = window.foreground;
		foreground.unlock('loadMap');
		foreground.hideBorderArrow();
		self.cancelMapTransition(mapSide);
	}, CHANGE_MAP_TIMEOUT);
};

// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * @method class:IsoEngine.gotoNeighbourMap
 *
 * @desc   Request to change map
 *
 * @param {string} mapSide - 'right' || 'left' || 'top' || 'bottom'
 * @param {number} cellId  - cellId from where to change map
 * @param {number} x       - tapped x coordinates
 * @param {number} y       - tapped y coordinates
 */
IsoEngine.prototype.gotoNeighbourMap = function (mapSide, cellId, x, y) {
	var self = this;
	// if character is moving, cancel current movement
	if (this.actorManager.userActor.moving) {
		return this.cancelUserActorMovement(function () { self.gotoNeighbourMap(mapSide, cellId, x, y); });
	}

	// In tutorial, if not ready to change map we don't go near the border
	var tutorialManager = window.gui.tutorialManager;
	if (tutorialManager.inTutorial && !tutorialManager.isChangingMap) { return; }

	function whenMoveEnds(error, target) {
		if (error || target !== cellId) { return; }
		self._requestMapChange(self.mapRenderer.map[mapSide + 'NeighbourId'], mapSide);
	}

	var target = this._movePlayerOnMap(cellId, false, whenMoveEnds);
	if (target === cellId) {
		// add an 'arrow' picto to tell user that he will change map at the end of movement
		window.foreground.showBorderArrow(mapSide, x, y);
	}
};

// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * @method class:IsoEngine.clearPendingMovement
 *
 * @desc   To clear variables tracking the state of the movement, used for instance when we know that the
 *         server is not going to answer our latest movement request
 */
IsoEngine.prototype.clearPendingMovement = function () {
	this.isMovementWaitingForConfirmation = false;
	this.endMovementCallback = null;
	this.isMovementCanceled = false;
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/IsoEngine/movement.js
 ** module id = 1011
 ** module chunks = 0
 **/