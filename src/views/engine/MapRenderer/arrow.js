var constants      = require('constants');
var Graphic        = require('Graphic');
var inherit        = require('util').inherits;
var easing         = require('TINAlight').easing;
var Tween          = require('TINAlight').Tween;
var Delay          = require('TINAlight').Delay;
var textureLoading = require('textureLoading');

var arrows              = [];
var arrowsWaitingList   = [];
var arrowTexture        = null;
var hasInitCalled       = false;

var ARROW_WIDTH  = 60;
var ARROW_HEIGHT = 60;

// the duration of animation of the arrow in time unit
var DISPLAY_DURATION    = 24;
var FADE_DURATION       = 2;
var ARROW_LOOP_DURATION = 2 * (DISPLAY_DURATION + FADE_DURATION);

var ARROW_ROTATION_DEGREE_MAP = {
	up:        0,
	down:      180,
	left:     -90,
	right:     90,
	upLeft:   -45,
	upRight:   45,
	downLeft: -135,
	downRight: 135
};

var BOUNCE_VALUE = 3;
var BOUNCE_TIMES = 3;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
function ArrowGraphic(params, texture, nIterations) {
	Graphic.call(this, params, texture);

	this._centerX  = params.w / 2;
	this._centerY  = params.h;

	this.orientation = params.orientation;

	this.tween = null;
	this._startAnimation(nIterations);
}
inherit(ArrowGraphic, Graphic);

Object.defineProperty(ArrowGraphic.prototype, 'centerX', {
	get: function () { return this._centerX; },
	set: function (centerX) {
		this._centerX = centerX;
		this.forceRefresh();
	}
});

Object.defineProperty(ArrowGraphic.prototype, 'centerY', {
	get: function () { return this._centerY; },
	set: function (centerY) {
		this._centerY = centerY;
		this.forceRefresh();
	}
});

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
ArrowGraphic.prototype._startAnimation = function (nIterations) {
	var deg = ARROW_ROTATION_DEGREE_MAP[this.orientation] || 0;
	this.rotation = deg * Math.PI / 180;

	if (this.tween) {
		this.tween.stop();
		this.tween = null;
	}

	var bounceInitialValue = this.centerY - BOUNCE_VALUE;
	var bounceLastValue = this.centerY + BOUNCE_VALUE;

	this.tween = new Tween(this, ['alpha', 'centerY'])
		.from({ alpha: 0, centerY: bounceInitialValue })
		.to({ alpha: 1, centerY: bounceInitialValue }, FADE_DURATION)
		.to({ alpha: 1, centerY: bounceLastValue }, DISPLAY_DURATION, easing.trigo, BOUNCE_TIMES)
		.to({ alpha: 0, centerY: bounceLastValue }, FADE_DURATION)
		.to({ alpha: 0, centerY: bounceLastValue }, DISPLAY_DURATION)
		.start(nIterations || true /* looping */);

	return this;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
ArrowGraphic.prototype.stop = function () {
	this.tween.stop();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
ArrowGraphic.prototype.render = function () {
	var renderer = this.renderer;

	renderer.save();
	renderer.translate(this._x, this._y);
	renderer.rotate(this._rotation);
	renderer.translate(-this._centerX, -this._centerY);
	renderer.multiplyColor(this.tint[0], this.tint[1], this.tint[2], this.tint[3]);
	renderer.drawImage(this.texture, 0, 0, this.w, this.h);
	renderer.restore();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
ArrowGraphic.prototype.generateCurrentFrameData = function () {
	return [
		-this._centerX,
		this.w - this._centerX,
		-this._centerY,
		this.h - this._centerY
	];
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
function addWaitingArrow() {
	if (arrowsWaitingList.length === 0) {
		return;
	}
	arrowsWaitingList.forEach(function (arrayArgs) {
		exports.addArrow.apply(null, arrayArgs);
	});
	arrowsWaitingList = [];
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Add an arrow
 *
 * @param {Object} position              - arrow position coordinates
 *        {number} position.x            - x coordinate
 *        {number} position.y            - y coordinate
 * @param {number} cellId                - cell id pointed by arrow
 * @param {String} arrowOrientation      - how arrow is oriented, e.g. 'up', 'downRight'
 * @param {object} scene                 - involved scene
 * @param {number|boolean} [nIterations] - number of times the arrow animation will play, true for infinite
 *                                         cf. TinaLight Playable.start()
 */
function addArrow(position, cellId, arrowOrientation, scene, nIterations) {
	// If an arrow is instantiated for the first time, its texture needs to be loaded.
	// All the arrows that are instantiated between the moment the texture starts loading
	// and the moment it finishes loading will be added into the arrowsWaitingList and
	// will be added back after the texture is loaded
	if (!arrowTexture) {
		arrowsWaitingList.push(arguments);
		if (!hasInitCalled) {
			hasInitCalled = true;
			textureLoading.loadTexture('ui/hintArrow/arrow.png', function (texture) {
				arrowTexture = texture;
				addWaitingArrow();
			}, scene.renderer, 'linear', 'permanent');
		}
		return;
	}

	// Creating arrow parameters
	var arrowParams = {
		x: position.x,
		y: position.y,
		w: ARROW_WIDTH,
		h: ARROW_HEIGHT,
		position: cellId,
		layer: constants.MAP_LAYER_POINT_LABELS,
		orientation: arrowOrientation,
		scene: scene
	};

	// Adding arrow
	arrows.push(new ArrowGraphic(arrowParams, arrowTexture, nIterations));
}
exports.addArrow = addArrow;


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// Only one arrow sequence can be run at any given time since we are removing all the arrows
// when we play the sequence. The code would need to be modified if several sequences must be
// run simultaneously
var arrowSequenceDelay = new Delay();
var arrowOneShotDelay  = new Delay();

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Remove all arrows */
function removeArrows() {
	// clear the arrow in waiting list as well, because we do not want any arrow
	// to display when this function is called
	arrowsWaitingList = [];

	for (var i = 0; i < arrows.length; i++) {
		arrows[i].remove();
	}

	arrows = [];

	if (arrowSequenceDelay.playing || arrowSequenceDelay.starting) {
		arrowSequenceDelay.stop();
	}
	if (arrowOneShotDelay.playing || arrowOneShotDelay.starting) {
		arrowOneShotDelay.stop();
	}
}

exports.removeArrows = removeArrows;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Play a sequences of arrows added with addArrowsSequence.
 *
 * @param {Object[]} positions        - arrows position coordinates
 *        {number}   positions[*].x   - x coordinate
 *        {number}   positions[*].y   - y coordinate
 * @param {number[]} cellIds          - cell ids poited by arrows
 * @param {String[]} arrowOrientation - orientations, e.g. 'up', 'downRight'
 * @param {number}   index            - current step in the sequence
 */
function playSequence(positions, cellIds, arrowOrientation, scene, index) {
	removeArrows();

	// add one arrow from the sequence with the provided index, then display the next arrow
	// in the sequence when this arrow finishes looping, will always show one arrow at a time
	addArrow(positions[index], cellIds[index], arrowOrientation, scene);
	arrowSequenceDelay.reset(ARROW_LOOP_DURATION, function () {
		if (++index >= positions.length) { index = 0; }
		playSequence(positions, cellIds, arrowOrientation, scene, index);
	});
	arrowSequenceDelay.start();
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Add an arrow to several cell. The arrow moves from one cell to another in sequence.
 *
 * @param {Object[]} positions        - arrows position coordinates
 * @param {number[]} cellIds          - cell ids poited by arrows
 * @param {String[]} arrowOrientation - orientations, e.g. 'up', 'downRight'
 */
function addArrowsSequence(positions, cellIds, arrowOrientation, scene) {
	playSequence(positions, cellIds, arrowOrientation, scene, 0);
}

exports.addArrowsSequence = addArrowsSequence;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Add an arrow to several cells. The arrows are displayed all at once for a single loop.
 *
 * @param {Object[]} positions        - arrows position coordinates
 * @param {number[]} cellIds          - cell ids poited by arrows
 * @param {String[]} arrowOrientation - orientations, e.g. 'up', 'downRight'
 */
function addArrowsOneShot(positions, cellIds, arrowOrientation, scene) {
	if (arrowOneShotDelay.playing || arrowOneShotDelay.starting) {
		return;
	}

	removeArrows();

	for (var i = 0; i < positions.length; i++) {
		addArrow(positions[i], cellIds[i], arrowOrientation, scene);
	}
	arrowOneShotDelay.reset(ARROW_LOOP_DURATION, function () {
		removeArrows();
	});
	arrowOneShotDelay.start();
}

exports.addArrowsOneShot = addArrowsOneShot;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/MapRenderer/arrow.js
 ** module id = 1018
 ** module chunks = 0
 **/