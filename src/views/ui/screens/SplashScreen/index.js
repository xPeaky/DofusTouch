require('./styles.less');
var inherits = require('util').inherits;
var WuiDom  = require('wuidom');


function SplashScreen() {
	WuiDom.call(this, 'div', { className: 'splashScreen', hidden: true });

	this.once('show', SplashScreen.prototype._createContent);

	var self = this;
	window.gui.on('connected', function () { self.hide(); });
}
inherits(SplashScreen, WuiDom);
module.exports = SplashScreen;


SplashScreen.prototype._createContent = function () {
	this.log = this.createChild('div', { className: 'logBox' });
	this.createChild('div', { className: 'dofusLogo' });
	this.createChild('div', { className: ['spinner', 'splashSpinner'] });
};

SplashScreen.prototype.showMessage = function (msg) {
	this.log.setText(msg);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/screens/SplashScreen/index.js
 ** module id = 998
 ** module chunks = 0
 **/