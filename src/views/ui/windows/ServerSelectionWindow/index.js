require('./styles.less');
var inherits = require('util').inherits;
var Button = require('Button');
var Window = require('Window');
var windowsManager = require('windowsManager');
var ServerBox = require('ServerSelectionWindow/ServerBox');
var getText = require('getText').getText;
var ServerStatusEnum = require('ServerStatusEnum');
var userPref = require('UserPreferences');

/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @class ServerSelectionWindow
 * @desc  Window for server creation
 */
function ServerSelectionWindow() {
	Window.call(this, {
		className: 'ServerSelectionWindow',
		title: getText('ui.sersel.choseServer'),
		positionInfo: {
			left: 'c',
			top: 'c',
			width: 700,
			height: 445
		},
		hidden: true
	});
	var self = this;

	var MAX_SERVERS_SHOW = 4;

	var selectedServerId = null;
	var serversRawData;
	var selectableServers;
	var selectedBox;
	var indexBase = 0;
	var serverBoxes = [];

	//TODO the combo box to select server order by name from the staticContent "Servers"

	this.closeButton.on('tap', function () {
		window.dofus.disconnect();
	});

	var content = this.windowBody;
	var arrowLeft = content.appendChild(new Button({ className: ['arrow', 'arrowLeft'] }, function () {
		if (indexBase <= 0) {
			return;
		}
		arrowLeft.disable();
		indexBase -= 1;
		updateServersList();
	}));
	arrowLeft.on('disabled', function () {
		this.addClassNames('disabled');
	});

	arrowLeft.on('enabled', function () {
		this.delClassNames('disabled');
	});

	var serverBoxesDiv = content.createChild('div', { className: 'serverBoxesDiv' });
	var arrowRight = content.appendChild(new Button({ className: ['arrow', 'arrowRight'] }, function () {
		if (indexBase >= selectableServers.length - MAX_SERVERS_SHOW) {
			return;
		}
		arrowRight.disable();
		indexBase += 1;
		updateServersList();
	}));
	arrowRight.on('disabled', function () {
		this.addClassNames('disabled');
	});

	arrowRight.on('enabled', function () {
		this.delClassNames('disabled');
	});

	function sortServers() {
		//TODO check after if it's correct for production
		selectableServers = serversRawData.filter(function (server) {
			return server.charactersCount > 0;
		});

		// sort server by last connexion
		selectableServers.sort(function (serverA, serverB) {
			if (serverA.isSelectable === serverB.isSelectable) {
				return serverB.date - serverA.date;
			}
			return !serverA.isSelectable;
		});
	}

	// serverBox can be passed as null for deselecting the current server box
	function selectServerBox(serverBox) {
		// deselect the previous box
		if (selectedBox) {
			selectedBox.delClassNames('selected');
		}
		selectedBox = serverBox;
		if (!serverBox) {
			return;
		}

		// select the new box
		serverBox.addClassNames('selected');
		selectedServerId = serverBox.data.id;

		// when we have a current box we can validate the server choice
		self.selectBtn.enable();
	}

	function updateServersList() {
		sortServers();

		selectServerBox(null);
		for (var i = 0; i < MAX_SERVERS_SHOW; i += 1) {
			var serverBox = serverBoxes[i];
			var server = selectableServers[i + indexBase];
			serverBox.setServer(server);

			if (server && server.id === selectedServerId && server.status === ServerStatusEnum.ONLINE) {
				selectServerBox(serverBox);
			}
		}

		if (indexBase <= 0) {
			arrowLeft.disable();
		} else {
			arrowLeft.enable();
		}
		if (indexBase >= selectableServers.length - MAX_SERVERS_SHOW) {
			arrowRight.disable();
		} else {
			arrowRight.enable();
		}
	}

	function createServerBox(server) {
		var serverBox = serverBoxesDiv.appendChild(new ServerBox(server));

		serverBox.on('tap', function () {
			selectServerBox(this);
		});

		serverBoxes.push(serverBox);
	}

	for (var i = 0; i < MAX_SERVERS_SHOW; i += 1) {
		createServerBox();
	}

	var selectBtn = content.appendChild(new Button({
		className: ['greenButton', 'selectServerBtn'],
		text: getText('ui.common.select')
	}, function () {
		selectBtn.disable();
		if (window.gui.serversData.connectedServerId === selectedServerId) {
			//if already connected to same server we simply ask again the list of characters
			window.dofus.sendMessage('CharactersListRequestMessage');
			windowsManager.close(self.id);
		} else {
			window.gui.serversData.selectServer(selectedServerId);
		}
	}));
	this.selectBtn = selectBtn;
	selectBtn.disable();

	var createCharacterDiv = content.createChild('div', { className: 'createCharacterDiv' });
	createCharacterDiv.appendChild(new Button({
		className: ['greenButton', 'createCharacterBtn'],
		text: getText('ui.charsel.createCharacter')
	}, function () {
		windowsManager.close(self.id);
		windowsManager.open('serverSimpleSelection');
	}));

	// on TrustStatusMessage close the window
	window.gui.on('TrustStatusMessage', function () {
		windowsManager.close(self.id);
	});

	this.on('open', function () {
		serversRawData = window.gui.serversData.serversRawData;

		sortServers();

		if (!selectedServerId) {
			selectedServerId = userPref.getValue('lastServerId');
		}

		indexBase = 0;
		arrowLeft.disable();
		if (selectableServers.length <= MAX_SERVERS_SHOW) {
			arrowRight.disable();
		}

		updateServersList();

		window.gui.on('serversUpdate', updateServersList);
	});

	this.on('close', function () {
		// remove the listener
		window.gui.removeListener('serversUpdate', updateServersList);
	});
}

inherits(ServerSelectionWindow, Window);
module.exports = ServerSelectionWindow;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/ServerSelectionWindow/index.js
 ** module id = 803
 ** module chunks = 0
 **/