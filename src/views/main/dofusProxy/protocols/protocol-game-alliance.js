var connectionManager = require('dofusProxy/connectionManager.js');


connectionManager.on('AllianceCreationStartedMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('AllianceModificationStartedMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('AllianceCreationResultMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('AllianceInvitedMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('AllianceInvitationStateRecruterMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('AllianceInvitationStateRecrutedMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('AllianceJoinedMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('AllianceGuildLeavingMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('AllianceLeftMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('AllianceMembershipMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('KohUpdateMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('AllianceFactsErrorMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('AllianceFactsMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// AllianceListMessage

// AllianceVersatileInfoListMessage

// AlliancePartialListMessage

connectionManager.on('AllianceInsiderInfoMessage', function (msg) {
	window.gui.transmitMessage(msg);
});



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-game-alliance.js
 ** module id = 71
 ** module chunks = 0
 **/