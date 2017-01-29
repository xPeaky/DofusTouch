/**
 * @module protocol/interactiveZaap
 */
var connectionManager = require('dofusProxy/connectionManager.js');


/**
 * @event module:protocol/interactiveZaap.client_TeleportDestinationsListMessage
 * @desc  Message sent after user request use of zaap.
 *        Contain informations for this zaap: destinations and cost for each, type of teleporter.
 *
 * @param {object} msg - msg
 * @param {number}    msg.teleporterType     - start teleporter type
 * @param {number[]}  msg.mapIds             - map ids where zaap can teleport user (current map included)
 * @param {number[]}  msg.subAreaIds         - list of subareas ids
 * @param {number[]}  msg.costs              - cost in kamas for each teleporter
 * @param {number[]}  msg.destTeleporterType - as teleporterType, for destination teleporter
 * @param {number}    msg.spawnMapId         - map id for the saved zaap
 */
connectionManager.on('TeleportDestinationsListMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

/**
 * @event module:protocol/interactiveZaap.client_ZaapListMessage
 * @desc  Message sent after user request use of zaap.
 *        Contain informations for this zaap: destinations and cost for each, type of teleporter.
 *
 * @param {object} msg - msg
 * @param {number}    msg.teleporterType     - 0 is regular zaap
 * @param {number[]}  msg.mapIds             - map ids where zaap can teleport user (current map included)
 * @param {number[]}  msg.subAreaIds         - subareas ids
 * @param {number[]}  msg.costs              - cost in kamas for each teleport
 * @param {number[]}  msg.destTeleporterType - as teleporterType, for destination zaap
 * @param {number}    msg.spawnMapId         - map id for the saved zaap
 */
connectionManager.on('ZaapListMessage', function (msg) {
	window.gui.transmitMessage(msg);
});



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-game-interactive-zaap.js
 ** module id = 129
 ** module chunks = 0
 **/