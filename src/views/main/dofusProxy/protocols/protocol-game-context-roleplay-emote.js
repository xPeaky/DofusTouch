var connectionManager = require('dofusProxy/connectionManager.js');

connectionManager.on('EmoteListMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('EmoteAddMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('EmoteRemoveMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// EmotePlayAbstractMessage


/** @event module:protocol/debug.client_EmotePlayMessage
 *
 * @param {object} msg - msg
 * @param {number} msg.accountId      - id of account playing the emote
 * @param {number} msg.actorId        - id of actor playing the emote
 * @param {number} msg.emoteId        - emote id
 * @param {number} msg.emoteStartTime - timestamp
 * @param {Object} msg._emote         - emote data object (enriched)
 */
connectionManager.on('EmotePlayMessage', function (msg) {
	window.isoEngine.playEmote(msg);
});

// EmotePlayMassiveMessage

// EmotePlayErrorMessage



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-game-context-roleplay-emote.js
 ** module id = 107
 ** module chunks = 0
 **/