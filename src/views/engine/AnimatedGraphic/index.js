var inherits       = require('util').inherits;
var AnimatedSprite = require('AnimatedSprite');

var ANIMATED_GFX_STATIC_SYMBOL = { id: 'AnimStatique_0', base: 'AnimStatique', direction: 0 };
var ANIMATED_GFX_START_SYMBOL  = { id: 'AnimStart_0',    base: 'AnimStart',    direction: 0 };

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** @class AnimatedGraphic
 *
 * @param {Object}  params - element data
 *        {Object}  params.animManager - animation manager reference
 *        {boolean} params.astc        - is animation static
 *        {number}  params.dmin        - delay minimum
 *        {number}  params.dmax        - delay maximum
 */
function AnimatedGraphic(params) {
	AnimatedSprite.call(this, params, params.animManager);

	// animation properties
	this.animStatic = !!params.astc;
	this.delayMin = params.dmin || 0;
	this.delayMax = params.dmax || 0;

	// private properties
	this._timeout = null;
	this._stopped = true;
}
inherits(AnimatedGraphic, AnimatedSprite);
module.exports = AnimatedGraphic;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Start animation */
AnimatedGraphic.prototype.animate = function () {
	if (!this._stopped) { return; }
	this._stopped = false;
	if (!this.delayMax) {
		this._animateLoop();
	} else {
		if (this.animStatic) { this.animManager.assignSymbol(ANIMATED_GFX_STATIC_SYMBOL, false); }
		this._animateShoot();
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Stop animation */
AnimatedGraphic.prototype.stop = function () {
	this._stopped = true;
	if (this._timeout) {
		window.clearTimeout(this._timeout);
		this._timeout = null;
	}

	if (!this.delayMax) {
		this.animManager.assignSymbol(ANIMATED_GFX_STATIC_SYMBOL, false);
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
AnimatedGraphic.prototype.remove = function () {
	this.stop();
	AnimatedSprite.prototype.remove.call(this);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Looped animation
 * @private
 */
AnimatedGraphic.prototype._animateLoop = function () {
	this.animManager.assignSymbol(ANIMATED_GFX_START_SYMBOL, true);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Auto retriggering one-shoot animation
 * @private
 */
AnimatedGraphic.prototype._animateShoot = function () {
	var self = this;
	if (this._stopped) { return; }
	var delay = 1000 * (this.delayMin + (this.delayMax - this.delayMin) * Math.random());
	this._timeout = window.setTimeout(function () {
		if (self._stopped) { return; }
		self.animManager.assignSymbol(ANIMATED_GFX_START_SYMBOL, false, function () {
			if (self._stopped) { return; }
			if (self.animStatic) { self.animManager.assignSymbol(ANIMATED_GFX_STATIC_SYMBOL, false); }
			self._animateShoot();
		});
	}, delay);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/AnimatedGraphic/index.js
 ** module id = 1017
 ** module chunks = 0
 **/