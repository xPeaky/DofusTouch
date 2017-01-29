var inherits = require('util').inherits;
var getText = require('getText').getText;
var Button = require('Button');
var PartyTypeEnum = require('PartyTypeEnum');
var GuildRightsBitEnum = require('guildManager').GuildRightsBitEnum;
var ExchangeTypeEnum = require('ExchangeTypeEnum');
var PrismStateEnum = require('PrismStateEnum');
var AggressableStatusEnum = require('AggressableStatusEnum');
var WuiDom = require('wuidom');
var windowsManager = require('windowsManager');
var GameContextEnum = require('GameContextEnum');
var AlignmentSideEnum = require('AlignmentSideEnum');
var socialEntityManager = require('socialEntityManager');

var FIGHT_STATES = require('fightManager').FIGHT_STATES;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

var allFollow = false;

var partyId;
var arenaId;

var targetAccountId;
var targetPlayerId;
var targetPlayerName;
var targetCellId;
var interactiveElements;
var isAvA;

var partyTypesIds;

var AGGRESSION_NOT_ALLOWED = -1;
var AGGRESSION_IMPOSSIBLE = 0;
var AGGRESSION_ALLOWED = 1;

var CAPABILITY_ALLOW_AGGRESSION = 2;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** @class */
function ContextualMenuPlayerContent(banner) {
	WuiDom.call(this, 'div', { className: 'ContextualMenuPlayerContent' });

	var container = this.createChild('div');

	this.banner = banner;

	this._setupGroup1(container);
	this._setupGroup2(container);
	this._setupGroup3(container);
	this._setupGroup4(container);
	this._setupGroup5(container);
	this._setupGroup6(container);
}

inherits(ContextualMenuPlayerContent, WuiDom);
module.exports = ContextualMenuPlayerContent;


ContextualMenuPlayerContent.prototype.updateContent = function (params) {
	interactiveElements = params.interactiveElements;
	targetAccountId = params.accountId; // optional
	targetPlayerId = params.playerId;
	targetPlayerName = params.playerName;
	targetCellId = params.cellId; // optional
	var humanoidInfo = params.humanoidInfoOptions; // optional
	var alignInfo = params.alignmentInfos; // optional

	var guild = null;
	var alliance = null;

	function handleOption(option) {
		// HumanOptionFollowers
		// HumanOptionEmote
		// HumanOptionTitle
		// HumanOptionOrnament
		// HumanOptionObjectUse
		switch (option._type) {
		case 'HumanOptionAlliance':
			alliance = option;
			break;
		case 'HumanOptionGuild':
			// HumanOptionGuild structure doesn't contain anything else than the guildInformations property
			guild = option.guildInformations;
			break;
		}
	}

	if (humanoidInfo) {
		for (var i = 0, len = humanoidInfo.length; i < len; i += 1) {
			handleOption(humanoidInfo[i]);
		}
	}
	var bannerContent = { name: targetPlayerName, guild: guild };
	if (alliance !== null) {
		bannerContent.alliance = alliance.allianceInformations;
	}
	this.banner.setContent(bannerContent);

	var partyData = window.gui.playerData.partyData;
	var pendingInvitations = partyData.pendingInvitations;

	partyTypesIds = [];

	for (var id in pendingInvitations) {
		if (pendingInvitations[id][targetPlayerId]) {
			partyTypesIds.push(partyData.getPartyTypeFromId(id));
		}
	}

	partyId = partyData.partyTypes[PartyTypeEnum.PARTY_TYPE_CLASSICAL].id;
	arenaId = partyData.partyTypes[PartyTypeEnum.PARTY_TYPE_ARENA].id;

	this.toggleButtonsAvailability(params, alignInfo, guild, alliance);
};


ContextualMenuPlayerContent.prototype.hideButtons = function () {
	this.kickFighter.hide();
	this.challenge.hide();
	this.assault.hide();
	this.exchangeProp.hide();
	this.inviteParty.hide();
	this.inviteArena.hide();
	this.inviteGuild.hide();
	this.inviteAlliance.hide();
	this.addFriend.hide();
	this.addEnemy.hide();
	this.ignoreSession.hide();
	this.stopIgnoreSession.hide();
	this.partyTitle.hide();
	this.follow.hide();
	this.stopFollowing.hide();
	this.kickPlayer.hide();
	this.appointLeader.hide();
	this.kickArenaPlayer.hide();
	this.appointArenaLeader.hide();
	this.allFollow.hide();
	this.allStopFollow.hide();
	this.cancelPartyInvitation.hide();
	this.leaveParty.hide();
	this.arenaTitle.hide();
	this.cancelArenaInvitation.hide();
	this.leaveArena.hide();
	this.kickOutFromHome.hide();
	this.guildInformations.hide();
	this.allianceInformations.hide();
};

function isAggressableAvA(aggressableStatus) {
	//jscs:disable requireCamelCaseOrUpperCaseIdentifiers
	return (aggressableStatus === AggressableStatusEnum.AvA_ENABLED_AGGRESSABLE ||
		aggressableStatus === AggressableStatusEnum.AvA_PREQUALIFIED_AGGRESSABLE);
}

function isAggressionAllowedOnMap(mapPosition) {
	if (!mapPosition) {
		console.warn('isAggressionAllowedOnMap called before we know mapPosition');
		return false;
	}
	return (mapPosition.capabilities & CAPABILITY_ALLOW_AGGRESSION) !== 0;
}

function allowAggression(targetAlignment, targetAlliance, isTargetMutant) {
	//jscs:disable requireCamelCaseOrUpperCaseIdentifiers
	var playerData = window.gui.playerData;
	if (!isAggressionAllowedOnMap(playerData.position.mapPosition)) {
		return AGGRESSION_NOT_ALLOWED;
	}
	if (playerData.isMutant()) {
		if (playerData.getRestrictions().cantAttack || isTargetMutant) {
			return AGGRESSION_IMPOSSIBLE;
		}
		return AGGRESSION_ALLOWED;
	}
	if (isTargetMutant) {
		return AGGRESSION_ALLOWED;
	}

	var isHeroicServer = window.gui.serversData.settings.serverGameType === 1;
	var playerAlliance = playerData.alliance.current;
	var subAreaPrism = socialEntityManager.entities.prism[playerData.position.subAreaId];
	var currentPrism = subAreaPrism && subAreaPrism.prism;
	var isSubAreaWithPrism = currentPrism && currentPrism.mapId !== -1;

	var playerAlignment = playerData.characters.mainCharacter.characteristics.alignmentInfos;
	var isPlayerAggressableAvA = isAggressableAvA(playerAlignment.aggressable);
	var alignmentFightWithPrism = false;

	if (isSubAreaWithPrism) {
		var isPrismVulnerable = currentPrism.state === PrismStateEnum.PRISM_STATE_VULNERABLE;
		if (!isHeroicServer) {
			if (!isPrismVulnerable) {
				alignmentFightWithPrism = true;
			} else if (playerAlliance && (!isPlayerAggressableAvA || !targetAlliance)) {
				return AGGRESSION_NOT_ALLOWED;
			}
		} else if (playerAlliance && !isPlayerAggressableAvA &&
			(currentPrism.alliance.allianceId !== playerAlliance.allianceId ||
				playerAlignment.aggressable !== AggressableStatusEnum.AvA_ENABLED_NON_AGGRESSABLE)) {
			return AGGRESSION_NOT_ALLOWED;
		}
		if (!alignmentFightWithPrism) {
			if (!playerAlliance) {
				return AGGRESSION_NOT_ALLOWED;
			} else if (targetAlliance && (isHeroicServer || isPrismVulnerable)) {
				if (targetAlliance.aggressable === AggressableStatusEnum.AvA_DISQUALIFIED) {
					return AGGRESSION_IMPOSSIBLE;
				} else if (!isAggressableAvA(targetAlliance.aggressable) ||
					playerAlliance.allianceId === targetAlliance.allianceInformations.allianceId ||
					(isHeroicServer &&
						currentPrism.alliance.allianceId === targetAlliance.allianceInformations.allianceId &&
						!isPrismVulnerable)) {
					return AGGRESSION_NOT_ALLOWED;
				}
			}
		}
		isAvA = true;
	}

	if (!isHeroicServer) {
		if (!isSubAreaWithPrism || alignmentFightWithPrism) {
			if ((!playerAlignment || !targetAlignment) ||
				playerAlignment.aggressable !== AggressableStatusEnum.PvP_ENABLED_AGGRESSABLE ||
				(targetAlignment.alignmentSide <= AlignmentSideEnum.ALIGNMENT_NEUTRAL ||
					targetAlignment.alignmentGrade === 0) ||
				(playerAlignment.alignmentSide !== AlignmentSideEnum.ALIGNMENT_MERCENARY &&
					playerAlignment.alignmentSide === targetAlignment.alignmentSide) ||
				playerAlignment.alignmentSide === AlignmentSideEnum.ALIGNMENT_NEUTRAL) {
				return AGGRESSION_NOT_ALLOWED;
			}
			isAvA = false;
		}
	} else if (!isSubAreaWithPrism) {
		if (playerAlliance && targetAlliance) {
			if (playerAlliance.allianceId === targetAlliance.allianceInformations.allianceId ||
				!isPlayerAggressableAvA || !isAggressableAvA(targetAlliance.aggressable)) {
				return AGGRESSION_NOT_ALLOWED;
			}
		} else if (!playerAlliance || isPlayerAggressableAvA) {
			return AGGRESSION_NOT_ALLOWED;
		}
		isAvA = true;
	}

	var playerLevel = playerData.characterBaseInformations.level;
	if (isHeroicServer && playerLevel < 50) {
		return AGGRESSION_IMPOSSIBLE;
	}

	var gap = isAvA ? 100 : 50;
	// Below looks like a bug; Flash also uses "targetedPlayerId" in a very weird way...
	if (playerLevel + gap < targetAlignment.characterPower - targetPlayerId) {
		return AGGRESSION_NOT_ALLOWED;
	}

	return AGGRESSION_ALLOWED;
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** show and hide buttons
 * @private
 */
ContextualMenuPlayerContent.prototype.toggleButtonsAvailability = function (params, alignement, guild, alliance) {
	params = params || {};
	var playerData = window.gui.playerData;
	var partyData = playerData.partyData;
	var jobsData = playerData.jobs;
	var socialData = playerData.socialData;
	var partyInfo = partyData.partyTypes[PartyTypeEnum.PARTY_TYPE_CLASSICAL];
	var arenaInfo = partyData.partyTypes[PartyTypeEnum.PARTY_TYPE_ARENA];
	var isPlayerDead = !playerData.isAlive();
	var isMutant = params.isMutant;
	var isInFight = window.gui.gameContext === GameContextEnum.FIGHT;

	this.hideButtons();

	if (window.gui.fightManager.fightState === FIGHT_STATES.PREPARATION && playerData.isFightLeader &&
		playerData.id !== targetPlayerId) {
		this.kickFighter.show();
	}

	if (partyTypesIds.indexOf(PartyTypeEnum.PARTY_TYPE_CLASSICAL) === -1) {
		if (!partyInfo.members[targetPlayerId]) {
			this.inviteParty.show();
		}
	} else {
		this.partyTitle.show();
		this.cancelPartyInvitation.show();
	}

	if (partyTypesIds.indexOf(PartyTypeEnum.PARTY_TYPE_ARENA) === -1) {
		if (!arenaInfo.members[targetPlayerId]) {
			this.inviteArena.show();
		}
	} else {
		this.arenaTitle.show();
		this.cancelArenaInvitation.show();
	}

	if (!targetAccountId || !socialData.friendsList[targetAccountId] && !socialData.enemiesList[targetAccountId]) {
		this.addFriend.show();
		this.addEnemy.show();
	}

	if (socialData.isIgnored(targetAccountId)) {
		this.stopIgnoreSession.show();
	} else {
		this.ignoreSession.show();
	}

	if (partyInfo.members[targetPlayerId]) {
		this.partyTitle.show();

		if (partyData.followedId === targetPlayerId) {
			this.stopFollowing.show();
		} else {
			this.follow.show();
		}

		if (partyInfo.leaderId === playerData.id) {
			this.kickPlayer.show();
			this.appointLeader.show();

			if (allFollow) {
				this.allStopFollow.show();
			} else {
				this.allFollow.show();
			}
		}
	}

	this.kickOutFromHome.toggleDisplay(!!window.gui.playerData.position.isInMyHouse);

	if (arenaInfo.members[targetPlayerId] && arenaInfo.leaderId === playerData.id) {
		this.arenaTitle.show();
		this.kickArenaPlayer.show();
		this.appointArenaLeader.show();
	}

	this.join.toggleDisplay(!isInFight && playerData.position.isInIncarnam());

	if (!isInFight) {
		var restrictions = playerData.getRestrictions();
		if (!restrictions.cantExchange) {
			if (isPlayerDead) {
				this.exchangeProp.disable();
			} else {
				this.exchangeProp.enable();
			}
			this.exchangeProp.show();
		}
		if (alignement) {
			if (!restrictions.cantChallenge) {
				if (isPlayerDead) {
					this.challenge.disable();
				} else {
					this.challenge.enable();
				}
				this.challenge.show();
			}
			var aggressionState = allowAggression(alignement, alliance, isMutant, targetPlayerId);
			if (aggressionState === AGGRESSION_IMPOSSIBLE || aggressionState === AGGRESSION_ALLOWED) {
				if (aggressionState === AGGRESSION_IMPOSSIBLE || isPlayerDead) {
					this.assault.disable();
				} else {
					this.assault.enable();
				}
				this.assault.show();
			}
		}
	}

	// TODO: no idea how to disable the invite guild until the guild member list is update when entering guild window
	// no update guild member event is received for sender after the receiver accepted the invitation
	var guildData = playerData.guild;
	if (!params.hasGuild && !guild && guildData.current &&
		guildData.hasRight(GuildRightsBitEnum.GUILD_RIGHT_INVITE_NEW_MEMBERS)) {
		this.inviteGuild.show();
	}

	var allianceData = playerData.alliance;
	if (!params.hasGuild && targetPlayerId && guild && !alliance && allianceData.current && allianceData.isBoss()) {
		this.inviteAlliance.show();
	}

	if (guild) {
		this.guildId = guild.guildId;
		this.guildInformations.show();
	}
	if (alliance) {
		this.allianceId = alliance.allianceInformations.allianceId;
		this.allianceInformations.show();
	}

	// multiCraft
	this._updateMultiCraftMenu(playerData, jobsData);
};


ContextualMenuPlayerContent.prototype._setupGroup1 = function (container) {
	var self = this;
	var group = container.createChild('div', { className: 'group' });

	this.kickFighter = group.appendChild(new Button({
		text: getText('ui.fight.kick'),
		className: 'cmButton'
	}, function () {
		window.dofus.sendMessage('GameContextKickMessage', { targetId: targetPlayerId });
		self.emit('close');
	}));
};

ContextualMenuPlayerContent.prototype._setupGroup2 = function (container) {
	var self = this;
	var group = container.createChild('div', { className: 'group' });

	this.privateMessage = group.appendChild(new Button({
		text: getText('ui.common.wisperMessage'),
		className: 'cmButton'
	}, function () {
		window.gui.chat.startPrivateMessage(targetPlayerName);
		self.emit('close');
	}));

	group.appendChild(new Button({
		text: getText('ui.common.ankaboxMessage'),
		className: ['cmButton', 'disabled']
	}, function () {
		// TODO
	}));

	this.challenge = group.appendChild(new Button({
		text: getText('ui.common.challenge'),
		className: 'cmButton'
	}, function () {
		window.gui.playerData.fightRequests.requestChallenge({
			targetId: targetPlayerId,
			targetName: targetPlayerName,
			targetCellId: targetCellId
		});
		self.emit('close');
	}));

	this.assault = group.appendChild(new Button({
		text: getText('ui.pvp.assault'),
		className: 'cmButton'
	}, function () {
		window.gui.playerData.fightRequests.requestAssault({
			targetId: targetPlayerId,
			targetName: targetPlayerName,
			targetCellId: targetCellId
		}, isAvA);
		self.emit('close');
	}));

	this.join = group.appendChild(new Button({
		text: getText('ui.common.join'),
		className: 'cmButton'
	}, function () {
		window.dofus.sendMessage('FriendJoinRequestMessage', { name: targetPlayerName });
		self.emit('close');
	}));

	this.kickOutFromHome = group.appendChild(new Button({
		text: getText('ui.common.kickOff'),
		className: 'cmButton'
	}, function () {
		window.dofus.sendMessage('HouseKickRequestMessage', { id: targetPlayerId });
		self.emit('close');
	}));

	group.appendChild(new Button({
		text: getText('ui.common.informations'),
		className: ['cmButton']
	}, function () {
		window.dofus.sendMessage('BasicWhoIsRequestMessage', {
			search: targetPlayerName,
			verbose: true
		});
		self.emit('close');
	}));

	this.guildInformations = group.appendChild(new Button({
		text: getText('ui.guild.guildInformations'),
		className: 'cmButton'
	}, function () {
		window.dofus.sendMessage('GuildFactsRequestMessage', { guildId: self.guildId });
		self.emit('close');
	}));

	this.allianceInformations = group.appendChild(new Button({
		text: getText('ui.alliance.allianceInformations'),
		className: 'cmButton'
	}, function () {
		window.dofus.sendMessage('AllianceFactsRequestMessage', { allianceId: self.allianceId });

		self.emit('close');
	}));
};


ContextualMenuPlayerContent.prototype._setupGroup3 = function (container) {
	var self = this;
	var group = container.createChild('div', { className: 'group' });

	this.exchangeProp = group.appendChild(new Button({
		text: getText('ui.common.exchangeProp'),
		className: 'cmButton'
	}, function () {
		self.emit('close');
		windowsManager.getWindow('tradeWithPlayer').prepareMakeExchange({
			targetId: targetPlayerId,
			targetName: targetPlayerName
		});
		window.dofus.sendMessage('ExchangePlayerRequestMessage', {
			exchangeType: 1,
			target: targetPlayerId
		});
	}));

	this.inviteParty = group.appendChild(new Button({
		text: getText('ui.party.addToParty'),
		className: 'cmButton'
	}, function () {
		window.dofus.sendMessage('PartyInvitationRequestMessage', { name: targetPlayerName });
		self.emit('close');
	}));

	this.inviteArena = group.appendChild(new Button({
		text: getText('ui.party.addToArena'),
		className: 'cmButton'
	}, function () {
		window.dofus.sendMessage('PartyInvitationArenaRequestMessage', { name: targetPlayerName });
		self.emit('close');
	}));

	this.inviteGuild = group.appendChild(new Button({
		text: getText('ui.social.inviteInGuild'),
		className: 'cmButton'
	}, function () {
		if (targetPlayerId) {
			window.dofus.sendMessage('GuildInvitationMessage', { targetId: targetPlayerId });
		} else {
			window.dofus.sendMessage('GuildInvitationByNameMessage', { name: targetPlayerName });
		}
		self.emit('close');
	}));

	this.inviteAlliance = group.appendChild(new Button({
		text: getText('ui.social.inviteInAlliance'),
		className: 'cmButton'
	}, function () {
		window.dofus.sendMessage('AllianceInvitationMessage', { targetId: targetPlayerId });
		self.emit('close');
	}));

	// keep the multiCraftMenu at the end of the group
	this._multiCraftMenu = group.createChild('div', { className: 'multiCraftMenu' });
};


ContextualMenuPlayerContent.prototype._setupGroup4 = function (container) {
	var self = this;
	var group = container.createChild('div');

	this.addFriend = group.appendChild(new Button({
		text: getText('ui.social.addToFriends'),
		className: 'cmButton'
	}, function () {
		self.emit('close');
		window.gui.openConfirmPopup({
			title: getText('ui.popup.warning'),
			message: getText('ui.social.confirmAddFriend', targetPlayerName),
			cb: function (result) {
				if (!result) {
					return;
				}
				window.dofus.sendMessage('FriendAddRequestMessage', { name: targetPlayerName });
			}
		});
	}));

	this.addEnemy = group.appendChild(new Button({
		text: getText('ui.social.addToEnemy'),
		className: 'cmButton'
	}, function () {
		self.emit('close');
		window.gui.openConfirmPopup({
			title: getText('ui.popup.warning'),
			message: getText('ui.social.confirmAddEnemy', targetPlayerName),
			cb: function (result) {
				if (!result) {
					return;
				}
				window.dofus.sendMessage('IgnoredAddRequestMessage', { name: targetPlayerName, session: false });
			}
		});
	}));

	this.ignoreSession = group.appendChild(new Button({
		text: getText('ui.social.blackListTemporarly'),
		className: 'cmButton'
	}, function () {
		window.dofus.sendMessage('IgnoredAddRequestMessage', { name: targetPlayerName, session: true });
		self.emit('close');
	}));

	this.stopIgnoreSession = group.appendChild(new Button({
		text: getText('ui.social.blackListRemove'),
		className: 'cmButton'
	}, function () {
		window.dofus.sendMessage('IgnoredDeleteRequestMessage', { accountId: targetAccountId, session: true });
		self.emit('close');
	}));
};


ContextualMenuPlayerContent.prototype._setupGroup5 = function (container) {
	var self = this;
	var group = container.createChild('div');

	this.partyTitle = group.createChild('div', { text: getText('ui.common.party'), className: 'title' });

	this.follow = group.appendChild(new Button({
		text: getText('ui.common.follow'),
		className: 'cmButton'
	}, function () {
		window.dofus.sendMessage('PartyFollowMemberRequestMessage', { partyId: partyId, playerId: targetPlayerId });
		self.emit('close');
	}));

	this.stopFollowing = group.appendChild(new Button({
		text: getText('ui.party.stopFollowing'),
		className: 'cmButton'
	}, function () {
		window.dofus.sendMessage('PartyStopFollowRequestMessage', { partyId: partyId });
		self.emit('close');
	}));

	this.kickPlayer = group.appendChild(new Button({
		text: getText('ui.party.kickPlayer'),
		className: 'cmButton'
	}, function () {
		window.dofus.sendMessage('PartyKickRequestMessage', { partyId: partyId, playerId: targetPlayerId });
		self.emit('close');
	}));

	this.appointLeader = group.appendChild(new Button({
		text: getText('ui.party.promotePartyLeader'),
		className: 'cmButton'
	}, function () {
		window.dofus.sendMessage('PartyAbdicateThroneMessage', { partyId: partyId, playerId: targetPlayerId });
		self.emit('close');
	}));

	this.allFollow = group.appendChild(new Button({
		text: getText('ui.party.followHimAll'),
		className: 'cmButton'
	}, function () {
		window.dofus.sendMessage('PartyFollowThisMemberRequestMessage', {
			partyId: partyId,
			playerId: targetPlayerId,
			enabled: true
		});
		allFollow = true;
		self.emit('close');
	}));

	this.allStopFollow = group.appendChild(new Button({
		text: getText('ui.party.stopAllFollowingHim'),
		className: 'cmButton'
	}, function () {
		window.dofus.sendMessage('PartyFollowThisMemberRequestMessage', {
			partyId: partyId,
			playerId: targetPlayerId,
			enabled: false
		});
		allFollow = false;
		self.emit('close');
	}));

	this.cancelPartyInvitation = group.appendChild(new Button({
		text: getText('ui.party.cancelInvitation'),
		className: 'cmButton'
	}, function () {
		window.dofus.sendMessage('PartyCancelInvitationMessage', { partyId: partyId, guestId: targetPlayerId });
		self.emit('close');
	}));

	this.leaveParty = group.appendChild(new Button({
		text: getText('ui.party.leaveParty'),
		className: 'cmButton'
	}, function () {
		window.dofus.sendMessage('PartyLeaveRequestMessage', { partyId: partyId });
		self.emit('close');
	}));
};


ContextualMenuPlayerContent.prototype._setupGroup6 = function (container) {
	var self = this;
	var group = container.createChild('div', { className: 'group' });

	this.arenaTitle = group.createChild('div', { text: getText('ui.common.koliseum'), className: 'title' });

	this.cancelArenaInvitation = group.appendChild(new Button({
		text: getText('ui.party.cancelInvitation'),
		className: 'cmButton'
	}, function () {
		window.dofus.sendMessage('PartyCancelInvitationMessage', { partyId: arenaId, guestId: targetPlayerId });
		self.emit('close');
	}));

	this.kickArenaPlayer = group.appendChild(new Button({
		text: getText('ui.party.kickPlayer'),
		className: 'cmButton'
	}, function () {
		window.dofus.sendMessage('PartyKickRequestMessage', { partyId: arenaId, playerId: targetPlayerId });
		self.emit('close');
	}));

	this.appointArenaLeader = group.appendChild(new Button({
		text: getText('ui.party.promotePartyLeader'),
		className: 'cmButton'
	}, function () {
		window.dofus.sendMessage('PartyAbdicateThroneMessage', { partyId: arenaId, playerId: targetPlayerId });
		self.emit('close');
	}));

	this.leaveArena = group.appendChild(new Button({
		text: getText('ui.party.arenaQuit'),
		className: 'cmButton'
	}, function () {
		window.dofus.sendMessage('PartyLeaveRequestMessage', { partyId: arenaId });
		self.emit('close');
	}));
};


ContextualMenuPlayerContent.prototype._updateMultiCraftMenu = function (playerData, jobsData) {
	var multiCraftMenu = this._multiCraftMenu;

	multiCraftMenu.clearContent();

	if (window.gui.gameContext !== GameContextEnum.ROLE_PLAY) {
		return;
	}

	var self = this;
	var myId = playerData.id;
	var isPlayerDead = !playerData.isAlive();

	/**
	 * @param {string} label
	 * @param {number} exchangeType
	 * @param {number} skillId
	 */
	function createMenu(label, exchangeType, skillId) {
		var menu = multiCraftMenu.appendChild(new Button({
			text: label,
			className: 'cmButton'
		}, function () {
			window.dofus.sendMessage('ExchangePlayerMultiCraftRequestMessage', {
				exchangeType: exchangeType,
				target: targetPlayerId,
				skillId: skillId
			});
			self.emit('close');
		}));
		if (isPlayerDead) {
			menu.disable();
		} else {
			menu.enable();
		}
	}

	var label;

	// List of my active skills
	var playerSkills = jobsData.getUsableSkillsInMap(myId, interactiveElements);
	var inviteTo = getText('ui.common.inviteTo');
	for (var key in playerSkills) {
		var playerSkill = playerSkills[key];
		label = inviteTo + ' ' + playerSkill.nameId;
		createMenu(label, ExchangeTypeEnum.MULTICRAFT_CRAFTER, playerSkill.id);
	}

	// List of active skills of the target
	var otherSkills = jobsData.getUsableSkillsInMap(targetPlayerId, interactiveElements);
	var askTo = getText('ui.common.askTo');
	for (var keyo in otherSkills) {
		var otherSkill = otherSkills[keyo];
		label = askTo + ' ' + otherSkill.nameId;
		createMenu(label, ExchangeTypeEnum.MULTICRAFT_CUSTOMER, otherSkill.id);
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/contextualMenus/ContextualMenuPlayer/contentPlayer.js
 ** module id = 416
 ** module chunks = 0
 **/