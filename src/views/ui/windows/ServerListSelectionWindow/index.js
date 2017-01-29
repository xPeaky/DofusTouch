require('./styles.less');
var inherit = require('util').inherits;
var Window = require('Window');
var wuiButton = require('tapBehavior');
var ServerRow = require('ServerListSelectionWindow/ServerRow');
var ServerDetails = require('ServerDetails');
var Button = require('Button').DofusButton;
var getText = require('getText').getText;
var windowsManager = require('windowsManager');
var InputBox = require('InputBox');

/**
 * @class ServerSimpleSelectionWindow
 * @desc  Window for auto select a server
 */
function ServerListSelectionWindow() {
	Window.call(this, {
		className: 'ServerListSelectionWindow',
		title: getText('ui.sersel.choseServer'),
		positionInfo: { left: 'c', top: 'c', width: 700, height: 510 },
		hidden: true
	});
	var self = this,

		serversRawData,
		searchedFriend,
		previouslySelectedServer = null,
		availableServers,
		availableServersIds = [],

		friendFilter,
		allServersFilter,
		myServersFilter,

		serverRows = [],

		SEARCH_ERROR = {
			0: getText('ui.sersel.searchError.unknown'),
			1: getText('ui.sersel.searchError.unavailable'),
			2: getText('ui.sersel.searchError.no_result'),
			3: getText('ui.sersel.searchError.flood')
		},

		content = this.windowBody;

	/**
	 * Create generic button
	 * @param {WuiDom} parent - parent to create child
	 * @param {Array} classNames
	 * @param {function} fn - function to execute on tap
	 */
	function createButton(parent, classNames, fn) {
		var btn = parent.createChild('div', { className: classNames });
		wuiButton(btn);
		btn.on('tap', fn);
		return btn;
	}

	var findFriendDiv = content.createChild('div', { className: 'findFriendDiv' });
	findFriendDiv.createChild('div', { className: 'findFriendLabel', text: getText('ui.sersel.findFriend') + ': ' });
	var inputFriend = findFriendDiv.appendChild(new InputBox({
		className: 'inputFriend',
		attr: { type: 'text', id: 'inputFriend' }
	}));

	// ok button
	createButton(findFriendDiv, ['okBtn', 'btn'], function () {
		if (inputFriend.rootElement.value) {
			searchedFriend = inputFriend.rootElement.value;
			window.dofus.sendMessage('AcquaintanceSearchMessage', { nickname: searchedFriend });
		}
	});

	// clear button
	createButton(findFriendDiv, ['clearBtn', 'btn'], function () {
		inputFriend.rootElement.value = '';
		friendFilter = null;
		updateList();
	});

	/**
	 * Clear selected server
	 */
	function clearServerSelection() {
		if (previouslySelectedServer) {
			previouslySelectedServer.delClassNames('selected');
			previouslySelectedServer = null;
		}
		// hide server details
		serverDetails.hide();

		confirmBtn.disable();
	}

	/**
	 * Main function to update the list of the servers
	 */
	function updateList() {
		clearServerSelection();

		var servers = serversRawData;

		if (myServersFilter) {
			servers = servers.filter(function (server) {
				return server.charactersCount > 0;
			});
		}
		if (!allServersFilter) {
			servers = servers.filter(function (server) {
				return availableServersIds.indexOf(server.id) !== -1;
			});
		}

		if (friendFilter) {
			servers = servers.filter(function (server) {
				return friendFilter.indexOf(server.id) !== -1;
			});
		}

		window.gui.serversData.syncServerStaticData(function (error) {
			if (error) {
				return console.error('ServerRow getServerStaticData error', error);
			}
			var staticContent = window.gui.serversData.staticContent;

			// sort server by population
			servers.sort(function (serverA, serverB) {
				var serverAPopulationId = staticContent.data[serverA.id].populationId;
				var serverBPopulationId = staticContent.data[serverB.id].populationId;
				var serverAWeight = staticContent.populations[serverAPopulationId].weight;
				var serverBWeight = staticContent.populations[serverBPopulationId].weight;
				var populationDiff = serverAWeight - serverBWeight;
				if (populationDiff !== 0) {
					return populationDiff;
				}
				return serverB.id - serverA.id;
			});

			for (var i = 0, len = Math.max(servers.length, serverRows.length); i < len; i += 1) {
				var server = servers[i];

				var serverRow = serverRows[i];
				if (server) {
					if (serverRow) {
						serverRow.setServer(server);
						serverRow.show();
					} else {
						createServerLine(server, serverRows.length % 2);
					}
				} else if (serverRow) {
					serverRow.hide();
				}
			}
			// if we have 1 server at least, select it
			if (!previouslySelectedServer  && servers[0]) {
				serverRows[0].emit('tap');
			}
		});
	}

	var middleDiv = content.createChild('div', { className: 'middleDiv' });

	var leftFrame = middleDiv.createChild('div', { className: 'leftFrame' });
	var serverList = leftFrame.createChild('div', { className: 'serverList' });
	var table = serverList.createChild('div', { className: 'div-table' });

	var listTitle = table.createChild('div', { className: ['listHead', 'listRow', 'odd'] });
	listTitle.createChild('div', { className: ['listHeadBox', 'empty'] });
	listTitle.createChild('div', { className: ['listHeadBox', 'name'], text: getText('ui.common.name') });
	listTitle.createChild('div', { className: ['listHeadBox', 'population'], text: getText('ui.sersel.population') });
	listTitle.createChild('div', { className: ['listHeadBox', 'status'], text: getText('ui.sersel.state') });

	/**
	 * Create a server line in the list using the component ServerRow and set up the button
	 * @param {Object} server - server data from ServerList message
	 * @param {Boolean} odd - manage the color of the background
	 */
	function createServerLine(server, odd) {
		var serverRow = table.appendChild(new ServerRow(server, odd));
		serverRows.push(serverRow);

		serverRow.on('tap', function () {
			if (previouslySelectedServer) {
				previouslySelectedServer.delClassNames('selected');
			}
			serverRow.addClassNames('selected');
			previouslySelectedServer = serverRow;

			serverDetails.setServer(serverRow.data);
			serverDetails.show();

			// enable confirm button if the server is online
			if (serverRow.data.status === 3) {
				confirmBtn.enable();
			} else {
				confirmBtn.disable();
			}
		});
	}

	// right frame

	var rightFrame = middleDiv.createChild('div', { className: 'rightFrame' });
	rightFrame.createChild('div', { className: 'title', text: getText('ui.sersel.suggestedServer') + ':' });
	var serverDetails = rightFrame.appendChild(new ServerDetails());

	// filter buttons

	function toggleAllServersFilter() {
		if (allServersFilter) {
			allServersFilter = false;
			allServersBtn.delClassNames('selected');
		} else {
			allServersFilter = true;
			allServersBtn.addClassNames('selected');
		}
	}

	function toggleMyServersFilter() {
		if (myServersFilter) {
			myServersFilter = false;
			myServersBtn.delClassNames('selected');
		} else {
			myServersFilter = true;
			myServersBtn.addClassNames('selected');
		}
	}

	var filtersBtn = leftFrame.createChild('div', { className: 'filtersBtn' });

	var allServersBtn = createButton(filtersBtn, 'allServersBtn', function () {
		toggleAllServersFilter();
		updateList();
	});

	var myServersBtn = createButton(filtersBtn, 'myServersBtn', function () {
		toggleMyServersFilter();
		updateList();
	});


	// buttons

	var topBtnDiv = content.createChild('div', { className: 'topBtnDiv' });
	var confirmBtn = topBtnDiv.appendChild(new Button(getText('ui.common.validation'), { className: 'confirmBtn' }));
	confirmBtn.on('tap', function () {
		if (previouslySelectedServer) {
			window.gui.serversData.selectServer(previouslySelectedServer.data.id);
		}
	});

	var bottomLeftBtnDiv = content.createChild('div', { className: 'bottomLeftBtnDiv' });
	var returnBtn = bottomLeftBtnDiv.appendChild(new Button(getText('ui.common.back'), { className: 'returnBtn' }));
	returnBtn.on('tap', function () {
		windowsManager.close(self.id);
	});

	var bottomRightBtnDiv = content.createChild('div', { className: 'bottomRightBtnDiv' });
	var autoChooseBtn = bottomRightBtnDiv.appendChild(
		new Button(getText('ui.sersel.autochoice'), { className: 'autochooseBtn' })
	);
	autoChooseBtn.on('tap', function () {
		window.gui.serversData.pickUpOneServerForMe();
	});

	this.on('open', function () {
		serversRawData = window.gui.serversData.serversRawData;

		clearServerSelection();

		window.gui.serversData.getAutoChosenServers(function (err, servers) {
			if (err) {
				// NOT RETURN, if there are nothing just continue;
				console.warn(err);
			}
			availableServers = servers || [];
			allServersFilter = false;
			allServersBtn.delClassNames('selected');
			myServersFilter = false;
			myServersBtn.delClassNames('selected');

			availableServersIds = [];
			for (var i = 0, len = availableServers.length; i < len; i += 1) {
				availableServersIds.push(availableServers[i].id);
			}

			updateList();

			window.gui.on('serversUpdate', updateList);
		});
	});

	this.on('close', function () {
		// remove the listener
		window.gui.removeListener('serversUpdate', updateList);
	});

	// listeners

	window.gui.on('AcquaintanceSearchErrorMessage', function (msg) {
		var reason = msg.reason;
		if (reason) {
			// use replace because it's not possible to put my replace directly in my object SEARCH_ERROR
			window.gui.openPopup({
				title: getText('ui.common.error'),
				message: SEARCH_ERROR[reason].replace('%1', searchedFriend)
			});
		}
	});

	window.gui.on('AcquaintanceServerListMessage', function (msg) {
		friendFilter = msg.servers;
		updateList();
	});

	// on TrustStatusMessage close the window
	window.gui.on('TrustStatusMessage', function () {
		windowsManager.close(self.id);
	});
}

inherit(ServerListSelectionWindow, Window);
module.exports = ServerListSelectionWindow;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/ServerListSelectionWindow/index.js
 ** module id = 799
 ** module chunks = 0
 **/