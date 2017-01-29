var subentitySymbolModifiers = require('Entity/subentitySymbolModifiers');
var Delay                    = require('TINAlight').Delay;

var HOOK_POINT_CATEGORY_LIFTED_ENTITY = 3;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** GameActionFightCarryCharacterMessage
 * @desc A character is carryied by another
 *
 * @param {number} msg.actionId - action id (and action text)
 * @param {number} msg.sourceId - source actor (human, monstres, etc.) id.
 * @param {number} msg.targetId - carryied character id
 * @param {number} msg.cellId   - La cellule où se trouvait le personnage porté (pour connaître la direction)
 */
exports.carryCharacter = function (msg, animSequence) {
	var actorManager = window.actorManager;
	var source = actorManager.getActor(msg.sourceId);
	var target = actorManager.getActor(msg.targetId);
	if (!source || !target) { return; }

	var pickupSymbol = { base: 'AnimPickup', direction: msg._direction };

	// use the correct entity for carrier (i.e. if panda ride a mount)
	var carrier = source.riderEntity || source.animManager;

	animSequence.push(function seqCarryCharacter(cb) {
		carrier.addAnimationModifier('AnimStatique', 'AnimStatiqueCarrying');
		carrier.addAnimationModifier('AnimMarche',   'AnimMarcheCarrying');
		carrier.addAnimationModifier('AnimCourse',   'AnimCourseCarrying');
		carrier.addAnimationModifier('AnimHit',      'AnimHitCarrying');
		carrier.addAnimationModifier('AnimTacle',    'AnimTacleCarrying');

		var carriedEntity = {
			animManager:          target.animManager,
			bindingPoint:         'carried_3_0',
			symbolModifier:       subentitySymbolModifiers[HOOK_POINT_CATEGORY_LIFTED_ENTITY],
			bindingPointCategory: HOOK_POINT_CATEGORY_LIFTED_ENTITY
		};

		target.parentActor   = source;
		source.carriedEntity = carriedEntity;
		source.carriedActor  = target;
		carrier.addSubentity(carriedEntity);

		// TODO: handle creature mode

		target.setDisposition(source.cellId);
		target.getFighterData().isCarryied = true;
		target.y = -1000;
		source.oneShootAnim(pickupSymbol, true, cb);
	});
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
function removeCarrying(actor) {
	var carrier = actor.riderEntity || actor.animManager;
	carrier.removeAnimationModifier('AnimStatique');
	carrier.removeAnimationModifier('AnimMarche');
	carrier.removeAnimationModifier('AnimCourse');
	carrier.removeAnimationModifier('AnimHit');
	carrier.removeAnimationModifier('AnimTacle');
	carrier.removeSubentity(actor.carriedEntity);

	actor.carriedActor.parentActor = null;
	actor.carriedEntity = null;
	actor.carriedActor  = null;
}

exports.removeCarrying = removeCarrying;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** GameActionFightThrowCharacterMessage
 * @desc Un personnage est lancé par un autre
 *
 * @param {number} msg.actionId - action id (and action text)
 * @param {number} msg.sourceId - source actor (human, monstres, etc.) id.
 * @param {number} msg.targetId - thrown character id
 * @param {number} msg.cellId   - Cell on which actor is thrown
 */
exports.throwCharacter = function (msg, animSequence) {
	var actorManager = window.actorManager;
	var target = actorManager.getActor(msg.targetId);
	var source = actorManager.getActor(msg.sourceId);
	if (!source || !target) { return; }
	var cellId = msg.cellId;

	var throwAnimSymbol = { base: 'AnimThrow', direction: msg._direction };

	animSequence.push(function seqThrowAnimation(cb) {
		source.oneShootAnim(throwAnimSymbol, false, function () {
			removeCarrying(source);
			source.staticAnim();
			target.getFighterData().isCarryied = false;
		});
		var delay = new Delay(7, cb);
		delay.start(false);
	});

	if (cellId === -1) { return; }

	animSequence.push(function seqThrowProjectile(cb) {
		msg._throwingProjectile.launch(cellId, 13, 0.3, 70, cb);
	});

	animSequence.push(function seqThrowLanding(cb) {
		target.setDisposition(cellId);
		window.gui.transmitFightSequenceMessage(msg);
		return cb();
	});
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** GameActionFightDropCharacterMessage
 * @desc Un personnage est posé par un autre
 *
 * @param {number} msg.actionId - action id (and action text)
 * @param {number} msg.sourceId - source actor (human, monstres, etc.) id.
 * @param {number} msg.targetId - dropped character id
 * @param {number} msg.cellId   - Cell on which actor is dropped
 */
exports.dropCharacter = function (msg, animSequence) {
	var actorManager = window.actorManager;
	var source = actorManager.getActor(msg.sourceId);
	var target = actorManager.getActor(msg.targetId);
	if (!source) { return; }

	var dropAnimSymbol = { base: 'AnimDrop', direction: msg._direction };

	animSequence.push(function seqDropCharacter(cb) {
		source.oneShootAnim(dropAnimSymbol, false, function () {
			removeCarrying(source);
			target.setDisposition(msg.cellId);
			target.getFighterData().isCarryied = false;
			source.staticAnim();
			window.gui.transmitFightSequenceMessage(msg);
			return cb();
		});
	});
};





/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/fightSequence/carry.js
 ** module id = 1046
 ** module chunks = 0
 **/