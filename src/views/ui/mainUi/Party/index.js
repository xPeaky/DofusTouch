require('./styles.less');
var addTooltip = require('TooltipBox').addTooltip;
var dimensions = require('dimensionsHelper').dimensions;
var hyperlink = require('hyperlink');
var inherits = require('util').inherits;
var WuiDom = require('wuidom');
var Button = require('Button');
var gripBehavior = require('gripBehavior');
var gt = require('getText');
var getText = gt.getText;
var processTextWithModifier = gt.processTextWithModifier;
var PartyTypeEnum = require('PartyTypeEnum');
var CharacterDisplay = require('CharacterDisplayWebGL');
var DirectionsEnum = require('DirectionsEnum');
var ChatActivableChannelsEnum = require('ChatActivableChannelsEnum');
var windowsManager = require('windowsManager');


function Party() {
	WuiDom.call(this, 'div', { className: 'Party', hidden: true });
	gripBehavior(this, { isCollapsable: true });

	this.numParties = 0;
	this.hasParty = {}; // one boolean per party type; true if we are in this party
	this.currentPartyType = null;
	this.currentParty = null;
	this.invitedFrom = {};
	this.partyTypesById = {}; // maps a unique party to its type

	this.setupEvents();
}
inherits(Party, WuiDom);
module.exports = Party;


Party.prototype._reset = function () {
	this.hide();
	this.cleanData(PartyTypeEnum.PARTY_TYPE_CLASSICAL, /*isSilent=*/true);
	this.cleanData(PartyTypeEnum.PARTY_TYPE_ARENA, /*isSilent=*/true);
};

function invertPartyType(type) {
	return type === PartyTypeEnum.PARTY_TYPE_ARENA ?
		PartyTypeEnum.PARTY_TYPE_CLASSICAL : PartyTypeEnum.PARTY_TYPE_ARENA;
}

Party.prototype._selectPartyType = function (type) {
	var isShowingArena = type === PartyTypeEnum.PARTY_TYPE_ARENA;
	this.toggleClassName('arena', isShowingArena);

	this.currentPartyType = type;
	this.currentParty = isShowingArena ? this.arenaParty : this.classicParty;

	this.classicParty.toggleDisplay(!isShowingArena);
	this.arenaParty.toggleDisplay(isShowingArena);
};

Party.prototype._createContent = function () {
	var self = this;

	this.createChild('div', { className: 'gripIcon' });

	var btn = this.switchPartyButton = this.appendChild(
		new Button({ className: 'switchPartyButton', hidden: true }));
	btn.createChild('div', { className: 'iconGroup' });
	btn.createChild('div', { className: 'separator' });
	btn.createChild('div', { className: 'iconArena' });
	btn.on('tap', function () {
		self._selectPartyType(invertPartyType(self.currentPartyType));
	});

	var optionsButton = this.appendChild(
		new Button({ className: ['optionsButton', 'greenButton'] }));
	optionsButton.createChild('div', { className: 'icon' });
	optionsButton.on('tap', function () {
		var partyBox = self.currentParty;
		window.gui.openContextualMenuAround('partyOptions', optionsButton, {
			partyType: self.currentPartyType,
			partyId: self.currentParty.partyId,
			isLoyal: partyBox.isLoyal,
			isRestricted: partyBox.isRestricted,
			isLeader: partyBox.partyLeaderId === window.gui.playerData.id
		});
	});

	this.partyBoxes = this.createChild('div', { className: 'partyBoxes' });
	this.classicParty = this.partyBoxes.createChild('div', {
		className: ['partyBox', 'classic'],
		name: PartyTypeEnum.PARTY_TYPE_CLASSICAL
	});
	this.arenaParty = this.partyBoxes.createChild('div', {
		className: ['partyBox', 'arena'],
		name: PartyTypeEnum.PARTY_TYPE_ARENA,
		hidden: true
	});

	this.setStyles({
		left: dimensions.mapRight - 90 + 'px',
		top: '100px'
	});
};

Party.prototype.addMember = function (partyType, memberData) {
	var partyBox = this.partyBoxes.getChild(partyType);
	var memberId = memberData.id || memberData.guestId;

	// box
	var memberDom = partyBox.createChild('div', {
		className: 'member',
		name: memberId
	});

	// avatar
	var memberAvatar = new CharacterDisplay({ scale: 'fitin' });

	var look = memberData.entityLook || memberData.guestLook;
	memberAvatar.setLook(look, {
		riderOnly: true,
		direction: DirectionsEnum.DIRECTION_SOUTH_WEST,
		animation: 'AnimArtwork',
		boneType:  'timeline/',
		skinType:  'timeline/'
	});

	memberDom.appendChild(memberAvatar);

	// context menu
	memberDom.on('tap', function () {
		window.gui.openContextualMenuAround('player', memberDom, {
			playerId: memberData.id || memberData.guestId,
			playerName: memberData.name
		});
	});

	// hp
	var hpBar = memberDom.createChild('div', { className: 'hpBar', name: 'hpBar' });
	memberDom.hp = hpBar.createChild('div', { className: 'hp', name: 'hp' });

	// icons
	memberDom.createChild('div', { className: 'pendingIcon', name: 'pendingIcon', text: '?' });
	memberDom.createChild('div', { className: 'leaderIcon', name: 'leaderIcon' });
	var followingBadge = memberDom.createChild('div', { className: 'followingBadge' });
	followingBadge.createChild('div', { className: 'icon' });

	this.updateMember(partyType, memberData);
	this.emit('resized');
};


Party.prototype.updateMember = function (partyType, memberData) {
	var partyBox = this.partyBoxes.getChild(partyType);
	var memberId = memberData.id || memberData.guestId;
	var isLeader = (partyBox.partyLeaderId === memberId);

	var memberDom = partyBox.getChild(memberId);
	if (!memberDom) {
		return;
	}
	memberDom.memberData = memberData;
	this._updateMemberTooltip(memberDom, isLeader);

	var children = partyBox.getChildren();
	if (isLeader && children.length > 1 && children[0] !== memberDom) {
		partyBox.insertAsFirstChild(memberDom);
	}

	// hp
	memberDom.hp.setStyle('height', memberData.lifePoints / memberData.maxLifePoints * 100 + '%');

	// icons
	memberDom.toggleClassName('guest', !!memberData.guestId);
	memberDom.toggleClassName('leader', isLeader);
};

Party.prototype.addOrUpdateMember = function (partyId, memberInformations) {
	var partyBox = this._getPartyById(partyId);
	if (!partyBox) { return; }

	var memberDom = partyBox.getChild(memberInformations.id);
	if (!memberDom) {
		this.addMember(partyBox.type, memberInformations);
	} else {
		memberDom.memberData = memberInformations;
		this.updateMember(partyBox.type, memberInformations);
	}
};

Party.prototype.getMemberById = function (partyId, memberId) {
	var partyBox = this._getPartyById(partyId);
	if (!partyBox) { return; }

	var memberDom = partyBox.getChild(memberId);
	if (!memberDom) {
		return;
	}

	return memberDom.memberData;
};

Party.prototype._getPartyById = function (partyId) {
	var type = this.partyTypesById[partyId];
	if (!type) {
		return null;
	}
	return this.partyBoxes.getChild(type);
};

Party.prototype._joinParty = function (type, partyId, partyLeaderId, members, guests) {
	if (!this.partyBoxes) {
		this._createContent();
	}
	this.hasParty[type] = true;
	this.numParties++;

	this.partyTypesById[partyId] = type;

	var partyBox = this.partyBoxes.getChild(type);
	partyBox.type = type;
	partyBox.partyLeaderId = partyLeaderId;
	partyBox.partyId = partyId;
	partyBox.isLoyal = false;
	partyBox.isRestricted = true;

	// load the party box
	for (var i = 0; i < members.length; i += 1) {
		if (partyBox.getChild(members[i].id)) {
			this.updateMember(type, members[i]);
		} else {
			this.addMember(type, members[i]);
		}
	}

	for (i = 0; i < guests.length; i += 1) {
		if (partyBox.getChild(guests[i].id)) {
			this.updateMember(type, guests[i]);
		} else {
			this.addMember(type, guests[i]);
		}
	}

	// Auto switch to joined party
	var leaderMemberDom = partyBox.getChild(partyLeaderId);
	if (partyBox.getChildren()[0] !== leaderMemberDom) {
		partyBox.insertAsFirstChild(leaderMemberDom);
	}
	this._selectPartyType(type);

	if (this.numParties >= 2) { this.switchPartyButton.show(); }
	if (this.numParties === 1) { this.show(); }

	this.emit('resized');
};

// Called when we exit a party (several reasons to do that) - opposite of _joinParty method above
Party.prototype.cleanData = function (type, isSilent) {
	if (!type) {
		return; // likely from prev message that already deleted same party
	}
	if (!this.hasParty[type]) { return; }
	this.hasParty[type] = false;
	this.numParties--;

	var partyBox = this.partyBoxes.getChild(type);
	partyBox.hide();
	partyBox.clearContent();

	delete partyBox.partyLeaderId;

	for (var id in this.partyTypesById) {
		if (parseInt(this.partyTypesById[id], 10) === type) {
			delete this.partyTypesById[id];
		}
	}

	this.switchPartyButton.hide();

	if (this.numParties > 0) {
		this._selectPartyType(invertPartyType(type));
	} else {
		this.hide();
	}

	if (type === PartyTypeEnum.PARTY_TYPE_ARENA) {
		this.removeArenaFightQuestion();
	}
	if (!isSilent) { this.emit('resized'); }
};

Party.prototype.removeMember = function (msg) {
	var partyBox = this._getPartyById(msg.partyId);
	if (!partyBox) { return; }

	var memberId = msg.leavingPlayerId || msg.guestId || msg.cancelerId;
	partyBox.getChild(memberId).destroy();

	// In case we were invited by this member, remove invitation (invitation will not work if accepted)
	this.removeTeleportQuestion(memberId);

	this.emit('resized');
};

Party.prototype.setupEvents = function () {
	var self = this;
	var gui = window.gui;
	var partyData = gui.playerData.partyData; //TODO: partyData should be used everywhere
	var connectionManager = window.dofus.connectionManager;

	gui.on('disconnect', function () { self._reset(); });

	// you have just become a member of a party
	// NOTE: check this message for full information on ALL party members & guests
	gui.on('PartyJoinMessage', function (msg) {
		self._joinParty(msg.partyType, msg.partyId, msg.partyLeaderId, msg.members, msg.guests);
	});

	// someone new has been appointed or previous leader left
	gui.on('PartyLeaderUpdateMessage', function (msg) {
		var partyBox = self._getPartyById(msg.partyId);
		if (!partyBox) { return; }

		var lastLeaderMemberDom = partyBox.getChild(partyBox.partyLeaderId);
		var newLeaderMemberDom = partyBox.getChild(msg.partyLeaderId);

		partyBox.partyLeaderId = msg.partyLeaderId;

		self.updateMember(partyBox.type, lastLeaderMemberDom.memberData);
		self.updateMember(partyBox.type, newLeaderMemberDom.memberData);
	});

	// someone has been invited to join your party
	// NOTE: check this message for information on NEW guest
	gui.on('PartyNewGuestMessage', function (msg) {
		var partyBox = self._getPartyById(msg.partyId);
		if (!partyBox) { return; }

		var memberData = msg.guest;
		memberData.hostName = partyBox.getChild(memberData.hostId).memberData.name;
		self.addMember(partyBox.type, memberData);

		partyBox.partyId = msg.partyId;
	});

	// a member has left your group
	gui.on('PartyMemberRemoveMessage', function (msg) {
		self.removeMember(msg);
	});

	// you have kicked a member out
	gui.on('PartyMemberEjectedMessage', function (msg) {
		self.removeMember(msg);
	});

	// a guest has accepted invitation to join your group
	partyData.on('partyNewMember', function (partyId, memberInformations) {
		self.addOrUpdateMember(partyId, memberInformations);
	});

	partyData.on('partyUpdateMember', function (partyId, memberInformations) {
		self.addOrUpdateMember(partyId, memberInformations);
	});

	gui.on('PartyLeaveMessage', function (msg) {
		self.cleanData(self.partyTypesById[msg.partyId]);
	});

	gui.on('PartyDeletedMessage', function (msg) {
		self.cleanData(self.partyTypesById[msg.partyId]);
	});

	gui.on('PartyKickedByMessage', function (msg) {
		self.cleanData(self.partyTypesById[msg.partyId]);
	});

	// You have been asked to join a party
	gui.on('PartyInvitationMessage', function (msg) {
		self.showPartyInvitationQuestion(msg.partyType, msg.partyId, msg.fromName);
	});

	// Your Arena party is proposed to join a fight (= a match was found for your team)
	gui.on('GameRolePlayArenaFightPropositionMessage', function (msg) {
		self.showArenaFightQuestion(msg.fightId);
	});

	partyData.on('arenaLeft', function () { //TODO: many others here should listen instead on partyData
		self.removeArenaFightQuestion();
	});

	gui.on('GameRolePlayArenaFighterStatusMessage', function (msg) {
		// NB: there seems to be no specific message sent by server after 1 fighter refuses the fight
		// so we must catch it here to remove the fight proposal
		if (!msg.accepted) {
			self.removeArenaFightQuestion(msg.fightId);
		}
	});

	// you canceled invitation of a guest before they accept/refuse
	gui.on('PartyCancelInvitationNotificationMessage', function (msg) {
		self.removeMember(msg);
	});

	// you declined an invitation, or it was cancelled before you accept/refuse
	gui.on('PartyInvitationCancelledForGuestMessage', function (msg) {
		// NOTE: msg.cancelerId is who did the canceling, you or them
		if (gui.playerData.id !== msg.cancelerlId) {
			self.removeMember(msg);
		}

		gui.notificationBar.removeNotification('party' + msg.partyId);
	});

	// an invited guest declines your invitation
	gui.on('PartyRefuseInvitationNotificationMessage', function (msg) {
		self.removeMember(msg);

		var fromName = self.invitedFrom[msg.partyId];

		if (fromName) {
			var text = getText('ui.party.invitationCancelledForGuest', fromName);
			gui.chat.logMsg(text);
			gui.notificationBar.removeNotification('party' + msg.partyId);
		}
	});

	gui.on('PartyFollowStatusUpdateMessage', function (msg) {
		if (!msg.success) {
			return;
		}
		var partyBox = self._getPartyById(msg.partyId);
		if (!partyBox) { return; }

		if (self.followedId) {
			partyBox.getChild(self.followedId).delClassNames('following');
		}

		self.followedId = msg.followedId;
		if (!self.followedId) {
			return;
		}

		partyBox.getChild(self.followedId).addClassNames('following');
	});

	gui.on('PartyUpdateLightMessage', function (msg) {
		var partyBox = self._getPartyById(msg.partyId);
		if (!partyBox) { return; }

		var hp = partyBox.getChild(msg.id).getChild('hpBar').getChild('hp');
		hp.setStyle('height', msg.lifePoints / msg.maxLifePoints * 100 + '%');
	});

	// NB: msg.dungeonId not used; same as in Flash client
	connectionManager.on('TeleportBuddiesMessage', function (/*msg*/) {
		gui.openConfirmPopup({
			title: getText('ui.common.confirm'),
			message: getText('ui.party.teleportMembersProposition'),
			cb: function (accepted) {
				connectionManager.sendMessage('TeleportBuddiesAnswerMessage', { accept: accepted });
			}
		});
	});

	connectionManager.on('TeleportBuddiesRequestedMessage', function (msg) {
		// Gather name of buddies
		var hostName = partyData.getMemberName(PartyTypeEnum.PARTY_TYPE_CLASSICAL, msg.inviterId);
		var rejectedBuddyNames = [];
		for (var i = 0; i < msg.invalidBuddiesIds.length; i++) {
			rejectedBuddyNames.push(partyData.getMemberName(PartyTypeEnum.PARTY_TYPE_CLASSICAL, msg.invalidBuddiesIds[i]));
		}

		// Build message for chat
		var chatMsg = getText('ui.party.teleportWish', hostName, msg._dungeonName);
		if (rejectedBuddyNames.length) {
			// teleportCriterionFallenAngels: "%1 ne respecte{~pnt} pas les conditions pour être invité{~ps}."
			chatMsg += ' ' + processTextWithModifier(getText('ui.party.teleportCriterionFallenAngels'),
				rejectedBuddyNames.length, rejectedBuddyNames.join(', '));
		}
		gui.chat.logMsg(chatMsg, ChatActivableChannelsEnum.CHANNEL_PARTY);
	});

	connectionManager.on('TeleportToBuddyOfferMessage', function (msg) {
		self.showTeleportQuestion(msg.buddyId, msg.dungeonId, msg._dungeonName, msg.timeLeft * 1000);
	});

	connectionManager.on('TeleportToBuddyCloseMessage', function (msg) {
		self.removeTeleportQuestion(msg.buddyId);
	});

	connectionManager.on('PartyRestrictedMessage', function (msg) {
		var partyBox = self._getPartyById(msg.partyId);
		if (!partyBox) { return; }
		partyBox.isRestricted = msg.restricted;
	});

	connectionManager.on('PartyLoyaltyStatusMessage', function (msg) {
		var partyBox = self._getPartyById(msg.partyId);
		if (!partyBox) { return; }
		partyBox.isLoyal = msg.loyal;
	});
};

Party.prototype.showTeleportQuestion = function (buddyId, dungeonId, dungeonName, timerInMs) {
	var inviterName = window.gui.playerData.partyData.getMemberName(PartyTypeEnum.PARTY_TYPE_CLASSICAL, buddyId);

	function reply(btn) {
		var accept = btn === 1; // "close" or "refuse" => refuse
		window.dofus.connectionManager.sendMessage('TeleportToBuddyAnswerMessage',
			{ dungeonId: dungeonId, buddyId: buddyId, accept: accept });
	}
	var notificationBar = window.gui.notificationBar;
	var desc = {
		type: notificationBar.notificationType.PRIORITY_INVITATION,
		title: getText('ui.common.invitation'),
		text: getText('ui.party.teleportProposition', inviterName, dungeonName),
		timer: timerInMs,
		buttons: [
			{ label: getText('ui.common.refuse'), action: reply },
			{ label: getText('ui.common.accept'), action: reply }
		],
		onClose: reply
	};
	notificationBar.newNotification('teleport' + buddyId, desc);
};

// NB: no issue if invitation is not here or already gone
Party.prototype.removeTeleportQuestion = function (buddyId) {
	window.gui.notificationBar.removeNotification('teleport' + buddyId);
};

Party.prototype.showArenaFightQuestion = function (fightId) {
	this.arenaFightId = fightId; //we can only be in 1 fight at a time!
	var notifId = 'arena' + fightId;

	function reply(btn) {
		var accept = btn === 1; // "close" or "refuse" => refuse
		window.dofus.connectionManager.sendMessage('GameRolePlayArenaFightAnswerMessage',
			{ fightId: fightId, accept: accept });
	}

	var notificationBar = window.gui.notificationBar;
	var desc = {
		type: notificationBar.notificationType.PRIORITY_INVITATION,
		title: getText('ui.common.koliseum'),
		text: getText('ui.party.fightFound'),
		buttons: [
			{ label: getText('ui.common.refuse'), action: reply },
			{ label: getText('ui.common.accept'), action: reply }
		],
		onClose: reply
	};
	notificationBar.newNotification(notifId, desc);
};

/** @param {int} [fightId] - optional since we can be in only 1 arena party */
Party.prototype.removeArenaFightQuestion = function (fightId) {
	// we ignore fightId but check it if given (pretty sure it is fine to ignore)
	if (fightId && fightId !== this.arenaFightId) { console.error('removeArenaFightQuestion: bad fightId?'); }

	if (this.arenaFightId) {
		window.gui.notificationBar.removeNotification('arena' + this.arenaFightId);
		this.arenaFightId = null;
	}
};

Party.prototype.showPartyInvitationQuestion = function (partyType, partyId, fromName) {
	this.invitedFrom[partyId] = fromName;

	var notifId = 'party' + partyId;

	var text;
	if (partyType === PartyTypeEnum.PARTY_TYPE_CLASSICAL) {
		text = getText('ui.party.playerInvitation', fromName);
	} else if (partyType === PartyTypeEnum.PARTY_TYPE_ARENA) {
		text = getText('ui.party.playerInvitationArena', fromName);
	} else {
		return console.error('Unknown party type ' + partyType);
	}

	function showDetails() {
		windowsManager.getWindow('partyInviteDetails').showPartyDetails(partyId);
		return 'HIDE_DIALOG';
	}
	function acceptOrRefuse(btn) {
		var msg = btn === -1 ? 'PartyRefuseInvitationMessage' : 'PartyAcceptInvitationMessage';
		window.dofus.connectionManager.sendMessage(msg, { partyId: partyId });
	}

	var notificationBar = window.gui.notificationBar;
	var desc = {
		type: notificationBar.notificationType.INVITATION,
		title: getText('ui.common.invitation'),
		text: text,
		buttons: [
			{ label: getText('ui.common.details'), action: showDetails },
			{ label: getText('ui.common.accept'), action: acceptOrRefuse }
		],
		onClose: acceptOrRefuse
	};
	notificationBar.newNotification(notifId, desc);
};

Party.prototype.showPartyFightQuestion = function (fightId, leaderId, memberId, memberName, timerInMs) {
	function join() {
		window.dofus.connectionManager.sendMessage('GameFightJoinRequestMessage', { fightId: fightId, fighterId: leaderId });
	}

	var notificationBar = window.gui.notificationBar;
	var desc = {
		type: notificationBar.notificationType.PRIORITY_INVITATION,
		title: getText('ui.party.teamFightTitle'),
		wuidom: hyperlink.process(getText('ui.party.joinTeamFightQuestion', memberName, memberId)),
		timer: timerInMs,
		buttons: [
			{ label: getText('ui.common.join'), action: join }
		]
	};
	notificationBar.newNotification('partyFight' + fightId, desc);
};

/** @param {int} fightId */
Party.prototype.removePartyFightQuestion = function (fightId) {
	window.gui.notificationBar.removeNotification('partyFight' + fightId);
};

Party.prototype._updateMemberTooltip = function (memberDom, isLeader) {
	var memberData = memberDom.memberData;

	addTooltip(memberDom, function () {
		// create?
		var memberTooltip = memberDom.getChild('tooltip');
		var memberTips, guestTips;

		if (!memberTooltip) {
			memberTooltip = new WuiDom('div', { className: 'memberTooltip', name: 'tooltip' });

			// leader title
			memberTooltip.createChild('div', {
				className: 'stat',
				name: 'leaderTitle',
				text: getText('ui.party.leader')
			});
			// name
			memberTooltip.createChild('div', {
				className: 'stat',
				name: 'memberName'
			});

			memberTips = memberTooltip.createChild('div', { className: 'memberTips', name: 'memberTips' });
			guestTips = memberTooltip.createChild('div', { className: 'guestTips', name: 'guestTips' });

			// level
			memberTips.createChild('div', {
				className: 'stat',
				name: 'level'
			});
			// HP
			memberTips.createChild('div', {
				className: 'stat',
				name: 'hp'
			});
			// prospecting
			memberTips.createChild('div', {
				className: 'stat',
				name: 'prospecting'
			});
			// initiative
			memberTips.createChild('div', {
				className: 'stat',
				name: 'initiative'
			});

			// guest invited by
			guestTips.createChild('div', {
				className: 'stat',
				name: 'invitedBy'
			});
		}

		// update
		memberTooltip.getChild('memberName').setText(memberData.name);

		var isGuest = Boolean(memberData.guestId);

		memberTips = memberTooltip.getChild('memberTips');
		guestTips = memberTooltip.getChild('guestTips');

		memberTips.toggleDisplay(!isGuest);
		guestTips.toggleDisplay(isGuest);

		var colonStr = getText('ui.common.colon');

		if (!isGuest) { // members
			var hpStr = memberData.lifePoints + ' / ' + memberData.maxLifePoints;

			memberTooltip.getChild('leaderTitle').toggleDisplay(isLeader);

			memberTips.getChild('level').setText(getText('ui.common.level') + colonStr + memberData.level);
			memberTips.getChild('hp').setText(getText('ui.short.lifePoints') + colonStr + hpStr);
			memberTips.getChild('prospecting').setText(getText('ui.stats.prospecting') + colonStr + memberData.prospecting);
			memberTips.getChild('initiative').setText(getText('ui.stats.initiative') + colonStr + memberData.initiative);
		} else { // guests
			guestTips.getChild('invitedBy').setText(getText('ui.party.invitedBy') + colonStr + '\n' + memberData.hostName);
		}

		return memberTooltip;
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/mainUi/Party/index.js
 ** module id = 511
 ** module chunks = 0
 **/