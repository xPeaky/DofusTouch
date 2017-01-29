var connectionManager = require('dofusProxy/connectionManager.js');


// InventoryPresetUpdateMessage
connectionManager.on('InventoryPresetUpdateMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// InventoryPresetItemUpdateErrorMessage
connectionManager.on('InventoryPresetItemUpdateErrorMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// InventoryPresetItemUpdateMessage
connectionManager.on('InventoryPresetItemUpdateMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// InventoryPresetSaveResultMessage
connectionManager.on('InventoryPresetSaveResultMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// InventoryPresetDeleteResultMessage
connectionManager.on('InventoryPresetDeleteResultMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// InventoryPresetUseResultMessage
connectionManager.on('InventoryPresetUseResultMessage', function (msg) {
	window.gui.transmitMessage(msg);
});



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-game-inventory-preset.js
 ** module id = 133
 ** module chunks = 0
 **/