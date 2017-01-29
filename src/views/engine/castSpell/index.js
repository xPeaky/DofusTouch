var spellAnimation = require('spellAnimation');
var pointVariation = require('pointVariation');
var Delay          = require('TINAlight').Delay;
var gameOptions    = require('gameOptions');
var async          = require('async');

var CAST_SPELL_DELAY = 17; // Delay between casting animation and spell animation

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** GameActionFightSpellCastMessage | GameActionFightCloseCombatMessage
 *
 * @param {number}  msg.sourceId          - source actor id
 * @param {number}  msg.targetId          - target actor id.  (0 if none)
 * @param {number}  msg.destinationCellId - destination cell. (-1 if unknown)
 * @param {number}  msg.critical          - 1: NORMAL, 2: CRITICAL_HIT, 3: CRITICAL_FAIL
 * @param {boolean} msg.silentCast        -
 * @param {number}  msg.spellId           -
 * @param {number}  msg.spellLevel        -
 *
 * @param {Object}  msg._scriptParams - (enriched) informations on spell animation
 * @param {number}  msg._scriptParams.animId        - symbolId to be played by caster
 * @param {string}  msg._scriptParams.customHitAnim - symbolId to be played by target
 * @param {number}  msg._scriptParams.casterGfxId   - gfx to display on caster
 * @param {number}  msg._scriptParams.targetGfxId   - gfx to display on target
 * @param {number}  msg._scriptParams.targetGfxId2  - additional gfx on target
 * @param {number}  msg._scriptParams.casterGfxDisplayType  - display mode { 0: normal, 1: random, 2: oriented }
 * @param {number}  msg._scriptParams.targetGfxDisplayType  - display mode
 * @param {number}  msg._scriptParams.targetGfxDisplayType2 - display mode
 * @param {number}  msg._scriptParams.missileGfxId  - gfx to use for missile
 * @param {number}  msg._scriptParams.trailGfxId    - gfx to use for trail
 * @param {number}  msg._scriptParams.glyphGfxId    - gfx to use for glyph
 */
module.exports = function (msg, animSequence) {
	if (msg.silentCast) { return; }
	var actorManager = window.actorManager;
	var source = actorManager.getActor(msg.sourceId || msg.casterId);

	// orient caster to target
	var orientation = msg._casterOrientation;
	if (orientation) { // note: In fight, orientation can never be 0 (diagonal direction)
		animSequence.push(function seqOrientCaster(cb) {
			source.setDisposition(null, orientation);
			return cb();
		});
	}

	var script = msg._scriptParams || {};

	function playGfxTarget(waitAnimEnd) { // TODO: investigate usefulness of waitAnimEnd
		animSequence.push(function seqGfxOnTarget(cb) {
			spellAnimation.playGfx(
				msg._targetGfx,
				msg._targetGfxOrientation,
				script.targetGfxShowUnder,
				waitAnimEnd ? cb : null
				// TODO: instead of putting callback here, we should test a delay of half the duration
				//       of the animation. Waiting Brice's refactoring work on asset loading to do that.
			);
			return !waitAnimEnd && cb();
		});
	}

	function playGfxTarget2() {
		animSequence.push(function seqGfxOnTarget2(cb) {
			spellAnimation.playGfx(
				msg._targetGfx2,
				msg._targetGfx2Orientation,
				script.targetGfxShowUnder2
			);
			return cb();
		});
	}

	if (gameOptions.allowSpellEffects) {
		// spell (or close combat) animation
		var spellAnimSymbol = msg._spellAnimSymbol;
		if (spellAnimSymbol) {
			animSequence.push(function seqCastSpell(cb) {
				source.oneShootAnim(spellAnimSymbol, true);

				var castAnimationDuration = source.animManager.nbFrames;
				Delay(Math.min(CAST_SPELL_DELAY, castAnimationDuration), cb).start();
			});
		}

		// add gfx on target if needed to play first
		var hasTargetCell = (msg._targetCellId || msg.destinationCellId !== -1);
		if (hasTargetCell) {
			if (msg._targetGfx  && script.playTargetGfxFirst)  { playGfxTarget(); }
			if (msg._targetGfx2 && script.playTargetGfxFirst2) { playGfxTarget2(); }
		}

		// add gfx on source
		if (script.casterGfxId) {
			animSequence.push(function seqGfxOnCaster(cb) {
				// TODO? script.casterGfxDisplayType
				spellAnimation.playGfx(
					msg._casterGfx,
					msg._casterGfxOrientation,
					script.casterGfxShowUnder
				);
				return cb();
			});
		}

		// missile animation
		if (msg._missileGfx && msg.destinationCellId !== -1) {
			animSequence.push(function seqSpellMissile(cb) {
				msg._missileGfx.launch(
					msg.destinationCellId,
					// To find original missile speed calculation see:
					// "atouin/types/sequences/ParableGfxMovementStep.as"
					// and in the missile gfx script file "2.ds"
					script.missileSpeed !== undefined ? script.missileSpeed + 10 : 10,
					(script.missileCurvature || 0) / 10,
					// N.B: script.missileOrientedToCurve not considered in original source code
					script.missileGfxYOffset || 0,
					cb
				);
			});
		}

		// Trail animation
		if (script.trailGfxId) {
			animSequence.push(function seqGfxOnTrail(cb) {
				spellAnimation.playGfxTrailAnimation(
					msg._trailGfxs,
					msg._trailGfxsOrientation,
					script.trailGfxShowUnder,
					cb
				);
			});
		}

		// add gfx on target
		if (hasTargetCell) {
			if (msg._targetGfx  && !script.playTargetGfxFirst)  { playGfxTarget(); }
			if (msg._targetGfx2 && !script.playTargetGfxFirst2) { playGfxTarget2(); }
		}
	}

	// there are hits and death messages related to this spell
	var hasLifeVariationAnim = msg._lifeVariationMsgs  && msg._lifeVariationMsgs.length > 0;
	if (hasLifeVariationAnim) {
		pointVariation.lifePointVariationBatch(msg._lifeVariationMsgs, animSequence);
		animSequence.push(function seqSpellHitBatch(cb) {
			// play all hit animations
			for (var i = 0; i < msg._lifeVariationMsgs.length; i++) {
				var hitMsg = msg._lifeVariationMsgs[i];
				if (hitMsg._isDead || hitMsg.delta > 0) { continue; } // delta is amount of the stat changed
				var target = actorManager.getActor(hitMsg.targetId);
				var symbol = { base: hitMsg._animSymbol || 'AnimHit' };
				target.oneShootAnim(symbol, true);
			}

			return cb();
		});
	}

	var hasPointVariationAnim = msg._pointVariationMsgs && msg._pointVariationMsgs.length > 0;
	if (hasPointVariationAnim) {
		pointVariation.actionOrMovementPointVariationBatch(msg._pointVariationMsgs, animSequence);
	}

	var hasDeathAnim = msg._deathMsgs && msg._deathMsgs.length > 0;
	if (hasDeathAnim) {
		animSequence.push(function seqSpellDeathBatch(cb) {
			// play all death animations
			function die(deathMsg, callback) {
				var actor = actorManager.getActor(deathMsg.targetId);
				if (!actor) {
					console.error('Actor ' + deathMsg.targetId + 'not found.');
					return callback();
				}
				actor.isDead = true;
				actor.death(callback);
			}
			// fix up the movement zone after all deaths are finished.
			async.each(msg._deathMsgs, die, function () {
				if (!actorManager.userActor.isDead &&
					window.gui.fightManager.isFightersTurn(actorManager.userActor.actorId)) {
					window.isoEngine.tryDisplayUserMovementZone();
				}
			});
			cb();
		});
	}

	if (hasLifeVariationAnim || hasPointVariationAnim || hasDeathAnim) {
		animSequence.push(function finalDelay(cb) {
			// adding a short delay for the player to see what's going on before next action
			Delay(15, cb).start();
		});
	}

	// finally, transmit message to Gui
	animSequence.push(function seqTransmitMsg(cb) {
		window.gui.transmitFightSequenceMessage(msg);
		return cb();
	});
};




/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/castSpell/index.js
 ** module id = 1039
 ** module chunks = 0
 **/