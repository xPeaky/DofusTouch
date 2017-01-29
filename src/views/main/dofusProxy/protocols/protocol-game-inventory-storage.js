var connectionManager = require('dofusProxy/connectionManager.js');

/**
 * @event module:protocol/inventoryStorage.client_StorageInventoryContentMessage
 *
 * @param {object} msg - msg
 * @param {Array}  msg.objects - Array of raw ItemInstance (objectUID, objectGID, quantity, effects...)
 * @param {number} msg.kamas
 */
connectionManager.on('StorageInventoryContentMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

/**
 * @event module:protocol/inventoryStorage.client_StorageKamasUpdateMessage
 *
 * @param {object} msg - msg
 * @param {number} msg.kamasTotal - the new kaams amount in the storage
 */
connectionManager.on('StorageKamasUpdateMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

/**
 * @event module:protocol/inventoryStorage.client_StorageObjectUpdateMessage
 *
 * @param {object} msg - msg
 * @param {Object} msg.object - raw ItemInstance (objectUID, objectGID, quantity, effects...) to add/update
 */
connectionManager.on('StorageObjectUpdateMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

/**
 * @event module:protocol/inventoryStorage.client_StorageObjectsUpdateMessage
 *
 * @param {object} msg - msg
 * @param {Array} msg.objectList - array raw ItemInstance (objectUID, objectGID, quantity, effects...) to add/update
 */
connectionManager.on('StorageObjectsUpdateMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

/**
 * @event module:protocol/inventoryStorage.client_StorageObjectRemoveMessage
 *
 * @param {object} msg - msg
 * @param {number} msg.objectUID - the UID of the item to be removed
 */
connectionManager.on('StorageObjectRemoveMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

/**
 * @event module:protocol/inventoryStorage.client_StorageObjectsRemoveMessage
 *
 * @param {object} msg - msg
 * @param {Array} msg.objectUIDList - array of the items' UID to be removed
 */
connectionManager.on('StorageObjectsRemoveMessage', function (msg) {
	window.gui.transmitMessage(msg);
});



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-game-inventory-storage.js
 ** module id = 135
 ** module chunks = 0
 **/