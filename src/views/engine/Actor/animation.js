var Actor     = require('./main.js');
var constants = require('constants');

var ANIM_SYMBOLS = constants.ANIM_SYMBOLS;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Get the correct animation symbol with respect to actor's direction and animation modifiers */
Actor.prototype.getAnimSymbol = function (animBaseId, direction) {
	if (!direction && direction !== 0) { direction = this.direction; }

	return {
		id: animBaseId + '_' + ANIM_SYMBOLS[direction],
		base: animBaseId,
		direction: direction
	};
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Construct animation symbol's id from symbol data */
Actor.prototype.finalizeAnimationSymbol = function (symbol) {
	if (!symbol.direction && symbol.direction !== 0) { symbol.direction = this.direction; }
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Load an animation for this actor and play it once loaded
 *
 * @param {Object} symbol - animation symbol
 * @param {boolean} loop  - should animation be played in loop.
 */
Actor.prototype.loadAndPlayAnimation = function (symbol, loop, cb) {
	var self = this;
	function playAnimation() {
		if (loop) {
			self.loopAnim(symbol, cb);
		} else {
			self.oneShootAnim(symbol, false, cb);
		}
	}

	this.finalizeAnimationSymbol(symbol);
	this.animManager.addAnimation(symbol, playAnimation);
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Set actor in static animation */
Actor.prototype.staticAnim = function () {
	this.animSymbol = this.getAnimSymbol('AnimStatique');
	this.animManager.assignSymbol(this.animSymbol, false);
	this.animated = false;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Play a looped animation
 *
 * @param {Object} symbol - Animation symbol to be played
 */
Actor.prototype.loopAnim = function (symbol, cb) {
	// assign animation symbol and run animation
	this.animSymbol = symbol;
	this.animated = true;

	this.animManager.assignSymbol(symbol, true, cb);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Play a one shoot animation
 *
 * @param {Object}   symbol       - animation symbol
 * @param {boolean}  backToStatic - when animation is finished, set actor animation to static
 * @param {Function} [cb] - optionnal callback function called when animation finish
 */
Actor.prototype.oneShootAnim = function (symbol, backToStatic, cb) {
	var self = this;

	this.finalizeAnimationSymbol(symbol);

	// assign animation symbol and run animation
	this.animSymbol = symbol;
	this.animated = true;

	this.animManager.assignSymbol(symbol, false, function () {
		if (backToStatic) { self.staticAnim(); }
		self.animated = false;
		return cb && cb();
	});
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Remove all animations added in actor's template beside 'motion' */
Actor.prototype.cleanupAnimations = function () {
	this.animManager.cleanupAnimations();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Play death animation, then remove actor from context.
 *
 * @param {Function} [cb] optionnal asynchronous callback function
 */
Actor.prototype.death = function (cb) {
	var self = this;

	// Stop moving animation, if any.
	if (this.moving) {
		console.warn('kill a moving actor');
		this.pathTween.stop();
	}

	if (this.animated) {
		console.warn('kill an animated actor');
	}

	// Check if death animation exist. If not, just remove actor.
	// TODO: for players, symbol Id seems to be more complex and needs a extra id.
	var animSymbol = this.getAnimSymbol('AnimMort');

	// Assign death animation.
	this.animSymbol = animSymbol;
	this.animated   = true;
	if (self.actorManager.userActor === this) {
		this.animManager.cleanupAnimationsAndRemoveSubentities();
	}
	this.isDead = true;

	this.animManager.assignSymbol(animSymbol, false, function () {
		// Remove actor from context.
		self.animated = false;
		if (self.fighterIndicator) {
			self.fighterIndicator.remove();
		}
		self.removeTeamCircle();
		self.actorManager.removeActor(self.actorId);
		return cb && cb();
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/Actor/animation.js
 ** module id = 609
 ** module chunks = 0
 **/