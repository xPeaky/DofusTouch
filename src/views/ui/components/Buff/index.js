var BasicBuff     = require('./BasicBuff.js');
var SpellBuff     = require('./SpellBuff.js');
var StatBuff      = require('./StatBuff.js');
var StateBuff     = require('./StateBuff.js');
var TriggeredBuff = require('./TriggeredBuff.js');

// TODO: Solves a circular dependency with BasicBuff and StateBuff, a cleaner solution would be better
BasicBuff.setStateBuff(StateBuff);

exports.BasicBuff     = BasicBuff;
exports.SpellBuff     = SpellBuff;
exports.StatBuff      = StatBuff;
exports.StateBuff     = StateBuff;
exports.TriggeredBuff = TriggeredBuff;

function makeBuffFromEffect(effect, castingSpell, actionId, cb) {
	var buff;

	switch (effect._type) {
		// Spell boost
		case 'FightTemporarySpellBoostEffect':
			buff = new SpellBuff(effect, castingSpell, actionId, cb);
			break;
		// Boost with trigger
		case 'FightTriggeredEffect':
			buff = new TriggeredBuff(effect, castingSpell, actionId, cb);
			break;
		// Melee damage boost
		case 'FightTemporaryBoostWeaponDamagesEffect':
			buff = new BasicBuff(effect, castingSpell, actionId, effect.weaponTypeId, effect.delta, effect.weaponTypeId, cb);
			break;
		// State boost
		case 'FightTemporaryBoostStateEffect':
			buff = new StateBuff(effect, castingSpell, actionId, cb);
			break;
		// Spell boost
		case 'FightTemporarySpellImmunityEffect':
			buff = new BasicBuff(effect, castingSpell, actionId, effect.immuneSpellId, null, null, cb);
			break;
		// Stat boost
		case 'FightTemporaryBoostEffect':
			buff = new StatBuff(effect, castingSpell, actionId, cb);
			break;
	}

	return buff;
}

exports.makeBuffFromEffect = makeBuffFromEffect;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/Buff/index.js
 ** module id = 219
 ** module chunks = 0
 **/