var connectionManager = require('dofusProxy/connectionManager.js');


// PartyModifiableStatusMessage

// PartyInvitationMessage
connectionManager.on('PartyInvitationMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// PartyInvitationDungeonMessage

// PartyInvitationDetailsMessage
connectionManager.on('PartyInvitationDetailsMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// PartyInvitationDungeonDetailsMessage

// PartyInvitationCancelledForGuestMessage
connectionManager.on('PartyInvitationCancelledForGuestMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// PartyCancelInvitationNotificationMessage
connectionManager.on('PartyCancelInvitationNotificationMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// PartyRefuseInvitationNotificationMessage
connectionManager.on('PartyRefuseInvitationNotificationMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// PartyCannotJoinErrorMessage
connectionManager.on('PartyCannotJoinErrorMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// PartyJoinMessage
connectionManager.on('PartyJoinMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// PartyNewGuestMessage
connectionManager.on('PartyNewGuestMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('PartyUpdateMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// PartyNewMemberMessage
connectionManager.on('PartyNewMemberMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// PartyUpdateLightMessage
connectionManager.on('PartyUpdateLightMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// PartyMemberRemoveMessage
connectionManager.on('PartyMemberRemoveMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// PartyMemberEjectedMessage
connectionManager.on('PartyMemberEjectedMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// PartyLeaderUpdateMessage
connectionManager.on('PartyLeaderUpdateMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// PartyFollowStatusUpdateMessage
connectionManager.on('PartyFollowStatusUpdateMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// PartyLocateMembersMessage

// PartyLeaveMessage
connectionManager.on('PartyLeaveMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// PartyKickedByMessage
connectionManager.on('PartyKickedByMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// PartyDeletedMessage
connectionManager.on('PartyDeletedMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// PartyMemberInFightMessage
connectionManager.on('PartyMemberInFightMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// DungeonPartyFinderAvailableDungeonsMessage

// DungeonPartyFinderListenErrorMessage

// DungeonPartyFinderRoomContentMessage

// DungeonPartyFinderRoomContentUpdateMessage

// DungeonPartyFinderRegisterSuccessMessage

// DungeonPartyFinderRegisterErrorMessage



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-game-context-roleplay-party.js
 ** module id = 117
 ** module chunks = 0
 **/