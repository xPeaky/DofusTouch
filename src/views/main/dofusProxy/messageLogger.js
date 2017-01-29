var connectionManager = require('./connectionManager.js');

var filteredReceivedMessages = {
	BasicAckMessage: null,
	BasicLatencyStatsRequestMessage: null,
	BasicNoOperationMessage: null,
	SequenceNumberRequestMessage: null
};

var filteredSentMessages = {
	BasicLatencyStatsMessage: null,
	SequenceNumberMessage: null
};

connectionManager.on('data', function (msg) {
	if (filteredReceivedMessages[msg._messageType] === null) { return; }

	var color = 'background-color: #BFA;'; // default "received" color
	if (!msg._messageType || msg._messageType.indexOf('ErrorMessage') !== -1) {
		color = 'background-color: #F00; color: #FFF;';
	}

	console.log('[DOFUS PROXY] received: %c' + msg._messageType, color, msg);
});

connectionManager.on('messageSequence', function (msgs) {
	var color = 'background-color: #CB98E7;';
	console.log('[DOFUS PROXY] received: %cmessageSequence', color, msgs);
});

connectionManager.on('open', function () {
	console.log('[DOFUS PROXY] %c Connected to remote server ', 'background-color: #FF0;');
});

connectionManager.on('reconnecting', function () {
	console.log('[DOFUS PROXY] %c Reconnecting to remote server... ', 'background-color: #FF0;');
});

connectionManager.on('reconnected', function () {
	console.log('[DOFUS PROXY] %c Reconnected to remote server ', 'background-color: #FF0;');
});

connectionManager.on('error', function (err) {
	console.error('[DOFUS PROXY] ', err);
});

connectionManager.on('disconnect', function () {
	console.log('[DOFUS PROXY] %c disconnecting ', 'background-color: #FF0;');
});

connectionManager.on('send', function (msg) {
	if (msg.call === 'sendMessage') {
		if (filteredSentMessages[msg.data.data.type]) { return; }
		console.log('[DOFUS PROXY]     send: %c' + msg.data.data.type, 'background-color: #6DF;', msg.data.data.data);
		return;
	}

	console.log('[DOFUS PROXY]     send: %c' + msg.call, 'background-color: #6DF;', msg.data);
});



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/messageLogger.js
 ** module id = 181
 ** module chunks = 0
 **/