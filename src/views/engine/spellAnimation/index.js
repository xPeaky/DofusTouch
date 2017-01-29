var Delay = require('TINAlight').Delay;
var TRAIL_DELAY = 3;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 *
 * @param {Sprite}   gfx         - gfx being started
 * @param {number}   orientation - orientation of the caster
 * @param {boolean}  isUnder     - whether the spell is under the caster
 * @param {function} cb          - callback to trigger when the spell animation has finished
 */
function playGfx(gfx, orientation, isUnder, cb) {
	gfx.position += isUnder ? -0.1 : 0.1;
	gfx.animManager.assignSymbol({ base: 'FX', direction: orientation }, false, function () {
		gfx.remove();
		if (cb) { return cb(); }
	});
}
exports.playGfx = playGfx;

function playTrailGfxAfterDelay(trailGfx, orientation, isUnder, delay) {
	new Delay(delay, function playTrailGfx() {
		playGfx(trailGfx, orientation, isUnder);
	}).start();
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
exports.playGfxTrailAnimation = function (trailGfxs, orientation, isUnder, cb) {
	var delay = 0;
	for (var g = 0; g < trailGfxs.length; g += 1) {
		playTrailGfxAfterDelay(trailGfxs[g], orientation, isUnder, delay);
		delay += TRAIL_DELAY;
	}

	new Delay(delay, cb).start();
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/spellAnimation/index.js
 ** module id = 1040
 ** module chunks = 0
 **/