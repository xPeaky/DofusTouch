require('./styles.less');
var inherits = require('util').inherits;
var Window = require('Window');
var Button = require('Button').DofusButton;
var Table = require('Table');
var getText = require('getText').getText;
var PartyTypeEnum = require('PartyTypeEnum');
var PvpArenaStepEnum = require('PvpArenaStepEnum');
var PvpArenaTypeEnum = require('PvpArenaTypeEnum');


function ArenaWindow() {
	Window.call(this, {
		className: 'ArenaWindow',
		title: getText('ui.common.koliseum'),
		positionInfo: { left: 'c', top: 'c', width: 500, height: 500 }
	});

	this.mustReload = true;

	this.on('open', function () {
		if (!this.statusTitle) {
			this.createContent();
			this.setupListeners();
		}
		if (this.mustReload) {
			this.reloadPartyData();
		}
	});
}

inherits(ArenaWindow, Window);
module.exports = ArenaWindow;


ArenaWindow.prototype.createContent = function () {
	this.messageContainerSetup();
	this.tableSetup();
	this.informationSetup();
	this.buttonsSetup();
};

ArenaWindow.prototype.messageContainerSetup = function () {
	var container = this.windowBody.createChild('div', { className: 'wrapper', name: 'status' });
	this.statusTitle = container.createChild('div', { className: 'title' });
	this.statusText = container.createChild('div', { className: 'text' });
};


ArenaWindow.prototype.tableSetup = function () {
	this.table = this.windowBody.appendChild(new Table({
		colIds: ['icon', 'name', 'status'],
		headerContent: ['', getText('ui.common.team')],
		minRows: 3,
		defaultRowContent: ['', getText('ui.common.randomCharacter')]
	}));
};

ArenaWindow.prototype.informationSetup = function () {
	var container = this.windowBody.createChild('div', { className: 'wrapper', name: 'informations' });
	container.createChild('div', { className: 'title', text: getText('ui.common.myInformations') });
	container.createChild('div', { className: 'text', name: 'currentRating' });
	container.createChild('div', { className: 'text', name: 'dailyRating' });
	container.createChild('div', { className: 'text', name: 'maxRating' });
	container.createChild('div', { className: 'text', name: 'fightsWon' });
};

ArenaWindow.prototype.registerInArena = function () {
	window.dofus.sendMessage('GameRolePlayArenaRegisterMessage', { battleMode: PvpArenaTypeEnum.ARENA_TYPE_3VS3 });
};

ArenaWindow.prototype.buttonsSetup = function () {
	var self = this;

	var buttons = this.windowBody.createChild('div', { className: 'buttons' });
	this.unregisterBtn = buttons.appendChild(new Button(getText('ui.teamSearch.unregistration')));
	this.registerBtn = buttons.appendChild(new Button(getText('ui.teamSearch.registration')));
	this.leaveArenaBtn = buttons.appendChild(new Button(getText('ui.party.arenaQuit')));

	this.registerBtn.on('tap', function () {
		self.registerInArena();
	});

	this.unregisterBtn.on('tap', function () {
		window.dofus.sendMessage('GameRolePlayArenaUnregisterMessage');
	});

	this.leaveArenaBtn.on('tap', function () {
		window.dofus.sendMessage('PartyLeaveRequestMessage', { partyId: self.partyId });
	});
};


ArenaWindow.prototype.setLeaderRow = function (row, asLeader) {
	row.getChild('icon').toggleClassName('leaderIcon', asLeader);
};

// TODO: add status in the table
ArenaWindow.prototype.addMemberRow = function (name, id) {
	var row = this.table.addRow({ name: name }, { id: id });
	if (id === this.leaderId) { this.setLeaderRow(row, true); }

	this.memberCount++;
	return row;
};

ArenaWindow.prototype.addThisPlayerRow = function () {
	var playerData = window.gui.playerData;
	var playerName = playerData.characterBaseInformations.name;

	return this.addMemberRow(playerName, playerData.id);
};

ArenaWindow.prototype.findMemberRow = function (memberId) {
	if (!memberId) { return -1; }
	var rows = this.table.getRows();
	for (var i = 0; i < rows.length; i++) {
		if (rows[i].id === memberId) { return i; }
	}
	return -1;
};

ArenaWindow.prototype.removeMemberRow = function (leavingPlayerId) {
	var rowNdx = this.findMemberRow(leavingPlayerId);
	if (rowNdx === -1) { return console.warn('Cannot remove unknown arena member #' + leavingPlayerId); }

	this.table.delRow(rowNdx);
	this.memberCount--;
};

/** Leave Arena button is enabled if we are in an Arena party.
 *  During fights this button is anyway disabled so this method is called to restore it after that. */
ArenaWindow.prototype.enableOrDisableLeaveArenaButton = function () {
	if (this.partyId) {
		this.leaveArenaBtn.enable();
	} else {
		this.leaveArenaBtn.disable();
	}
};

/** The register OR unregister button is available only to the leader.
 *  When there is "no leader" (out of any party), we are our own leader. */
ArenaWindow.prototype.enableOrDisableRegisterButton = function () {
	if (this.isLeader || !this.leaderId) {
		this.registerBtn.enable();
		this.unregisterBtn.enable();
	} else {
		this.registerBtn.disable();
		this.unregisterBtn.disable();
	}
};

/** Register OR unregister button is displayed depending of what we are told by the server (partyData)
 *  NB: showing/hiding the register/unregister button also shows current status in UI */
 ArenaWindow.prototype.showOrHideRegisterButton = function (partyData) {
	if (partyData.arenaRegistered) {
		this.registerBtn.hide();
		this.unregisterBtn.show();
	} else {
		this.registerBtn.show();
		this.unregisterBtn.hide();
	}
};

ArenaWindow.prototype.setNewLeader = function (newLeaderId) {
	// remove old leader icon
	var i = this.findMemberRow(this.leaderId);
	if (i >= 0) { this.setLeaderRow(this.table.getRow(i), false); }
	// set new leader icon
	i = this.findMemberRow(newLeaderId);
	if (i >= 0) { this.setLeaderRow(this.table.getRow(i), true); }

	this.leaderId = newLeaderId;
	this.isLeader = (newLeaderId === window.gui.playerData.id);

	this.enableOrDisableRegisterButton();
};


ArenaWindow.prototype.updateArenaStats = function (partyData) {
	var stats = partyData.arenaStats;

	var information = this.windowBody.getChild('informations');
	information.getChild('currentRating').setText(
		getText('ui.party.arenaRank', stats.rank));
	information.getChild('dailyRating').setText(
		getText('ui.party.arenaRankMaxToday', stats.bestDailyRank));
	information.getChild('maxRating').setText(
		getText('ui.party.arenaRankMax', stats.bestRank));
	information.getChild('fightsWon').setText(
		getText('ui.party.arenaFightsOfTheDay', stats.victoryCount, stats.arenaFightCount));
};

ArenaWindow.prototype.reloadPartyData = function () {
	this.mustReload = false;
	var partyData = window.gui.playerData.partyData;

	this.updateArenaStats(partyData);
	this.updatePartyData(partyData);
	this.updateRegistrationStatus(partyData);
};

ArenaWindow.prototype.updatePartyData = function (partyData) {
	var party = partyData.partyTypes[PartyTypeEnum.PARTY_TYPE_ARENA];

	this.setNewLeader(party.leaderId);
	this.partyId = party.id;

	var members = party.members;
	this.memberCount = 0;
	this.table.clearContent();

	// member list in partyData does not include this player, so we insert it here...
	// ...in 1st place if this player is the leader, or at the end otherwise
	if (this.isLeader) { this.addThisPlayerRow(); }
	for (var id in members) {
		this.addMemberRow(members[id].name, ~~id);
	}
	if (!this.isLeader) { this.addThisPlayerRow(); }
};

var stepTextIds = [
	'ui.party.arenaInfoSearch', //getText('ui.party.arenaInfoSearch')
	'ui.party.arenaInfoWaiting', //getText('ui.party.arenaInfoWaiting') *** expects a parameter ***
	'ui.party.arenaInfoFighting', //getText('ui.party.arenaInfoFighting')
	'ui.party.arenaInfoInvite' //getText('ui.party.arenaInfoInvite')
];
var getTextForStep = getText;

ArenaWindow.prototype.getStepText = function (step, param) {
	return getTextForStep(stepTextIds[step], param);
};

ArenaWindow.prototype.updateRegistrationStatus = function (partyData) {
	var step = partyData.arenaStep;

	this.statusTitle.setText(getText('ui.common.step', ((step + 1) % 4) + 1, 4));
	this.statusText.setText(this.getStepText(step, 0));

	this.showOrHideRegisterButton(partyData);

	switch (step) {
	case PvpArenaStepEnum.ARENA_STEP_REGISTRED:
		this.enableOrDisableLeaveArenaButton();
		break;
	case PvpArenaStepEnum.ARENA_STEP_WAITING_FIGHT:
	case PvpArenaStepEnum.ARENA_STEP_STARTING_FIGHT:
		// Once the fight proposal came, or the fight is on, disable the other actions
		this.leaveArenaBtn.disable();
		this.registerBtn.disable();
		break;
	case PvpArenaStepEnum.ARENA_STEP_UNREGISTER:
		this.enableOrDisableLeaveArenaButton();
		this.enableOrDisableRegisterButton();
		break;
	default:
		console.error('Unknown arena step #' + step);
	}
};

ArenaWindow.prototype.onFightEnd = function () {
	this.enableOrDisableLeaveArenaButton();
	if (!this.isLeader) {
		return;
	}
	// leader can register again for another fight
	this.registerBtn.enable();
	var self = this;
	window.gui.openConfirmPopup({
		title: getText('ui.common.confirm'),
		message: getText('ui.party.arenaPopupReinscription'),
		cb: function (result) {
			if (!result) { return; }
			self.registerInArena();
		}
	});
};

ArenaWindow.prototype.setupListeners = function () {
	var self = this;
	var partyData = window.gui.playerData.partyData;

	window.gui.on('disconnect', function () {
		self.mustReload = true;
	});

	partyData.on('arenaRegistrationStatus', function () {
		self.updateRegistrationStatus(partyData);
	});

	partyData.on('arenaFightEnd', function () {
		self.onFightEnd();
	});

	partyData.on('arenaStatsUpdated', function () {
		self.updateArenaStats(partyData);
	});

	partyData.on('arenaJoined', function () {
		self.updatePartyData(partyData);
	});

	partyData.on('arenaNewMember', function (memberInfo) {
		// we verify we don't have this member already (not sure if necessary; was in earlier code)
		if (self.findMemberRow(memberInfo.id) >= 0) { return console.error('Dupe arena member #' + memberInfo.name); }

		self.addMemberRow(memberInfo.name, memberInfo.id);
	});

	partyData.on('arenaMemberLeft', function (leavingPlayerId) {
		self.removeMemberRow(leavingPlayerId);
	});

	partyData.on('arenaLeft', function () {
		self.reloadPartyData();
	});

	partyData.on('arenaLeaderUpdate', function (newLeaderId) {
		self.setNewLeader(newLeaderId);
	});

	partyData.on('arenaFighterReady', function (nbReadyFigthers) {
		self.statusText.setText(self.getStepText(1, nbReadyFigthers));
		//TODO: when PartyData implements it, show a green light for ready fighter
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/ArenaWindow/index.js
 ** module id = 646
 ** module chunks = 0
 **/