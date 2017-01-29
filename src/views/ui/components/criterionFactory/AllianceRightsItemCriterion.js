var Criterion = require('./Criterion.js');
var getText = require('getText').getText;
var AllianceRightsBitEnum = require('AllianceRightsBitEnum');
var inherits = require('util').inherits;

//COMPAT215 AllianceRightsBitEnum has missing cases.
AllianceRightsBitEnum.ALLIANCE_RIGHT_MANAGE_PRISMS = 2;
AllianceRightsBitEnum.ALLIANCE_RIGHT_TALK_IN_CHAN = 4;
AllianceRightsBitEnum.ALLIANCE_RIGHT_RECRUIT_GUILDS = 8;
AllianceRightsBitEnum.ALLIANCE_RIGHT_KICK_GUILDS = 16;
AllianceRightsBitEnum.ALLIANCE_RIGHT_MANAGE_RIGHTS = 32;


function getRightAsText(right) {
	switch (right) {
	case AllianceRightsBitEnum.ALLIANCE_RIGHT_BOSS :
		return getText('ui.guild.right.leader');
	case AllianceRightsBitEnum.ALLIANCE_RIGHT_KICK_GUILDS:
		return getText('ui.social.guildRightsBann');
	case AllianceRightsBitEnum.ALLIANCE_RIGHT_MANAGE_PRISMS:
		return getText('ui.social.guildRightsSetAlliancePrism');
	case AllianceRightsBitEnum.ALLIANCE_RIGHT_MANAGE_RIGHTS:
		return getText('ui.social.guildManageRights');
	case AllianceRightsBitEnum.ALLIANCE_RIGHT_RECRUIT_GUILDS:
		return getText('ui.social.guildRightsInvit');
	case AllianceRightsBitEnum.ALLIANCE_RIGHT_TALK_IN_CHAN:
		return getText('ui.social.guildRightsTalkInAllianceChannel');
	default: return '';
	}
}

function AllianceRightsItemCriterion(criterionString) {
	Criterion.call(this, criterionString);

	var right = getRightAsText(this.value);
	if (this.operator === Criterion.operators.equal) {
		this._text = getText('ui.criterion.allianceRights', [right]);
	} else {
		this._text = getText('ui.criterion.notAllianceRights', [right]);
	}
}
inherits(AllianceRightsItemCriterion, Criterion);

AllianceRightsItemCriterion.prototype.getText = function () {
	return this._text;
};

AllianceRightsItemCriterion.prototype.isRespected = function () {
	var playerAlliance = window.gui.playerData.alliance;

	if (!playerAlliance.hasAlliance()) {
		return this.operator === Criterion.operators.equal;
	}

	var hasThisRight = this.value === AllianceRightsBitEnum.ALLIANCE_RIGHT_BOSS ? playerAlliance.isBoss() : true;

	if (this.operator === Criterion.operators.equal) {
		return hasThisRight;
	} else if (this.operator === Criterion.operators.equal) {
		return !hasThisRight;
	} else {
		return false;
	}
};

module.exports = AllianceRightsItemCriterion;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/criterionFactory/AllianceRightsItemCriterion.js
 ** module id = 347
 ** module chunks = 0
 **/