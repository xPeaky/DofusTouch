var EventEmitter = require('events').EventEmitter;
var getText = require('getText').getText;
var inherits = require('util').inherits;


/**
 * How often we should ping the server so it does not consider us "gone" (and kicks us...).
 * Actually, the time observed was 25 minutes before a kick, but this must be from server's config.
 */
var SERVER_INACTIVITY_DELAY = 10 * 60000; // (10 mins)

/** How long the player can be inactive before we call him "idle" */
var INACTIVITY_DELAY = 5 * 60000; // (5 mins)

var AUTO_DISCONNECT_DELAY = 10 * 60000; // (10 mins) after this total inactivity we will auto-disconnect

var ACTIVITY_CHECK_FREQ = 2 * 60000; // (2 mins) how often we check if player is active

// We use this ONE_SECOND so that it does not matter if INACTIVITY_DELAY % ACTIVITY_CHECK_FREQ is 0
var ONE_SECOND = 1000;


/**
 * @class Monitors activity - hence inactivity - of the player.
 * This allows us to send a "ping" from time to time to the server to avoid being disconnected.
 * Especially, this is needed when user actions are not triggering messages to be sent, for example
 * while the player creates a new character, etc.
 * See InactivityManager in Flash code.
 *
 * Sequence of events with Flash client before a kick during game: (time in minutes)
 * t0: arrival into game = last player activity (this simplifies our reasoning below to start at login).
 * t0+10: ping to server; if last activity is not same as login time this could be between 0-10 minutes,
 *        depending where t0 was during 10 min server period.
 * t0+20: warning box on the client; at same time "t1" a request for status change is sent to server.
 * t0+40: external notification outside client.
 * t0+45: kicked out; note this is at t1+25.
 */
function InactivityMonitor() {
	EventEmitter.call(this);

	this.isListening = false;
	this.isConnected = false;

	this.pingInterval = null;
	this.activityInterval = null;

	this.isInactive = false;
	this.hasSeenActivity = false; //...since last check for server ping
	this.lastActivityTime = null;
}

inherits(InactivityMonitor, EventEmitter);
module.exports = new InactivityMonitor();


InactivityMonitor.prototype.initialize = function (gui) {
	var self = this;
	var connectionManager = window.dofus.connectionManager;

	connectionManager.on('ServersListMessage', function () {
		self._start();
	});

	gui.on('connected', function () {
		self.isConnected = true;
	});

	gui.on('disconnect', function () {
		self.isConnected = false;
		self._stop();
	});

	gui.on('appOnBackground', function () {
		self._stop();
	});

	// if the client manage to reconnect the session after disconnection or wake up the app from background
	connectionManager.on('sessionReconnected', function () {
		if (!self.isListening) {
			self._start();
		}
	});
};

InactivityMonitor.prototype._start = function () {
	if (this.isListening) { return; }
	this.isListening = true;

	this.activityInterval = window.setInterval(function (self) { self._checkActivity(); }, ACTIVITY_CHECK_FREQ, this);
	this.pingInterval = window.setInterval(function (self) { self._pingServer(); }, SERVER_INACTIVITY_DELAY, this);

	this.isInactive = false;
	this.hasSeenActivity = false;
	this.lastActivityTime = Date.now();
};

InactivityMonitor.prototype._stop = function () {
	if (!this.isListening) { return; }
	this.isListening = false;

	window.clearInterval(this.activityInterval);
	window.clearInterval(this.pingInterval);
};

InactivityMonitor.prototype.recordActivity = function () {
	this.hasSeenActivity = true;
	this.lastActivityTime = Date.now();

	if (this.isInactive && this.isListening) {
		this._leaveInactiveMode();
	}
};

/**
 * @param {number} dateInMs - a date in ms, like the ones you get from Date.now()
 * @return {boolean} true if we saw user activity since given date
 */
InactivityMonitor.prototype.isActiveSince = function (dateInMs) {
	return this.lastActivityTime >= dateInMs;
};

InactivityMonitor.prototype._checkActivity = function () {
	var howLongSinceLastActivity = Date.now() - this.lastActivityTime + ONE_SECOND;

	if (howLongSinceLastActivity < INACTIVITY_DELAY) {
		return; // we are still active
	}

	if (!this.isInactive) {
		// we become "idle"
		this._enterInactiveMode();
	} else {
		// we were already inactive; see if we should disconnect (saves player batteries)
		if (howLongSinceLastActivity >= AUTO_DISCONNECT_DELAY) {
			window.dofus.disconnect('INACTIVITY');
		}
	}
};

// Ping server if we saw activity since the last call
InactivityMonitor.prototype._pingServer = function () {
	if (!this.hasSeenActivity) {
		return; // we have not seen activity so we don't ping the server now
	}
	this.hasSeenActivity = false;

	window.dofus.sendMessage('BasicPingMessage', { quiet: true });
};

InactivityMonitor.prototype._enterInactiveMode = function () {
	// We are now officially inactive (idle)
	this.isInactive = true;

	// Only emit event if we are "connected" (GUI elements are not to be notified otherwise)
	// See also comment in StatusIndicator which listens to this event
	if (this.isConnected) { this.emit('inactive', true); }

	// NB: still OK if player did not close previous popup since it does not "stack" when message is same
	window.gui.openSimplePopup(getText('ui.common.inactivityWarning'), getText('ui.popup.warning'));
};

InactivityMonitor.prototype._leaveInactiveMode = function () {
	this.isInactive = false;

	if (this.isConnected) {
		this.emit('inactive', false); // StatusIndicator will send a message so no need to ping
	} else {
		this._pingServer();
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/inactivityMonitor/index.js
 ** module id = 34
 ** module chunks = 0
 **/