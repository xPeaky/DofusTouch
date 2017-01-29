/**
 * @module protocol/gameContextDisplay
 */

var connectionManager = require('dofusProxy/connectionManager.js');


function displayNumericalValue(msg) {
	window.isoEngine.displayNumericalValue(msg);
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** @event module:protocol/gameContextDisplay.client_DisplayNumericalValueMessage
 *  @desc  Display a numerical value next to an entity (for instance after ressource collection).
 *
 * @param {number} msg.entityId - actor id
 * @param {number} msg.value    - value to be displayed
 * @param {number} msg.type     - type of the value (ressource collect, craft, paddock, etc.)
 */
connectionManager.on('DisplayNumericalValueMessage', displayNumericalValue);

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** @event module:protocol/gameContextDisplay.client_DisplayNumericalValueWithAgeBonusMessage
 *  @desc  Display a numerical value next to an entity for a ressource with an age bonus.
 *
 * @param {number} msg.entityId - actor id
 * @param {number} msg.value    - value to be displayed
 * @param {number} msg.type     - type of the value (ressource collect, craft, paddock, etc.)
 * @param {number} msg.valueOfBonus - bonus value
 */
connectionManager.on('DisplayNumericalValueWithAgeBonusMessage', displayNumericalValue);



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-game-context-display.js
 ** module id = 96
 ** module chunks = 0
 **/