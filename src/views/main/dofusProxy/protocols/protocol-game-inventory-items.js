/**
 * @module protocol/inventoryItems
 */

var connectionManager = require('dofusProxy/connectionManager.js');


/**
 * @event module:protocol/inventory.client_InventoryContentMessage
 */
connectionManager.on('InventoryContentMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('SetUpdateMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('InventoryWeightMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('ObjectMovementMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('ObjectAddedMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('ObjectsAddedMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// GoldAddedMessage

connectionManager.on('ObjectModifiedMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// ObjectJobAddedMessage

// ObjectFoundWhileRecoltingMessage

connectionManager.on('LivingObjectMessageMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// MimicryObjectPreviewMessage

// MimicryObjectErrorMessage

// MimicryObjectAssociatedMessage

connectionManager.on('InventoryContentAndPresetMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('ExchangeObjectRemovedMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('ExchangeObjectModifiedMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('ExchangeObjectPutInBagMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('ExchangeObjectRemovedFromBagMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('ExchangeObjectModifiedInBagMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('ExchangeKamaModifiedMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('ExchangeMultiCraftCrafterCanUseHisRessourcesMessage', function (msg) {
	window.gui.transmitMessage(msg);
});



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-game-inventory-items.js
 ** module id = 132
 ** module chunks = 0
 **/