/**
 * The connection manager is in charge of:
 * - the Primus client lifecycle
 * - sending messages
 * - receiving messages
 *
 * We keep a single Primus object the whole time, even if we disconnect (or get disconnected)
 * and reconnect later.
 * NB: some of the automatic features of Primus are nice but hard to control when you want
 * a special behavior: for example, it was easier by not using the "reconnect on online" feature.
 * Remark: we left the commented out "console" calls so we can uncomment them all when debugging.
 */

var EventEmitter = require('events.js').EventEmitter;


/**
 * @module connectionManager
 * Singleton for socket connection of the client.
 * NB: the functions/methods below have been ordered as close as possible to the order in which they run.
 * Please try to stick to this order if you modify this file => this really helps understanding things!
 */
exports = module.exports = new EventEmitter();
exports.setMaxListeners(0);

var primus;

var isReconnect;
var wantConnection; // false when we disconnect voluntarily, give up attempts, or never tried yet

var online;
var voluntarilyClosed;

var messageSequence = [];
var messageSequenceIndex = 0; // store message sequence depth, so to know if we are in a subsequence or main sequence

// Messages are locked between the reception of a new map message and the creation of the map
// Locked messages are stacked and emitted, in the order they came in, when the new map has been created
var lockedMessages = [];
var areMessagesLocked = false;
exports.lockMessages = function () {
	areMessagesLocked = true;
};

function emitMessagesAsynchronously(messagesData) {
	if (messagesData.length === 0) {
		return;
	}

	var messageData = messagesData.shift();
	setTimeout(function emitLockedMessage() {
		emitMessagesAsynchronously(messagesData);
		exports.emit(messageData._messageType, messageData);
	}, 0);
}

exports.unlockMessages = function () {
	if (areMessagesLocked === false) {
		return;
	}

	areMessagesLocked = false;

	// Shallow copying list of messages in order to safely emit them asynchronously
	var lockedMessagesCopy = lockedMessages.slice();
	emitMessagesAsynchronously(lockedMessagesCopy);

	// Clearing message stack
	lockedMessages.length = 0;
};

exports.connect = function (url) {
	if (primus) {
		// destroy only emits "destroy" and nothing else
		primus.destroy();
		primus = null;

		return setTimeout(function () {
			exports.connect(url);
		}, 0);
	}

	// Number of times we attempt to reconnect.
	// Note that config is only received after our 1st connection so default value below is always used once.

	var Primus = window.Primus;
	var MAX_RECONNECTION_ATTEMPT = window.Config.maxReconnectionAttempt || 10;

	// reset state variables

	voluntarilyClosed = false;
	wantConnection = true;
	isReconnect = false;
	online = true;

	primus = new Primus(url, {
		// 'manual' means we need to call 'open()' to start our connection
		manual: true,
		// Reconnect strategy: disabled default 'online' because Primus would try even when we don't want to
		strategy: 'disconnect,timeout',
		reconnect: {
			max: 5000, // The maximum delay before we try to reconnect. (ms)
			min: 500,  // The minimum delay before we try reconnect. (ms)
			retries: MAX_RECONNECTION_ATTEMPT // How many times we should try to reconnect
		}
	});

	/**
	 * We emit 'open' each time we connect or reconnect.
	 *  NB: in case of reconnection, Primus sends 'open' then 'reconnected'; we only care for 'open'
	 */
	primus.on('open', function () {
		//console.info('primus:open', primus, 'isReco=', isReconnect, '| readyState:', primus.readyState, Date.now())
		if (primus !== this) { return console.warn('onOpen - Ignoring event: possible missing call to Primus#destroy'); }

		voluntarilyClosed = false;

		exports.emit('open', isReconnect);

		// next time "open" is emitted, we know it's a reconnect
		isReconnect = true;
	});

	primus.on('offline', function () {
		if (!online) { return; }
		//console.info('primus:offline');
		online = false;

		if (wantConnection) {
			exports.emit('offline');
		}
	});

	primus.on('online', function () {
		if (primus !== this) { return console.warn('onOnline - Ignoring event: possible missing call to Primus#destroy'); }
		if (online) { return; }
		//console.info('primus:online')
		online = true;

		// we try to reconnect only if we want the connection
		if (!wantConnection) { return; }

		exports.emit('online');

		// we don't try if an automatic reconnection is going to happen anyway
		if (primus.readyState !== Primus.CLOSED || primus.recovery.reconnecting()) { return; }

		//console.info('online: scheduling a reconnect in 500ms; readyState:', primus.readyState, Date.now())
		window.setTimeout(function () {
			if (primus.readyState === Primus.CLOSED && !primus.recovery.reconnecting()) {
				//console.info('primus:online calling primus.open() - readyState:',
				//	primus.readyState, 'reconnecting:', primus.recovery.reconnecting())
				primus.open();
			}
		}, 0);
	});

	/**
	 * Called when connection is ended. Primus may try to reconnect (see doc).
	 */
	primus.on('end', function () {
		//console.info('primus:end voluntary:', voluntarilyClosed, 'online:', online, 'wantCo:', wantConnection, this)
		// if offline Primus will retry when 'online' event comes
		if (!online) { return; }

		primus = null;

		// if voluntarily closed we are done

		if (!voluntarilyClosed) {
			// otherwise, we just lost our connection for good (we retried or cannot even retry)

			wantConnection = false;

			exports.disconnect('SOCKET_LOST');
		}
	});

	primus.on('reconnect scheduled', function (opts) {
		//console.info('primus:reconnect scheduled', opts, this)
		exports.emit('reconnecting', opts.attempt, url);
	});

	primus.on('data', function (data) {
		if (data._messageType === 'SequenceStartMessage') {
			messageSequenceIndex += 1;
		}

		if (messageSequenceIndex > 0) {
			messageSequence.push(data);

			if (data._messageType === 'SequenceEndMessage') {
				messageSequenceIndex -= 1;

				if (messageSequenceIndex <= 0) {
					var messageData = {
						_messageType: 'messageSequence',
						sequence: messageSequence
					};

					if (areMessagesLocked) {
						lockedMessages.push(messageData);
					} else {
						exports.emit('messageSequence', messageData);
					}

					messageSequence = [];
					messageSequenceIndex = 0;
				}
			}
		} else {
			exports.emit('data', data); // for messageLogger only
			if (areMessagesLocked) {
				lockedMessages.push(data);
			} else {
				exports.emit(data._messageType, data);
			}
		}
	});

	/**
	 * Happens in rare case. Primus (per doc) does not throw even if we don't listen.
	 *  Saw it when proxy is down and we try to connect.
	 */
	primus.on('error', function (err) {
		//console.error('primus:error', err);
		exports.emit('error', err);
	});

	primus.open();
};


/**
 * Closes our connection (event 'lost' will not be emitted)
 */
exports.close = function () {
	voluntarilyClosed = true;
	wantConnection = false;

	if (primus) {
		primus.destroy(); // Primus#end() is not enough here: we want the old instance to be really gone!
		primus = null;
	}
};


/**
 * @method module:connectionManager.disconnect
 *  @param {string} [reason] - if no reason given this is a voluntary close
 */
exports.disconnect = function (reason) {
	reason = reason || 'CLIENT_CLOSING';

	console.info('connectionManager.disconnect: reason=' + reason);

	// send "disconnecting" to the server and close primus
	// these are no-ops if primus is already gone, although close() does set some variables to make it clear
	// that this was voluntary and we're not looking to reconnect

	if (reason !== 'SOCKET_LOST' && primus) {
		exports.send('disconnecting', reason);
	}

	exports.close();

	exports.emit('disconnect', reason);
};


/**
 * Shortcut method to do a "sendMessage" call
 * @param {string} messageType
 * @param {Object} messageData
 */

exports.sendMessage = function (messageType, messageData) {
	exports.send('sendMessage', {
		type: messageType,
		data: messageData
	});
};


/**
 * Generic call from client to proxy.
 * @param {string} callName
 * @param {Object} data
 */
exports.send = function (callName, data) {
	if (!primus) {
		// do not log data because that can be the login and password data if the callname is "login"
		return console.warn('Client trying to send while primus is null for call: ' + callName);
	}

	var msg = {
		call: callName,
		data: data
	};

	primus.write(msg);
	exports.emit('send', { call: callName, data: msg });
	exports.emit('send:' + callName, msg);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/connectionManager.js
 ** module id = 49
 ** module chunks = 0
 **/