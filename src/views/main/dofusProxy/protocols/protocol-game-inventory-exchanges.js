/**
 * @module protocol/inventoryExchanges
 */
var connectionManager = require('dofusProxy/connectionManager.js');


connectionManager.on('ExchangeReplayCountModifiedMessage', function (msg) {
	window.gui.transmitMessage(msg);
});


// ExchangeObjectMessage

connectionManager.on('ExchangeObjectAddedMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// ExchangeRequestedMessage

connectionManager.on('ExchangeRequestedTradeMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

/**
 * @event module:protocol/inventoryExchanges.client_ExchangeStartedMessage
 *
 * @param {object} msg - msg
 * @param {ExchangeTypeEnum} msg.exchangeType - Shop / trade / craft ...
 */
connectionManager.on('ExchangeStartedMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('ExchangeStartedWithPodsMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

/**
 * @event module:protocol/inventoryExchanges.client_ExchangeStartedWithStorageMessage
 *
 * @param {object} msg - msg
 * @param {ExchangeTypeEnum} msg.exchangeType - Shop / trade / craft ...
 * @param {number} msg.storageMaxSlot
 */
connectionManager.on('ExchangeStartedWithStorageMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('ExchangeCraftSlotCountIncreasedMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('ExchangeIsReadyMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

/*
 * @event module:protocol/inventoryExchanges.client_ExchangeLeaveMessage
 * @desc  Message sent when an exchange is closed
 *
 * @param {Object} msg
 * @param {number} msg.dialogType - Modal interface type to close
 * @param {boolean} msg.success - The exchange was closed after an exchange has been validated by both parties?
 * If false, it means one of the players closed the window or it might be a chest
 */
connectionManager.on('ExchangeLeaveMessage', function (msg) {
	window.gui.transmitMessage(msg);
});


connectionManager.on('ExchangeStartOkNpcTradeMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('ExchangeOkMultiCraftMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('ExchangeCraftResultMessage', function (msg) {
	window.gui.transmitMessage(msg);
});


connectionManager.on('ExchangeCraftResultWithObjectIdMessage', function (msg) {
	// ObjectId seems to be GID
	window.gui.transmitMessage(msg);
});


connectionManager.on('ExchangeCraftResultWithObjectDescMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// ExchangeCraftResultMagicWithObjectDescMessage
connectionManager.on('ExchangeCraftResultMagicWithObjectDescMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('ExchangeCraftInformationObjectMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

/**
 * @event module:protocol/inventoryExchanges.client_ExchangeStartedMountStockMessage
 * @desc  Message sent when exchange with your mount
 *
 * @param {Object} msg
 * @param {Object[]} msg.objectsInfos - List of items
 */
connectionManager.on('ExchangeStartedMountStockMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

/**
 * @event module:protocol/inventoryExchanges.client_ExchangeWeightMessage
 *
 * @param {object} msg - msg
 * @param {number} msg.currentWeight
 * @param {number} msg.maxWeight
 */
connectionManager.on('ExchangeWeightMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// ExchangeStartOkTaxCollectorMessage

connectionManager.on('ExchangeGuildTaxCollectorGetMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

/**
 * @event module:protocol/inventoryExchanges.client_ExchangeReplyTaxVendorMessage
 * @desc  Message containing the tax amount to switch to merchant mode
 * @param {Object} msg
 * @param {number} msg.objectsValue - Total value of all objects being sold
 * @param {number} msg.totalTaxValue - Total value of tax
 */
connectionManager.on('ExchangeReplyTaxVendorMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// ExchangeWaitingResultMessage

// ExchangeStartOkMountWithOutPaddockMessage

// ExchangeMountStableErrorMessage
connectionManager.on('ExchangeMountStableErrorMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('ExchangeMountStableAddMessage', function (msg) {
	window.gui.transmitMessage(msg);
});


connectionManager.on('ExchangeMountPaddockAddMessage', function (msg) {
	window.gui.transmitMessage(msg);
});


connectionManager.on('ExchangeMountStableBornAddMessage', function (msg) {
	window.gui.transmitMessage(msg);
});


connectionManager.on('ExchangeMountStableRemoveMessage', function (msg) {
	window.gui.transmitMessage(msg);
});


connectionManager.on('ExchangeMountPaddockRemoveMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// ExchangeMountTakenFromPaddockMessage
connectionManager.on('ExchangeMountTakenFromPaddockMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// ExchangeMountFreeFromPaddockMessage
connectionManager.on('ExchangeMountFreeFromPaddockMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// ExchangeMountSterilizeFromPaddockMessage
connectionManager.on('ExchangeMountSterilizeFromPaddockMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// ExchangeBidSearchOkMessage

connectionManager.on('ExchangeItemAutoCraftStopedMessage', function (msg) {
	window.gui.transmitMessage(msg);
});


connectionManager.on('ExchangeItemAutoCraftRemainingMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// ExchangeStartOkCraftMessage

connectionManager.on('ExchangeStartOkCraftWithInformationMessage', function (msg) {
	window.gui.transmitMessage(msg);
});


connectionManager.on('ExchangeStartOkMulticraftCrafterMessage', function (msg) {
	window.gui.transmitMessage(msg);
});


connectionManager.on('ExchangeStartOkMulticraftCustomerMessage', function (msg) {
	window.gui.transmitMessage(msg);
});


connectionManager.on('ExchangeStartOkJobIndexMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('ExchangeGoldPaymentForCraftMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('ExchangeItemPaymentForCraftMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('ExchangeModifiedPaymentForCraftMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('ExchangeRemovedPaymentForCraftMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('ExchangeClearPaymentForCraftMessage', function (msg) {
	window.gui.transmitMessage(msg);
});



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-game-inventory-exchanges.js
 ** module id = 131
 ** module chunks = 0
 **/