require('./styles.less');
var inherits = require('util').inherits;
var Wallet = require('Wallet');
var Window = require('Window');

var WINDOW_WIDTH = 300; //px
var WINDOW_HEIGHT = 62; //px


function WalletWindow() {
	Window.call(this, {
		className: 'WalletWindow',
		positionInfo: { left: 0, top: 0, width: WINDOW_WIDTH, height: WINDOW_HEIGHT },
		noCloseButton: true,
		noTitle: true
	});

	this.wallet = null;

	this.on('open', this._onOpen);
}
inherits(WalletWindow, Window);
module.exports = WalletWindow;


WalletWindow.height = WINDOW_HEIGHT;
WalletWindow.width = WINDOW_WIDTH;


WalletWindow.prototype._onOpen = function () {
	if (!this.wallet) {
		this.wallet = this.windowBody.appendChild(new Wallet({ className: 'small' }));
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/WalletWindow/index.js
 ** module id = 829
 ** module chunks = 0
 **/