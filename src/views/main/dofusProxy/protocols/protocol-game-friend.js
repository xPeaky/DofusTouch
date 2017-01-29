var connectionManager = require('dofusProxy/connectionManager.js');


// FriendsListMessage
connectionManager.on('FriendsListMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// IgnoredListMessage
connectionManager.on('IgnoredListMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// FriendAddedMessage
connectionManager.on('FriendAddedMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// FriendUpdateMessage
connectionManager.on('FriendUpdateMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// IgnoredAddedMessage
connectionManager.on('IgnoredAddedMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// IgnoredDeleteResultMessage
connectionManager.on('IgnoredDeleteResultMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// SpouseStatusMessage
connectionManager.on('SpouseStatusMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// SpouseInformationsMessage
connectionManager.on('SpouseInformationsMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// FriendWarnOnConnectionStateMessage
connectionManager.on('FriendWarnOnConnectionStateMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// FriendWarnOnLevelGainStateMessage

// GuildMemberWarnOnConnectionStateMessage



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-game-friend.js
 ** module id = 124
 ** module chunks = 0
 **/