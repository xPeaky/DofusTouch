/**
 * @module protocol/houses
 */
var connectionManager = require('dofusProxy/connectionManager.js');

connectionManager.on('AccountHouseMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** @event module:protocol/houses.client_HousePropertiesMessage
 *
 * @param {Number}   msg.houseId      - house id
 * @param {Number[]} msg.doorsOnMap   - ids of interactive element 'doors' on map
 * @param {String}   msg.ownerName    - house's owner name
 * @param {Boolean}  msg.isOnSale     - is this house on sale ?
 * @param {Boolean}  msg.isSaleLocked - is house sell/buy temporary blocked ?
 * @param {Number}   msg.modelId      - house type
 */
connectionManager.on('HousePropertiesMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('HouseBuyResultMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('HouseSoldMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('HouseToSellListMessage', function (msg) {
	window.gui.transmitMessage(msg);
});



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-game-context-roleplay-houses.js
 ** module id = 110
 ** module chunks = 0
 **/