require('./styles.less');
var inherits = require('util').inherits;
var login = require('login');
var Window = require('Window');
var WuiDom = require('wuidom');
var windowsManager = require('windowsManager');
var Button = require('Button').DofusButton;
var getText = require('getText').getText;
var assetPreloading = require('assetPreloading');


function HardcoreDeathWindow() {
	Window.call(this, {
		className: 'HardcoreDeathWindow',
		positionInfo: { left: 'c', top: 'c', width: 500, height: 365 }
	});
	var self = this;
	this.once('open', function () {
		self._createDom();
	});
}
inherits(HardcoreDeathWindow, Window);
module.exports = HardcoreDeathWindow;

HardcoreDeathWindow.prototype._createDom = function () {
	var self = this;
	var message = this.windowBody.createChild('div', { className: 'message' });
	var characterIllu = new WuiDom('div', { className: 'characterIllu' });
	this.insertAsFirstChild(characterIllu);
	assetPreloading.preloadImage('gfx/illusUi/Heroique_tx_GameOver.png', function (url) {
		characterIllu.setStyle('backgroundImage', url);
	});

	var buttonContainer = this.windowBody.createChild('div', { className: 'buttonContainer' });
	var buttonAccept = buttonContainer.appendChild(new Button(getText('ui.common.yes')));
	buttonAccept.on('tap', function () {
		windowsManager.close(self.id);
		login.goBackToSelectionOf('character');
	});
	this.windowTitle.setText(getText('ui.common.gameover'));
	message.setHtml(getText('ui.gameuicore.hardcoreDeath'));
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/HardcoreDeathWindow/index.js
 ** module id = 953
 ** module chunks = 0
 **/