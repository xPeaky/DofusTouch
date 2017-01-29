var connectionManager = require('dofusProxy/connectionManager.js');


// NicknameRegistrationMessage
connectionManager.on('NicknameRegistrationMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// NicknameRefusedMessage
connectionManager.on('NicknameRefusedMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// NicknameAcceptedMessage
connectionManager.on('NicknameAcceptedMessage', function (msg) {
	window.gui.transmitMessage(msg);
});



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-connection-register.js
 ** module id = 62
 ** module chunks = 0
 **/