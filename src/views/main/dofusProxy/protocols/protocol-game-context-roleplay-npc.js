/**
 * @module protocol/roleplay
 */

var connectionManager = require('dofusProxy/connectionManager.js');

/**
 * @event module:protocol/roleplay.client_MapNpcsQuestStatusUpdateMessage
 * @desc  Add/remove quest icons above NPC on the map
 */
connectionManager.on('MapNpcsQuestStatusUpdateMessage', function (msg) {
	window.actorManager.updateQuestIcons(msg);
});

/**
 * @event module:protocol/roleplay.client_TaxCollectorDialogQuestionBasicMessage
 */
connectionManager.on('TaxCollectorDialogQuestionBasicMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

/**
 * @event module:protocol/roleplay.client_TaxCollectorDialogQuestionExtendedMessage
 */
connectionManager.on('TaxCollectorDialogQuestionExtendedMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

/**
 * @event module:protocol/roleplay.client_AllianceTaxCollectorDialogQuestionExtendedMessage
 */
connectionManager.on('AllianceTaxCollectorDialogQuestionExtendedMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

/**
 * @event module:protocol/roleplay.client_AlliancePrismDialogQuestionMessage
 */
connectionManager.on('AlliancePrismDialogQuestionMessage', function (msg) {
	window.gui.transmitMessage(msg);
});



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-game-context-roleplay-npc.js
 ** module id = 114
 ** module chunks = 0
 **/