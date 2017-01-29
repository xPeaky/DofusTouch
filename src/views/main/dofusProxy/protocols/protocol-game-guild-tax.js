var connectionManager = require('dofusProxy/connectionManager.js');

/**
 * @param {object} msg - msg
 * @param {String} msg.basicInfos.enrichData.firstName
 * @param {String} msg.basicInfos.enrichData.lastName
 * @param {String} msg.basicInfos.enrichData.subAreaName
 */
connectionManager.on('TaxCollectorMovementMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('TaxCollectorErrorMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

/**
 * @param {object} msg - msg
 * @param {String} msg.informations[*].enrichData.firstName
 * @param {String} msg.informations[*].enrichData.lastName
 * @param {String} msg.informations[*].enrichData.subAreaName
 */
connectionManager.on('TaxCollectorListMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

/**
 * This message is always sent along with TaxCollectorMovementAddMessage. we don't need it. Ankama either. yay.
 */
//TaxCollectorStateUpdateMessage

/**
 * @param {object} msg - msg
 * @param {String} msg.informations.enrichData.firstName
 * @param {String} msg.informations.enrichData.lastName
 * @param {String} msg.informations.enrichData.subAreaName
 */
connectionManager.on('TaxCollectorMovementAddMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('TaxCollectorMovementRemoveMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

/**
 * @param {object} msg - msg
 * @param {String} msg.enrichData.firstName
 * @param {String} msg.enrichData.lastName
 * @param {String} msg.enrichData.subAreaName
 */
connectionManager.on('TaxCollectorAttackedMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

/**
 * @param {object} msg - msg
 * @param {String} msg.basicInfos.enrichData.firstName
 * @param {String} msg.basicInfos.enrichData.lastName
 * @param {String} msg.basicInfos.enrichData.subAreaName
 */
connectionManager.on('TaxCollectorAttackedResultMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('GuildFightPlayersHelpersJoinMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('GuildFightPlayersHelpersLeaveMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('GuildFightPlayersEnemiesListMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('GuildFightPlayersEnemyRemoveMessage', function (msg) {
	window.gui.transmitMessage(msg);
});



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-game-guild-tax.js
 ** module id = 126
 ** module chunks = 0
 **/