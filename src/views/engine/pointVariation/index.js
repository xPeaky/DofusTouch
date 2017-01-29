var TextSprite = require('TextSprite');
var constants  = require('constants');
var Tween      = require('TINAlight').Tween;
var easing     = require('TINAlight').easing;
var Delay      = require('TINAlight').Delay;
var gameOptions = require('gameOptions');
var ActionIdConverter = require('ActionIdConverter');

var IN_BETWEEN_LABEL_DELAY = 10;

var DEFAULT_COLOR = [0.0, 0.0, 0.0, 0.0];

//jscs:disable disallowSpacesInsideArrayBrackets
var LP_COLOR  = [ 0.5, -0.3, -0.3,  0.0]; // Life point
var LP_CRIT   = [ 0.3,  0.3, -0.5,  0.0]; // Critical life point
var AP_COLOR  = [-0.2, -0.3,  0.5,  0.0]; // Action point
var MP_COLOR  = [ 0.2,  0.5, -0.2,  0.0]; // Movement point
var LPS_COLOR = [ 0.3,  0.0,  0.5,  0.0]; // Shield point
//jscs:enable disallowSpacesInsideArrayBrackets

var ACTION_COLORS = {};
ACTION_COLORS[ActionIdConverter.ACTION_CHARACTER_ACTION_POINTS_USE] = AP_COLOR; // 102 marked as voluntarily used ankama
ACTION_COLORS[ActionIdConverter.ACTION_CHARACTER_MOVEMENT_POINTS_USE] = MP_COLOR;   // 129  voluntarily used

ACTION_COLORS[ActionIdConverter.ACTION_CHARACTER_MOVEMENT_POINTS_LOST] = MP_COLOR; // 127 -mp
ACTION_COLORS[ActionIdConverter.ACTION_CHARACTER_ACTION_POINTS_LOST] = AP_COLOR; // 101

ACTION_COLORS[ActionIdConverter.ACTION_CHARACTER_BOOST_ACTION_POINTS] = AP_COLOR; // 111 +ap
ACTION_COLORS[ActionIdConverter.ACTION_CHARACTER_DEBOOST_ACTION_POINTS] = AP_COLOR; // 168 -ap

ACTION_COLORS[ActionIdConverter.ACTION_CHARACTER_BOOST_MOVEMENT_POINTS] = MP_COLOR; // 128 +mp
ACTION_COLORS[ActionIdConverter.ACTION_CHARACTER_DEBOOST_MOVEMENT_POINTS] = MP_COLOR; // 169 -mp
// TODO: delta is not neg

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
function createPointVariationLabel(params) {
	var bitmapFonts = window.isoEngine.bitmapFonts;
	if (!bitmapFonts) {
		// bitmap font not loaded yet
		return;
	}

	var maxRotation = params.maxRotation || 0;
	var label = new TextSprite({
		position: 0,
		layer: constants.MAP_LAYER_POINT_LABELS,
		bitmapFont: bitmapFonts.numbers,
		scene: window.actorManager.scene,
		text: params.pointVariation,
		color: params.color || DEFAULT_COLOR,
		x: params.x + (Math.random() - 0.5) * 30,
		y: params.y + (Math.random() - 0.5) * 30,
		rotation: (Math.random() - 0.5) * maxRotation
	});

	// Hiding for now
	label.hide();

	Delay(params.delay || 0, function () {
		Tween(label.highlight, ['red', 'green', 'blue'])
			.from({ red: 1, green: 1, blue: 1 })
			.to({ red: 4, green: 4, blue: 4 }, 3, easing.polyOut, 4)
			.to({ red: 1, green: 1, blue: 1 }, 8, easing.polyOut, 4)
			.start();

		Tween(label, ['scaleX', 'scaleY'])
			.from({ scaleX: 0.2, scaleY: 0.2 })
			.to({ scaleX: 1.8, scaleY: 1.8 }, 4, easing.polyOut, 4)
			.to({ scaleX: 1.0, scaleY: 1.0 }, 10, easing.polyOut, 4)
			.start();


		var startingRotation = label.rotation;
		var finalRotation = (Math.random() - 0.5) * startingRotation;
		Tween(label, ['y', 'rotation'])
			.from({ y: label.y, rotation: startingRotation })
			.to({ y: label.y, rotation: startingRotation }, 8)
			.to({ y: label.y - 60, rotation: finalRotation }, 30, easing.polyOut, 7)
			.start();

		Tween(label, ['alpha'])
			.from({ alpha: 0 })
			.to({ alpha: 1 }, 3, easing.polyOut, 4)
			.to({ alpha: 0 }, 38, easing.polyIn, 4)
			.start()
			.onFinish(function () {
				label.remove();
			});

		// Showing the label (was hidden since its creation)
		label.show();
	}).start();
}
exports.createPointVariationLabel = createPointVariationLabel;

function createMessagePointVariationLabel(msg, color, delay) {
	var target = window.actorManager.getActor(msg.targetId);
	if (!target) { return; }

	if (!msg.shieldLoss) {
		if ((msg.delta === 0) || (msg.loss === 0)) {
			// Skipping if point variation is 0
			return;
		}
	}

	var text;

	// HACK: because effects don't have actionIds and we need to invert the value
	if (msg.actionId === ActionIdConverter.ACTION_CHARACTER_DEBOOST_MOVEMENT_POINTS) {
		text = '-' + msg.delta;
	} else {
		text = msg.delta ? ((msg.delta > 0) ? '+' + msg.delta : msg.delta) : '-' + msg.loss;
	}

	createPointVariationLabel({
		x: target.x,
		y: target.y - 70,
		maxRotation: 0.3,
		color: color,
		delay: delay,
		pointVariation: text
	});
}

function pointVariation(msg, animSequence, color) {
	// if variation is the result of a spell animation, just send it to GUI (anim will play within this spell message)
	// if no color is specified, there is no label

	if (msg._spell || !color || (!gameOptions.showApMpUsed &&
		(msg.actionId === ActionIdConverter.ACTION_CHARACTER_MOVEMENT_POINTS_USE ||
		msg.actionId === ActionIdConverter.ACTION_CHARACTER_ACTION_POINTS_USE))) {
		return animSequence.push(function pointVariation(cb) {
			window.gui.transmitFightSequenceMessage(msg);
			return cb();
		});
	}

	animSequence.push(function seqPointsVariation(cb) {
		createMessagePointVariationLabel(msg, color);
		window.gui.transmitFightSequenceMessage(msg);
		// wait a moment to let label animation to start (to avoid label overlap)
		window.setTimeout(cb, 500);
	});
}

function pointVariationBatch(msgs, animSequence) {
	// sort labels by target (to avoid several labels on same target to overlap)
	msgs.sort(function (a, b) {
		return a.targetId - b.targetId;
	});

	// create point variation animations
	var delays = [];

	var currentTargetId = null;
	var currentDelay    = 0;

	for (var i = 0; i < msgs.length; i++) {
		var msg = msgs[i];
		if (!msg._labelColor) { // No color, no label
			continue;
		}

		var targetId = msg.targetId;
		// add a delay before label if there is a label on same target before it
		if (currentTargetId === targetId) {
			currentDelay += IN_BETWEEN_LABEL_DELAY;
		} else {
			currentDelay = 0;
		}

		delays[i] = currentDelay;
		currentTargetId = targetId;
	}

	animSequence.push(function seqPointsVariationBatch(cb) {
		for (var m = 0; m < msgs.length; m++) {
			var msg = msgs[m];
			if (!gameOptions.showApMpUsed &&
				(msg.actionId === ActionIdConverter.ACTION_CHARACTER_MOVEMENT_POINTS_USE ||
				msg.actionId === ActionIdConverter.ACTION_CHARACTER_ACTION_POINTS_USE)) {
				continue;
			}
			if (msg._labelColor) { // No color, no label
				createMessagePointVariationLabel(msg, msg._labelColor, delays[m]);
			}
		}

		return cb();
	});
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** GameActionFightLifePointsGainMessage,
 *  GameActionFightLifePointsLostMessage,
 *  GameActionFightLifeAndShieldPointsLostMessage
 *
 * @param {number} msg.actionId -
 * @param {number} msg.sourceId -
 * @param {number} msg.targetId -
 * @param {number} msg.delta    - life gain
 * @param {number} msg.loss     - life points lost
 * @param {number} msg.permanentDamages - unhealable dammages (to remove from maxLife)
 * @param {number} msg.shieldLoss - shield points lost
 */
exports.lifePointVariation = function (msg, animSequence) {
	if (msg.shieldLoss) {
		pointVariation(msg, animSequence, LPS_COLOR);
	} else if (msg._spell && msg._spell.critical === 2) {
		pointVariation(msg, animSequence, LP_CRIT);
	} else {
		pointVariation(msg, animSequence, LP_COLOR);
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Display the Action points and Movement points.
 *
 * @param {object} msg - GameActionFightPointsVariationMessage
 * @param {Function[]} animSequence - array of animation functions
 */
exports.actionOrMovementPointVariation = function (msg, animSequence) {
	if (gameOptions.showApMpUsed ||
		(msg.actionId === ActionIdConverter.ACTION_CHARACTER_ACTION_POINTS_LOST ||
		msg.actionId === ActionIdConverter.ACTION_CHARACTER_MOVEMENT_POINTS_LOST)) {
		pointVariation(msg, animSequence, ACTION_COLORS[msg.actionId]); //TODO: check lookup works
	} else {
		pointVariation(msg, animSequence, /*no colors*/ null);
	}
};

exports.buffVariation = function (msg, animSequence) {
	if (msg.effect._type === 'FightTemporaryBoostEffect') {
		msg.effect.actionId = msg.actionId; // HACK: because effects dont have action ids
		pointVariation(msg.effect, animSequence, ACTION_COLORS[msg.actionId]);
	}
	animSequence.push(function pointVariation(cb) {
		window.gui.transmitFightSequenceMessage(msg);
		return cb();
	});
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** execute several lifePointVariation messages in parallel
 *
 * @param {Object[]} msgs - an array of lifePointVariation messages
 * @param {Function[]} animSequence - array of animation functions
 */
exports.lifePointVariationBatch = function (msgs, animSequence) {
	for (var m = 0; m < msgs.length; m++) {
		var msg = msgs[m];
		if (msg.shieldLoss) {
			msg._labelColor = LPS_COLOR;
		} else if (msg._spell && msg._spell.critical === 2) {
			msg._labelColor = LP_CRIT;
		} else {
			msg._labelColor = LP_COLOR;
		}
	}

	pointVariationBatch(msgs, animSequence);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Display the Action points and Movement points.
 *
 * @param {Object[]} msgs - an array of GameActionFightPointsVariationMessage messages
 * @param {Function[]} animSequence - array of animation functions
 */
exports.actionOrMovementPointVariationBatch = function (msgs, animSequence) {
	for (var m = 0; m < msgs.length; m++) {
		var msg = msgs[m];
		msg._labelColor = ACTION_COLORS[msg.actionId];
	}
	pointVariationBatch(msgs, animSequence);
};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/pointVariation/index.js
 ** module id = 1041
 ** module chunks = 0
 **/