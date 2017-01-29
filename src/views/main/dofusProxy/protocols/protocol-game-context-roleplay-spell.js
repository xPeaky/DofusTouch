/**
 * @module protocol/contextRoleplaySpell
 */

var connectionManager = require('dofusProxy/connectionManager.js');


// SpellForgetUIMessage
connectionManager.on('SpellForgetUIMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// SpellForgottenMessage
connectionManager.on('SpellForgottenMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

/**
 * @event module:protocol/contextRoleplaySpell.client_SpellUpgradeSuccessMessage
 */
connectionManager.on('SpellUpgradeSuccessMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('SpellUpgradeFailureMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

/** @event module:protocol/debug.client_GameRolePlaySpellAnimMessage
 *
 * @param {object} msg - msg
 * @param {number} msg.casterId       - id of account casting the spell
 * @param {number} msg.targetCellId   - cell on which to cast the spell
 * @param {number} msg.spellId        - spell id
 * @param {number} msg.spellLevel     - timestamp
 * @param {Object} msg._scriptParams  - parameters of the spell
 */
connectionManager.on('GameRolePlaySpellAnimMessage', function (msg) {
	window.isoEngine.playRoleplaySpellAnim(msg);
});

// SpellItemBoostMessage



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-game-context-roleplay-spell.js
 ** module id = 120
 ** module chunks = 0
 **/