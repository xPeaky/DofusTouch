var staticContent = require('staticContent');
var windowsManager = require('windowsManager');
var getText = require('getText').getText;
var login = require('login');
var ServerStatusEnum = require('ServerStatusEnum');
var ServerCompletionEnum = require('ServerCompletionEnum');
var ServerConnectionErrorEnum = require('ServerConnectionErrorEnum');
var assetPreloading = require('assetPreloading');
//

var TIMEOUT_ON_SELECT_SERVER = 60000; //in ms - if the server is slower than that we cannot play anyway!
var isAutoChosenAlreadyLogged = false;

// reference of the game server image we actually have
var imageReferenceServerIdMap = {
	// north virginia region
	401: true, // international game server grandapan
	402: true, // international game server pandore
	407: true, // es/pt game server brutas

	// ireland region
	403: true, // fr game server oshimo
	404: true, // fr game server terra cogita
	405: true, // fr game server herdegrize
	406: true, // international game server dodge
	408: true, // fr game server frakacia
	409: true // fr game server fallanster
};

/**
 * @summary Tells if we have the illustration of the game server
 * @param {number|string} id - game server id
 * @returns {boolean}
 */
function hasServerImage(id) {
	return !!imageReferenceServerIdMap[id];
}

/**
 * @class
 * @desc Gathers the info we receive from proxy about the servers.
 */
function ServersData() {
	this.serversRawData = [];
	this.serversWithMyCharacter = [];
	this.optionalFeatures = {};
	this.connectedServerId   = null; // ID of selected game server or null
	this.connectedServerData = null; // Selected game server data or null
	this.sessionConstants = {};
	this.settings = {};
}
module.exports = ServersData;

ServersData.serverConstants = {
	SERVER_CONST_TIME_BEFORE_DISCONNECTION: 1,
	SERVER_CONST_KOH_DURATION: 2,
	SERVER_CONST_KOH_WINNING_SCORE: 3,
	SERVER_CONST_MINIMAL_TIME_BEFORE_KOH: 4,
	SERVER_CONST_TIME_BEFORE_WEIGH_IN_KOH: 5
};

/** Game server selection. Should be called from all places we do it. */
ServersData.prototype.selectServer = function (serverId) {
	if (!serverId) {
		console.error(new Error('ServersData.selectServer: serverId is null'));
		this._onSelectedServerRefused({});
		return;
	}
	login.selectServer(serverId);
	this.connectedServerId = serverId;
	this.connectedServerData = this._findServerById(serverId);

	window.dofus.accessGameServer(serverId, function (error) {
		if (error) {
			return console.error('accessGameServer', error);
		}
	});

	// Set a timeout to make sure we receive a success or fail message from server (we do see timeouts sometimes)

	if (this.failTimeout) {
		console.warn('Clearing previous connection timeout from ServersData.selectServer');
		window.clearTimeout(this.failTimeout);
	}

	var self = this;

	this.failTimeout = window.setTimeout(function () {
		self._onSelectedServerRefused({
			serverId: serverId,
			serverStatus: ServerStatusEnum.STATUS_UNKNOWN,
			error: ServerConnectionErrorEnum.SERVER_CONNECTION_ERROR_NO_REASON
		});
	}, TIMEOUT_ON_SELECT_SERVER);

	// If success we quickly receive an AuthenticationTicketAcceptedMessage, otherwise see _onSelectedServerRefused
	window.gui.once('AuthenticationTicketAcceptedMessage', function () {
		window.clearTimeout(self.failTimeout);
		self.failTimeout = null;
	});
};

ServersData.prototype.showServerSelectionUi = function () {
	if (this.serversWithMyCharacter.length > 0) {
		// There are servers with at least one of my character
		windowsManager.open('serverSelection', this.serversWithMyCharacter);
	} else {
		// No servers in which we have a character -> open the server selection window
		windowsManager.open('serverSimpleSelection', this.serversRawData);
	}
};

ServersData.prototype._filterMyServersList = function () {
	// keep servers with at least one of my character
	this.serversWithMyCharacter = this.serversRawData.filter(function (server) {
		return server && server.charactersCount > 0;
	});
};

/** Mainly, installs the event listeners for servers data related messages
 *  @param {Gui} gui - the gui root object
 */
ServersData.prototype.initialize = function (gui) {
	var self = this;

	gui.on('disconnect', function (reason) {
		self.serversRawData = [];
		self.serversWithMyCharacter = [];
		self.optionalFeatures = {};
		//TODO rollback to null. We put 'disconnect' and the reason  to understand why KPI cannot be send (serverId is null)
		self.connectedServerId = 'disconnect' + reason;
		self.connectedServerData = null;
		self.sessionConstants = {};
		self.settings = {};
	});

	gui.on('ServerStatusUpdateMessage', function (msg) {
		if (!msg.server) {
			return console.warn('WARN: ServerStatusUpdateMessage message have no server information');
		}

		var updatedServer = msg.server;
		var newServer = true;

		// research in the serversList the server to update
		for (var i = 0, len = self.serversRawData.length; i < len; i += 1) {
			if (updatedServer.id === self.serversRawData[i].id) {
				self.serversRawData[i] = updatedServer;
				newServer = false;
				break;
			}
		}

		// in case of new server add it
		if (newServer) {
			self.serversRawData.push(updatedServer);
		}

		// update also myServers
		self._filterMyServersList();

		// emit an update to sync the windows
		gui.emit('serversUpdate', updatedServer);
	});

	gui.on('SelectedServerRefusedMessage', function (msg) {
		self._onSelectedServerRefused(msg);
	});

	gui.on('ServerOptionalFeaturesMessage', function (msg) {
		self.optionalFeatures = {};
		var features = window.gui.databases.OptionalFeatures;

		for (var i = 0, len = msg.features.length; i < len; i += 1) {
			var featureId = msg.features[i];
			self.optionalFeatures[features[featureId].keyword] = featureId;
		}
	});

	gui.on('ServerSessionConstantsMessage', function (msg) {
		self.sessionConstants = {};
		var variables = msg.variables;
		for (var i = 0, len = msg.variables.length; i < len; i += 1) {
			self.sessionConstants[variables[i].id] = variables[i].value;
		}
	});

	gui.on('ServerSettingsMessage', function (msg) {
		self.settings.serverCommunityId = msg.community;
		self.settings.serverLang = msg.lang;
		self.settings.serverGameType = msg.gameType;
	});

	gui.on('CharacterSelectedSuccessMessage', function () {
		// clear staticContent from the memory
		delete self.staticContent;
	});
};

/** Called by GUI when we get the server list */
ServersData.prototype.onServerList = function (msg) {
	//

	this.serversRawData = msg.servers;
	this._filterMyServersList();

	// then manage what need to be open

	var serversWithMyCharacter = this.serversWithMyCharacter;

	var connectMethod = login.connectMethod;
	var lastServerId = login.lastServerId;

	var isAutoSelectServer = (
		connectMethod === 'lastServer' || connectMethod === 'lastCharacter' || connectMethod === 'characterId'
	);
	if (lastServerId && isAutoSelectServer) {
		for (var i = 0, len = serversWithMyCharacter.length; i < len; i += 1) {
			var server = serversWithMyCharacter[i];
			if (lastServerId === server.id && server.status === ServerStatusEnum.ONLINE) {
				return this.selectServer(lastServerId);
			}
		}
	}

	// We need to show server selection UI
	this.showServerSelectionUi();
};



ServersData.prototype.isFeatureActive = function (featureName) {
	return this.optionalFeatures.hasOwnProperty(featureName);
};


/**
 * Get all data concerning the servers. If the game already sync it, the function just return and use the
 * previous cached data
 * @param {function} cb - callback
 * @return {function} cb
 */
ServersData.prototype.syncServerStaticData = function (cb) {
	var self = this;

	if (this.staticContent) {
		return cb();
	}

	this.staticContent = {};

	var DB = ['Servers', 'ServerGameTypes', 'ServerPopulations', 'ServerCommunities'];
	staticContent.getAllDataMap(DB, function (error, res) {
		if (error) {
			return cb(error);
		}

		self.staticContent.data = res.Servers;
		self.staticContent.gameTypes = res.ServerGameTypes;
		self.staticContent.populations = res.ServerPopulations;
		self.staticContent.communities = res.ServerCommunities;
		return cb();
	});
};


/**
 * Return an array of servers that may correspond to the player, concerning language/community
 * @param {function} cb - callback
 * @return {function} cb with the error and Array of available servers
 */
ServersData.prototype.getAutoChosenServers = function (cb) {
	var self = this;

	/**
	 * Get all ONLINE servers that have the lowest population
	 * @param {Array} myCommuServers - My list of servers corresponding to my community
	 * @return {Array} - Online with the lowest population servers list
	 */
	function getAllOnline(myCommuServers) {
		var lowestPopulation = -1;
		var availableServers = [];

		// get all ONLINE servers that have the lowest population
		for (var i = 0, len = myCommuServers.length; i < len; i += 1) {
			var commuServer = myCommuServers[i];

			var commuServerStaticData = commuServer.staticData.server;

			if (commuServer.status === ServerStatusEnum.ONLINE && lowestPopulation === -1) {
				lowestPopulation = commuServer.completion;
			}

			commuServerStaticData.nameId = commuServerStaticData.nameId || 'n/a';

			if (lowestPopulation !== -1 &&
				commuServerStaticData.populationId === lowestPopulation && commuServer.status === ServerStatusEnum.ONLINE) {
				//if (BuildInfos.BUILD_TYPE != BuildTypeEnum.RELEASE || data.name.indexOf('Test') == -1)
				if (commuServerStaticData.nameId.indexOf('Test') === -1) {
					availableServers.push(commuServer);
				}
			}

			//
		}
		return availableServers;
	}

	var serversRawData = this.serversRawData;
	var identificationSuccessMessage = window.gui.playerData.identification;
	var i, len;
	// search servers of the same community
	var userCommunity = identificationSuccessMessage.communityId;

	var myCommuServers = [], internationalServers = [], availableServers = [];

	return this.syncServerStaticData(function (error) {
		if (error) {
			return cb(error);
		}

		// go through all servers
		for (i = 0, len = serversRawData.length; i < len; i += 1) {
			var server = serversRawData[i];

			if (!server) {
				continue;
			}
			var serverStaticData = self.staticContent.data[server.id];
			if (!serverStaticData) {
				console.warn('WARN: server', server.id, 'has no staticContent');
				continue;
			}

			// keep some static data on it for after
			if (!server.staticData) {
				server.staticData = {};
			}
			server.staticData.server = serverStaticData;

			//TODO: that switch case need to go away once we have the correct communities in the static data
			// right now the login server is not sending us the correct number for the completion. If it is always 0
			switch (server.id) {
			case 401:
			case 406:
			case 407:
				// We want Grandapan (401) to have an average level
				// We want Dodge (406) to have an average level
				// We want Brutas (407) to have an average level
				server.completion = ServerCompletionEnum.COMPLETION_AVERAGE;
				serverStaticData.populationId = ServerCompletionEnum.COMPLETION_AVERAGE;
				break;

			// French region
			case 403:
				// We want Oshimo (403) to have an high level
				server.completion = ServerCompletionEnum.COMPLETION_HIGH;
				serverStaticData.populationId = ServerCompletionEnum.COMPLETION_HIGH;
				break;
			case 404:
				// We want Terra Cogita (404) to have an high level
				server.completion = ServerCompletionEnum.COMPLETION_HIGH;
				serverStaticData.populationId = ServerCompletionEnum.COMPLETION_HIGH;
				break;
			case 405:
				// We want Herdegrize (405) to have an high level
				server.completion = ServerCompletionEnum.COMPLETION_HIGH;
				serverStaticData.populationId = ServerCompletionEnum.COMPLETION_HIGH;
				break;
			case 409:
				// We want Fallanster (409) to have an average level
				server.completion = ServerCompletionEnum.COMPLETION_AVERAGE;
				serverStaticData.populationId = ServerCompletionEnum.COMPLETION_AVERAGE;
				break;
			}

			var serverCommunity = serverStaticData.communityId;

			if (userCommunity === serverCommunity) {
				myCommuServers.push(server);
			} else {
				// special case from the ankama code 'fusion of the English-speaking community'
				if ((userCommunity === 1 || userCommunity === 2) && (serverCommunity === 1 || serverCommunity === 2)) {
					myCommuServers.push(server);
				}

				// special case 'fusion of the Spanish-speaking and Portugal-speaking communities'
				if ((userCommunity === 4 || userCommunity === 6) && (serverCommunity === 4 || serverCommunity === 6)) {
					myCommuServers.push(server);
				}

				// keep international server
				if (serverCommunity === 2) {
					internationalServers.push(server);
				}
			}
		}

		// if no server, adding the international servers
		if (myCommuServers.length === 0) {
			myCommuServers = myCommuServers.concat(internationalServers);
		}

		// Sort by lowest to highest population
		myCommuServers.sort(function (serverA, serverB) {
			return serverA.completion - serverB.completion;
		});


		if (myCommuServers.length === 0) {
			return cb('My community servers is empty, for userCommunity ' + userCommunity);
		}

		availableServers = getAllOnline(myCommuServers);

		// take one randomly
		if (availableServers.length === 0) {
			return cb('Available servers is empty, for userCommunity ' + userCommunity);
		}

		return cb(null, availableServers);
	});
};


/**
 * Open the details window of one chosen server
 */
ServersData.prototype.pickUpOneServerForMe = function () {
	this.getAutoChosenServers(function (err, servers) {
		if (err) {
			window.gui.openSimplePopup(getText('tablet.server.noServersForYourCommunity'));
			if (!isAutoChosenAlreadyLogged) {
				console.error('pickUpOneServerForMe:', err);
				isAutoChosenAlreadyLogged = true;
			}
			return;
		}

		// pick up one randomly
		var chosenServer = servers[Math.floor(Math.random() * servers.length)];

		if (chosenServer) {
			windowsManager.open('serverDetails', chosenServer);
		}
	});
};

ServersData.prototype._findServerById = function (id) {
	for (var i = 0; i < this.serversRawData.length; i++) {
		if (id === this.serversRawData[i].id) {
			return this.serversRawData[i];
		}
	}
	return null;
};

/** Returns the raw data of all selectable (online) servers */
ServersData.prototype.getSelectableServerList = function () {
	var selectableServers = [];
	for (var i = 0; i < this.serversRawData.length; i++) {
		var server = this.serversRawData[i];
		if (server.status === ServerStatusEnum.ONLINE && server.isSelectable) {
			selectableServers.push(server);
		}
	}
	return selectableServers;
};

/** Returns the list of selectable (online) servers names */
ServersData.prototype.getSelectableServerNames = function () {
	var selectableServers = this.getSelectableServerList();
	if (selectableServers.length === 0) {
		return getText('ui.common.none').toLowerCase();
	}
	var servList = selectableServers[0]._name;
	for (var i = 1; i < selectableServers.length; i++) {
		servList += ', ' + selectableServers[i]._name;
	}
	return servList;
};

ServersData.prototype._onSelectedServerRefused = function (msg) {
	if (this.failTimeout) { window.clearTimeout(this.failTimeout); }

	var serverData = this._findServerById(msg.serverId);
	if (serverData) { // when serverId is invalid we get no server data
		serverData.status = msg.serverStatus; //TODO emit event so various UI can show this update
	}

	var error;
	switch (msg.error) {
	case ServerConnectionErrorEnum.SERVER_CONNECTION_ERROR_DUE_TO_STATUS:
		error = 'Status';
		switch (msg.serverStatus) {
			case ServerStatusEnum.OFFLINE:
				error += 'Offline';
				break;
			case ServerStatusEnum.STARTING:
				error += 'Starting';
				break;
			case ServerStatusEnum.NOJOIN:
				error += 'Nojoin';
				break;
			case ServerStatusEnum.SAVING:
				error += 'Saving';
				break;
			case ServerStatusEnum.STOPING:
				error += 'Stoping';
				break;
			case ServerStatusEnum.FULL:
				error += 'Full';
				break;
			default: //also covers ServerStatusEnum.STATUS_UNKNOWN
				error += 'Unknown';
		}
		break;
	case ServerConnectionErrorEnum.SERVER_CONNECTION_ERROR_ACCOUNT_RESTRICTED:
		error = 'AccountRestricted';
		break;
	case ServerConnectionErrorEnum.SERVER_CONNECTION_ERROR_COMMUNITY_RESTRICTED:
		error = 'CommunityRestricted';
		break;
	case ServerConnectionErrorEnum.SERVER_CONNECTION_ERROR_LOCATION_RESTRICTED:
		error = 'LocationRestricted';
		break;
	case ServerConnectionErrorEnum.SERVER_CONNECTION_ERROR_SUBSCRIBERS_ONLY:
		error = 'SubscribersOnly';
		break;
	case ServerConnectionErrorEnum.SERVER_CONNECTION_ERROR_REGULAR_PLAYERS_ONLY:
		error = 'RegularPlayersOnly';
		break;
	default: //also covers ServerConnectionErrorEnum.SERVER_CONNECTION_ERROR_NO_REASON
		error = 'NoReason';
	}

	var text;
	switch (error) {
	case 'AccountRestricted':
		text = getText('ui.server.cantChoose.serverForbidden');
		break;
	case 'CommunityRestricted':
		text = getText('ui.server.cantChoose.communityRestricted');
		break;
	case 'LocationRestricted':
		text = getText('ui.server.cantChoose.locationRestricted');
		break;
	case 'SubscribersOnly':
		text = getText('ui.server.cantChoose.communityNonSubscriberRestricted');
		break;
	case 'RegularPlayersOnly':
		text = getText('ui.server.cantChoose.regularPlayerRestricted');
		break;
	case 'StatusOffline':
		text = getText('ui.server.cantChoose.serverDown');
		break;
	case 'StatusStarting':
		text = getText('ui.server.cantChoose.serverDown');
		break;
	case 'StatusNojoin':
		text = getText('ui.server.cantChoose.serverForbidden');
		break;
	case 'StatusSaving':
		text = getText('ui.server.cantChoose.serverSaving');
		break;
	case 'StatusStoping':
		text = getText('ui.server.cantChoose.serverDown');
		break;
	case 'StatusFull':
		text = getText('ui.server.cantChoose.serverFull') + '\n\n' +
			getText('ui.server.serversAccessibles', this.getSelectableServerNames());
		break;
	case 'NoReason':
	case 'StatusUnknown':
		text = getText('ui.popup.connectionFailed.text');
		break;
	}

	this.showServerSelectionUi();
	window.gui.openSimplePopup(text);
};

/** Retrieves the image for a server
 *  @param {int} serverId - ID of the server
 *  @param {function} cb - cb(error, serverImageUrl) */
ServersData.getServerImage = function (serverId, cb) {
	// default server image is loaded in case server has no image
	var images = ['gfx/illus/illu_0.png'];

	if (hasServerImage(serverId)) {
		images.push('gfx/illus/illu_' + serverId + '.png');
	}

	assetPreloading.preloadImages(images, function (urls) {
		var placeholderImage = urls[0];
		var serverImage = urls[1];

		if (!serverImage || serverImage === 'none') {
			return cb(null, placeholderImage);
		}
		return cb(null, serverImage);
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/ServersData/index.js
 ** module id = 479
 ** module chunks = 0
 **/