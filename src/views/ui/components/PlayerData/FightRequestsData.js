/** @module PlayerData/FightRequestsData */

var EventEmitter = require('events.js').EventEmitter;
var getText = require('getText').getText;
var inherits = require('util').inherits;
var mutualPopup = require('mutualPopup');
var FighterRefusedReasonEnum = require('FighterRefusedReasonEnum');
var AlignmentSideEnum = require('AlignmentSideEnum');

/**
 * FightRequestsData
 * @constructor
 */
function FightRequestsData() {
	EventEmitter.call(this);

	this._targetInfo = {};
}
inherits(FightRequestsData, EventEmitter);
module.exports = FightRequestsData;

FightRequestsData.prototype.disconnect = function () {
	this._targetInfo = {};
};

FightRequestsData.prototype.initialize = function (gui) {
	var self = this;

	function challengePopup(msg) {
		var data = mutualPopup.setupNames(self._targetInfo.targetId, msg.sourceId);
		if (!data) {
			return console.error('FightRequestsData: setupNames');
		}
		mutualPopup.setupCancelPopupTexts({
			title: getText('ui.fight.challenge'),
			message: getText('ui.fight.youChallenge', data.targetName)
		});
		mutualPopup.setupConfirmPopupTexts({
			title: getText('ui.fight.challenge'),
			message: getText('ui.fight.aChallengeYou', data.sourceName)
		});
		mutualPopup.askingChallengePopup(msg.fightId);
	}

	gui.on('GameRolePlayPlayerFightFriendlyRequestedMessage', challengePopup);
	gui.on('GameRolePlayPlayerFightFriendlyAnsweredMessage', function (msg) {
		mutualPopup.closingChallengePopup(msg.sourceId === window.gui.playerData.id);
	});
	gui.on('ChallengeFightJoinRefusedMessage', function (msg) {
		self.alertChallengeRefused(msg.reason);
	});
	gui.on('GameRolePlayAggressionMessage', function (msg) {
		self.alertAggression(msg);
	});
};

FightRequestsData.prototype.requestChallenge = function (targetInfo) {
	this._targetInfo = targetInfo;
	this.sendRequest(targetInfo, false, true, false);
};

FightRequestsData.prototype.requestAssault = function (targetInfo, isAvA) {
	this._targetInfo = targetInfo;
	this.sendRequest(targetInfo, isAvA, false, true);
};

/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @function sendRequest
 * @desc Whether ask the player to confirm the fight request if needed, or send the fight request
 *
 * @param {Number} targetInfo       - the info of the target
 * @param {Boolean} isAvA           - whether the fight request is AvA
 * @param {Boolean} isChallenge     - whether it's a challenge fight request
 * @param {Boolean} hasConfirmPopup - whether a confirm popup may be needed
 */
FightRequestsData.prototype.sendRequest = function (targetInfo, isAvA, isChallenge, hasConfirmPopup) {
	var targetId = targetInfo.targetId;
	var targetCellId = targetInfo.targetCellId;
	if (hasConfirmPopup) {
		var actorManager = window.isoEngine.actorManager;
		var targetData = actorManager.getActor(targetId).data;
		if (targetData.type === 'GameRolePlayCharacterInformations') {
			if (isAvA) {
				return this.confirmAttackTarget(targetInfo, true, null);
			}
			var isPlayerMutant = actorManager.userActor.data.type === 'GameRolePlayMutantInformations';
			if (targetData.alignmentInfos.alignmentSide === AlignmentSideEnum.ALIGNMENT_NEUTRAL && !isPlayerMutant) {
				return this.confirmAttackTarget(targetInfo, false, 2);
			}
			var targetLevel = targetData.alignmentInfos.characterPower - targetId;
			var fightType = window.gui.playerData.getLevelDiff(targetLevel);
			if (fightType) {
				return this.confirmAttackTarget(targetInfo, false, fightType);
			}
		}
	}
	window.dofus.sendMessage('GameRolePlayPlayerFightRequestMessage', {
		targetId: targetId,
		targetCellId: targetCellId,
		friendly: isChallenge
	});
};

FightRequestsData.prototype.confirmAttackTarget = function (targetInfo, isAvA, fightType) {
	var targetName = targetInfo.targetName;
	var text;
	if (isAvA || fightType === 0) {
		text = getText('ui.pvp.doUAttack', targetName);
	} else if (fightType === 2) {
		text = getText('ui.pvp.doUAttackNeutral');
	} else if (fightType === -1) {
		text = getText('ui.pvp.doUAttackNoGain', targetName);
	} else if (fightType === 1) {
		text = getText('ui.pvp.doUAttackBonusGain', targetName);
	}
	var self = this;
	window.gui.openConfirmPopup({
		title: getText('ui.popup.warning'),
		message: text,
		cb: function (action) {
			if (action !== 1) {
				return;
			}
			self.sendRequest(targetInfo, isAvA, false, false);
		}
	});
};

FightRequestsData.prototype.alertAggression = function (aggressionInfo) {
	var actorManager = window.isoEngine.actorManager;
	var attacker = actorManager.getActor(aggressionInfo.attackerId);
	var defender = actorManager.getActor(aggressionInfo.defenderId);
	if (!attacker || !defender) {
		return console.error('Could not find aggressed actors.');
	}
	var message = getText('ui.pvp.aAttackB', attacker.data.name, defender.data.name);
	window.gui.chat.logMsg(message);
	// TODO: SpeakingItem events
};

FightRequestsData.prototype.alertChallengeRefused = function (reason) {
	var message;
	switch (reason) {
		case FighterRefusedReasonEnum.CHALLENGE_FULL:
			message = getText('ui.fight.challengeFull');
			break;
		case FighterRefusedReasonEnum.TEAM_FULL:
			message = getText('ui.fight.teamFull');
			break;
		case FighterRefusedReasonEnum.WRONG_ALIGNMENT:
			message = getText('ui.wrongAlignment');
			break;
		case FighterRefusedReasonEnum.WRONG_GUILD:
			message = getText('ui.fight.wrongGuild');
			break;
		case FighterRefusedReasonEnum.TOO_LATE:
			message = getText('ui.fight.tooLate');
			break;
		case FighterRefusedReasonEnum.MUTANT_REFUSED:
			message = getText('ui.fight.mutantRefused');
			break;
		case FighterRefusedReasonEnum.WRONG_MAP:
			message = getText('ui.fight.wrongMap');
			break;
		case FighterRefusedReasonEnum.JUST_RESPAWNED:
			message = getText('ui.fight.justRespawned');
			break;
		case FighterRefusedReasonEnum.IM_OCCUPIED:
			message = getText('ui.fight.imOccupied');
			break;
		case FighterRefusedReasonEnum.OPPONENT_OCCUPIED:
			message = getText('ui.fight.opponentOccupied');
			break;
		case FighterRefusedReasonEnum.MULTIACCOUNT_NOT_ALLOWED:
			message = getText('ui.fight.onlyOneAllowedAccount');
			break;
		case FighterRefusedReasonEnum.INSUFFICIENT_RIGHTS:
			message = getText('ui.fight.insufficientRights');
			break;
		case FighterRefusedReasonEnum.MEMBER_ACCOUNT_NEEDED:
			message = getText('ui.fight.MemberAccountNeeded');
			break;
		case FighterRefusedReasonEnum.OPPONENT_NOT_MEMBER:
			message = getText('ui.fight.opponentNotMember');
			break;
		case FighterRefusedReasonEnum.TEAM_LIMITED_BY_MAINCHARACTER:
			message = getText('ui.fight.teamLimitedByMainCharacter');
			break;
		case FighterRefusedReasonEnum.GHOST_REFUSED:
			message = getText('ui.fight.ghostRefused');
			break;
		case FighterRefusedReasonEnum.AVA_ZONE:
			message = getText('ui.fight.cantAttackAvAZone');
			break;
		default:
			return;
	}
	window.gui.chat.logMsg(message);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/PlayerData/FightRequestsData.js
 ** module id = 524
 ** module chunks = 0
 **/