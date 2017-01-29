var connectionManager = require('dofusProxy/connectionManager.js');


// CompassResetMessage
connectionManager.on('CompassResetMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// CompassUpdateMessage
connectionManager.on('CompassUpdateMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// CompassUpdatePartyMemberMessage
connectionManager.on('CompassUpdatePartyMemberMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// CompassUpdatePvpSeekMessage



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-game-atlas-compass.js
 ** module id = 74
 ** module chunks = 0
 **/