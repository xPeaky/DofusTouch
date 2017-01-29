var BasicBuff = require('./BasicBuff.js');
var inherits = require('util').inherits;

function TriggeredBuff(effect, castingSpell, actionId, cb) {
	var self = this;
	BasicBuff.call(this, effect, castingSpell, actionId, effect.param1, effect.param2, effect.param3,
		function (error, buff) {
		if (error) {
			return cb(error);
		}
		self.delay = effect.delay;
		self.effect.delay = effect.delay;
		return cb(null, buff);
	});
}
inherits(TriggeredBuff, BasicBuff);
module.exports = TriggeredBuff;

TriggeredBuff.prototype.isActive = function () {
	return this.delay > 0 || BasicBuff.prototype.isActive.call(this);
};

TriggeredBuff.prototype.isTrigger = function () {
	return true;
};

TriggeredBuff.prototype.incrementDuration = function (delta, dispelEffect) {
	if (this.delay > 0 && !dispelEffect) {
		if (this.delay + delta >= 0) {
			this.delay--;
			this.effect.delay--;
		} else {
			delta += this.delay;
			this.delay = 0;
			this.effect.delay = 0;
		}
	}

	if (delta !== 0) {
		return BasicBuff.prototype.incrementDuration.call(this, delta, dispelEffect);
	} else {
		return true;
	}
};

TriggeredBuff.prototype.isUnusableNextTurn = function () {
	return this.delay <= 1 && BasicBuff.prototype.isUnusableNextTurn.call(this);
};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/Buff/TriggeredBuff.js
 ** module id = 235
 ** module chunks = 0
 **/