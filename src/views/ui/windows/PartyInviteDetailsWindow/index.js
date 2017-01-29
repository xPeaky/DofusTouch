require('./styles.less');
var inherits = require('util').inherits;
var Window = require('Window');
var windowsManager = require('windowsManager');
var Button = require('Button').DofusButton;
var tapBehavior = require('tapBehavior');
var getText = require('getText').getText;
var PartyTypeEnum = require('PartyTypeEnum');
var protocolConstants = require('protocolConstants');
var CharacterDisplay = require('CharacterDisplayWebGL');
var DirectionsEnum = require('DirectionsEnum');
var Scroller = require('Scroller');

var NUM_SLOTS_ARENA = 3; // protocolConstants.MAX_MEMBERS_PER_ARENA_PARTY = 5 but our server limits at 3...
var NUM_SLOTS_CLASSIC = protocolConstants.MAX_MEMBERS_PER_PARTY;

var WINDOW_MIN_WIDTH = 563; //px - enough for buttons and 3 slots to appear correctly
var WINDOW_MAX_WIDTH = 904; //px - enough for 7 slots (classic party mode)

var windowPosInfo = { left: 'c', top: 'c', minWidth: WINDOW_MIN_WIDTH, height: 375 };


function PartyInviteDetailsWindow() {
	Window.call(this, {
		className: 'PartyInviteDetailsWindow',
		positionInfo: windowPosInfo
	});

	this.partyMap = {};
	this.numParties = 0;
	this.partyId = null;

	var self = this;
	window.gui.on('disconnect', function () { self._closeAll(); });
}
inherits(PartyInviteDetailsWindow, Window);
module.exports = PartyInviteDetailsWindow;


PartyInviteDetailsWindow.prototype.showPartyDetails = function (partyId) {
	if (partyId === this.partyId) {
		return windowsManager.open(this.id);
	}

	window.dofus.sendMessage('PartyInvitationDetailsRequestMessage', { partyId: partyId });

	if (!this.partyMap[partyId]) {
		this.partyMap[partyId] = true;
		this.numParties++;
		if (this.numParties === 1) {
			this._setupListeners(true);
		}
	}

	if (!this.text) {
		this._setupDom();
	} else {
		// window is already open but we want to show details for another party (e.g. arena != group)
		this._resetDom();
	}
};

PartyInviteDetailsWindow.prototype._closeAll = function () {
	for (var partyId in this.partyMap) {
		this._closePartyInvitation(partyId);
	}
	this.partyMap = {};
	this.numParties = 0;
	this.partyId = null;
};

// NB: we destroy and free most things here - we SHOULD NOT do it in a freeContent function!
PartyInviteDetailsWindow.prototype._closePartyInvitation = function (partyId) {
	if (!this.partyMap[partyId]) { return; } // unknown party?
	delete this.partyMap[partyId];
	this.numParties--;
	if (this.numParties === 0) {
		this._setupListeners(false);
	}

	window.gui.notificationBar.removeNotification('party' + partyId);

	if (partyId === this.partyId) {
		this.partyId = null;
		windowsManager.close(this.id);

		this.windowBody.clearContent();
		this.text = null;
		this.characters = [];
		this.members = null;
		this.scroller = null;
		this.slotList = null;
	}
};

PartyInviteDetailsWindow.prototype._setupDom = function () {
	var self = this;

	this.text = this.windowBody.createChild('div', { className: 'text' });
	var container = this.windowBody.createChild('div', { className: 'container' });

	this.scroller = container.appendChild(new Scroller({ className: 'slotList' }, { isHorizontal: true }));
	this.slotList = this.scroller.content;

	this.characters = [];

	var buttons = this.windowBody.createChild('div', { className: 'buttons' });
	var acceptButton = buttons.appendChild(
		new Button(getText('ui.common.accept'), { className: 'acceptButton' }));
	var refuseButton = buttons.appendChild(
		new Button(getText('ui.common.refuse'), { className: 'refuseButton' }));
	var ignoreButton = buttons.appendChild(
		new Button(getText('ui.social.blackListTemporarly'), { className: 'ignoreButton' }));

	acceptButton.on('tap', function () {
		window.dofus.sendMessage('PartyAcceptInvitationMessage', { partyId: self.partyId });
		self._closePartyInvitation(self.partyId);
	});

	refuseButton.on('tap', function () {
		window.dofus.sendMessage('PartyRefuseInvitationMessage', { partyId: self.partyId });
		self._closePartyInvitation(self.partyId);
	});

	ignoreButton.on('tap', function () {
		window.dofus.sendMessage('IgnoredAddRequestMessage', { name: self.fromName, session: true });
		self._closePartyInvitation(self.partyId);
	});
};

PartyInviteDetailsWindow.prototype._newCharacterSlot = function () {
	var character = this.slotList.createChild('div', { className: 'character' });
	character.createChild('div', { className: 'background', name: 'background' });
	character.appendChild(new CharacterDisplay({ name: 'characterDisplay', scale: 1.4, verticalAlign: 'bottom' }));

	character.createChild('div', { className: 'name', name: 'name' });
	character.createChild('div', { className: 'breed', name: 'breed' });
	character.createChild('div', { className: 'level', name: 'level' });

	tapBehavior(character);
	var self = this;
	character.on('tap', function () {
		if (!character.characterId) { return; } // tap on empty slot
		var info = self.members[character.characterId];
		window.gui.openContextualMenu('player', { playerId: info.id, playerName: info.name });
	});

	return character;
};

PartyInviteDetailsWindow.prototype._resetDom = function () {
	this.characters = [];
	this.slotList.clearContent();
};

PartyInviteDetailsWindow.prototype._removeMember = function (partyId, leavingPlayerId) {
	if (partyId !== this.partyId) { return; } //only the notifications for current party are showed
	var info = this.members[leavingPlayerId];
	if (!info) { return; } //should not happen
	var index = info.index;

	// re-create the slot at the end
	var slot = this.characters.splice(index, 1)[0];
	this.slotList.removeChild(slot);
	this.characters.push(this._newCharacterSlot());

	//re-indexes the members that need it
	for (var id in this.members) {
		info = this.members[id];
		if (info.index > index) { info.index--; }
	}
	// now the member can be deleted
	delete this.members[leavingPlayerId];

	this.scroller.refresh();
};

var handledMemberInfoTypes = ['PartyGuestInformations', 'PartyInvitationMemberInformations', 'PartyMemberInformations'];

/** Updates the text and look for a guest or a member of the party
 *  @param {number} partyId
 *  @param {PartyGuestInformations|PartyInvitationMemberInformations|PartyMemberInformations} info
 *         - data about the new guest or member
 *  @param {boolean} [noRefresh] - if true we are in a series of updates, hence no display refresh needed
 */
PartyInviteDetailsWindow.prototype._addOrUpdateMember = function (partyId, info, noRefresh) {
	if (partyId !== this.partyId) { return; } //only the notifications for current party are showed
	if (handledMemberInfoTypes.indexOf(info._type) === -1) {
		return console.error('Unhandled type for character: ' + info._type);
	}

	var existingMember = this.members[info.id];
	if (existingMember) {
		info.index = existingMember.index;
	} else {
		info.index = Object.keys(this.members).length;
	}
	this.members[info.id] = info;

	this._updateCharacterSlot(info);
	if (!noRefresh) { this.scroller.refresh(); }
};

PartyInviteDetailsWindow.prototype._updateCharacterSlot = function (info) {
	var slot = this.characters[info.index];
	if (!slot) {
		slot = this.characters[info.index] = this._newCharacterSlot();
	}

	slot.characterId = info.id;
	slot.getChild('name').setText(info.name);
	slot.getChild('level').setText(getText('ui.common.level') + ' ' + info.level);
	slot.getChild('breed').setText(window.gui.databases.Breeds[info.breed].shortNameId);

	var characterDisplay = slot.getChild('characterDisplay');
	characterDisplay.setLook(info.entityLook, {
		direction: DirectionsEnum.DIRECTION_SOUTH_EAST,
		animation: 'AnimStatique',
		boneType:  'characters/',
		skinType:  'characters/',
		riderOnly: true
	});

	this._toggleGuest(info.id, info.isGuest);
};

PartyInviteDetailsWindow.prototype._toggleGuest = function (characterId, isGuest) {
	var info = this.members[characterId];
	if (!info) { return; }
	var slot = this.characters[info.index];
	slot.getChild('background').toggleClassName('guestFrame', !!isGuest);
};

PartyInviteDetailsWindow.prototype._toggleLeader = function (characterId, isLeader) {
	var info = this.members[characterId];
	if (!info) { return; }
	var slot = this.characters[info.index];
	slot.getChild('background').toggleClassName('leaderIcon', !!isLeader);
};

PartyInviteDetailsWindow.prototype._setLeader = function (partyId, newLeaderId) {
	if (partyId !== this.partyId) { return; } //only the notifications for current party are showed
	this._toggleLeader(this.leaderId, false);
	this._toggleLeader(newLeaderId, true);
	this.leaderId = newLeaderId;
};

PartyInviteDetailsWindow.prototype._joinParty = function (msg) {
	var partyId = msg.partyId;
	this.partyId = partyId;

	var isArena = msg.partyType === PartyTypeEnum.PARTY_TYPE_ARENA;

	// Resize & reopen window with right width for this party type
	windowPosInfo.width = isArena ? WINDOW_MIN_WIDTH : WINDOW_MAX_WIDTH;
	this.position = null;
	windowsManager.open(this.id);

	this.windowTitle.setText(isArena ? getText('ui.common.invitationArena') : getText('ui.common.invitationGroupe'));

	this.slotList.toggleClassName('arena', isArena);
	this.slotList.toggleClassName('classic', !isArena);
	for (var i = isArena ? NUM_SLOTS_ARENA : NUM_SLOTS_CLASSIC; i > 0; i--) {
		this.characters.push(this._newCharacterSlot());
	}

	this.text.setText(getText('ui.common.invitationPresentation', msg.fromName) + '.');

	this.fromName = msg.fromName;

	this.members = {};
	for (i = 0; i < msg.members.length; i++) {
		this._addOrUpdateMember(partyId, msg.members[i], /*noRefresh=*/true);
	}
	for (i = 0; i < msg.guests.length; i++) {
		this._addOrUpdateMember(partyId, msg.guests[i], /*noRefresh=*/true);
	}
	this._setLeader(partyId, msg.leaderId);

	this.scroller.refresh();
};

PartyInviteDetailsWindow.prototype._setupListeners = function (isListening) {
	var partyData = window.gui.playerData.partyData;

	if (!this.joinPartyHandler) {
		this.joinPartyHandler = this._joinParty.bind(this);
		this.closePartyInvitationHandler = this._closePartyInvitation.bind(this);
		this.setLeaderHandler = this._setLeader.bind(this);
		this.addOrUpdateMemberHandler = this._addOrUpdateMember.bind(this);
		this.removeMemberHandler = this._removeMember.bind(this);
	}

	if (isListening) {
		partyData.on('partyInvitationDetails', this.joinPartyHandler);
		partyData.on('partyInvitationCancelled', this.closePartyInvitationHandler);
		partyData.on('partyLeaderUpdated', this.setLeaderHandler);
		partyData.on('partyNewGuest', this.addOrUpdateMemberHandler);
		partyData.on('partyNewMember', this.addOrUpdateMemberHandler);
		partyData.on('partyUpdateMember', this.addOrUpdateMemberHandler);
		partyData.on('partyMemberLeft', this.removeMemberHandler);
		partyData.on('partyGuestLeft', this.removeMemberHandler);
	} else {
		partyData.removeListener('partyInvitationDetails', this.joinPartyHandler);
		partyData.removeListener('partyInvitationCancelled', this.closePartyInvitationHandler);
		partyData.removeListener('partyLeaderUpdated', this.setLeaderHandler);
		partyData.removeListener('partyNewGuest', this.addOrUpdateMemberHandler);
		partyData.removeListener('partyNewMember', this.addOrUpdateMemberHandler);
		partyData.removeListener('partyUpdateMember', this.addOrUpdateMemberHandler);
		partyData.removeListener('partyMemberLeft', this.removeMemberHandler);
		partyData.removeListener('partyGuestLeft', this.removeMemberHandler);
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/PartyInviteDetailsWindow/index.js
 ** module id = 790
 ** module chunks = 0
 **/