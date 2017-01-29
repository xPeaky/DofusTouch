require('./styles.less');
var inherit = require('util').inherits;
var ServerDetails = require('ServerDetails');
var Window = require('Window');
var windowsManager = require('windowsManager');
var Button = require('Button').DofusButton;
var getText = require('getText').getText;

/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @class ServerDetailsWindow
 * @desc  Window for server details
 */
function ServerDetailsWindow() {
	Window.call(this, {
		className: 'ServerDetailsWindow',
		title: getText('ui.sersel.suggestedServer'),
		positionInfo: { left: 'c', top: 'c', width: 350, height: 350 },
		hidden: true
	});
	var self = this;
	var content = this.windowBody;
	var server;

	var serverDetails = content.appendChild(new ServerDetails());

	var buttonsDiv = content.createChild('div', { className: 'buttonsDiv' });
	var okBtn = buttonsDiv.appendChild(new Button(getText('ui.common.ok'), { className: 'okBtn' }));
	var cancelBtn = buttonsDiv.appendChild(new Button(getText('ui.common.cancel'), { className: 'cancelBtn' }));

	okBtn.on('tap', function () {
		if (!server) {
			return console.error('No server');
		}
		window.gui.serversData.selectServer(server.id);
		windowsManager.close(self.id);
	});
	cancelBtn.on('tap', function () {
		windowsManager.close(self.id);
	});


	this.on('open', function (serverData) {
		server = serverData;
		serverDetails.setServer(server);

		if (server.status === 3) {
			okBtn.enable();
		} else {
			okBtn.disable();
		}
	});
}

inherit(ServerDetailsWindow, Window);
module.exports = ServerDetailsWindow;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/ServerDetailsWindow/index.js
 ** module id = 795
 ** module chunks = 0
 **/