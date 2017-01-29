/** @module protocol/characterCreation */

var connectionManager = require('dofusProxy/connectionManager.js');


/**
 * @event module:protocol/characterCreation.client_CharacterCreationResultMessage
 * @desc  Result for a sent CharacterCreationRequestMessage
 *
 * @param {object} msg - msg
 * @param {number} msg.result - character creation result code (see below)
 *
 * 0:  OK
 * 1:  ERR_NO_REASON
 * 2:  ERR_INVALID_NAME
 * 3:  ERR_NAME_ALREADY_EXISTS
 * 4:  ERR_TOO_MANY_CHARACTERS
 * 5:  ERR_NOT_ALLOWED
 * 6:  ERR_NEW_PLAYER_NOT_ALLOWED
 * 7:  ERR_RESTRICED_ZONE
 */
connectionManager.on('CharacterCreationResultMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

/**
 * @event module:protocol/characterCreation.client_CharacterNameSuggestionSuccessMessage
 * @desc  Result of a CharacterNameSuggestionRequestMessage
 *
 * @param {object} msg - msg
 * @param {string} msg.suggestion - name suggestion
 */
connectionManager.on('CharacterNameSuggestionSuccessMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

/**
 * @event module:protocol/characterCreation.client_CharacterNameSuggestionFailureMessage
 *
 * @param {object} msg - msg
 * @param {number} msg.reason - reason why name could not be generated (see below)
 *
 * 0:  NICKNAME_GENERATOR_RETRY_TOO_SHORT
 * 1:  NICKNAME_GENERATOR_UNAVAILABLE
 */
connectionManager.on('CharacterNameSuggestionFailureMessage', function (msg) {
	window.gui.transmitMessage(msg);
});



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-game-character-creation.js
 ** module id = 76
 ** module chunks = 0
 **/