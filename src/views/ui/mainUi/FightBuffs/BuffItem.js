var inherits = require('util').inherits;
var WuiDom   = require('wuidom');
var assetPreloading = require('assetPreloading');

function getEndDelayTurn(buff) {
	var turnCount = window.gui.fightManager.getTurnCount();
	if (buff.effect.hasOwnProperty('delay')) {
		return turnCount + buff.effect.delay;
	}
	return turnCount;
}

function BuffItem(buff) {
	WuiDom.call(this, 'div', { className: 'BuffItem' });

	var spellId = buff.castingSpell.spell.id;
	var casterId = buff.castingSpell.casterId;
	var parentBoostUid = buff.parentBoostUid;
	var endDelay = (buff.effect.hasOwnProperty('delay') && buff.effect.delay > 0) ? getEndDelayTurn(buff) : -1;

	if (endDelay > 0) {
		this.key = spellId + '#' + casterId + '#' + parentBoostUid + '#' + endDelay;
	} else {
		this.key = spellId + '#' + casterId + '#' + parentBoostUid;
	}

	// TODO: Get spell
	this.parentBoostUid = 0;
	this.spell = buff.castingSpell.spell;

	var self = this;
	if (this.spell.getIconUri) {
		assetPreloading.preloadImage(this.spell.getIconUri(), function (url) {
			if (self && self.rootElement) {
				self.setStyle('backgroundImage', url);
			}
		});
	}

	this.buffs = [];

	this.cooldownLabel = this.createChild('div', { className: 'cooldown' });
	this.setCooldown(0);
}
inherits(BuffItem, WuiDom);
module.exports = BuffItem;

function getDelayKey(buff) {
	return buff.castingSpell.spell.id +
		'#' + buff.castingSpell.casterId +
		'#' + buff.parentBoostUid +
		'#' + getEndDelayTurn(buff);
}
module.exports.getDelayKey = getDelayKey;

function getKey(buff) {
	if (buff.effect.hasOwnProperty('delay') && buff.effect.delay > 0) {
		return getDelayKey(buff);
	}

	return buff.castingSpell.spell.id + '#' + buff.castingSpell.casterId + '#' + buff.parentBoostUid;
}
module.exports.getKey = getKey;

BuffItem.prototype.hasUid = function (boostUid) {
	for (var i = 0; i < this.buffs.length; i++) {
		if (this.buffs[i].uid === boostUid) {
			return true;
		}
	}

	return false;
};

BuffItem.prototype.addBuff = function (buff) {
	this.buffs.push(buff);

	if (buff.parentBoostUid !== 0) {
		this.parentBoostUid = buff.parentBoostUid;
	}

	this.updateCooldown();
};

BuffItem.prototype.isUnusableNextTurn = function () {
	for (var i = 0; i < this.buffs.length; i++) {
		if (!this.buffs[i].isUnusableNextTurn()) {
			return false;
		}
	}
	return true;
};

BuffItem.prototype.updateCooldown = function () {
	var last = 0;
	var isSet = false;
	var delay = 0;
	for (var i = 0, len = this.buffs.length; i < len; i++) {
		var buff = this.buffs[i];
		if (isSet && last !== buff.duration) {
			this.setCooldown(this.cooldown - 1);
		}

		if (delay === 0 || buff.effect.delay < delay) {
			delay = buff.effect.delay;
		}

		last = buff.duration;
		isSet = true;
	}

	if (delay > 0) {
		this.setCooldown(delay);
	} else {
		this.setCooldown(last);
	}

	if (this.isUnusableNextTurn()) {
		this.addClassNames('disabled');
	}
};

BuffItem.prototype.setCooldown = function (value) {
	this.cooldown = value;
	if (value === -1) {
		this.cooldownLabel.setText('+');
		this.cooldownLabel.show();
	} else if (value === 0 || value === Number.MAX_VALUE) {
		this.cooldownLabel.setText('');
		this.cooldownLabel.hide();
	} else if (value < -1) {
		this.cooldownLabel.setText('∞');
		this.cooldownLabel.show();
	} else {
		this.cooldownLabel.setText(value);
		this.cooldownLabel.show();
	}
};

BuffItem.prototype.maxCooldown = function () {
	if (this.cooldown !== -1) {
		return this.cooldown;
	}

	var max = 0;
	for (var i = 0, len = this.buffs.length; i < len; i++) {
		var buff = this.buffs[i];
		if (buff.duration > max || buff.duration < -1) {
			max = buff.duration;
		}
	}

	return max;
};

BuffItem.prototype.removeBuff = function (buff) {
	for (var i = 0; i < this.buffs.length; i++) {
		if (this.buffs[i] === buff) {
			this.buffs.splice(i, 1);
			this.updateCooldown();
			break;
		}
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/mainUi/FightBuffs/BuffItem.js
 ** module id = 584
 ** module chunks = 0
 **/