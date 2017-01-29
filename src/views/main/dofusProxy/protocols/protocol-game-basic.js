/** @module protocol/basic */

var connectionManager = require('dofusProxy/connectionManager.js');


// BasicDateMessage

connectionManager.on('BasicTimeMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// BasicNoOperationMessage
/**** nothing ****/

// BasicAckMessage
/**** nothing ****/

// BasicWhoIsNoMatchMessage
connectionManager.on('BasicWhoIsNoMatchMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// NumericWhoIsMessage

// BasicLatencyStatsRequestMessage
var latency     = 262; // TODO: get real value
var sampleCount = 12;  // TODO: get real value
var max         = 50;  // TODO: get real value

/** @event module:protocol/basic.client_BasicLatencyStatsRequestMessage */
connectionManager.on('BasicLatencyStatsRequestMessage', function () {
	connectionManager.sendMessage('BasicLatencyStatsMessage', { latency: latency, sampleCount: sampleCount, max: max });
});

var sequenceNumber = 0;

connectionManager.on('send:login', function () {
	sequenceNumber = 0;
});

/** @event module:protocol/basic.client_SequenceNumberRequestMessage */
connectionManager.on('SequenceNumberRequestMessage', function () {
	sequenceNumber += 1;
	connectionManager.sendMessage('SequenceNumberMessage', { number: sequenceNumber });
});



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-game-basic.js
 ** module id = 75
 ** module chunks = 0
 **/