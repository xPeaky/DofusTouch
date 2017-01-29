var mapPoint                = require('mapPoint');
var atouin                  = require('atouin');
var preprocessSequence      = require('./preprocessSequence.js');
var constants               = require('constants');
var Bresenham               = require('Bresenham');
var Missile                 = require('Missile');
var AnimatedGfx             = require('AnimatedGfx');
var getSpellEffectZone      = require('spellShapes').getSpellEffectZone;
var animationManagerLoading = require('animationManagerLoading');

var ANIM_SYMETRY = constants.ANIM_SYMETRY;
var THROWING_PROJECTILE_FX = '21209';

var ORIENTATION_MODE = {
	NORMAL: 0,
	RANDOM: 1,
	ORIENTED: 2
};

var ROTATION_MODE = {
	NONE: 0,
	TOWARD_POSITION1: 1,
	TOWARD_POSITION2: 2
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** get actor state when action will be performed
 *
 * @param {number}  actorId - actor id
 * @param {Object} fightState - current fight state
 */
function getActorState(actorId, fightState) {
	var actors = fightState.actors;
	if (!actors[actorId]) {
		actors[actorId] = {};
	}
	return actors[actorId];
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** get actor position and direction when action will be performed
 *
 * @param {number} actorId - actor id
 * @param {Object} fightState - current fight state
 */
function getActorDisposition(actorId, fightState) {
	var actorState = getActorState(actorId, fightState);
	if (!actorState.position && actorState.position !== 0) {
		var actor = window.actorManager.getActor(actorId);
		if (!actor) { return console.error('No actor ' + actorId); }
		actorState.position  = actor.cellId;
		actorState.direction = actor.direction;
	}
	return actorState;
}


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Get animation asset of an actor
 *
 * @param {number} actorId   - actor id
 * @param {Object} symbol    - animation symbol object
 * @param {Object} assetList - asset list
 */
function getAnimationAssets(sequenceLoader, actorId, symbol, fightState) {
	// Not a valid actorId, meaning source or target is void.
	if (actorId === 0) { return; }

	var actor = window.actorManager.getActor(actorId);
	if (!actor || actor.animManager.isTemporary) {
		return console.warn('No actor', actorId);
	}

	symbol.direction = getActorDisposition(actorId, fightState).direction;
	sequenceLoader.addAnimation(actor, symbol);
}


function getAngleTo(sourceCellId, targetCellId) {
	var gridPositionSource = mapPoint.getMapPointFromCellId(sourceCellId);
	var gridPositionTarget = mapPoint.getMapPointFromCellId(targetCellId);

	var scenePositionSource = mapPoint.getCoordinateSceneFromGrid(gridPositionSource);
	var scenePositionTarget = mapPoint.getCoordinateSceneFromGrid(gridPositionTarget);

	var dy = scenePositionTarget.y - scenePositionSource.y;
	var dx = scenePositionTarget.x - scenePositionSource.x;
	return Math.atan2(dy, dx);
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Add a gfx to the list of assets to be downloaded
 *
 * @param {Object} msg         - original message
 * @param {Object} assetList   - asset list to be downloaded
 * @param {string} id          - gfx reference name
 * @param {number} [direction] - optional fx direction (default is 0)
 */
function addGfx(sequenceLoader, msg, gfxId, gfxType, direction, position1, yOffset, position2, rotationMode) {
	direction = direction || 0;

	var coord = atouin.cellCoord[position1];
	if (!coord) {
		return;
	}

	var gfx = new AnimatedGfx({
		scene: window.isoEngine.mapScene,
		position: position1,
		x: coord.x,
		y: coord.y - (yOffset || 0)
	});

	if (rotationMode) {
		var angle;
		if (rotationMode === ROTATION_MODE.TOWARD_POSITION2) {
			angle = getAngleTo(position1, position2);
		} else {
			angle = getAngleTo(position2, position1);
		}

		gfx.rotation = ANIM_SYMETRY[direction] ? angle + Math.PI : angle;
	}

	msg['_' + gfxType + 'Orientation'] = direction;
	msg['_' + gfxType] = gfx;

	sequenceLoader.loadAnimationManager(gfx, gfxId + '/FX');

	return gfx;
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
function createMissile(sequenceLoader, castingActorId, missileId) {
	var actorManager = window.actorManager;
	var castingActor = actorManager.getActor(castingActorId);
	if (!castingActor) {
		console.warn('Source actor does not exist');
		return;
	}

	var missile = new Missile({
		actorId: missileId + ':' + castingActorId,
		position: castingActor.position,
		scene: actorManager.scene
	});

	sequenceLoader.loadAnimationManager(missile, missileId + '/FX');
	return missile;
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
function addMissile(sequenceLoader, msg, missileId) {
	msg._missileGfx = createMissile(sequenceLoader, msg.sourceId || msg.casterId, missileId);
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
function createGfx(sequenceLoader, msg, gfxId, gfxType, pos1, direction, yOffset, displayType, oriented, pos2) {
	var orientation  = getOrientation(displayType, direction);
	var rotationMode = getRotationMode(oriented, displayType, gfxType === 'casterGfx');

	return addGfx(sequenceLoader, msg, gfxId, gfxType, orientation, pos1, yOffset, pos2, rotationMode);
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
function createTrail(sequenceLoader, msg, caster, target, extendedZone) {
	var grid   = window.isoEngine.mapRenderer.grid;
	var source = window.actorManager.getActor(msg.sourceId || msg.casterId);

	var script = msg._scriptParams;

	var trailGfxId = script.trailGfxId;
	var direction  = caster.direction;

	var casterPosition = source.position;

	var sourceGridCoord = grid.getCoordinateGridFromCellId(casterPosition);
	var sourceI = sourceGridCoord.i;
	var sourceJ = sourceGridCoord.j;

	var destinationGridCoord = grid.getCoordinateGridFromCellId(msg.destinationCellId || msg.targetCellId);
	var destinationI = destinationGridCoord.i;
	var destinationJ = destinationGridCoord.j;

	var bresenham = new Bresenham();
	bresenham.set(sourceI, sourceJ, destinationI, destinationJ);

	var minScale = 1 + (script.trailGfxMinScale || 0) / 10;
	var maxScale = 1 + (script.trailGfxMaxScale || 0) / 10;

	var yOffset     = script.targetGfxYOffset2;
	var displayType = script.trailDisplayType;
	var oriented    = script.targetGfxOriented2;

	var spellLevelRatio = msg.spellLevel / 6;
	var scale = maxScale * spellLevelRatio + minScale * (1 - spellLevelRatio);

	// TODO: consider "endTrailOnTarget" attribute
	// using: msg.targetId
	var endTrailOnTarget = script.endTrailOnTarget;
	var endTrail = false;
	var targetPosition;
	if (endTrailOnTarget) {
		targetPosition = target.position;
	}

	var trailGfxs = [];
	function createTrailGfx(i, j) {
		var gfxPosition = grid.getCoordinateCellIdFromGrid({ i: i, j: j });

		if (endTrailOnTarget && targetPosition === gfxPosition) {
			// After this gfx, the trail should stop
			endTrail = true;
			bresenham.stop();
		}

		var gfx = createGfx(sequenceLoader, msg,
			trailGfxId,
			'trailGfx',
			gfxPosition,
			direction,
			yOffset,
			displayType,
			oriented,
			casterPosition
		);

		if (gfx) {
			// Applying scale (only trails have scales)
			gfx.scaleX = scale;
			gfx.scaleY = scale;

			trailGfxs.push(gfx);
		}
	}

	bresenham.exec(createTrailGfx);

	// Extending trail to extended zone
	for (var z = 1; z < extendedZone.length && !endTrail; z += 1) {
		var zoneCellId = extendedZone[z];
		var zoneGridCoord = grid.getCoordinateGridFromCellId(zoneCellId);
		createTrailGfx(zoneGridCoord.i, zoneGridCoord.j);
	}

	msg._trailGfxs = trailGfxs;
	msg._trailGfxsOrientation = direction;
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
function addTrail(sequenceLoader, msg, caster, target) {
	if (msg._scriptParams.useSpellZone) {
		// Adding a waiting request to the loader
		// To ensure that it waits for the trail to start loading
		sequenceLoader.addWaitingRequest();

		var actorId = msg.sourceId || msg.casterId;
		var spellTarget = msg.destinationCellId || msg.targetCellId;

		// Spread trail to spell zone
		var spellId    = msg.spellId;
		var spellLevel = msg.spellLevel;
		window.gui.fightManager.getFighterSpell(spellId, actorId, function addTrailMore(error, data) {
			var effectZone;
			if (error) {
				console.error(error);
				effectZone = [];
			} else {
				var mySpell = data;
				mySpell.setLevel(spellLevel);

				if (!window.isoEngine.mapRenderer.map || !window.isoEngine.mapRenderer.map.cells) {
					return;
				}
				var cellsData  = window.isoEngine.mapRenderer.map.cells;
				effectZone = getSpellEffectZone(cellsData, caster.position, spellTarget, mySpell.getZoneEffect());
			}

			createTrail(sequenceLoader, msg, caster, target, effectZone);
			sequenceLoader.removeWaitingRequest();
		});
	} else {
		createTrail(sequenceLoader, msg, caster, target, []);
	}
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
function getOrientation(orientationMode, casterDirection) {
	switch (orientationMode) {
	case ORIENTATION_MODE.RANDOM:
		return Math.floor(Math.random() * 8);
	case ORIENTATION_MODE.ORIENTED:
		return casterDirection;
	default: // normal
		return 0;
	}
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
function getRotationMode(oriented, displayType, isCasterGfx) {
	if (displayType === ORIENTATION_MODE.ORIENTED) {
		return ROTATION_MODE.NONE;
	}

	if (oriented) {
		if (isCasterGfx) {
			return ROTATION_MODE.TOWARD_POSITION2;
		} else {
			return ROTATION_MODE.TOWARD_POSITION1;
		}
	}

	return ROTATION_MODE.NONE;
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Get assets list for attacks.
 *  Source messages are  * GameActionFightSpellCastMessage
 *                       * GameActionFightCloseCombatMessage
 *
 * @param {Object}  msg        - original message
 * @param {Object}  assets     - assets list
 * @param {Object}  fightState - fight current state
 *
 * @param {number}  msg.sourceId          - source actor id
 * @param {number}  msg.targetId          - target actor id.  (0 if none)
 * @param {number}  msg.destinationCellId - destination cell. (-1 if unknown)
 * @param {number}  msg.critical          - 1: NORMAL, 2: CRITICAL_HIT, 3: CRITICAL_FAIL
 * @param {boolean} msg.silentCast        -
 * @param {number}  msg.spellId           -
 * @param {number}  msg.spellLevel        -
 *
 * @param {Object}  msg._scriptParams                       - (enriched) informations on spell animation
 * @param {number}  msg._scriptParams.animId                - symbolId to be played by caster
 * @param {string}  msg._scriptParams.customHitAnim         - symbolId to be played by target
 * @param {number}  msg._scriptParams.casterGfxId           - gfx to display on caster
 * @param {number}  msg._scriptParams.targetGfxId           - gfx to display on target
 * @param {number}  msg._scriptParams.targetGfxId2          - additional gfx on target
 * @param {number}  msg._scriptParams.casterGfxDisplayType  - display mode { 0: normal, 1: random, 2: oriented }
 * @param {number}  msg._scriptParams.targetGfxDisplayType  - display mode
 * @param {number}  msg._scriptParams.targetGfxDisplayType2 - display mode
 * @param {number}  msg._scriptParams.casterGfxOriented     - is gfx oriented, then apply a rotation on the graphical
 * @param {number}  msg._scriptParams.targetGfxOriented     - is gfx oriented
 * @param {number}  msg._scriptParams.targetGfxOriented2    - is gfx oriented
 * @param {number}  msg._scriptParams.missileGfxId          - gfx to use for missile
 * @param {number}  msg._scriptParams.trailGfxId            - gfx to use for trail
 * @param {number}  msg._scriptParams.glyphGfxId            - gfx to use for glyph
 */
function getScriptAssets(sequenceLoader, msg, fightState) {
	var isCloseCombat = (msg._messageType === 'GameActionFightCloseCombatMessage');
	var isExplosion = (msg._messageType === 'GameRolePlaySpellAnimMessage'); // corresponds to fireworks

	var casterId = msg.sourceId || msg.casterId;

	// compute caster orientation to load correct animations
	var caster = getActorDisposition(casterId, fightState);
	if (!caster) { return; }

	if (msg.destinationCellId !== -1 && caster.position !== msg.destinationCellId) {
		var direction = mapPoint.getOrientation(caster.position, msg.destinationCellId, false);
		caster.direction = direction;
		msg._casterOrientation = direction;
	}

	// TODO: instead show cast direction
	if (msg.silentCast) { return; } // spell animation should not play (silent)

	// check that there is a target (if id === 0, no target actor)
	// TODO: addGfx should check target existance
	var target;
	if (!msg.targetId) {
		target = { direction: 1 }; // default placeholder for target.
	} else {
		target = getActorDisposition(msg.targetId, fightState);
		if (!target) { return; }
	}

	// Default direction is the direction of the caster
	var targetCellId = target.position || msg.destinationCellId || msg.targetCellId;
	msg._targetCellId = targetCellId;

	// model gfx
	var script = msg._scriptParams || {};
	// these FX may be postfixed by actor direction
	if (script.casterGfxId) {
		createGfx(sequenceLoader, msg,
			script.casterGfxId,
			'casterGfx',
			caster.position,
			caster.direction,
			script.casterGfxYOffset,
			script.casterGfxDisplayType,
			script.casterGfxOriented,
			targetCellId
		);
	}

	if (script.targetGfxId) {
		createGfx(sequenceLoader, msg,
			script.targetGfxId,
			'targetGfx',
			targetCellId,
			caster.direction,
			script.targetGfxYOffset,
			script.targetGfxDisplayType,
			script.targetGfxOriented,
			caster.position
		);
	}

	if (script.targetGfxId2) {
		createGfx(sequenceLoader, msg,
			script.targetGfxId2,
			'targetGfx2',
			targetCellId,
			caster.direction,
			script.targetGfxYOffset2,
			script.targetGfxDisplayType2,
			script.targetGfxOriented2,
			caster.position
		);
	}

	if (isExplosion) {
		var gfxId = script.animId;
		if (gfxId) {
			if (script.targetGfxId2) {
				// Might happen if spell scripts change in future Dofus versions
				console.error(new Error('Message contains a targetGfdId2 and '));
			}
			addGfx(sequenceLoader, msg, gfxId, 'targetGfx2', 1, targetCellId);
		}

		msg._spellAnimSymbol = { base: 'AnimAttaque', type: 403 };
	} else {
		// these FX don't have direction

		if (script.missileGfxId) { addMissile(sequenceLoader, msg, script.missileGfxId); }

		// Preload attack animId of source actor (spellCast or closeCombat)
		if (isCloseCombat) {
			msg._spellAnimSymbol = { base: 'AnimArme', type: msg._weaponTypeId || 0 };
		} else if (script.animId !== undefined) {
			msg._spellAnimSymbol = { base: 'AnimAttaque', type: script.animId };
		}
	}

	if (script.trailGfxId)   { addTrail(sequenceLoader, msg, caster, target); }

	if (msg._spellAnimSymbol) { getAnimationAssets(sequenceLoader, casterId, msg._spellAnimSymbol, fightState); }

	// load all hit animation (linked lifePointVariation messages)
	var lifeVariationMsgs = msg._lifeVariationMsgs || [];
	var deadIds = msg._deadIds;

	for (var i = 0; i < lifeVariationMsgs.length; i++) {
		var hitMsg = lifeVariationMsgs[i];
		var hitTargetId = hitMsg.targetId;
		// don't load hit animation if target is killed (death animation should play instead)
		if (deadIds && deadIds.indexOf(hitTargetId) !== -1) {
			hitMsg._isDead = true;
			continue;
		}
		// don't load hit animation if life variation is not negative (cure spell, reflected spell, etc.)
		if (!lifeVariationMsgs[i].loss) { continue; }
		getAnimationAssets(sequenceLoader, hitTargetId, { base: 'AnimHit' }, fightState);
	}
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Get carrying bones assets
 */
function getCarryingAsset(sequenceLoader, msg, fightState) {
	var actor = window.actorManager.getActor(msg.sourceId);
	if (!actor || actor.animManager.isVoidAnimManager) { return; }
	sequenceLoader.addAnimation(actor, { base: 'carrying', direction: -1 });
	getAnimationAssets(sequenceLoader, msg.sourceId, { base: 'AnimPickup' }, fightState);
	msg._direction = getActorDisposition(msg.sourceId, fightState).direction;
}


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
function getDropAsset(sequenceLoader, msg, fightState) {
	getAnimationAssets(sequenceLoader, msg.sourceId, { base: 'AnimDrop' }, fightState);
	msg._direction = getActorDisposition(msg.sourceId, fightState).direction;
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
function getThrowAsset(sequenceLoader, msg, fightState) {
	getAnimationAssets(sequenceLoader, msg.sourceId, { base: 'AnimThrow' }, fightState);
	msg._throwingProjectile = createMissile(sequenceLoader, msg.sourceId, THROWING_PROJECTILE_FX);
	msg._direction = getActorDisposition(msg.sourceId, fightState).direction;
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Get assets list for GameActionFightSummonMessage
 *
 * @param {number}  msg.summon - GameFightFighterInformations
 * @param {number}  msg.summon.contextualId
 * @param {number}  msg.summon.look
 * @param {number}  msg.summon.disposition
 * @param {number}  msg.summon.teamId
 * @param {number}  msg.summon.alive
 * @param {number}  msg.summon.stats
 */
function getSummonAssets(sequenceLoader, msg) {
	window.gui.fightManager.loadFighter(msg);

	var summon = sequenceLoader.loadActor(msg.summon);
	summon.hide();
	msg._summon = summon;
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Get assets list for GameActionFightChangeLookMessage
 *
 * @param {number}   msg.targetId
 * @param {number}   msg.entityLook - EntityLook
 */
function getChangeLookAssets(sequenceLoader, msg, fightState) {
	var actorState = getActorState(msg.targetId, fightState);
	if (actorState.look !== msg.entityLook) {
		msg._doNotProcess = true;
		return;
	}

	var actor = window.actorManager.getActor(msg.targetId);
	sequenceLoader.loadLook(msg, actor, msg.entityLook);
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Get assets list for GameFightRefreshFighterMessage
 *
 * @param {number}  msg.informations
 */
function getRefreshFighterAssets(sequenceLoader, msg) {
	var informations = msg.informations;
	var actor = window.actorManager.getActor(informations.contextualId);
	sequenceLoader.loadLook(msg, actor, informations.look);
}


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Get assets list for GameActionFightDeathMessage or GameActionFightKillMessage
 *
 * @param {number} msg.targetId - id of actor that die
 */
function getDeathAssets(sequenceLoader, msg, fightState) {
	getAnimationAssets(sequenceLoader, msg.targetId, { base: 'AnimMort' }, fightState);
	msg._animSymbol = 'AnimMort';
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
function getHitAsset(sequenceLoader, msg, fightState) {
	getAnimationAssets(sequenceLoader, msg.targetId, { base: 'AnimHit' }, fightState);
	msg._animSymbol = 'AnimHit';
}


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Get assets list for GameActionFightTackledMessage
 *
 * @param {number}   msg.sourceId    - id of tackled actor
 * @param {number[]} msg.tacklersIds - id of actors who did the tackle
 */
function getTackledAssets(sequenceLoader, msg, fightState) {
	// TODO: if actor is carrying another actor, animation id becomes 'AnimTacleCarrying'
	getAnimationAssets(sequenceLoader, msg.sourceId, { base: 'AnimTacle' }, fightState);
}


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Get assets list for GameActionFightVanishMessage
 */
function getVanishAsset(sequenceLoader, msg, fightState) {
	getAnimationAssets(sequenceLoader, msg.targetId, { base: 'AnimVanish' }, fightState);
}


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Get assets list for GameActionFightMarkCellsMessage
 */
function getMarkAssets(sequenceLoader, msg) {
	var mark = msg.mark;
	if (!mark._glyphGfxId) {
		return;
	}

	addGfx(sequenceLoader, mark, mark._glyphGfxId, 'glyph', 0, 0);
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

var getMessageAssets = {
	GameActionFightSpellCastMessage:               getScriptAssets,
	GameActionFightCloseCombatMessage:             getScriptAssets,
	GameActionFightChangeLookMessage:              getChangeLookAssets,
	GameActionFightSummonMessage:                  getSummonAssets,
	GameActionFightDeathMessage:                   getDeathAssets,
	GameActionFightKillMessage:                    getDeathAssets,
	GameActionFightTackledMessage:                 getTackledAssets,
	GameActionFightMarkCellsMessage:               getMarkAssets,
	GameActionFightCarryCharacterMessage:          getCarryingAsset,
	GameActionFightThrowCharacterMessage:          getThrowAsset,
	GameActionFightDropCharacterMessage:           getDropAsset,
	_GameActionFightLeaveMessage:                  getDeathAssets,
	GameActionFightVanishMessage:                  getVanishAsset,
	GameActionFightLifeAndShieldPointsLostMessage: getHitAsset,
	GameActionFightLifePointsLostMessage:          getHitAsset,
	GameFightRefreshFighterMessage:                getRefreshFighterAssets,
	GameRolePlaySpellAnimMessage:                  getScriptAssets
	/*
	GameActionFightStealKamaMessage:               null,
	GameActionFightInvisibilityMessage:            null,
	GameActionFightTriggerEffectMessage:           null, // deprecated
	GameActionFightDispellEffectMessage:           null,
	GameActionFightDispellSpellMessage:            null,
	GameActionFightDispellMessage:                 null,
	GameActionFightDodgePointLossMessage:          null,
	GameActionFightSpellImmunityMessage:           null,
	GameActionFightInvisibleObstacleMessage:       null,
	GameActionFightReduceDamagesMessage:           null,
	GameActionFightReflectDamagesMessage:          null,
	GameActionFightReflectSpellMessage:            null,
	GameActionFightDispellableEffectMessage:       null,
	GameActionFightModifyEffectsDurationMessage:   null,
	GameActionFightInvisibleDetectedMessage:       null,
	GameActionFightPointsVariationMessage:         null,
	GameActionFightUnmarkCellsMessage:             null, // nothing to preload
	GameActionFightTriggerGlyphTrapMessage:        null, // nothing to preload
	GameActionFightSpellCooldownVariationMessage:  null, // nothing to preload
	GameMapMovementMessage:                        null, // nothing to preload
	GameActionFightSlideMessage:                   null, // nothing to preload
	GameActionFightLifePointsGainMessage:          null, // nothing to preload
	GameActionFightTeleportOnSameMapMessage:       null, // nothing to preload
	GameActionFightExchangePositionsMessage:       null, // nothing to preload
	GameFightTurnListMessage:                      null  // nothing to preload
	*/
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Manages loading of all the assets for the given sequence
 *
 * @param {array}    sequence - Message sequence. It contains the info of the assets to load
 * @param {function} cb       - callback triggered when all the assets have been loaded
 */
function LoadSequenceAssets(sequence, cb) {
	if ((this instanceof LoadSequenceAssets) === false) {
		return new LoadSequenceAssets(sequence, cb);
	}

	var fightState = preprocessSequence(sequence);

	this.nAssetsToLoad = 1;
	this.nAssetsLoaded = 0;

	var self = this;
	this.onAssetsLoaded = function () {
		self.nAssetsLoaded += 1;
		if (self.nAssetsLoaded === self.nAssetsToLoad) {
			cb();
		}
	};

	for (var s = 0; s < sequence.length; s++) {
		var msg = sequence[s];
		var getAssets = getMessageAssets[msg._messageType];
		if (getAssets) {
			getAssets(this, msg, fightState);
		}
	}

	this.onAssetsLoaded();
}

LoadSequenceAssets.prototype.addAnimation = function (sprite, symbol) {
	this.nAssetsToLoad += 1;
	sprite.animManager.addAnimation(symbol, this.onAssetsLoaded);
};

LoadSequenceAssets.prototype.loadAnimationManager = function (sprite, id) {
	this.nAssetsToLoad += 1;
	animationManagerLoading.loadAnimationManager(sprite, 'bone', id, this.onAssetsLoaded);
};

LoadSequenceAssets.prototype.loadActor = function (actorData) {
	this.nAssetsToLoad += 1;
	return window.actorManager.addActor(actorData, this.onAssetsLoaded);
};

LoadSequenceAssets.prototype.loadLook = function (msg, actor, look) {
	this.nAssetsToLoad += 1;

	var onAssetsLoaded = this.onAssetsLoaded;
	var options = { addToSprite: false };
	animationManagerLoading.loadLook(actor, look, options, function (animationManager) {
		msg._loadedLook = { animationManager: animationManager, look: look };
		onAssetsLoaded();
	});
};

LoadSequenceAssets.prototype.addWaitingRequest = function () {
	this.nAssetsToLoad += 1;
};

LoadSequenceAssets.prototype.removeWaitingRequest = function () {
	this.nAssetsToLoad -= 1;
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Get assets list needed to play the whole sequence.
 *
 * @param {Object[]} sequence - message sequence
 * @param {Function} cb - asynchronous callback function
 */
module.exports = function (sequence, cb) {
	LoadSequenceAssets(sequence, cb);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/preloadAssets/index.js
 ** module id = 1033
 ** module chunks = 0
 **/