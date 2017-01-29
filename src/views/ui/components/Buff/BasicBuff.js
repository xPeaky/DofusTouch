var ActionIdConverter     = require('ActionIdConverter');
var FightDispellableEnum  = require('FightDispellableEnum');
var effectInstanceFactory = require('effectInstanceFactory');
var EffectInstance = effectInstanceFactory.EffectInstance;
var StateBuff;

// Table of effects affecting spells
var actionIdsForSpellModificatorEffect = [
	ActionIdConverter.ACTION_BOOST_SPELL_RANGE,
	ActionIdConverter.ACTION_BOOST_SPELL_RANGEABLE,
	ActionIdConverter.ACTION_BOOST_SPELL_DMG,
	ActionIdConverter.ACTION_BOOST_SPELL_HEAL,
	ActionIdConverter.ACTION_BOOST_SPELL_AP_COST,
	ActionIdConverter.ACTION_BOOST_SPELL_CAST_INTVL,
	ActionIdConverter.ACTION_BOOST_SPELL_CC,
	ActionIdConverter.ACTION_BOOST_SPELL_CASTOUTLINE,
	ActionIdConverter.ACTION_BOOST_SPELL_NOLINEOFSIGHT,
	ActionIdConverter.ACTION_BOOST_SPELL_MAXPERTURN,
	ActionIdConverter.ACTION_BOOST_SPELL_MAXPERTARGET,
	ActionIdConverter.ACTION_BOOST_SPELL_CAST_INTVL_SET,
	ActionIdConverter.ACTION_BOOST_SPELL_BASE_DMG,
	ActionIdConverter.ACTION_DEBOOST_SPELL_RANGE,
	406, 787, 792, 793, 1017, 1018, 1019, 1035, 1036, 1044, 1045
];

var defaultCallback = function (error) {
	if (error) {
		console.error(error);
	}
};

// TODO: Modify params to be a single array?
function BasicBuff(effect, castingSpell, actionId, param1, param2, param3, cb) {
	this._disabled = false;
	this._removed = false;

	this.id = effect.uid;
	this.uid = effect.uid;
	this.actionId = actionId;
	this.targetId = effect.targetId;
	this.castingSpell = castingSpell;
	this.duration = effect.turnDuration;
	this.dispelable = effect.dispelable;
	this.source = castingSpell.casterId;

	this.stack = null;

	var fightManager = window.gui.fightManager;
	if (fightManager.isInReconnection || window.gui.playerData.isSpectator || fightManager.currentFighterId === 0) {
		this.aliveSource = this.source;
	} else {
		this.aliveSource = fightManager.currentFighterId;
	}
	this.parentBoostUid = 0;
	this.initParam(param1, param2, param3, cb);
}
module.exports = BasicBuff;

BasicBuff.prototype.getParam1 = function () {
	if (this.effect._type === 'EffectInstanceDice') {
		return this.effect.diceNum;
	}
	return null;
};

BasicBuff.prototype.getParam2 = function () {
	if (this.effect._type === 'EffectInstanceDice') {
		return this.effect.diceSide;
	}
	return null;
};

BasicBuff.prototype.getParam3 = function () {
	if (this.effect._type === 'EffectInstanceInteger') {
		return this.effect.value;
	}
	return null;
};

BasicBuff.prototype._setParameter = function (index, value) {
	this.effect.setParameter(index, value === 0 ? null : value);
};

BasicBuff.prototype.setParam1 = function (value) {
	this._setParameter(0, value);
};

BasicBuff.prototype.setParam2 = function (value) {
	this._setParameter(1, value);
};

BasicBuff.prototype.setParam3 = function (value) {
	this._setParameter(2, value);
};

BasicBuff.prototype.initParam = function (param1, param2, param3, cb) {
	if (!cb) {
		cb = defaultCallback;
	}
	var rawEffect = {
		effectId: this.actionId,
		duration: this.duration,
		trigger: this.isTrigger(),
		value: param3
	};
	if (param1 || param2) {
		rawEffect.diceNum = param1;
		rawEffect.diceSide = param2;
	}
	this.effect = new EffectInstance(rawEffect);
	var self = this;
	effectInstanceFactory.collectEffectInstanceData([this.effect], function (error) {
		if (error) {
			return cb(error);
		}
		cb(null, self);
	});
};

BasicBuff.prototype.updateParam = function (value1, value2, value3) {
	switch (this.actionId) {
		case 788:
			this.setParam1(value2);
			break;
		case 950:
		case 951:
			break;
		default:
			this.setParam1(value1);
			this.setParam2(value2);
			this.setParam3(value3);
			break;
	}
	this.refreshDescription();
};

BasicBuff.prototype.equals = function (buff, doNotNeedSpell) {
	var isCastingAndBuffRankDifferent = (
	this.castingSpell.spellRank && buff.castingSpell.spellRank && !doNotNeedSpell &&
	this.castingSpell.spellRank.id !== buff.castingSpell.spellRank.id
	);

	if (this.targetId !== buff.targetId ||
		this.effect.effectId !== buff.actionId ||
		this.duration !== buff.duration ||
		(this.effect.hasOwnProperty('delay') && this.effect.delay !== buff.effect.delay) ||
		isCastingAndBuffRankDifferent ||
		(!doNotNeedSpell && this.castingSpell.spell.id !== buff.castingSpell.spell.id) ||
		this.constructor !== buff.constructor ||
		this.source !== buff.source ||
		this.isTrigger()) {
		return false;
	}

	// Special case: we need to add up only if the targeted spell is the same
	var thisActionId = this.actionId;
	if (thisActionId === 788) {
		// Retribution
		if (this.getParam1() !== buff.getParam1()) {
			// Retribution on two different caracteristics
			return false;
		}
	} else if (actionIdsForSpellModificatorEffect.indexOf(thisActionId) !== -1) {
		// Spell modifying spells
		if (this.getParam1() !== buff.getParam1()) {
			// Modifying two spells
			return false;
		}
	} else if (thisActionId === 165) {
		// Mastery are never merged
		return false;
	} else if (thisActionId === buff.actionId && (thisActionId === 952 || thisActionId === 951 || thisActionId === 950)) {
		// State buffs only add up if they are strictly the same
		if (this instanceof StateBuff && buff instanceof StateBuff) {
			if (this.stateId !== buff.stateId) {
				return false;
			}
		}
	}

	return true;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Apply a buff and its effect on a fighter
 *  Original name: onApplyed
 *  @virtual
 */
BasicBuff.prototype.apply = function () {
	this._disabled = false;
	this._removed = false;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Remove a buff and its effect on a fighter
 *  Original name: onRemoved
 *  @virtual
 */
BasicBuff.prototype.remove = function () {
	this._removed = true;
	if (!this._disabled) {
		// disable might be redefine in subclasses
		this.disable();
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Enable a buff on a fighter
 *  Original name: undisable
 *  @virtual
 */
BasicBuff.prototype.enable = function () {
	this._disabled = false;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Disable a buff on a fighter
 *  Original name: onDisabled
 *  @virtual
 */
BasicBuff.prototype.disable = function () {
	this._disabled = true;
};

BasicBuff.prototype.incrementDuration = function (delta, dispelEffect) {
	if (!dispelEffect || this.canBeDispell()) {
		if (this.duration >= 63) {
			return false;
		}

		if (this.duration + delta > 0) {
			this.duration += delta;
			this.effect.duration += delta;
			return true;
		} else if (this.duration > 0) {
			this.duration = 0;
			this.effect.duration = 0;
			return true;
		} else {
			return false;
		}
	} else {
		return false;
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Check if a buff is active
 *  Original name: active getter
 *  @virtual
 *  @return {boolean} true if the buff is active, false otherwise
 */
BasicBuff.prototype.isActive = function () {
	return this.duration !== 0;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Disable a buff on a fighter
 *  Original name: trigger getter
 *  @virtual
 *  @return {boolean} true if the buff is a trigger, false otherwise
 */
BasicBuff.prototype.isTrigger = function () {
	return false;
};

BasicBuff.prototype.canBeDispell = function (forceUndispellable, targetBuffId, dying) {
	targetBuffId = targetBuffId === undefined ? Number.MIN_VALUE : targetBuffId;

	if (targetBuffId === this.id) {
		return true;
	}

	switch (this.dispelable) {
		case FightDispellableEnum.DISPELLABLE:
			return true;
		case FightDispellableEnum.DISPELLABLE_BY_STRONG_DISPEL:
			return forceUndispellable;
		case FightDispellableEnum.DISPELLABLE_BY_DEATH:
			return dying || forceUndispellable;
		case FightDispellableEnum.REALLY_NOT_DISPELLABLE:
			return targetBuffId === this.id;
		default:
			return false;
	}
};

BasicBuff.prototype.add = function (buff) {
	if (!this.stack) {
		this.stack = [];
		this.stack.push(this);
	}
	this.stack.push(buff);

	switch (this.actionId) {
		case 293 :
			this.setParam1(buff.getParam1());
			this.setParam2(this.getParam2() + buff.getParam2());
			this.setParam3(this.getParam3() + buff.getParam3());
			break;
		case 788:
			this.setParam1(this.getParam1() + buff.getParam2());
			break;
		case 950:
		case 951:
		case 952:
			break;
		default:
			this.setParam1(this.getParam1() + buff.getParam1());
			this.setParam2(this.getParam2() + buff.getParam2());
			this.setParam3(this.getParam3() + buff.getParam3());
			break;
	}

	this.refreshDescription();
};

BasicBuff.prototype.isUnusableNextTurn = function () {
	if (this.duration > 1 || this.duration < 0) {
		return false;
	}

	var fightManager = window.gui.fightManager;
	var currentFighterId = fightManager.currentFighterId;
	var playerId = window.gui.playerData.id;

	if (currentFighterId === playerId || currentFighterId === this.source) {
		return false;
	}

	var fightersList = fightManager.turnsList;
	var playerPos = fightersList.indexOf(playerId);
	var currentPos = fightersList.indexOf(currentFighterId);
	var casterPos = fightersList.indexOf(this.source);

	if (casterPos < currentPos) {
		casterPos += fightersList.length;
	}
	if (playerPos < currentPos) {
		playerPos += fightersList.length;
	}

	if (playerPos < casterPos) {
		return false;
	}

	return true;
};

BasicBuff.prototype.refreshDescription = function () {
	this.effect.forceDescriptionRefresh();
};

module.exports.setStateBuff = function (stateBuffRef) {
	StateBuff = stateBuffRef;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Default delta getter (virtual method for inheritance)
 */
BasicBuff.prototype.getDelta = function () {
	console.warn('BasicBuff.prototype.getDelta should not be called directly');
	return 0;
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/Buff/BasicBuff.js
 ** module id = 220
 ** module chunks = 0
 **/