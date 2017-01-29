/*
 * This module manages everything related to the beginner assistant actor (sprite):
 *  deployment, movements, animations, etc.
 */

var EventEmitter = require('events.js').EventEmitter;
var beginnerAssistant = require('beginnerAssistant');
var Actor = require('Actor');
var pathFinder = require('pathFinder');
var mapPoint = require('mapPoint');
var data = require('./data.js');

var isoEngine, actorManager, gui;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Constants */

var ACTOR_BONE_ID = 3192;

var POSES_ANIMATIONS = {
	HandWave:     'AnimAttaque1',  // hand wave
	LookOnFloor:  'AnimAttaque2',  // look on floor
	LookAround:   'AnimAttaque3',  // look at right then left
	AirPunchs:    'AnimAttaque4',  // air punchs
	Jump:         'AnimAttaque5',  // jump
	LetsGo:       'AnimAttaque6',  // let's go this way / let's attack
	CrossedArms:  'AnimAttaque7',  // crosses arms
	GoRight:      'AnimAttaque8',  // go right! / go away
	GoLeft:       'AnimAttaque9',  // go left! / go away / I have an idea
	HeadAttack:   'AnimAttaque10', // head attack
	JumpAndFlash: 'AnimHit',       // jump while flashing
	JumpAndSmoke: 'AnimMort'       // jump and smoke diseappear
};

var ANIMS = {
	IDLE_ANIMS: [
		'LookOnFloor', 'LookAround', 'LookAround', 'AirPunchs', 'CrossedArms', 'GoRight', 'GoLeft', 'HandWave', 'Jump'
	],
	ENTERED_MAP_ANIMS: [
		'LetsGo', 'LetsGo', 'LetsGo', 'LetsGo', 'AirPunchs', 'AirPunchs', 'CrossedArms', 'LookAround'
	]
};

var ACTOR_STATE = {
	NOT_CREATED: 0,
	CREATED: 1,
	WAITING_PLAYER: 2,
	WAITING_PLAYER_POSE: 3,
	FIRST_MOVEMENT: 4,
	IDLE: 5,
	IDLE_POSE: 6,
	IDLE_MOVE: 7,
	MOVING_TO_EXIT: 8,
	WAITING_FOR_PLAYER_EXIT: 9,
	MOVING_CANCEL: 10,
	MAP_TRANSITION_EXIT: 11,
	MAP_TRANSITION_ENTER: 12
};

var RUN_SPEED_ADJUSTMENT = 8;

var MINIMAL_DELAY_BETWEEN_ANIMATIONS = 3000;
var RANDOM_ADDITIONAL_DELAY_BETWEEN_ANIMATIONS = 4000;

var ANIM_OR_MOVE_CHANCE = 0.75; // between 0 and 1

var DEFAULT_CELL_WEIGHT = 1000;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Local variables */

var actor;                   // isoEngine actor
var initialPlayerPos;        // player position right after map loading
var animPool;                // idle anim pool to avoid repeating too much the same ones
var animPoolType;            // to know what kind of animations are in the pool now
var animPoolIndex;           // pointer of the next animation to play in the pool
var actorState;              // current actor state
var metronome;               // timestamp of next animation test
var lastPath;                // to interrupt an actor movement we need to track its current path
var frozen;                  // to stop Joris from doing anything
var cellsStaticWeightMap;    // to cache .getCellWeight() results
var cellsStaticFreeMap;      // to cache .isFreeCell() results
var mapTransition;           // to store the fact that the user actor is currently map transitionning
var lastMap;                 // to store what was the map id before the latest 'mapLoaded' event

// TODO: refactor beginner assistant modules to be real components and avoid this standalone eventEmitter
var eventEmitter = new EventEmitter();

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Helpers */

function getRandomArrayIndex(a) { return Math.floor(Math.random() * a.length); }
function getRandomArrayElement(a) {	return a[getRandomArrayIndex(a)]; }
function isValidCellId(cellId) {
	if (!cellId && cellId !== 0) { return false; }
	return (cellId >= 0 && cellId <= 559);
}
function getCellFrontOf(cellId) {
	var frontCellId = cellId + 28;
	return isValidCellId(frontCellId) ? frontCellId : null;
}
function getCellBehind(cellId) {
	var backCellId = cellId - 28;
	return isValidCellId(backCellId) ? backCellId : null;
}
function shuffleArray(array) { // unbiased Fisher–Yates shuffle algorithm
	var currentIndex = array.length, temporaryValue, randomIndex;
	// While there remain elements to shuffle...
	while (currentIndex !== 0) {
		// Pick a remaining element...
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;
		// And swap it with the current element.
		temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	}
	return array;
}
function getActor() {
	if (actorState === ACTOR_STATE.NOT_CREATED) {
		return null;
	}
	return actor;
}

function refreshBbox() {
	if (!actor) { return; }
	actor.refreshAnimation();
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Initialization */

// Called one time per character max, the first time the assistant is required
function initialize() {
	isoEngine = window.isoEngine;
	actorManager = window.actorManager;
	gui = window.gui;
	actorState = ACTOR_STATE.NOT_CREATED;
	mapTransition = {
		transitionning: false,
		mapSide: null
	};
	isoEngine.on('mapLoaded', onMapLoaded);
	isoEngine.on('launchMapTransition', onLaunchMapTransition);
	isoEngine.on('cancelMapTransition', onCancelMapTransition);
	gui.once('disconnect', onDisconnect);
	onMapLoaded();
}

function onMapLoaded(options) {
	if (!beginnerAssistant.isBeginnerAssistantRequired()) { return; }
	if (options && options.isReload && actor && actorState !== ACTOR_STATE.NOT_CREATED) {
		return;
	}
	mapTransition.transitionning = false;
	mapTransition.mapSide = null;
	cellsStaticWeightMap = {};
	cellsStaticFreeMap = {};
	frozen = false;
	deploy();
}

function onDisconnect() {
	isoEngine.removeListener('mapLoaded', onMapLoaded);
	isoEngine.removeListener('launchMapTransition', onLaunchMapTransition);
	isoEngine.removeListener('cancelMapTransition', onCancelMapTransition);
}

// called when assistant will not be required again, ever, for the current character
function removeAndClean() {
	onDisconnect(); // that's the only thing to do so far
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** To determine if a cell is at the border of the map */

function isCellOnBorderTop(cellId, distance) {
	distance = distance || 1;
	return (cellId < (28 * distance));
}

function isCellOnBorderBottom(cellId, distance) {
	distance = distance || 1;
	return (cellId > (559 - 28 * distance));
}

function isCellOnBorderLeft(cellId, distance) {
	distance = distance || 1;
	var modulo14 = cellId % 14;
	return (modulo14 < distance);
}

function isCellOnBorderRight(cellId, distance) {
	distance = distance || 1;
	var modulo14 = cellId % 14;
	return (modulo14 > (13 - distance));
}

function isCellOnBorder(cellId, distance) {
	return (
		isCellOnBorderLeft(cellId, distance) || isCellOnBorderRight(cellId, distance) ||
		isCellOnBorderTop(cellId, distance) || isCellOnBorderBottom(cellId, distance)
	);
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** To determine if a cell is near/around other elements  */

function isCellBehindAnActor(cellId) {
	var frontCellId = getCellFrontOf(cellId);
	return actorManager.occupiedCells[frontCellId] ? true : false;
}

function isCellFrontOfAnActor(cellId) {
	var backCellId = getCellBehind(cellId);
	return actorManager.occupiedCells[backCellId] ? true : false;
}

function isCellBlockingEntrance(cellId) {
	var backCellId = getCellBehind(cellId);
	var exits = data.exits[gui.playerData.position.mapId];
	if (!exits || !exits.length) { return false; }
	for (var i = 0; i < exits.length; i++) {
		var exit = exits[i];
		var exitCellId = null;
		if (exit.target === 'tile') {
			exitCellId = exit.targetId;
		} else if (exit.type === 'interactive') {
			var graphic = isoEngine.mapRenderer.identifiedElements[exit.targetId];
			if (graphic && graphic._position !== undefined && graphic._position !== null) {
				exitCellId = graphic._position;
			}
		}
		if (exitCellId !== null && (cellId === exitCellId || backCellId === exitCellId)) {
			return true;
		}
	}
	return false;
}

function isCellFrontOrBehindInteractiveElement(cellId, asBoolean) {
	var result;
	if (!asBoolean) {
		result = { front: false, behind: false };
	}
	var frontCellId = getCellFrontOf(cellId);
	var backCellId = getCellBehind(cellId);
	var interactives = isoEngine.mapRenderer.interactiveElements;
	var statedElements = isoEngine.mapRenderer.identifiedElements;
	for (var elementId in interactives) {
		if (!statedElements[elementId] || statedElements[elementId]._position === undefined) {
			continue;
		}
		if (statedElements[elementId]._position === frontCellId) {
			if (asBoolean) { return true; }
			result.front = true;
		}
		if (statedElements[elementId]._position === backCellId) {
			if (asBoolean) { return true; }
			result.behind = true;
		}
	}
	return result;
}

function areCellAndCellAboveVisible(cellId) {
	if (!isoEngine.mapRenderer.isVisibleCell(cellId)) { return false; }
	var backCellId = getCellBehind(cellId);
	if (!isValidCellId(backCellId)) { return false; }
	return isoEngine.mapRenderer.isVisibleCell(backCellId);
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** To determine on which cells to move or to deploy */

function getAllCellsAround(cellId, radius, includeSelf) {
	radius = radius || (includeSelf ? 0 : 1);
	var cells = [];

	var coord = mapPoint.getMapPointFromCellId(cellId);
	var fromX = coord.x - radius; var toX = coord.x + radius;
	var fromY = coord.y - radius; var toY = coord.y + radius;

	for (var y = fromY; y <= toY; y++) {
		for (var x = fromX; x <= toX; x++) {
			if (x === coord.x && y === coord.y && !includeSelf) { continue; }
			var candidate = mapPoint.getCellIdFromMapPoint(x, y);
			if (!candidate) { continue; }
			cells.push(candidate);
		}
	}
	return cells;
}

// get a score of how good it would be to move or deploy the assistant into a specific tile
function getCellWeight(cellId) {
	if (!isValidCellId(cellId) || cellsStaticWeightMap[cellId] === 0 || actorManager.occupiedCells[cellId]) {
		return 0;
	}

	var weight = DEFAULT_CELL_WEIGHT;

	// static elements
	if (cellsStaticWeightMap[cellId] !== undefined) {
		weight = cellsStaticWeightMap[cellId];
	} else if (!isoEngine.mapRenderer.isWalkable(cellId, false)) {
		cellsStaticWeightMap[cellId] = 0;
		return 0;
	} else {
		if (!areCellAndCellAboveVisible(cellId)) { weight -= 25; }
		if (isCellOnBorder(cellId, 1)) { weight -= 3; }
		if (isCellOnBorder(cellId, 2)) { weight -= 2; }
		if (isCellOnBorder(cellId, 3)) { weight -= 1; }
		if (isCellBlockingEntrance(cellId)) { weight -= 30; }
		var frontOrBehindInteractive = isCellFrontOrBehindInteractiveElement(cellId);
		if (frontOrBehindInteractive.front) { weight -= 15; }
		if (frontOrBehindInteractive.behind) { weight -= 10; }
		cellsStaticWeightMap[cellId] = weight;
	}

	// dynamic elements
	if (isCellBehindAnActor(cellId)) { weight -= 15; }
	if (isCellFrontOfAnActor(cellId)) { weight -= 15; }

	// TODO:
	//   - Add tile floor parameter (to avoid stools for example) and speed weight
	//     See cell's f and w parameters, cf. PathFinder.

	return weight;
}

// test if a tile is perfect to move or deploy the assistant
// almost the same as testing .getCellWeight() for the best score possible
function isFreeCell(cellId, testForCellBorder) {
	if (!isValidCellId(cellId) || cellsStaticFreeMap[cellId] === false) {
		return false;
	}

	// exclude self from the `occupied by actor test`
	if (actorManager.occupiedCells[cellId]) {
		if (actorManager.occupiedCells[cellId].length > 1) { return false; }
		if (!actor || actor.cellId !== cellId) { return false; }
	}

	var isFree = true;

	// static elements
	if (cellsStaticFreeMap[cellId] === undefined) {
		if (
			!isoEngine.mapRenderer.isWalkable(cellId, false) ||
			!areCellAndCellAboveVisible(cellId) ||
			(testForCellBorder && isCellOnBorder(cellId, 2)) ||
			isCellBlockingEntrance(cellId) ||
			isCellFrontOrBehindInteractiveElement(cellId, true)
		) {
			isFree = false;
		}
		cellsStaticFreeMap[cellId] = isFree;
		if (!isFree) { return false; }
	}

	// dynamic elements
	if (isCellBehindAnActor(cellId) || isCellFrontOfAnActor(cellId)) {
		isFree = false;
	}

	// TODO: see getCellWeight comments
	return isFree;
}

// returns the best tile (or tiles if returnRange == true) to move or deploy the assistant
function getBestFreeCellBetween(cellIdList, returnRange) {
	var bestScore = 1;
	var candidates = [];
	var score;
	for (var i = 0; i < cellIdList.length; i++) {
		score = getCellWeight(cellIdList[i]);
		if (score > bestScore) {
			bestScore = score;
			candidates = [];
		}
		if (score === bestScore) {
			candidates.push(cellIdList[i]);
		}
	}
	if (candidates.length === 0) { return null; }
	if (returnRange) {
		return candidates;
	} else {
		return getRandomArrayElement(candidates);
	}
}

function getRandomFreeCellAround(cellId, radius, includeSelf) {
	var candidates = getAllCellsAround(cellId, radius, includeSelf);
	if (candidates.length === 0) { return null; }
	var betterCandidates = getBestFreeCellBetween(candidates, true);
	if (!betterCandidates || betterCandidates.length === 0) {
		betterCandidates = candidates;
	}
	return getRandomArrayElement(betterCandidates);
}

function getBestFreeCellNear(cellId, maxRadius, includeSelf) {
	for (var radius = 0; radius <= maxRadius; radius++) {
		if (radius === 0 && !includeSelf) { continue; }
		var candidates = getAllCellsAround(cellId, radius, includeSelf); // TODO: implement an 'asRing' parameter
		if (candidates.length === 0) { continue; }
		var targetCell = getBestFreeCellBetween(candidates);
		if (isValidCellId(targetCell)) { return targetCell; }
	}
	return null;
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Actor related */

function resetActor() {
	actor = null;
	actorState = ACTOR_STATE.NOT_CREATED;
	lastPath = null;
}

function onActorRemove() {
	eventEmitter.emit('removed');
	resetActor();
}

function actorRemoveOverride() {
	onActorRemove();
	Actor.prototype.remove.call(this);
}

function addActor(cellId, direction, cb) {
	var actorData = {
		contextualId: 'beginnerAssistant',
		look: { bonesId: ACTOR_BONE_ID, scales: [100], skins: [] },
		disposition: { cellId: cellId, direction: direction },
		name: 'Joris',
		_type: 'BeginnerAssistant'
	};

	actorManager.addActor(actorData, function (actorObject) {
		if (!actorObject) {
			return cb(new Error('Unable to create the beginner assistant actor'));
		}
		actor = actorObject;
		actor.remove = actorRemoveOverride; // because we don't want Actor to be an event emitter
		actor.setCellPosition(cellId);
		actorManager.addAnimBehaviourToActor(actor.actorId, onAnimationRequest);
		actorState = ACTOR_STATE.CREATED;
		cb();
	});
}

function deploy() {
	if (actor || actorState !== ACTOR_STATE.NOT_CREATED) {
		if (lastMap === gui.playerData.position.mapId) {
			return console.error(new Error('Beginner assistant deploy: actor is already loaded'));
		}
		console.error(new Error(
			'Beginner assistant deploy: actor is already loaded but map has changed.' +
			' Will re-create it for seemless user experience but this should not happen.'
		));
		onActorRemove();
	}

	var userPosition = initialPlayerPos = actorManager.userActor.position;
	var userCoordinate = mapPoint.getMapPointFromCellId(userPosition);
	var isUserOnBorder = isCellOnBorder(userPosition, 2);
	var direction = actorManager.userActor.direction;
	var targetCell = null;

	if (!isUserOnBorder) {
		targetCell = getBestFreeCellNear(userPosition, 7);
	} else {
		// user did spawn near map border
		var favoritePositions = [];

		if (isCellOnBorderLeft(userPosition, 2)) {
			favoritePositions.push({ x: -1, y: 1 });
			favoritePositions.push({ x: 1, y: -1 });
			direction = 1;
		} else if (isCellOnBorderRight(userPosition, 2)) {
			favoritePositions.push({ x: -1, y: 1 });
			favoritePositions.push({ x: 1, y: -1 });
			direction = 3;
		} else if (isCellOnBorderTop(userPosition, 2)) {
			favoritePositions.push({ x: -1, y: -1 });
			favoritePositions.push({ x: 1, y: 1 });
			direction = Math.random() > 0.5 ? 3 : 1;
		} else if (isCellOnBorderBottom(userPosition, 2)) {
			favoritePositions.push({ x: -1, y: -1 });
			favoritePositions.push({ x: 1, y: 1 });
			direction = Math.random() > 0.5 ? 5 : 7;
		} else {
			return console.error(new Error('player seems to be on map border but unable to determine which one'));
		}

		// we try to deploy on the first valid favorite position
		for (var i = 0; i < favoritePositions.length; i++) {
			var candidateCellId = mapPoint.getCellIdFromMapPoint(
				userCoordinate.x + favoritePositions[i].x,
				userCoordinate.y + favoritePositions[i].y
			);
			if (isFreeCell(candidateCellId, false)) {
				targetCell = candidateCellId;
				break;
			}
		}

		if (!isValidCellId(targetCell)) {
			targetCell = getBestFreeCellNear(userPosition, 7);
		}
	}

	if (!isValidCellId(targetCell)) {
		return console.error(new Error('Unable to deploy beginner assistant near the player'));
	}

	addActor(targetCell, direction, function (err) {
		if (err) {
			return console.error(err);
		}
		if (isUserOnBorder) {
			actorState = ACTOR_STATE.MAP_TRANSITION_ENTER;
			isoEngine.makeActorWalkIn(actor, 300, function () {
				metronome = Date.now() + 3000;
				actorState = ACTOR_STATE.WAITING_PLAYER;
				refreshBbox();
				eventEmitter.emit('actorStopped');
				eventEmitter.emit('actorReady');
			});
			return;
		}
		metronome = Date.now() + getNextAnimationDelay();
		actorState = ACTOR_STATE.IDLE;
		refreshBbox();
		eventEmitter.emit('actorStopped');
		eventEmitter.emit('actorReady');
	});
}

/**
 * Pre-required knowledge to understand this method:
 *   - actor.cellId   is the cellId occupied on the grid
 *   - actor.position is the cellId where the sprite visually stands (when he's moving) and also his z-index
 * actor.setCellPosition() is updating actor.cellId, not actor.position. So actor.setCellPosition(actor.position) makes
 *   sense to update an actor's real position to it's sprite position.
 * TODO:
 *   - rename actor's setCellPosition() method?
 *   - split actor's position in two different properties: zIndex and spriteCellId?
 *   - move the following method into actor?
 */
function setActorPositionFromItsSprite() {
	actor.setCellPosition(actor.position);
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Animation related */

// returns a delay to wait until the next animation triggers
function getNextAnimationDelay() {
	return (MINIMAL_DELAY_BETWEEN_ANIMATIONS + Math.floor(Math.random() * RANDOM_ADDITIONAL_DELAY_BETWEEN_ANIMATIONS));
}

// retrieve the next `animType` animation id to play
function getAnim(animType) {
	if (animPoolType !== animType || !animPool || animPoolIndex === undefined || animPoolIndex >= animPool.length) {
		animPoolType = animType;
		animPool = ANIMS[animType];
		animPoolIndex = 0;
		shuffleArray(animPool);
	}
	return animPool[animPoolIndex++];
}

// is user currently moving to a map border?
// TODO: would be great to detect also suns or other teleporting interactives/cells as exits
function isUserMovingToExit() {
	return actorManager.userActor.moving && isCellOnBorder(actorManager.userActor.cellId, 1);
}

function isUserOnBorder() {
	return isCellOnBorder(actorManager.userActor.cellId);
}

function visualDistanceFromUser() {
	if (!actor) {
		return console.error(new Error('Beginner assistant visualDistanceFromUser: no actor available'));
	}
	return mapPoint.getDistance(actor.position, actorManager.userActor.position);
}

function isStackedWithOtherActor() {
	return actorManager.occupiedCells[actor.cellId].length > 1;
}

function isStanding() {
	return (
		actorState === ACTOR_STATE.IDLE ||
		actorState === ACTOR_STATE.WAITING_PLAYER ||
		actorState === ACTOR_STATE.WAITING_FOR_PLAYER_EXIT
	);
}

// called every frame when beginner assistant is on the screen
function onAnimationRequest() {
	if (actorState === ACTOR_STATE.CREATED) { // not ready for animations yet
		return;
	}
	if (frozen) { return; }
	var tick = Date.now() > metronome;
	var userMovingToExit = isUserMovingToExit();
	if (actorState === ACTOR_STATE.WAITING_PLAYER) {
		var playerHasMoved = (initialPlayerPos !== actorManager.userActor.position);
		if (playerHasMoved) {
			if (userMovingToExit) {
				animationExitMap();
			} else {
				animationFollowPlayer();
			}
		} else if (isStackedWithOtherActor()) {
			animationIdleMove();
		} else if (tick) {
			animationWaitingForPlayerPose();
		}
	} else if (actorState === ACTOR_STATE.IDLE && userMovingToExit) {
		animationExitMap();
	} else if (actorState === ACTOR_STATE.IDLE && tick) {
		var moveOrPose = Math.random() < ANIM_OR_MOVE_CHANCE ? 'pose' : 'move';
		if (moveOrPose === 'pose') {
			if (!isOrientationGoodForPoses() || isStackedWithOtherActor() || !isFreeCell(actor.cellId)) {
				moveOrPose = 'move';
			}
		}
		if (moveOrPose === 'pose') {
			animationIdlePose();
		} else {
			animationIdleMove();
		}
	} else if (actorState === ACTOR_STATE.MOVING_TO_EXIT && !userMovingToExit) {
		stopMoving();
	} else if (isStackedWithOtherActor() && isStanding()) {
		animationIdleMove();
	} else if (actorState === ACTOR_STATE.WAITING_FOR_PLAYER_EXIT && !userMovingToExit && !isUserOnBorder()) {
		actorState = ACTOR_STATE.IDLE;
		metronome = Date.now() + getNextAnimationDelay();
	} else if (tick) {
		metronome = Date.now() + getNextAnimationDelay();
	}
	// TODO: add an 'if IDLE and current cell is not perfectly free, trigger IDLE move'
}

function returnToIdle() {
	if (mapTransition.transitionning && actorState !== ACTOR_STATE.MAP_TRANSITION_EXIT) {
		return catchUpMapTransition();
	}
	metronome = Date.now() + getNextAnimationDelay();
	actorState = ACTOR_STATE.IDLE;
	eventEmitter.emit('actorStopped');
}

// animation played when user entered a new map (from a border) and did not move yet
function animationWaitingForPlayerPose() {
	actorState = ACTOR_STATE.WAITING_PLAYER_POSE;
	metronome = Infinity;
	var direction = getBestPoseDirection();
	var animName = getAnim('ENTERED_MAP_ANIMS');
	actor.setDisposition(actor.position, direction);
	setAnimation(animName, direction, function () {
		if (!actor) { return; }
		metronome = Date.now() + getNextAnimationDelay();
		actorState = ACTOR_STATE.WAITING_PLAYER;
		eventEmitter.emit('actorStopped');
	});
}

// movement triggered when player moved somewhere into the map for the first time
function animationFollowPlayer(isSecondTry) {
	actorState = ACTOR_STATE.FIRST_MOVEMENT;
	var targetCellId = getRandomFreeCellAround(actorManager.userActor.cellId, 3, false, true);
	if (targetCellId === null) { // this should never happen
		return returnToIdle();
	}
	var path = pathFinder.getPath(actor.cellId, targetCellId, actorManager.occupiedCells, true);
	if (path.length === 0) {
		return returnToIdle();
	}
	targetCellId = path[path.length - 1];
	actor.setCellPosition(targetCellId);
	lastPath = path;
	actor.speedAdjust = RUN_SPEED_ADJUSTMENT;
	actor.setPath(path, { cb: function () {
		if (!actor) { return; }
		actor.speedAdjust = 0;
		lastPath = null;
		if (actor.position !== targetCellId) { // something has interrupted him on the way
			setActorPositionFromItsSprite();
			if (!isSecondTry) {
				return animationFollowPlayer(true);
			}
		}
		if (mapTransition.transitionning && actorState !== ACTOR_STATE.MAP_TRANSITION_EXIT) {
			return catchUpMapTransition();
		}
		returnToIdle();
	} });
}

// movement triggered when the player is moving to a map border
function animationExitMap(isSecondTry) {
	actorState = ACTOR_STATE.MOVING_TO_EXIT;
	metronome = Infinity;

	// TODO: search a cell as near as possible of the border instead of "a random one around around player's target"
	var targetCellId = getBestFreeCellNear(actorManager.userActor.cellId, 3, false);

	if (!isValidCellId(targetCellId)) {
		actorState = ACTOR_STATE.WAITING_FOR_PLAYER_EXIT;
		return;
	}
	var path = pathFinder.getPath(actor.cellId, targetCellId, actorManager.occupiedCells, true);
	if (path.length === 0) {
		actorState = ACTOR_STATE.WAITING_FOR_PLAYER_EXIT;
		return;
	}
	targetCellId = path[path.length - 1];
	actor.setCellPosition(targetCellId);
	lastPath = path;
	actor.speedAdjust = RUN_SPEED_ADJUSTMENT;
	actor.setPath(path, { cb: function () {
		if (!actor) { return; }
		actor.speedAdjust = 0;
		if (actorState !== ACTOR_STATE.MOVING_TO_EXIT) { return; } // has been canceled
		lastPath = null;
		if (actor.position !== targetCellId) { // something has interrupted him on the way
			setActorPositionFromItsSprite();
			if (!isSecondTry) { animationExitMap(true); }
			return;
		}
		if (mapTransition.transitionning && actorState !== ACTOR_STATE.MAP_TRANSITION_EXIT) {
			return catchUpMapTransition();
		}
		actorState = ACTOR_STATE.WAITING_FOR_PLAYER_EXIT;
		metronome = Date.now() + getNextAnimationDelay();
	} });
}

// executed when player is interrupting a move to a map border
function stopMoving(cb) {
	if (!lastPath) { return; }
	actor.speedAdjust = 0;
	var index = lastPath.indexOf(actor.position);
	if (index === -1) { return; }
	var nextCellId = lastPath[index + 1];
	if (!isValidCellId(nextCellId)) { return; }
	setActorPositionFromItsSprite();
	actorState = ACTOR_STATE.MOVING_CANCEL;
	actor.cancelMovement(function () {
		if (!actor) { return; }
		lastPath = null;
		returnToIdle();
		if (cb) {
			cb();
		}
	});
}

// animation played when the assistant is idle on the map
function animationIdlePose() {
	actorState = ACTOR_STATE.IDLE_POSE;
	metronome = Infinity;
	var direction = getBestPoseDirection();
	var animName = getAnim('IDLE_ANIMS');
	actor.setDisposition(actor.position, direction);
	setAnimation(animName, direction, function () {
		if (!actor) { return; }
		returnToIdle();
	});
}

// movement played when the assistant is idle on the map
function animationIdleMove() {
	actorState = ACTOR_STATE.IDLE_MOVE;
	metronome = Infinity;
	// TODO: try more than 3 tiles around if the score is under a certain number
	var targetCellId = getRandomFreeCellAround(actor.cellId, 3, false, true);
	if (!isValidCellId(targetCellId)) {
		return returnToIdle();
	}
	var path = pathFinder.getPath(actor.cellId, targetCellId, actorManager.occupiedCells, true);
	if (path.length === 0) {
		return returnToIdle();
	}
	// TODO: try to limit the number of cells moved here, like 3 cells max, while being still a valid cell
	targetCellId = path[path.length - 1];
	actor.setCellPosition(targetCellId);
	lastPath = path;
	actor.speedAdjust = 0;
	actor.setPath(path, { forceWalk: true, cb: function () {
		if (!actor) { return; }
		lastPath = null;
		if (actor.position !== targetCellId) { // something has interrupted him on the way
			setActorPositionFromItsSprite();
		}
		if (mapTransition.transitionning && actorState !== ACTOR_STATE.MAP_TRANSITION_EXIT) {
			return catchUpMapTransition();
		}
		returnToIdle();
	} });
}

// pose animations are playable in only 2 directions: 3 and 1 (south-west and south-east)
// this method returns the most logical one for the actor at the current moment
function getBestPoseDirection() {
	var direction = actor.direction;
	if (direction === 5 || direction === 4) {
		direction = 3;
	} else if (direction === 7 || direction === 0) {
		direction = 1;
	} else if (direction === 6 || direction === 2) {
		direction = Math.random() > 0.5 ? 3 : 1;
	}
	return direction;
}

// to determine if the actor is in an orientation where a pose animation can be played
function isOrientationGoodForPoses() {
	return (actor.direction === 3 || actor.direction === 1 || actor.direction === 2);
}

// stop automated movements
function freeze() {
	frozen = true;
}

// restore automated movements
function unfreeze(delayBeforeNextMove) {
	metronome = Date.now() + (delayBeforeNextMove || 0);
	frozen = false;
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Map transition related */

function onLaunchMapTransition(mapSide) {
	// done before anything else because we need to know on which map the user was previously, no matter what
	lastMap = gui.playerData.position.mapId;

	if (!actor || frozen) { return; }
	mapTransition.mapSide = mapSide;
	mapTransition.transitionning = true;
	if (!isStanding()) { return; }
	catchUpMapTransition();
}

function onCancelMapTransition(mapSide) {
	if (!actor || frozen) { return; }
	mapTransition.transitionning = false;
	mapTransition.mapSide = null;
	actorState = ACTOR_STATE.MAP_TRANSITION_EXIT;
	isoEngine.makeActorWalkInDirection(actor, mapSide, true, function () {
		if (!actor) { return; }
		returnToIdle();
	});
}

function catchUpMapTransition() {
	if (!actor || frozen) { return; }
	if (!mapTransition.transitionning || actorState === ACTOR_STATE.MAP_TRANSITION_EXIT) {
		return;
	}
	// if actor is too far from the border of the map, he just tries to reach the border
	if (visualDistanceFromUser() > 3) {
		animationExitMap();
		return;
	}
	actorState = ACTOR_STATE.MAP_TRANSITION_EXIT;
	isoEngine.makeActorWalkInDirection(actor, mapTransition.mapSide, false);
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Helper to play/load/clear animations
 *  TODO: this method will be moved directly into AnimationManager by BC and may be used
 *        in more places to save memory
 */

function setAnimation(animName, direction, cb) {
	var animSymbol = { base: POSES_ANIMATIONS[animName], direction: direction };
	var initialActor = actor;
	actor.animManager.addAnimation(animSymbol, function () {
		if (!actor || actor !== initialActor) {
			return;
		}
		actor.animManager.assignSymbol(
			animSymbol,
			false,
			function () {
				if (!actor || actor !== initialActor) { return; }
				actor.staticAnim();
				actor.animManager.cleanupAnimations();
				if (cb) {
					cb();
				}
			}
		);
	});
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Exposing */

exports.initialize = initialize;
exports.stopMoving = stopMoving;
exports.freeze = freeze;
exports.unfreeze = unfreeze;
exports.getActor = getActor;
exports.setAnimation = setAnimation;
exports.removeAndClean = removeAndClean;

exports.on = eventEmitter.on.bind(eventEmitter);
exports.once = eventEmitter.once.bind(eventEmitter);
exports.removeListener = eventEmitter.removeListener.bind(eventEmitter);


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/beginnerAssistant/actor.js
 ** module id = 607
 ** module chunks = 0
 **/