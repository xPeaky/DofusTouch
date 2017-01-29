/**
 * @module protocol/chatSmiley
 */

var connectionManager = require('dofusProxy/connectionManager.js');


/**
 * @event module:protocol/chatSmiley.client_ChatSmileyMessage
 *
 * @param {object} msg - msg
 * @param {number} msg.entityId  - id of the character in current context
 * @param {number} msg.smileyId  - id of the smiley to show
 * @param {number} msg.accountId - id of the account required in case of a client operation (report, ignore, ...)
 */
connectionManager.on('ChatSmileyMessage', function (msg) {
	if (window.gui.playerData.socialData.isIgnored(msg.accountId)) {
		return;
	}
	window.actorManager.addSmileyOnActor(msg.entityId, msg.smileyId);
});

// LocalizedChatSmileyMessage

/**
 * @event module:protocol/chatSmiley.client_MoodSmileyResultMessage
 *
 * @param {object} msg - msg
 * @param {number} msg.resultCode - indicate if mood request went well
 * @param {number} msg.smileyId   - id of the smiley used for the mood, -1 if none
 */
connectionManager.on('MoodSmileyResultMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

/**
 * @event module:protocol/chatSmiley.client_MoodSmileyUpdateMessage
 *
 * @param {object} msg - msg
 * @param {number} msg.accountId - id of the account of the player
 * @param {number} msg.playerId  - id of the player
 * @param {number} msg.smileyId  - id of the smiley used for the mood, -1 if none
 */
connectionManager.on('MoodSmileyUpdateMessage', function (msg) {
	window.gui.transmitMessage(msg);
});



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-game-chat-smiley.js
 ** module id = 82
 ** module chunks = 0
 **/