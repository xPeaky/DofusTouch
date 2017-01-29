/**
 * @module protocol/inventorySpells
 */

var connectionManager = require('dofusProxy/connectionManager.js');


/**
 * @event module:protocol/inventorySpells.client_SpellListMessage
 */
connectionManager.on('SpellListMessage', function (msg) {
	window.gui.transmitMessage(msg);
});


/**
 * @event module:protocol/inventorySpells.client_SlaveSwitchContextMessage
 *
 * @param {object} msg - msg
 * @param {number} msg.summonerId  - id of the player character which controls the slave.
 * @param {number} msg.slaveId     - id of the slave the player starts to control.
 * @param {Array}  msg.slaveSpells - spells list of the slave.
 * @param {Object} msg.slaveStats  - stats of the slave.
 */
connectionManager.on('SlaveSwitchContextMessage', function (msg) {
	window.gui.transmitMessage(msg);
});



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-game-inventory-spells.js
 ** module id = 134
 ** module chunks = 0
 **/