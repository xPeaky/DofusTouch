var EventEmitter = require('events.js').EventEmitter;
var inherits = require('util').inherits;
var getText = require('getText').getText;
var PartyJoinErrorEnum = require('PartyJoinErrorEnum');
var PartyTypeEnum = require('PartyTypeEnum');
var FightTypeEnum = require('FightTypeEnum');
var PvpArenaStepEnum = require('PvpArenaStepEnum');
var PartyMemberInFightCauseEnum = require('PartyMemberInFightCauseEnum');


function PartyData() {
	EventEmitter.call(this);

	this._reset();
}

inherits(PartyData, EventEmitter);
module.exports = PartyData;


PartyData.prototype.disconnect = function () {
	this._reset();
};

/** Reset party data, and invitations */
PartyData.prototype._reset = function () {
	this.arenaStats = {};
	this.arenaRegistered = false;
	this.arenaStep = PvpArenaStepEnum.ARENA_STEP_UNREGISTER;
	this.followedId = null;
	this.pendingInvitations = {};
	this.partyList = {};
	this.partyTypes = {
		1: { id: null, members: {}, leaderId: null }, //PartyTypeEnum.PARTY_TYPE_CLASSICAL
		3: { id: null, members: {}, leaderId: null }  //PartyTypeEnum.PARTY_TYPE_ARENA
	};
	this._partyFights = {};
};

/** Returns party type given a party id. Helper function. */
PartyData.prototype.getPartyTypeFromId = function (partyId) {
	return this.partyList[partyId] || 0;
};

/** Get a member's name from his ID */
PartyData.prototype.getMemberName = function (partyType, memberId) {
	// Our player is not in party members so we check it separately
	var playerData = window.gui.playerData;
	if (memberId === playerData.id) {
		return playerData.characterBaseInformations.name;
	}

	var party = this.partyTypes[partyType];
	if (!party) { return '?'; } // we just left the party?

	var member = party.members[memberId];
	if (!member) { return '?'; } // this member just left the party?

	return member.name;
};

/** Modify informations about a guest to "look like" any other member info.
 *  @param {PartyGuestInformations} guestInfo */
PartyData.prototype._enrichGuestInfo = function (guestInfo) {
	guestInfo.isGuest = true;
	guestInfo.level = '?'; //this info is missing from server message. Flash client does same.
	guestInfo.id = guestInfo.guestId;
	guestInfo.entityLook = guestInfo.guestLook;
};

/** Setup messages listeners */
PartyData.prototype.initialize = function (gui) {
	var self = this;

	gui.on('PartyInvitationDetailsMessage', function (msg) {
		for (var i = 0; i < msg.guests.length; i++) {
			self._enrichGuestInfo(msg.guests[i]);
		}
		self.emit('partyInvitationDetails', msg);
	});

	/** A new guest is invited to our party...
	 *  NB: right now we are not asking automatically for details by using PartyInvitationDetailsRequestMessage.
	 *  This is done in PartyInviteDetailsWindow when requested by player.
	 *  We could move here the collecting of the data if we really want partyData to keep it.
	 */
	gui.on('PartyNewGuestMessage', function (msg) {
		self._enrichGuestInfo(msg.guest);
		var guest = msg.guest;

		if (!self.pendingInvitations[msg.partyId]) {
			self.pendingInvitations[msg.partyId] = {};
		}

		self.pendingInvitations[msg.partyId][guest.guestId] = {
			hostId: guest.hostId,
			guestName: guest.name,
			guestId: guest.guestId
		};
		self.emit('partyNewGuest', msg.partyId, guest);
	});


	/** A new member joined your group (accepted an invitation) */
	gui.on('PartyNewMemberMessage', function (msg) {
		var memberInformation = msg.memberInformations;

		var invitations = self.pendingInvitations[msg.partyId];
		if (invitations) {
			delete invitations[memberInformation.id];
		}

		var type = self.getPartyTypeFromId(msg.partyId);
		var party = self.partyTypes[type];
		if (party) {
			party.members[memberInformation.id] = { name: memberInformation.name };
			if (type === PartyTypeEnum.PARTY_TYPE_ARENA) {
				self.emit('arenaNewMember', memberInformation);
			}
		}
		// even when we did not accept yet the invite to this party, we want to know who is "in"
		self.emit('partyNewMember', msg.partyId, memberInformation);
	});

	/** A member's information (e.g. look or level) has been updated.
	 *  NB: we don't receive this for guests.
	 *  @param {map} msg - msg.partyId, msg.memberInformations (PartyMemberInformations)
	 */
	gui.on('PartyUpdateMessage', function (msg) {
		self.emit('partyUpdateMember', msg.partyId, msg.memberInformations);
	});


	function clearPartyData(msg) {
		var partyId = msg.partyId;
		delete self.pendingInvitations[partyId];
		var type = self.getPartyTypeFromId(partyId);
		var party = self.partyTypes[type];
		if (!party) {
			return;
		}
		party.id = null;
		party.leaderId = null;
		party.members = {};
		delete self.partyList[partyId];
		if (type === PartyTypeEnum.PARTY_TYPE_ARENA) {
			self.emit('arenaLeft');
		}
		self.emit('partyLeft', msg.partyId);
	}

	gui.on('PartyDeletedMessage', clearPartyData);
	gui.on('PartyLeaveMessage', clearPartyData);
	gui.on('PartyKickedByMessage', clearPartyData);

	/** We receive this when a guest in the party is not invited anymore */
	gui.on('PartyCancelInvitationNotificationMessage', function (msg) {
		self.emit('partyGuestLeft', msg.partyId, msg.guestId);

		var invitations = self.pendingInvitations[msg.partyId];
		if (!invitations) { return; } // happens when we did not accept our own invitation yet
		var invitation = invitations[msg.guestId]; // always exists

		var playerName = gui.playerData.characterBaseInformations.name;

		var text = getText('ui.party.invitationCancelled', playerName, invitation.guestName);
		gui.chat.logMsg(text);

		delete self.pendingInvitations[msg.partyId][msg.guestId];
	});

	/** You declined an invitation, or it was cancelled before you accept/refuse */
	gui.on('PartyInvitationCancelledForGuestMessage', function (msg) {
		self.emit('partyInvitationCancelled', msg.partyId);
	});

	// if you joined a party
	gui.on('PartyJoinMessage', function (msg) {
		var party = self.partyTypes[msg.partyType];
		if (!party) { return; }
		var playerData = gui.playerData;

		// add members
		var members = msg.members;
		for (var i = 0; i < members.length; i += 1) {
			var member = members[i];
			if (member.id === playerData.id) {
				continue; //skip this player since we don't keep it in our party list
			}
			party.members[member.id] = { name: member.name };
		}

		// add guests (invitations)
		var guests = msg.guests;
		if (!self.pendingInvitations[msg.partyId] && guests.length) {
			self.pendingInvitations[msg.partyId] = {};
		}
		for (i = 0; i < guests.length; i += 1) {
			var guest = guests[i];

			self.pendingInvitations[msg.partyId][guest.guestId] = {
				hostId: guest.hostId,
				guestName: guest.name,
				guestId: guest.guestId
			};
		}

		party.id = msg.partyId;
		party.leaderId = msg.partyLeaderId;
		self.partyList[msg.partyId] = msg.partyType;

		if (msg.partyType === PartyTypeEnum.PARTY_TYPE_ARENA) {
			self.emit('arenaJoined');
		}
	});

	function removePartyMember(msg) {
		self.emit('partyMemberLeft', msg.partyId, msg.leavingPlayerId);
		var type = self.getPartyTypeFromId(msg.partyId);
		var party = self.partyTypes[type];
		if (!party) { return; }

		delete party.members[msg.leavingPlayerId];
		if (type === PartyTypeEnum.PARTY_TYPE_ARENA) {
			self.emit('arenaMemberLeft', msg.leavingPlayerId);
		}
	}

	gui.on('PartyMemberRemoveMessage', removePartyMember);
	gui.on('PartyMemberEjectedMessage', removePartyMember);

	gui.on('PartyLeaderUpdateMessage', function (msg) {
		self.emit('partyLeaderUpdated', msg.partyId, msg.partyLeaderId);
		var type = self.getPartyTypeFromId(msg.partyId);
		var party = self.partyTypes[type];
		if (party) {
			party.leaderId = msg.partyLeaderId;
			if (type === PartyTypeEnum.PARTY_TYPE_ARENA) {
				self.emit('arenaLeaderUpdate', msg.partyLeaderId);
			}
		}
	});

	gui.on('PartyRefuseInvitationNotificationMessage', function (msg) {
		self.emit('partyGuestLeft', msg.partyId, msg.guestId);
		if (self.pendingInvitations[msg.partyId]) {
			delete self.pendingInvitations[msg.partyId][msg.guestId];
		}
	});

	gui.on('PartyFollowStatusUpdateMessage', function (msg) {
		if (!msg.success) {
			return;
		}
		self.followedId = msg.followedId;
	});

	//--- Special messages for Arena ("Kolizeum")

	gui.on('GameRolePlayArenaRegistrationStatusMessage', function (msg) {
		self.arenaStep = msg.step;
		self.arenaRegistered = msg.registered;
		// are we starting to wait for fighters to accept? (in this case registered turns back to false)
		if (msg.step === 1 && !msg.registered) {
			self.nbArenaFigthersReady = 0;
		}
		self.emit('arenaRegistrationStatus');
	});

	gui.on('GameFightJoinMessage', function (msg) {
		if (msg.fightType === FightTypeEnum.FIGHT_TYPE_PVP_ARENA && !msg.isSpectator) {
			self.arenaStep = PvpArenaStepEnum.ARENA_STEP_STARTING_FIGHT;
			self.arenaRegistered = false;
			self.emit('arenaRegistrationStatus');
		}
		self._cleanPartyFightNotifications();
	});

	gui.on('GameFightEndMessage', function () {
		if (self.arenaStep === PvpArenaStepEnum.ARENA_STEP_STARTING_FIGHT) {
			self.arenaStep = PvpArenaStepEnum.ARENA_STEP_UNREGISTER;
			self.emit('arenaRegistrationStatus');
			self.emit('arenaFightEnd');
		}
	});

	gui.on('GameRolePlayArenaUpdatePlayerInfosMessage', function (msg) {
		self.arenaStats = {
			rank: msg.rank,
			bestDailyRank: msg.bestDailyRank,
			bestRank: msg.bestRank,
			victoryCount: msg.victoryCount,
			arenaFightCount: msg.arenaFightcount
		};
		self.emit('arenaStatsUpdated');
	});

	gui.on('GameRolePlayArenaFighterStatusMessage', function (msg) {
		//msg parameters: fightId:int, playerId:int, accepted:bool
		if (msg.accepted) {
			self.nbArenaFigthersReady++;
			//TODO: save fighter (playerId) status in PartyData so ArenaWindow can show green indicators
			self.emit('arenaFighterReady', self.nbArenaFigthersReady);
		} else {
			self.emit('arenaFightDeclined', msg.fightId, msg.playerId);
		}
	});

	//--- End of Arena special messages

	gui.on('PartyCannotJoinErrorMessage', function (msg) {
		var text;

		switch (msg.reason) {
			case PartyJoinErrorEnum.PARTY_JOIN_ERROR_UNKNOWN:
				text = getText('ui.party.cantInvit');
				break;

			case PartyJoinErrorEnum.PARTY_JOIN_ERROR_PLAYER_NOT_FOUND:
				// TODO: need to figure out how to get the name of the player who request is sent to
				//text = getText('ui.common.playerNotFound', playerName);
				break;

			case PartyJoinErrorEnum.PARTY_JOIN_ERROR_PARTY_NOT_FOUND:
				text = getText('ui.party.cantFindParty');
				break;

			case PartyJoinErrorEnum.PARTY_JOIN_ERROR_PARTY_FULL:
				text = getText('ui.party.partyFull');
				break;

			case PartyJoinErrorEnum.PARTY_JOIN_ERROR_PLAYER_BUSY:
				text = getText('ui.party.cantInvitPlayerBusy');
				break;

			case PartyJoinErrorEnum.PARTY_JOIN_ERROR_PLAYER_ALREADY_INVITED:
				text = getText('ui.party.playerAlreayBeingInvited');
				break;

			case PartyJoinErrorEnum.PARTY_JOIN_ERROR_PLAYER_TOO_SOLLICITED:
				text = getText('ui.party.playerTooSollicited');
				break;

			case PartyJoinErrorEnum.PARTY_JOIN_ERROR_UNMODIFIABLE:
				text = getText('ui.party.partyUnmodifiable');
				break;

			case PartyJoinErrorEnum.PARTY_JOIN_ERROR_UNMET_CRITERION :
			case PartyJoinErrorEnum.PARTY_JOIN_ERROR_PLAYER_LOYAL :
				// Gerés coté serveur
				break;
		}

		if (text) {
			this.openSimplePopup(text);
		}
	});

	// A member of your party is starting a fight. Do you want to join?
	gui.on('PartyMemberInFightMessage', function (msg) {
		var alreadyInFight = gui.playerData.isFighting && !gui.playerData.isSpectator;
		if (alreadyInFight) { return; }

		// message to chat
		var mapId = msg.fightMap.mapId;
		var fightCause;
		switch (msg.reason) {
		case PartyMemberInFightCauseEnum.FIGHT_REASON_MONSTER_ATTACK:
			fightCause = getText('ui.party.memberStartFight.monsterAttack', msg.memberName, msg.memberId, mapId);
			break;
		case PartyMemberInFightCauseEnum.FIGHT_REASON_PLAYER_ATTACK:
			fightCause = getText('ui.party.memberStartFight.playerAttack', msg.memberName, msg.memberId, mapId);
			break;
		case PartyMemberInFightCauseEnum.FIGHT_REASON_MEMBER_ATTACKED_PLAYERS:
			fightCause = getText('ui.party.memberStartFight.attackPlayer', msg.memberName, msg.memberId, mapId);
			break;
		default : //PartyMemberInFightCauseEnum.FIGHT_REASON_UNKNOWN
			fightCause = getText('ui.party.memberStartFight.unknownReason', msg.memberName, msg.memberId, mapId);
		}
		gui.chat.logMsg(fightCause);

		var msBeforeStart = msg.secondsBeforeFightStart; //NB: msg.secondsBeforeFightStart is actually in ms!
		self._addFightInfo(mapId, msg.fightId, msg.memberId, msg.memberName, msBeforeStart);

		if (gui.playerData.position.mapId === mapId) {
			var leaderId = msg.memberId; //TODO: test or review with Ankama; seems to work
			gui.party.showPartyFightQuestion(msg.fightId, leaderId,
				msg.memberId, msg.memberName, msBeforeStart);
		}
		//TODO: external notification? (e.g. push notification)
	});

	/** Sent if a party fight on the same map cannot be joined anymore (= has started already) */
	gui.on('GameRolePlayRemoveChallengeMessage', function (msg) {
		gui.party.removePartyFightQuestion(msg.fightId);
		self._deleteFightInfo(gui.playerData.position.mapId, msg.fightId);
	});

	gui.on('MapComplementaryInformationsDataMessage', function (msg) {
		self._cleanPartyFightNotifications();

		// for the fights we know on this map, show a notif only for "joinable" ones
		var knownFights = self._partyFights[msg.mapId];
		if (!knownFights) { return; }
		var joinableFights = msg.fights;
		for (var i = 0; i < joinableFights.length; i++) {
			var info = knownFights[joinableFights[i].fightId];
			if (!info) { continue; }
			var leaderId = info.memberId; //TODO: test or review with Ankama; seems to work
			gui.party.showPartyFightQuestion(info.fightId, leaderId,
				info.memberId, info.memberName, info.startTime - Date.now());
		}
	});
};

/** Store info for a fight that is about to start */
PartyData.prototype._addFightInfo = function (mapId, fightId, memberId, memberName, msBeforeStart) {
	var mapFights = this._partyFights[mapId];
	if (!mapFights) {
		mapFights = this._partyFights[mapId] = {};
	}
	mapFights[fightId] = {
		fightId: fightId,
		memberId: memberId,
		memberName: memberName,
		startTime: Date.now() + msBeforeStart
	};

	//auto-delete the fight info when it has started
	var self = this;
	window.setTimeout(function () {
		self._deleteFightInfo(mapId, fightId);
	}, msBeforeStart);
};

PartyData.prototype._deleteFightInfo = function (mapId, fightId) {
	var mapFights = this._partyFights[mapId];
	if (!mapFights) { return; }
	delete mapFights[fightId];
	// if no party fight left on this map, do the cleanup
	if (Object.keys(mapFights).length === 0) {
		delete this._partyFights[mapId];
	}
};

PartyData.prototype._cleanPartyFightNotifications = function () {
	// list of party fights is short so we simply ask to close any existing notification
	for (var m in this._partyFights) {
		var mapFights = this._partyFights[m];
		for (var fightId in mapFights) {
			window.gui.party.removePartyFightQuestion(fightId);
		}
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/PlayerData/PartyData.js
 ** module id = 536
 ** module chunks = 0
 **/