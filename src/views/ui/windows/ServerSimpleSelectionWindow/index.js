require('./styles.less');
var inherits = require('util').inherits;
var Window = require('Window');
var windowsManager = require('windowsManager');
var Button = require('Button').DofusButton;
var getText = require('getText').getText;
var assetPreloading = require('assetPreloading');

/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @class ServerSimpleSelectionWindow
 * @desc  Window for auto select a server
 */
function ServerSimpleSelectionWindow() {
	Window.call(this, {
		className: 'ServerSimpleSelectionWindow',
		title: getText('ui.sersel.choseServer'),
		positionInfo: { left: 'c', top: 'c', width: 700, height: 400 },
		hidden: true
	});

	this.once('open', ServerSimpleSelectionWindow.prototype._createContent);
}
inherits(ServerSimpleSelectionWindow, Window);
module.exports = ServerSimpleSelectionWindow;

ServerSimpleSelectionWindow.prototype._createContent = function () {
	var self = this;
	var content = this.windowBody;

	var bg = content.createChild('div', { className: 'bg' });
	assetPreloading.preloadImage('gfx/illusUi/simpleServerChoiceIllu.png', function (imageUrl) {
		bg.setStyle('backgroundImage', imageUrl);
	});

	var autoSelectBtn = content.appendChild(
		new Button(getText('ui.sersel.autoChoice'), { className: 'autoSelectServerBtn' })
	);
	autoSelectBtn.on('tap', function () {
		window.gui.serversData.pickUpOneServerForMe();
	});

	var manualCreationDiv = content.createChild('div', { className: 'manualCreationDiv' });
	var manualCreationBtn = manualCreationDiv.appendChild(
		new Button(getText('ui.sersel.manualChoice'), { className: 'manualCreationBtn' })
	);
	manualCreationBtn.on('tap', function () {
		windowsManager.open('serverListSelection');
	});

	// if closed by the user we go back to server selection
	this.on('close', function (params) {
		if (!params || !params.validated) {
			windowsManager.open('serverSelection');
		}
	});

	// on TrustStatusMessage close the window
	window.gui.on('TrustStatusMessage', function () {
		windowsManager.close(self.id, { validated: true });
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/ServerSimpleSelectionWindow/index.js
 ** module id = 807
 ** module chunks = 0
 **/