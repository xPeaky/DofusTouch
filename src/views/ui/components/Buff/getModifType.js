var ActionIdConverter = require('ActionIdConverter');
var CharacterSpellModificationTypeEnum = require('CharacterSpellModificationTypeEnum');

var buffTypeMap = {};
buffTypeMap[ActionIdConverter.ACTION_BOOST_SPELL_RANGEABLE] = CharacterSpellModificationTypeEnum.RANGEABLE;
buffTypeMap[ActionIdConverter.ACTION_BOOST_SPELL_DMG] = CharacterSpellModificationTypeEnum.DAMAGE;
buffTypeMap[ActionIdConverter.ACTION_BOOST_SPELL_BASE_DMG] = CharacterSpellModificationTypeEnum.BASE_DAMAGE;
buffTypeMap[ActionIdConverter.ACTION_BOOST_SPELL_HEAL] = CharacterSpellModificationTypeEnum.HEAL_BONUS;
buffTypeMap[ActionIdConverter.ACTION_BOOST_SPELL_AP_COST] = CharacterSpellModificationTypeEnum.AP_COST;
buffTypeMap[ActionIdConverter.ACTION_BOOST_SPELL_CAST_INTVL] = CharacterSpellModificationTypeEnum.CAST_INTERVAL;
buffTypeMap[ActionIdConverter.ACTION_BOOST_SPELL_CAST_INTVL_SET] = CharacterSpellModificationTypeEnum.CAST_INTERVAL_SET;
buffTypeMap[ActionIdConverter.ACTION_BOOST_SPELL_CC] = CharacterSpellModificationTypeEnum.CRITICAL_HIT_BONUS;
buffTypeMap[ActionIdConverter.ACTION_BOOST_SPELL_CASTOUTLINE] = CharacterSpellModificationTypeEnum.CAST_LINE;
buffTypeMap[ActionIdConverter.ACTION_BOOST_SPELL_NOLINEOFSIGHT] = CharacterSpellModificationTypeEnum.LOS;
buffTypeMap[ActionIdConverter.ACTION_BOOST_SPELL_MAXPERTURN] = CharacterSpellModificationTypeEnum.MAX_CAST_PER_TURN;
buffTypeMap[ActionIdConverter.ACTION_BOOST_SPELL_MAXPERTARGET] = CharacterSpellModificationTypeEnum.MAX_CAST_PER_TARGET;
buffTypeMap[ActionIdConverter.ACTION_BOOST_SPELL_RANGE] = CharacterSpellModificationTypeEnum.RANGE;
buffTypeMap[ActionIdConverter.ACTION_DEBOOST_SPELL_RANGE] = CharacterSpellModificationTypeEnum.RANGE;

function getModifType(actionId) {
	return buffTypeMap[actionId];
}
module.exports = getModifType;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/Buff/getModifType.js
 ** module id = 225
 ** module chunks = 0
 **/