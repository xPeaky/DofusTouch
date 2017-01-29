var Criterion = require('./Criterion.js');
var getText = require('getText').getText;
var GuildRightsBitEnum = require('guildManager').GuildRightsBitEnum;
var inherits = require('util').inherits;

function GuildRightsItemCriterion(criterionString) {
	Criterion.call(this, criterionString);
}
inherits(GuildRightsItemCriterion, Criterion);

GuildRightsItemCriterion.prototype.getText = function () {
	var readableCriterionValue;

	switch (this.value) {
	case GuildRightsBitEnum.GUILD_RIGHT_BOSS :
		readableCriterionValue = getText('ui.guild.right.leader');
		break;

	case GuildRightsBitEnum.GUILD_RIGHT_BAN_MEMBERS :
		readableCriterionValue = getText('ui.social.guildRightsBann');
		break;

	case GuildRightsBitEnum.GUILD_RIGHT_COLLECT :
		readableCriterionValue = getText('ui.social.guildRightsCollect');
		break;

	case GuildRightsBitEnum.GUILD_RIGHT_COLLECT_MY_TAX_COLLECTOR :
		readableCriterionValue = getText('ui.social.guildRightsCollectMy');
		break;

	case GuildRightsBitEnum.GUILD_RIGHT_DEFENSE_PRIORITY :
		readableCriterionValue = getText('ui.social.guildRightsPrioritizeMe');
		break;

	case GuildRightsBitEnum.GUILD_RIGHT_HIRE_TAX_COLLECTOR :
		readableCriterionValue = getText('ui.social.guildRightsHiretax');
		break;

	case GuildRightsBitEnum.GUILD_RIGHT_INVITE_NEW_MEMBERS :
		readableCriterionValue = getText('ui.social.guildRightsInvit');
		break;

	case GuildRightsBitEnum.GUILD_RIGHT_MANAGE_GUILD_BOOSTS :
		readableCriterionValue = getText('ui.social.guildRightsBoost');
		break;

	case GuildRightsBitEnum.GUILD_RIGHT_MANAGE_MY_XP_CONTRIBUTION :
		readableCriterionValue = getText('ui.social.guildRightManageOwnXP');
		break;

	case GuildRightsBitEnum.GUILD_RIGHT_MANAGE_RANKS :
		readableCriterionValue = getText('ui.social.guildRightsRank');
		break;

	case GuildRightsBitEnum.GUILD_RIGHT_MANAGE_RIGHTS :
		readableCriterionValue = getText('ui.social.guildManageRights');
		break;

	case GuildRightsBitEnum.GUILD_RIGHT_MANAGE_XP_CONTRIBUTION :
		readableCriterionValue = getText('ui.social.guildRightsPercentXP');
		break;

	case GuildRightsBitEnum.GUILD_RIGHT_ORGANIZE_PADDOCKS :
		readableCriterionValue = getText('ui.social.guildRightsMountParkArrange');
		break;

	case GuildRightsBitEnum.GUILD_RIGHT_SET_ALLIANCE_PRISM :
		readableCriterionValue = getText('ui.social.guildRightsSetAlliancePrism');
		break;

	case GuildRightsBitEnum.GUILD_RIGHT_TALK_IN_ALLIANCE_CHAN :
		readableCriterionValue = getText('ui.social.guildRightsTalkInAllianceChannel');
		break;

	case GuildRightsBitEnum.GUILD_RIGHT_TAKE_OTHERS_MOUNTS_IN_PADDOCKS :
		readableCriterionValue = getText('ui.social.guildRightsManageOtherMount');
		break;

	case GuildRightsBitEnum.GUILD_RIGHT_USE_PADDOCKS :
		readableCriterionValue = getText('ui.social.guildRightsMountParkUse');
		break;
	default:
		readableCriterionValue = '';
		break;
	}

	if (this.operator === Criterion.operators.equal) {
		return getText('ui.criterion.guildRights', [readableCriterionValue]);
	} else {
		return getText('ui.criterion.notGuildRights', [readableCriterionValue]);
	}
};

GuildRightsItemCriterion.prototype.isRespected = function () {
	var guildData = window.gui.playerData.guild;

	if (!guildData.hasGuild()) {
		return this.operator === Criterion.operators.different;
	}

	var hasThisRight = guildData.hasRight(this.value);
	if (this.operator === Criterion.operators.equal) {
		return hasThisRight;
	} else {
		return !hasThisRight;
	}
};

module.exports = GuildRightsItemCriterion;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/criterionFactory/GuildRightsItemCriterion.js
 ** module id = 359
 ** module chunks = 0
 **/