var connectionManager = require('dofusProxy/connectionManager.js');

// HouseGuildNoneMessage
connectionManager.on('HouseGuildNoneMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// HouseGuildRightsMessage
connectionManager.on('HouseGuildRightsMessage', function (msg) {
	window.gui.transmitMessage(msg);
});



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-game-context-roleplay-houses-guild.js
 ** module id = 111
 ** module chunks = 0
 **/