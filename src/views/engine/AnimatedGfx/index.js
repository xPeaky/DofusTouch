var inherits       = require('util').inherits;
var AnimatedSprite = require('AnimatedSprite');

function AnimatedGfx(params) {
	AnimatedSprite.call(this, params, params.animManager);
	this.offsetY = params.offsetY || 0;
}
inherits(AnimatedGfx, AnimatedSprite);
module.exports = AnimatedGfx;

AnimatedGfx.prototype.isFx = true;


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/AnimatedGfx/index.js
 ** module id = 247
 ** module chunks = 0
 **/