var connectionManager = require('dofusProxy/connectionManager.js');

connectionManager.on('JobDescriptionMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('JobLevelUpMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('JobUnlearntMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('JobExperienceMultiUpdateMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('JobExperienceUpdateMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// JobAllowMultiCraftRequestMessage
connectionManager.on('JobAllowMultiCraftRequestMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// JobMultiCraftAvailableSkillsMessage
connectionManager.on('JobMultiCraftAvailableSkillsMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// JobCrafterDirectoryListMessage
connectionManager.on('JobCrafterDirectoryListMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// JobCrafterDirectorySettingsMessage
connectionManager.on('JobCrafterDirectorySettingsMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// JobListedUpdateMessage
connectionManager.on('JobListedUpdateMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// JobCrafterDirectoryRemoveMessage
connectionManager.on('JobCrafterDirectoryRemoveMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// JobCrafterDirectoryAddMessage
connectionManager.on('JobCrafterDirectoryAddMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// JobCrafterDirectoryEntryMessage
connectionManager.on('JobCrafterDirectoryEntryMessage', function (msg) {
	window.gui.transmitMessage(msg);
});



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-game-context-roleplay-job.js
 ** module id = 112
 ** module chunks = 0
 **/