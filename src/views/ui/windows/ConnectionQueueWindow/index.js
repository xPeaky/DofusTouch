require('./styles.less');
var Button = require('Button').DofusButton;
var getText = require('getText').getText;
var inherits = require('util').inherits;
var login = require('login');
var Window = require('Window');
var windowsManager = require('windowsManager');


function ConnectionQueueWindow() {
	Window.call(this, {
		className: 'connectionQueueWindow',
		positionInfo: { left: 'c', top: 'c', width: 600, height: 200 },
		noCloseButton: true
	});

	this.once('open', this._createContent);

	this._setupEventListeners();
}
inherits(ConnectionQueueWindow, Window);
module.exports = ConnectionQueueWindow;


ConnectionQueueWindow.prototype._setupEventListeners = function () {
	var self = this;

	window.dofus.connectionManager.on('LoginQueueStatusMessage', function (msg) {
		self._queueStatusUpdate('login', msg.position, msg.total);
	});

	window.dofus.connectionManager.on('QueueStatusMessage', function (msg) {
		self._queueStatusUpdate('game', msg.position, msg.total);
	});
};

// Returns null if we are not connected to a game server yet
function getGameServerData() {
	var serversData = window.gui.serversData;
	if (!serversData) { return null; }
	return serversData.connectedServerData; // could be null too
}

ConnectionQueueWindow.prototype._createContent = function () {
	this.windowTitle.setText(getText('ui.queue.wait'));

	var box = this.windowBody.createChild('div', { className: 'messageBox' });
	this.message = box.createChild('div', { className: 'message' });

	var buttonContainer = this.windowBody.createChild('div', { className: 'buttonContainer' });

	var button = buttonContainer.appendChild(new Button(getText('ui.queue.back')));
	var self = this;
	button.on('tap', function () {
		if (!getGameServerData()) {
			return window.dofus.disconnect();
		}
		login.goBackToSelectionOf('server');
		windowsManager.close(self.id);
	});
};

ConnectionQueueWindow.prototype._queueStatusUpdate = function (queue, rank, total) {
	// if no waiting queue OR we are done waiting (server always sends a final message with rank = 0)
	if (rank === 0) {
		return windowsManager.close(this.id);
	}

	windowsManager.open(this.id); // before setText because content is created for the 1st show

	var msg = getText('ui.queue.number', rank, total);

	var gameServer = getGameServerData();
	if (gameServer) {
		msg += '\n\n' + getText('ui.queue.server', gameServer._name);
	}

	this.message.setText(msg);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/ConnectionQueueWindow/index.js
 ** module id = 1005
 ** module chunks = 0
 **/