/**
 * @module protocol/actionsSequence
 */

var connectionManager = require('dofusProxy/connectionManager.js');

/**
 * sequence type
 *
 * SEQUENCE_SPELL           1
 * SEQUENCE_WEAPON			2
 * SEQUENCE_GLYPH_TRAP      3
 * SEQUENCE_TRIGGERED       4
 * SEQUENCE_MOVE            5
 * SEQUENCE_CHARACTER_DEATH 6
 * SEQUENCE_TURN_START      7
 * SEQUENCE_TURN_END        8
 * SEQUENCE_FIGHT_START     9
 */

/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @event module:protocol/actionsSequence.client_SequenceStartMessage
 * @desc  This message is embedded by websocket in a `messageSequence` message (see bellow)
 *
 * @param {number} sequenceType - sequence type (see before)
 * @param {number} authorId     - actor id
 */


/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @event module:protocol/actionsSequence.client_SequenceEndMessage
 * @desc  This message is embedded by connectionManager in a `messageSequence` message (see bellow)
 *
 * @param {number} msg.actionId
 * @param {number} msg.authorId
 * @param {number} msg.sequenceType
 */


/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @event module:protocol/actionsSequence.client_messageSequence
 * @desc  This is a custom message that contain a array of messages that have been sent between
 *        a SequenceStartMessage and a SequenceEndMessage (including these ones).
 *        The whole sequence is sent to isoEngine that will parse the sequence to cronstruct the
 *        correct animation sequence.
 *
 * @param {Object[]} msg.sequence - Array of messages
 */
connectionManager.on('messageSequence', function (msg) {
	window.isoEngine.transmitMessage(msg);
	window.gui.emit('checkServerLag', 'fightAction', 'stop');
});



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-game-actions-sequence.js
 ** module id = 70
 ** module chunks = 0
 **/