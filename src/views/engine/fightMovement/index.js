var mapPoint = require('mapPoint');
var GameActionFightInvisibilityStateEnum = require('GameActionFightInvisibilityStateEnum');
var fightSequence = require('fightSequence');

var INVISIBLE   = GameActionFightInvisibilityStateEnum.INVISIBLE;
var DETECTED    = GameActionFightInvisibilityStateEnum.DETECTED;
var ROOTED      = 6;
var UNTACKLER   = 95;
var UNTACKLABLE = 96;


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
function canBeTackler(tackler, actor) {
	var tacklerFighter = tackler.getFighter();
	var actorFighter = actor.getFighter();

	if (!tacklerFighter || !actorFighter) {
		//TODO: fix me that should be an error
		console.warn('canBeTackler: Corresponding fighters could not be found.');
		return false;
	}

	if (tacklerFighter.data.stats.invisibilityState === INVISIBLE) { return false; }
	if (tacklerFighter.data.stats.invisibilityState === DETECTED)  { return false; }
	if (tacklerFighter.data.teamId === actorFighter.data.teamId)   { return false; } // same team
	if (tacklerFighter.data.alive === false) { return false; } // tackler is dead
	if (tacklerFighter.data.isCarryied)      { return false; }
	if (tacklerFighter.hasState(UNTACKLER))  { return false; }
	if (tacklerFighter.hasState(ROOTED))     { return false; }

	return tacklerFighter.canTackle;
}


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
function canBeTackled(actor) {
	var fighter = actor.getFighter();
	if (!fighter) {
		console.error('Corresponding fighter could not be found.');
		return false;
	}

	if (fighter.data.stats.invisibilityState === INVISIBLE) { return false; }
	if (fighter.data.stats.invisibilityState === DETECTED)  { return false; }
	if (fighter.data.isCarryied)       { return false; }
	if (fighter.hasState(UNTACKLABLE)) { return false; }
	if (fighter.hasState(ROOTED))      { return false; }

	return true;
}


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
function getTackleRatio(actor, tackler) {
	var evade = Math.max(0, actor.getFighterData().stats.tackleEvade || 0);
	var block = Math.max(0, tackler.getFighterData().stats.tackleBlock || 0);
	return (evade + 2) / (block + 2) / 2;
}


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Get cost needed for an actor to leave a cell.
 *  Cost do not include the regular 1 movement point needed to move from a cell to another
 *
 * @param {Actor}   actor    - source actor (tackled one)
 * @param {Actor[]} tacklers - list of tackler actors
 * @param {number}  mp       - movement points
 * @param {number}  ap       - action points
 */
function getTackleCost(actor, tacklers, mp, ap) {
	mp = Math.max(0, mp);
	ap = Math.max(0, ap);
	var cost = { mp: 0, ap: 0 };
	if (!canBeTackled(actor))  { return cost; }
	if (tacklers.length === 0) { return cost; }

	for (var i = 0; i < tacklers.length; i++) {
		var tackler = tacklers[i];
		if (!tackler) { continue; } // tackler may have die at this point
		if (!canBeTackler(tackler, actor)) { continue; }
		var tackle = getTackleRatio(actor, tackler);
		if (tackle >= 1) { continue; }
		cost.mp += ~~(mp * (1 - tackle) + 0.5);
		cost.ap += ~~(ap * (1 - tackle) + 0.5);
	}

	return cost;
}


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

function PathNode(cellId, mp, ap, tackleMp, tackleAp, distance) {
	this.cellId      = cellId;
	this.availableMp = mp;
	this.availableAp = ap;
	this.tackleMp    = tackleMp;
	this.tackleAp    = tackleAp;
	this.distance    = distance;
}

function MoveNode(tackleCost, from, reachable) {
	this.ap        = tackleCost.ap;
	this.mp        = tackleCost.mp;
	this.from      = from;
	this.reachable = reachable;
	this.path      = null;
}

function getReachableZone(actor, currentCellId) {
	var movementZone = {};
	var fighterData = actor.getFighterData();
	var stats = fighterData.stats;
	var maxDistance = stats.movementPoints;
	if (maxDistance <= 0) { return movementZone; }

	var actorManager = window.actorManager;
	var map = window.isoEngine.mapRenderer;
	var opened = [];
	var closed = {};

	var node = new PathNode(currentCellId, stats.movementPoints, stats.actionPoints, 0, 0, 1);
	opened.push(node);
	closed[currentCellId] = node;

	var occupiedCells = actorManager.getIndexedVisibleActors();
	var markedCells = fightSequence.getMarkedCells();

	while (opened.length) {
		var current = opened.pop();
		var cellId = current.cellId;
		var neighbours = mapPoint.getNeighbourCells(cellId, false);

		// get tacklers list
		var tacklers = [];
		var i = 0;
		var neighbour;
		while (i < neighbours.length) {
			neighbour = neighbours[i];
			var tackler = occupiedCells[neighbour];
			if (neighbour !== undefined && !tackler) {
				i++;
				continue;
			}
			neighbours.splice(i, 1); // cell is not walkable
			if (tackler) { tacklers.push(tackler); }
		}

		var tackleCost  = getTackleCost(actor, tacklers, current.availableMp, current.availableAp);
		var availableMp = current.availableMp - tackleCost.mp - 1; // tackle cost + 1 mp to move
		var availableAp = current.availableAp - tackleCost.ap;
		var tackleMp    = current.tackleMp + tackleCost.mp;
		var tackleAp    = current.tackleAp + tackleCost.ap;
		var distance    = current.distance + 1;
		var reachable   = availableMp >= 0;

		if (markedCells[cellId] && currentCellId !== cellId) {
			availableMp = 0;
		}

		for (i = 0; i < neighbours.length; i++) {
			neighbour = neighbours[i];

			// this cell has already been checked.
			// see if new cost is better than previous one.
			if (closed[neighbour]) {
				var previous = closed[neighbour];
				// don't consider this path to this neighbour if available mp are less than previous path
				if (previous.availableMp > availableMp) { continue; }
				// if mp costs are the same, then test available ap
				if (previous.availableMp === availableMp && previous.availableAp >= availableAp) { continue; }
			}

			// cell is not walkable in fight
			if (!map.isWalkable(neighbour, true)) { continue; }

			movementZone[neighbour] = new MoveNode(tackleCost, cellId, reachable);
			node = new PathNode(neighbour, availableMp, availableAp, tackleMp, tackleAp, distance);
			closed[neighbour] = node;
			if (current.distance < maxDistance) { opened.push(node); }
		}
	}

	return movementZone;
}

exports.getReachableZone = getReachableZone;




/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/fightMovement/index.js
 ** module id = 1052
 ** module chunks = 0
 **/