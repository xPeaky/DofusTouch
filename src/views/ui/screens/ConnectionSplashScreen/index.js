require('./styles.less');
var getText = require('getText').getText;
var inherits = require('util').inherits;
var WuiDom  = require('wuidom');


// After the delay below, the lock screen is removed; if internet is not back and the player taps
// "on the ground" asking for another move, the lock screen will show again for a new period.
// User can insted choose to use the menu and "disconnect".
// Various things to consider to set this delay: if internet is really lost, player can do nothing in the game.
// ...but if we put the lock screen because of a bug, 15 seconds is already a looong time.
var MAX_TIME_WITH_LOCK_SCREEN = 15000;


function ConnectionSplashScreen() {
	WuiDom.call(this, 'div', { className: 'connectionSplashScreen', hidden: true });
	this.autoRemoveTimeout = null;

	this.once('show', this._createContent);
}
inherits(ConnectionSplashScreen, WuiDom);
module.exports = ConnectionSplashScreen;

ConnectionSplashScreen.prototype._createContent = function () {
	this.createChild('div', { className: 'lockingDiv' });
	var messageBox = this.createChild('div', { className: 'splashScreenMsg' });
	this.message = messageBox.createChild('div', { className: 'message' });
	this.createChild('div', { className: ['spinner', 'splashSpinner'] });
};

ConnectionSplashScreen.prototype.onStateChange = function (state, attemptNum) {
	if (state !== 'UNSTABLE') {
		this.autoRemoveTimeout = window.clearTimeout(this.autoRemoveTimeout);
	}

	switch (state) {
	case 'UNSTABLE':
		this.show();
		this.message.setText(getText('tablet.connect.lost'));

		if (this.autoRemoveTimeout) { return; }
		var self = this;
		this.autoRemoveTimeout = window.setTimeout(function () {
			self.autoRemoveTimeout = null;
			self.hide();
		}, MAX_TIME_WITH_LOCK_SCREEN);
		break;
	case 'RECONNECTING':
		this.show();
		this.message.setText(getText('tablet.connect.retrying', attemptNum));
		break;
	case 'RELOADING':
		this.show();
		this.message.setText(getText('tablet.connect.reloading'));
		break;
	case 'CONNECTED':
	case 'DISCONNECTED':
		this.hide();
		break;
	default:
		console.error('ConnectionSplashScreen#onStateChange: invalid state: ' + state);
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/screens/ConnectionSplashScreen/index.js
 ** module id = 977
 ** module chunks = 0
 **/