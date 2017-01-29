var connectionManager = require('dofusProxy/connectionManager.js');


// TitlesAndOrnamentsListMessage
connectionManager.on('TitlesAndOrnamentsListMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// TitleGainedMessage
connectionManager.on('TitleGainedMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// TitleLostMessage
connectionManager.on('TitleLostMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// OrnamentGainedMessage
connectionManager.on('OrnamentGainedMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// TitleSelectedMessage
connectionManager.on('TitleSelectedMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// TitleSelectErrorMessage
connectionManager.on('TitleSelectErrorMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// OrnamentSelectedMessage
connectionManager.on('OrnamentSelectedMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// OrnamentSelectErrorMessage
connectionManager.on('OrnamentSelectErrorMessage', function (msg) {
	window.gui.transmitMessage(msg);
});



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-game-tinsel.js
 ** module id = 145
 ** module chunks = 0
 **/