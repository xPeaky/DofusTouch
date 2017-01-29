var connectionManager = require('dofusProxy/connectionManager.js');

connectionManager.on('QuestListMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('QuestStartedMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('QuestValidatedMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('QuestObjectiveValidatedMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('QuestStepValidatedMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('QuestStepStartedMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('QuestStepInfoMessage', function (msg) {
	window.gui.transmitMessage(msg);
});



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-game-context-roleplay-quest.js
 ** module id = 119
 ** module chunks = 0
 **/