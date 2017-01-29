require('./styles.less');
var inherits   = require('util').inherits;
var WuiDom     = require('wuidom');
var BuffItem   = require('./BuffItem.js');
var addTooltip = require('TooltipBox').addTooltip;
var BuffDescription = require('BuffDescription');

/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @class  Fight buffs
 * @desc   Fighter buffs displayed under the timeline during a fight
 */
function FightBuffs() {
	WuiDom.call(this, 'div', { className: 'FightBuffs' });

	this.buffList = this.createChild('div', { className: 'buffList' });
	this.buffItems = {};

	this._registerListeners(window.gui.fightManager);

	this.fighter = null;
	this.lastWasPlayer = false;

	this.buffDescription = new BuffDescription();

	this.hide();
}
inherits(FightBuffs, WuiDom);
module.exports = FightBuffs;

FightBuffs.prototype._registerListeners = function (fightManager) {
	var self = this;

	fightManager.on('GameFightTurnStart', function (id) {
		if (id === window.gui.playerData.id) {
			self.lastWasPlayer = true;
		} else if (self.lastWasPlayer) {
			var buffItems = self.buffList.getChildren();
			for (var i = 0; i < buffItems.length; i++) {
				buffItems[i].updateCooldown();
			}

			self.lastWasPlayer = false;
		}
	});

	fightManager.on('BuffUpdate', function (buff, fighter) {
		if (self.fighter !== fighter) {
			return;
		}
		self.updateBuff(buff);
	});

	fightManager.on('BuffRemove', function (buff, fighter) {
		if (self.fighter !== fighter) {
			return;
		}
		self.removeBuff(buff);
	});

	fightManager.on('BuffAdd', function (buff, fighter) {
		if (self.fighter !== fighter) {
			return;
		}
		self._addBuff(buff);
		self.updateUi();
	});
};

FightBuffs.prototype.open = function (fighter) {
	if (this.fighter !== fighter) {
		this.clean();
		this.fighter = fighter;

		this.makeItemBuffs(fighter);
		this.updateUi();
	}

	this.show();
};

FightBuffs.prototype.close = function () {
	this.clean();

	this.hide();
};

FightBuffs.prototype.clean = function () {
	this.fighter = null;

	this.buffList.clearContent();
	this.buffItems = {};
};

FightBuffs.prototype.makeItemBuffs = function (fighter) {
	var buffList = fighter.buffs;

	for (var i = 0, len = buffList.length; i < len; i++) {
		this._addBuff(buffList[i]);
	}
};

var sortCastingSpellGroup = function (a, b) {
	return a.maxCooldown() - b.maxCooldown();
};

FightBuffs.prototype.updateUi = function () {
	var tmpSorted = [];
	var boosts = [];
	var buffItems = this.buffList.getChildren();
	for (var i = 0; i < buffItems.length; i++) {
		var buffItem = buffItems[i];
		if (buffItem.parentBoostUid !== 0) {
			boosts.push(buffItem);
		} else {
			tmpSorted.push(buffItem);
		}
	}

	tmpSorted.sort(sortCastingSpellGroup);

	for (i = 0; i < boosts.length; i++) {
		var boost = boosts[i];
		var hasBuff = false;
		var cooldownPos = 0;
		for (var j = 0; j < tmpSorted.length; j++) {
			if (tmpSorted[j].maxCooldown() < boost.cooldown) {
				cooldownPos = j;
			}

			if (tmpSorted[j].hasUid(boost.parentBoostUid)) {
				tmpSorted.splice(j + 1, 0, boost);
				hasBuff = true;
				break;
			}
		}
		if (!hasBuff) {
			tmpSorted.splice(cooldownPos, 0, boost);
		}
	}

	for (i = 0; i < tmpSorted.length; i++) {
		var buff = tmpSorted[i];
		this.buffList.appendChild(buff);
	}
};

FightBuffs.prototype._addBuff = function (buff) {
	var key = BuffItem.getKey(buff);
	var buffItem = this.buffItems[key];

	if (buffItem) {
		buffItem.addBuff(buff);
		return;
	}

	buffItem = new BuffItem(buff);

	var tooltipContent;
	function onPressBuff() {
		var effects = [];
		var casterId = -1;
		for (var i = 0; i < buffItem.buffs.length; i++) {
			var buff = buffItem.buffs[i];
			effects.push(buff.effect);
			casterId = buff.source;
		}

		var fightManager = window.gui.fightManager;
		var caster = fightManager.getFighter(casterId);

		if (!caster) {
			return null;
		}

		var buffData = {};
		buffData.spellName = buffItem.spell.getName();
		buffData.casterName = caster.name;
		buffData.effects = effects;

		if (tooltipContent) {
			tooltipContent.updateUI(buffData);
		} else {
			tooltipContent = new BuffDescription(buffData);
		}

		return tooltipContent;
	}
	addTooltip(buffItem, onPressBuff);

	this.buffItems[key] = buffItem;
	this.buffList.appendChild(buffItem);

	buffItem.addBuff(buff);
};

FightBuffs.prototype.updateBuff = function (buff) {
	var key = BuffItem.getKey(buff);
	var buffItem = this.buffItems[key];
	if (!buffItem) {
		var delayKey = BuffItem.getDelayKey(buff);
		buffItem = this.buffItems[delayKey];
		if (!buffItem) {
			console.warn('Trying to update a non-existing buff.');
			return;
		}

		this.buffItems[key] = buffItem;
		delete this.buffItems[delayKey];
	} else {
		buffItem.updateCooldown(buff);
		this.updateUi();
	}
};

FightBuffs.prototype.removeBuff = function (buff) {
	this.removeBuffItem(buff, BuffItem.getKey(buff));
	this.removeBuffItem(buff, BuffItem.getDelayKey(buff));

	this.updateUi();
};

FightBuffs.prototype.removeBuffItem = function (buff, key) {
	var buffItem = this.buffItems[key];
	if (!buffItem) {
		return;
	}

	buffItem.removeBuff(buff);

	if (buffItem.buffs.length === 0) {
		this.buffList.removeChild(buffItem);
		buffItem.destroy();
		delete this.buffItems[key];
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/mainUi/FightBuffs/index.js
 ** module id = 582
 ** module chunks = 0
 **/