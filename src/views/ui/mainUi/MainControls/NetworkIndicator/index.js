require('./styles.less');
var inherits = require('util').inherits;
var WuiDom = require('wuidom');


// Limits used to decide when server lag is "orange" (slow) and "red" (bad)
var SERVER_LAG_BAD = 1500;
var SERVER_LAG_SLOW = 800; // anything under "slow" is "good"


function NetworkIndicator() {
	WuiDom.call(this, 'div');

	this._currentServerLag(0); // initializes to green conditions

	var self = this;
	window.gui.on('checkServerLag', function (eventName, action) {
		self.checkServerLag(eventName, action);
	});
}
inherits(NetworkIndicator, WuiDom);
module.exports = NetworkIndicator;


NetworkIndicator.prototype._currentServerLag = function (delay) {
	if (delay > SERVER_LAG_BAD) {
		this.setClassNames(['networkIndicator', 'bad']);
		console.debug('Current server lag is bad:', delay);
	} else if (delay > SERVER_LAG_SLOW) {
		this.setClassNames(['networkIndicator', 'slow']);
	} else {
		this.setClassNames(['networkIndicator', 'good']);
	}
};

NetworkIndicator.prototype.checkServerLag = function (eventName, action) {
	if (action === 'start') {
		this.serverLagEventName = eventName;
		this.serverLagStart = Date.now();
	} else if (action === 'stop') {
		if (this.serverLagEventName !== eventName) { return; } // can't say much when wrong event comes

		this._currentServerLag(Date.now() - this.serverLagStart);
		this.serverLagEventName = null; // done with this event
	} else {
		console.warn('Invalid action emitted to checkServerLag', eventName, ':', action);
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/mainUi/MainControls/NetworkIndicator/index.js
 ** module id = 498
 ** module chunks = 0
 **/