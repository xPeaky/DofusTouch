var IsoEngine          = require('./main.js');
var fightMovement      = require('fightMovement');
var compressPath       = require('pathFinder').compressPath;
var Bresenham          = require('Bresenham');
var mapPoint           = require('mapPoint');
var playUiSound        = require('audioManager').playUiSound;
var CellInfo           = require('CellInfo');
var transformStates    = require('transformStates');
var losDetector        = require('losDetector');
var gameOptions        = require('gameOptions');
var trueName           = require('rumplestiltskin').trueName;

var aimingCurrentTarget        = null;
var fightMovementReachableZone = null;
var infoboxDisplayed           = false;
var displayedPath              = null;

var bresenham = new Bresenham();


function toggleInfobox(type, value) {
	if (type) {
		infoboxDisplayed = true;
		window.foreground.showInfobox(type, value);
	} else if (infoboxDisplayed) {
		infoboxDisplayed = false;
		window.foreground.hideInfobox();
	}
}

function cleanupMovementDisplayed() {
	aimingCurrentTarget = null;
	displayedPath = null;
	toggleInfobox(false);
}

function resetParams() {
	fightMovementReachableZone = null;
	cleanupMovementDisplayed();
}

IsoEngine.prototype.fightTurnStart = function (userTurn) {
	this._previousTurn = this._isUserTurn;
	this._isUserTurn = userTurn;
	window.background.hideTargetHighlights();
	this._resetFightPositionLayer();
	if (this._previousTurn !== this._isUserTurn) { // if we switch from enemy turn, to enemy turn, skip color changing
		if (userTurn) {
			this._enemyToUserTurn();
		} else {
			this._userToEnemyTurn();
		}
	}
	this._resetWalkLayer();
	resetParams();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/* Changes the grid overlays with respect to whose turn it is.
 * It basically just loops through, checks the target of the cell animation, and changes them.
 * see comments in GridAnimator for more details on how the grid animations work.
 * for more info about the nodes / container, see DoublyList
 * this has to be done for spell range cells, and spell area of effect cells
 * for spell range cells it is also different if the cells are in or out of line of sight.
 *  Depending on current game context and options, actions can be different.
 *
 * @param {TransformState} currentISState - current in-sight state
 * @param {TransformState} newISState     - new in-sight state
 * @param {TransformState} currentOSState - current out-of-sight state
 * @param {TransformState} newOSState     - new out-of-sight state
 * @param {TransformState} newAOEState    - new area-of-effect state
 */
IsoEngine.prototype._switchTurn = function (currentISState, newISState, currentOSState, newOSState, newAOEState) {
	if (this._spellRangeLayer) {
		var cellInfos = {};
		var currentCellInfos = this._spellRangeLayer.cellInfos;
		var cellIds = Object.keys(currentCellInfos);
		for (var i = 0; i < cellIds.length; i++) {
			var cellInfo = currentCellInfos[cellIds[i]];
			if (cellInfo.transformState === currentISState) {
				cellInfos[cellInfo.cellId] = new CellInfo(
					cellInfo.cellId,
					cellInfo.distanceToPlayer,
					newISState
				);
			} else if (cellInfo.transformState === currentOSState) {
				cellInfos[cellInfo.cellId] = new CellInfo(
					cellInfo.cellId,
					cellInfo.distanceToPlayer,
					newOSState
				);
			}
		}

		if (Object.keys(cellInfos).length !== 0) { // hack, casting between turns
			this._resetSpellRangeLayer(cellInfos);
		}
	}

	if (this._spellEffectLayer) {
		cellInfos = {};
		currentCellInfos = this._spellEffectLayer.cellInfos;
		cellIds = Object.keys(currentCellInfos);
		for (i = 0; i < cellIds.length; i++) {
			cellInfo = currentCellInfos[cellIds[i]];
			cellInfos[cellInfo.cellId] = new CellInfo(
				cellInfo.cellId,
				cellInfo.distanceToPlayer,
				newAOEState
			);
		}
		this._resetSpellEffectLayer(cellInfos);
	}
};

IsoEngine.prototype._enemyToUserTurn = function () {
	window.background.showTargetHighlights();
	window.foreground.confirmBox.show();

	this._switchTurn(
		transformStates.inSightEnemyTurn,
		transformStates.inSight,
		transformStates.outSightEnemyTurn,
		transformStates.outSight,
		transformStates.areaOfEffect
	);
};

IsoEngine.prototype._userToEnemyTurn = function () {
	this._switchTurn(
		transformStates.inSight,
		transformStates.inSightEnemyTurn,
		transformStates.outSight,
		transformStates.outSightEnemyTurn,
		transformStates.areaOfEffectEnemyTurn
	);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Touch cancel */
IsoEngine.prototype.touchCancel = function () {
	this.clearHighlights();
	resetParams();
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

function getPath(source, target, zone) {
	var node = zone[target];
	if (!node) { return null; }
	if (!node.path) {
		var current = target;
		var reachable = [];
		var reachableMap = {};
		var unreachable = [];
		var unreachableMap = {};
		var mp = 0;
		var ap = 0;
		var distance = 0;
		while (current !== source) {
			var cell = zone[current];
			if (cell.reachable) {
				reachable.unshift(current);
				reachableMap[current] = distance;
			} else {
				unreachable.unshift(current);
				unreachableMap[current] = distance;
			}
			mp += cell.mp;
			ap += cell.ap;
			current = cell.from;
			distance += 1;
		}
		node.path = {
			reachable: reachable,
			unreachable: unreachable,
			mp: mp,
			ap: ap,
			reachableMap: reachableMap,
			unreachableMap: unreachableMap
		};
	}

	return node.path;
}


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Touch move */
IsoEngine.prototype.touchMove = function (x, y, options) {
	var mapScenePosition = this.mapScene.convertCanvasToSceneCoordinate(x, y);
	var cellId = this.mapRenderer.getCellId(mapScenePosition.x, mapScenePosition.y).cell;
	// the cell is the same as previous touchmove event, no need to update anything

	if (aimingCurrentTarget === cellId) { return; }
	aimingCurrentTarget = cellId;

	if (options.mode === 'fight' && options.spellId !== undefined) {
		// Fight mode, with a spell selected. We display the spell effect zone
		this.displayEffectZone(cellId);
	} else if (options.mode === 'fight' && this._isUserTurn) {
		var actorCells = this.actorManager.occupiedCells;
		if (actorCells[cellId]) {
			this._resetWalkLayer();
		} else {
			window.foreground.confirmBox.close();
			displayedPath = this._displayPathInFight(cellId);
		}
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
IsoEngine.prototype._displayPathInFight = function (targetCellId) {
	var userActor = this.actorManager.userActor;
	var position  = userActor.cellId;
	fightMovementReachableZone = fightMovementReachableZone || fightMovement.getReachableZone(userActor, position);
	var target = targetCellId;
	if (!fightMovementReachableZone[targetCellId]) {
		var sourceCoord = mapPoint.getMapPointFromCellId(position);
		var targetCoord = mapPoint.getMapPointFromCellId(target);
		bresenham.set(sourceCoord.x, sourceCoord.y, targetCoord.x, targetCoord.y);
		bresenham.exec(function (x, y) {
			var cellId = mapPoint.getCellIdFromMapPoint(x, y);
			if (fightMovementReachableZone[cellId]) {
				target = cellId;
			} else {
				bresenham.stop();
			}
		});
	}

	var path = getPath(position, target, fightMovementReachableZone);
	if (!path) { return cleanupMovementDisplayed(); }

	//path isn't going to be large, so just do it here.
	var lastCell = path.reachable[path.reachable.length - 1];

	var cellInfos = {};
	for (var i = 0; i < path.reachable.length; i++) {
		cellInfos[path.reachable[i]] =
			new CellInfo(
				path.reachable[i],
				path.reachableMap[path.reachable[i]],
				transformStates.walkable
			);
	}

	for (var j = 0; j < path.unreachable.length; j++) {
		cellInfos[path.unreachable[j]] =
			new CellInfo(
				path.unreachable[j],
				path.unreachableMap[path.unreachable[j]],
				transformStates.unwalkable
			);
	}

	if (path.reachable.length > 0) {
		cellInfos[lastCell] =
			new CellInfo(
				lastCell,
				0,
				transformStates.walkableLast
			);
	}

	window.background.removeTargetHighlights();
	this._resetWalkLayer(cellInfos);

	if (path.mp > 0 || path.ap > 0) {
		toggleInfobox('tackle', { ap: path.ap, mp: path.mp });
	} else {
		toggleInfobox(false);
	}

	return path;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** User tap somewhere on the map to perform an action.
 *  Depending on current game context and options, actions can be different.
 *
 * @param {number}   x        - x coordinate (canvas coordinate system) on map where clic/tap occured
 * @param {number}   y        - y coordinate (canvas coordinate system) on map where clic/tap occured
 * @param {Object}  [options] - options parameter (is a special action is associated with this tap, e.g. use spell, ...)
 *
 * @param {string}  [options.mode]    - game context mode : 'fightPlacement' | 'fight' | 'roleplay'
 * @param {boolean} [options.move]    - in fight mode, request to move
 * @param {number}  [options.spellId] - selected spell id
 */
IsoEngine.prototype.touchEnd = function (x, y, options) {
	options = options || {};
	options.canvasX = x;
	options.canvasY = y;
	var scenePosition = this.mapScene.convertCanvasToSceneCoordinate(x, y);
	var mapRenderer = this.mapRenderer;
	var closestCell = mapRenderer.getCellId(scenePosition.x, scenePosition.y);
	var coords = mapRenderer.getCellSceneCoordinate(closestCell.cell);
	mapRenderer.addTapFeedback(coords.x, coords.y);
	this._touchEnd(scenePosition.x, scenePosition.y, closestCell, options);
};

var currentHoverCellId = null;

IsoEngine.prototype.cellHover = function (cellId) {
	if (window.gui.playerData.isFighting) {
		this._hovering = true;
		if (currentHoverCellId !== cellId) {
			currentHoverCellId = cellId;
			this.displayEffectZone(cellId);
		}
	}
};

IsoEngine.prototype.cellHoverRelease = function (cellId) {
	if (this._spellRangeLayer && this._spellRangeLayer.cellInfos.hasOwnProperty(cellId)) {
		if (gameOptions.confirmBoxWhenDragCasting) {
			this._castSpellImmediatelyConfirm(cellId);
		} else {
			this._castSpellImmediately(cellId);
			this.clearSpellDisplay();
		}
	} else {
		this.clearSpellDisplay();
	}
	this._hovering = false;
	if (this._isUserTurn && !gameOptions.confirmBoxWhenDragCasting) {
		this.displayUserMovementZone();
	}
};

/**
 * @param {number}  x                 - x coordinate (scene coordinate system)
 * @param {number}  y                 - y coordinate (scene coordinate system)
 * @param {object}  closestCell       - closest cell to the coordinate
 * @param {string}  [options]
 *
 * @param {string}  [options.mode]    - game context mode : 'fightPlacement' | 'fight' | 'roleplay'
 * @param {boolean} [options.move]    - in fight mode, request to move
 * @param {number}  [options.spellId] - selected spell id
 * @param {number}  [options.canvasX] - x coordinate (canvas coordinate system)
 * @param {number}  [options.canvasY] - y coordinate (canvas coordinate system)
 */
IsoEngine.prototype._touchEnd = function (x, y, closestCell, options) {
	if (!options.hasOwnProperty('mode')) {
		return;
	} else if (window.gui.pingSystem.isActive()) {
		this._tapPing(x, y, closestCell);
	} else if (options.mode === 'fightPlacement') {
		this._tapFightPlacement(x, y, closestCell, options);
	} else if (options.mode === 'fight' && options.spellId !== undefined) {
		this._tapFightWithSpell(x, y, closestCell, options);
	} else if (options.mode === 'fight' && this._isUserTurn) {
		this._tapFight(x, y, closestCell, options);
	} else if (options.mode === 'roleplay') {
		this._tapRoleplay(x, y, closestCell, options);
	}

	resetParams();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

/**
 * @param {number}  x                 - x coordinate (scene coordinate system)
 * @param {number}  y                 - y coordinate (scene coordinate system)
 * @param {object}  closestCell       - closest cell to the coordinate
 */
IsoEngine.prototype._tapPing = function (x, y, closestCell) {
	var pingSystem = window.gui.pingSystem;

	// if pingBox already opened we cancel it

	if (pingSystem.isPingBoxOpen()) {
		return pingSystem.cancelPingBox();
	}

	var isEmptyCell = true;
	// is it occupied cell?

	var actorsOnCell = this.actorManager.occupiedCells[closestCell.cell] || [];
	if (actorsOnCell.length > 0) {
		isEmptyCell = false;
	}

	var cellId = closestCell.cell;
	pingSystem.openPingBox(cellId, isEmptyCell);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

/**
 * @param {number}  x                 - x coordinate (scene coordinate system)
 * @param {number}  y                 - y coordinate (scene coordinate system)
 * @param {object}  closestCell       - closest cell
 * @param {string}  [options]
 *
 * @param {string}  [options.mode]             - game context mode : 'fightPlacement' | 'fight' | 'roleplay'
 * @param {boolean} [options.move]             - in fight mode, request to move
 * @param {number}  [options.spellId]          - selected spell id
 * @param {number}  [options.canvasX]          - x coordinate (canvas coordinate system)
 * @param {number}  [options.canvasY]          - y coordinate (canvas coordinate system)
 * @param {string}  [options.changeMapRequest] - if specified, change map is requested to the given side:
 *                                               'left' | 'right' | 'top' | 'bottom'
 */
IsoEngine.prototype._tapRoleplay = function (x, y, closestCell, options) {
	var self = this;
	var canvasX = options.canvasX;
	var canvasY = options.canvasY;

	var changeMapRequest = options.changeMapRequest;

	var mapRenderer = this.mapRenderer;
	var userActor = this.actorManager.userActor;
	var isActionQueued = this.actionQueue.isActive();

	if (isActionQueued) { // an action (or a queue of actions) is in progress
		var interactiveTriggered = this._tapInteractive(x, y);

		if (!interactiveTriggered && !userActor.moving) { // user did not tap on an interactive
			changeMapRequest = changeMapRequest || mapRenderer.getFirstMapFlag(closestCell.cell);
			if (changeMapRequest) { // user tapped a map border (to change map)
				// in this case we attempt to push a new action in the queue
				var endOfQueueOnly = true;
				var enqueued = this.actionQueue.enqueue(
					'changeMap',
					endOfQueueOnly,
					function () {
						self.gotoNeighbourMap(changeMapRequest, closestCell.cell, canvasX, canvasY);
					}
				);
				// if it has been enqueued, we can display the arrow on screen border
				if (enqueued) {
					window.foreground.showBorderArrow(changeMapRequest, canvasX, canvasY);
				}
				return;
			}

			if (this.isWaitingForInteractiveUseServerAnswer()) {
				return;
			}
		}
	}

	if (userActor.isLocked) {
		return;
	}

	// check if character is moving
	if (userActor.moving || this.isMovementWaitingForConfirmation) {
		window.foreground.hideBorderArrow(); // TODO: we might want to check if arrow is displayed.
		if (isActionQueued && !changeMapRequest && this._tapInteractive(x, y)) {
			return;
		}

		// cancel current movement and re-trigger touch.
		this.clearHighlights();
		this.actionQueue.clear();
		this.cancelUserActorMovement(function () {
			self._touchEnd(x, y, closestCell, options);
		});
		return;
	}

	// When the tap is a map change request
	// Tapping interactives or actors should be skipped
	if (!changeMapRequest) {
		// check if an interactive element is tapped
		if (this._tapInteractive(x, y)) { return; }

		// from coordinate, get the cellId that have been tapped
		var actorsOnCell = this.actorManager.occupiedCells[closestCell.cell];

		// if the actor who is at the occupiedCell doesn't match his position, he is moving, don't click him.
		if (actorsOnCell && actorsOnCell[0] && actorsOnCell[0].position === closestCell) {
			if (closestCell.dist === 0) {
				actorsOnCell[0].tap(x, y, mapRenderer.camera);
			}
			return;
		}
	}

	this.clearHighlights();

	var cellId = closestCell.cell;

	// check if tapped cell can be used to change map
	// TODO: check where we tap in the cell
	changeMapRequest = changeMapRequest || mapRenderer.getFirstMapFlag(closestCell.cell);
	if (changeMapRequest) {
		return this.gotoNeighbourMap(changeMapRequest, closestCell.cell, canvasX, canvasY);
	}

	this._movePlayerOnMap(cellId);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** User tap somewhere on the map with a spell selected.
 * @private
 *
 * @param {number}  x                   - x coordinate (scene coordinate system)
 * @param {number}  y                   - y coordinate (scene coordinate system)
 * @param {Object}  options             - options parameter
 *        {number}  options.spellId     - selected spell id
 *        {boolean} options.characterId - controlled character id (slave)
 */
IsoEngine.prototype._tapFightWithSpell = function (x, y, closestCell, options) {
	var cellId = closestCell.cell;
	if (!window.foreground.fightIsUserTurn) {
		// this.displayEffectZone(cellId);
		options.hideConfirmWindow = true;
	} else {
		options.hideConfirmWindow = false;
	}

	if (gameOptions.confirmBoxWhenClickCasting) {
		this._castSpellConfirm(cellId, x, y, options);
	} else {
		this._castSpell(cellId, x, y, options);
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
IsoEngine.prototype.displayUserMovementZone = function () {
	if (!this.mapRenderer.isReady || this._hovering) { return; }
	if (window.gui.playerData.isSpectator) { return; }

	this.clearSpellDisplay();

	var userActor   = this.actorManager.userActor;
	var position    = userActor.cellId;
	var zone        = fightMovementReachableZone || fightMovement.getReachableZone(userActor, position);

	this.clearUserMovementZone();

	var hasCells;
	var cellInfos = {};
	var actorCellId = window.isoEngine.actorManager.userActor.cellId;
	for (var cellId in zone) {
		var distanceFromCharacter = losDetector.getDistance(actorCellId, cellId);
		var transformState;
		if (zone[cellId].reachable) {
			if (zone[cellId].ap > 0) {
				transformState = transformStates.walkAreaRequiresAP;
			} else {
				transformState = transformStates.walkArea;
			}
		} else {
			transformState = transformStates.walkAreaRestricted;
		}
		cellInfos[cellId] =
			new CellInfo(
				~~cellId,
				distanceFromCharacter,
				transformState
			);
		hasCells = true;
	}

	if (hasCells) {
		this._resetWalkAreaLayer(cellInfos);
	}
};

IsoEngine.prototype.tryDisplayUserMovementZone = function () {
	if (this._spellRangeLayer) {
		this.displaySpellRange();
		return;
	}

	this.displayUserMovementZone();
};

IsoEngine.prototype.displayEnemyMovementZone = function (fighter) {
	if (!this.mapRenderer.isReady) { return; }

	this.clearSpellDisplay();

	var actor   = this.actorManager.getActor(fighter.id);
	var position    = actor.cellId;
	var zone        = fightMovement.getReachableZone(actor, position);

	this._resetWalkAreaLayer();

	var hasCells;
	var cellInfos = {};

	var cellIds = Object.keys(zone);
	for (var i = 0; i < cellIds.length; i++) {
		var cellId = cellIds[i];
		var distanceFromCharacter = losDetector.getDistance(position, cellId);
		var transformState;
		if (zone[cellId].reachable) {
			if (zone[cellId].ap > 0) {
				transformState = transformStates.enemyWalkAreaRequiresAP;
			} else {
				transformState = transformStates.enemyWalkArea;
			}
		} else {
			transformState = transformStates.enemyWalkAreaRestricted;
		}
		cellInfos[cellId] =	new CellInfo(~~cellId, distanceFromCharacter, transformState);
		hasCells = true;
	}

	if (hasCells) {
		this._resetEnemyWalkAreaLayer(cellInfos);
	}
};

IsoEngine.prototype.removeEnemyMovementZone = function () {
	this._resetEnemyWalkAreaLayer();
	if (this._isUserTurn) {
		if (window.foreground.isSpellSelected()) {
			window.foreground._displaySpellRange();
		} else {
			this.displayUserMovementZone();
		}
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** User tap somewhere on the map in fight mode.
 * @private
 *
 * @param {number}  x           - x coordinate (scene coordinate system)
 * @param {number}  y           - y coordinate (scene coordinate system)
 * @param {object}  closestCell - closest cell to the coordinate
 * @param {Object}  options     - options parameter
 */
IsoEngine.prototype._tapFight = function (x, y, closestCell) {
	var id         = this.mapRenderer.map.id;
	var cellId     = closestCell.cell;
	var position   = this.actorManager.userActor.cellId;
	var confirmBox = window.foreground.confirmBox;
	var self = this;

	if (this.actorManager.occupiedCells[cellId] || !this._isUserTurn) {
		cleanupMovementDisplayed();
		this._resetWalkLayer();
		confirmBox.close();
		return;
	}

	if (!displayedPath) {
		displayedPath = this._displayPathInFight(cellId);
	}

	if (!displayedPath ||
		displayedPath.reachable.length === 0 || // tap on user actor
		(!aimingCurrentTarget && // tap, not slide
			displayedPath.reachable.indexOf(cellId) === -1 && // outside spell green area
			displayedPath.unreachable.indexOf(cellId) === -1)) { // outside spell red area
		cleanupMovementDisplayed();
		this._resetWalkLayer();
		confirmBox.close();
		return;
	}

	function confirm(valid) {
		if (!valid) {
			self._resetWalkLayer();
			return;
		}
		path.unshift(position);
		window.gui.emit('checkServerLag', 'fightAction', 'start');
		window.dofus.sendMessage('GameMapMovementRequestMessage', {
			keyMovements: compressPath(path),
			mapId: id
		});

		self._resetWalkLayer();
		resetParams();
	}

	if (displayedPath) {
		var path = displayedPath.reachable;
		var cost = { mp: path.length + displayedPath.mp, ap: displayedPath.ap };
		var actionId = trueName(['move', cost, path, cellId, id]);

		if (gameOptions.confirmBoxWhenWalking) {
			confirmBox.open('move', cost, confirm, actionId);
		} else {
			confirm(true);
		}
	}
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** User tap somewhere on the map in fight preparation mode.
 * @private
 *
 * @param {number}  x           - x coordinate (scene coordinate system)
 * @param {number}  y           - y coordinate (scene coordinate system)
 * @param {object}  closestCell - closest cell to the coordinate
 * @param {Object}  options     - options parameter
 */
IsoEngine.prototype._tapFightPlacement = function (x, y, closestCell, options) {
	// from coordinate, get the cellId that have been tapped
	var actorsOnCell = this.actorManager.occupiedCells[closestCell.cell];

	if (actorsOnCell) {
		if (closestCell.dist === 0) { actorsOnCell[0].tap(x, y, this.mapRenderer.camera); }
		return;
	}

	var cellId = closestCell.cell;
	// check this is a possible position
	var possiblePlacements = options.possiblePlacements || [];
	var index = possiblePlacements.indexOf(cellId);
	if (index === -1) { return; }

	window.dofus.sendMessage('GameFightPlacementPositionRequestMessage', { cellId: cellId });
	playUiSound('FIGHT_POSITION');
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
var allInteractives, lastTouchedElement;

IsoEngine.prototype.holdStart = function () {
	this.highlightAllInteractives(5);
	allInteractives = this._getAllInteractives();
	lastTouchedElement = null;
};

IsoEngine.prototype.holdEnd = function () {
	this.clearHighlights();
	this.removeEnemyMovementZone();
};

IsoEngine.prototype.holdAndMove = function (x, y) {
	var mapScenePosition = this.mapScene.convertCanvasToSceneCoordinate(x, y);

	var tappedElement = null;
	for (var i = 0; i < allInteractives.length; i++) {
		var element = allInteractives[i];
		if (this._isElementClicked(element, mapScenePosition.x, mapScenePosition.y)) {
			tappedElement = element;
			break;
		}
	}

	if (!tappedElement) {
		lastTouchedElement = null;
		this.clearHighlights();
		return;
	}

	if (lastTouchedElement === tappedElement) { return tappedElement; }
	lastTouchedElement = tappedElement;

	this.clearHighlights();
	this._addHighlight(tappedElement);
	return tappedElement;
};




/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/IsoEngine/tap.js
 ** module id = 1051
 ** module chunks = 0
 **/