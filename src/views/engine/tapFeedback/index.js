var inherit                 = require('util').inherits;
var AnimatedGfx             = require('AnimatedGfx');
var constants               = require('constants');
var animationManagerLoading = require('animationManagerLoading');
var TeamEnum                = require('TeamEnum');

var ANIMATED_TAP_TYPES = {
	TAP_MARKER: {
		id: 1,
		animationName: 'touch_anim_ok',
		isLoop: false
	},
	MOVEMENT_MARKER: {
		id: 2,
		animationName: 'marqueur_anim_ok',
		isLoop: true
	},
	TURN_MARKER_RED: {
		id: 3,
		animationName: 'marqueur_anim_ok',
		isLoop: true
	},
	TURN_MARKER_BLUE: {
		id: 4,
		animationName: 'marqueur_anim_ok',
		isLoop: true
	}
};

var animatedTaps = {};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
function AnimatedTap(type, params) {
	if (type === ANIMATED_TAP_TYPES.TAP_MARKER) {
		params.layer = constants.MAP_LAYER_TAP_FEEDBACK;
	}
	AnimatedGfx.call(this, params);
	this.setWhiteListedness(true);

	this.infos = type;
}
inherit(AnimatedTap, AnimatedGfx);

AnimatedTap.prototype.play = function (params) {
	var infos = this.infos;
	var self = this;
	var isLoop = infos.isLoop;
	var cb = isLoop ? undefined : function () { self.remove(false); };

	this.animManager.assignSymbol({ base: infos.animationName, direction: -1 }, isLoop, cb);
	if (params.position || params.position === 0) {
		this.position = params.position;
	}
	this.x = params.x;
	this.y = params.y;
	this.show();
};

function loadModels() {
	var turnIconScale = 1.5;
	var red = [1, 0, 0, 1];
	var blue = [0, 0, 1, 1];
	for (var typeName in ANIMATED_TAP_TYPES) {
		var type = ANIMATED_TAP_TYPES[typeName];
		if (type.id === 3 || type.id === 4) {
			var animatedTap = new AnimatedTap(type, {
				scene: window.isoEngine.mapRenderer.mapScene,
				layer: constants.MAP_LAYER_BACKGROUND,
				hue: type.id === 3 ? red : blue,
				sx: turnIconScale,
				sy: turnIconScale
			});
		} else {
			animatedTap = new AnimatedTap(type, { scene: window.isoEngine.mapRenderer.mapScene });
		}
		animatedTaps[type.id] = animatedTap;
		animationManagerLoading.loadAnimationManager(animatedTap, 'embedded', 'tapFeedback');
	}
}

function addAnimatedTap(type, params) {
	var animatedTap = animatedTaps[type.id];
	if (!animatedTap) {
		return console.warn('Tap feedback', type.id, 'does not exist.');
	}
	animatedTap.play(params);
}

function removeAnimatedTap(type) {
	var animatedTap = animatedTaps[type.id];
	if (!animatedTap) {
		return;
	}
	animatedTap.remove();
}

exports.initialize = function () {
	loadModels();
};

function addMovementFeedback(params) {
	addAnimatedTap(ANIMATED_TAP_TYPES.MOVEMENT_MARKER, params);
}
exports.addMovementFeedback = addMovementFeedback;

function removeMovementFeedback() {
	removeAnimatedTap(ANIMATED_TAP_TYPES.MOVEMENT_MARKER);
	removeAnimatedTap(ANIMATED_TAP_TYPES.TURN_MARKER_RED);
	removeAnimatedTap(ANIMATED_TAP_TYPES.TURN_MARKER_BLUE);
}
exports.removeMovementFeedback = removeMovementFeedback;

function addTapFeedback(params) {
	addAnimatedTap(ANIMATED_TAP_TYPES.TAP_MARKER, params);
}
exports.addTapFeedback = addTapFeedback;

function removeTapFeedback() {
	removeAnimatedTap(ANIMATED_TAP_TYPES.TAP_MARKER);
}
exports.removeTapFeedback = removeTapFeedback;

//

exports.addTurnFeedback = function (params, team) {
	var turnMarker = team === TeamEnum.TEAM_CHALLENGER ?
		ANIMATED_TAP_TYPES.TURN_MARKER_RED :
		ANIMATED_TAP_TYPES.TURN_MARKER_BLUE;
	addAnimatedTap(turnMarker, params);
};

exports.moveRedFeedback = function (x, y) {
	var animatedTap = animatedTaps[3];
	animatedTap.x = x;
	animatedTap.y = y;
};

exports.moveBlueFeedback = function (x, y) {
	var animatedTap = animatedTaps[4];
	animatedTap.x = x;
	animatedTap.y = y;
};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/tapFeedback/index.js
 ** module id = 620
 ** module chunks = 0
 **/