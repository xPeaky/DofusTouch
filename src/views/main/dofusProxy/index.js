/* global _PROXY_ADDRESS_ */
var async = require('async');
var scriptLoader = require('scriptLoader');
var EventEmitter = require('events.js').EventEmitter;
var clientLogger = require('./clientLogger/index.js');
var connectionManager = require('./connectionManager.js');
var userPref = require('UserPreferences');
var staticContent = require('staticContent');
var gt = require('getText');
var login = require('login');
require('./protocols.js');
var tutorial = require('./tutorial.js');
var assetHandler = require('assetHandler');
var audioManager = require('audioManager');
var powerManager = require('powerManager');
var createEventWrapper = require('event-wrapper');
var analytics = require('analytics');
var adjust = require('adjust');
var querystring = require('querystring');
var deviceInfo = require('deviceInfo');

if (window.developmentMode) {
	require('./messageLogger.js');
}

var STICKY_NAME = 'STICKER';
var VERSION = window.appInfo && window.appInfo.version;

exports = module.exports = new EventEmitter();

exports.logger = clientLogger;
exports.connectionManager = connectionManager;
exports.sessionId = null;

var gameServers = [];

function makeSticky(url) {
	if (!window.Config.sessionId) {
		console.warn('Cannot make URL sticky (no session ID has been set):', url);
		return url;
	}

	var seperator = url.indexOf('?') === -1 ? '?' : '&';

	return url + seperator + STICKY_NAME + '=' + encodeURIComponent(window.Config.sessionId);
}


function getLoginServerUrl() {
	var appInfo = window.appInfo || {};

	if (appInfo.server) {
		return appInfo.server;
	}
	//replaced by webpack
	return _PROXY_ADDRESS_;
}


function getGameServer(id) {
	for (var i = 0; i < gameServers.length; i += 1) {
		var server = gameServers[i];
		if (server.id === id) {
			return server;
		}
	}
}


/**
 * Updates the language on an existing Config object, and does nothing if no Config exists yet
 */
exports.setLanguage = function (language, cb) {
	if (!window.Config || (language && window.Config.language === language)) {
		return cb();
	}

	var url = getLoginServerUrl() + '/getLanguage.json?lang=' + language;

	scriptLoader.loadJson(url, function (error, res) {
		if (error) {
			return cb(error);
		}

		window.Config.language = res.language;

		cb();
	});
};


function loadConfig(language, cb) {
	var appVersion = window.appInfo && window.appInfo.version || '';
	var data = {
		appVersion: appVersion
	};
	if (language) {
		data.lang = language;
	}
	querystring.stringify(data);
	var url = getLoginServerUrl() + '/config.json?' + querystring.stringify(data);


	scriptLoader.loadJson(url, function (err, config) {
		if (err) {
			return cb(err);
		}

		// TODO: test with 'use-credentials' instead of "undefined"
		// with a CORS-enabled asset server (right now Test is not enabled)
		// TODO: imgCrossOrigin is poor naming, as it may be CORS, but we really care whether
		// TODO: or not it's CORS with basic auth or not.

		config.imgCrossOrigin = config.assetsUrl.match(/^https?:\/\/.+?:.+?@.+?/) ? undefined : 'anonymous';

		cb(null, config);
	});
}


/**
 * Things we need before we can connect. E.g. know the proxy URI, have the config & Primus code, etc.
 */
function setup(language, cb) {
	async.auto({
		primus: function (cb) {
			if (window.Primus) {
				return cb();
			}

			scriptLoader.loadScript(getLoginServerUrl() + '/primus/primus.js', cb);
		},
		config: function (cb) {
			if (window.Config) {
				if (language) {
					return exports.setLanguage(language, cb);
				}
				return cb();
			}

			loadConfig(language, function (error, config) {
				if (error) {
					return cb(error);
				}

				window.Config = config;
				cb();
			});
		},
		syncSetup: ['config', function (cb) {
			// configure logger
			clientLogger.setup(window.Config);

			// configure static content library
			staticContent.initialize(window.Config);

			cb();
		}],
		getText: ['syncSetup', function (cb) {
			// depends on staticContent.initialize()
			gt.initialize(window.Config, cb);
		}]
	}, cb);
}


function startAudioSystem() {
	audioManager.setupChannels(userPref.getValue('soundPreferences', {}, true));
	audioManager.playLoopSound('music', '20000', 0.8);
}

function stopAudioSystem() {
	audioManager.stopAllLoopSounds();
	audioManager.release();
}


exports.start = function () {
	// starts the application

	window.gui.initialize();

	var language = userPref.getValue('lang');

	//TODO: Should write better reload system
	function reload() {
		window.gui.splashScreen.show();
		return window.setTimeout(function () {
			window.gui.splashScreen.hide();
			exports.start();
		}, 60000);
	}

	setup(language, function (error) {
		if (error) {
			console.error(error);

			// show "offline" login screen but schedule a retry...
			// TODO: show an offline screen with multi-language
			if (navigator.notification) {
				navigator.notification.alert(
					'Server busy.', // message
					reload,         // callback
					'Dofus Touch',  // title
					'Reload'        // buttonName
				);
			} else {
				/* eslint-disable no-alert */
				window.alert('Server busy.');
				/* eslint-enable no-alert */
				reload();
			}
			return;
		}

		// all is good: we connected and got config
		analytics.init(window.Config.analytics);
		adjust.initialize(window.Config.adjust);
		login.backToLogin();

		window.gui.initialize(window.Config);
		if (window.isoEngine) {
			window.isoEngine.initialize({ config: window.Config });
		}
	});
};


var STATE_DISCONNECTED = 0;
var STATE_LOGGING_IN = 1;
var STATE_LOGGED_IN = 2;
var STATE_ACCESSING_GAME = 3;
var STATE_IN_GAME = 4;

var state = STATE_DISCONNECTED;
var queuedServerId;   // the serverId we're currently trying to connect to


function createSessionInfo(server) {
	var data = {
		language: window.Config ? window.Config.language : 'en',
		server: server
		// TODO: we may want different behavior during fights
		// TODO: if so, uncomment the following and implement server logic
		// inFight: window.gui && window.gui.playerData && window.gui.playerData.isFighting ? true : false
	};
	if (server === 'login') {
		data.client = deviceInfo.os;
	}
	return data;
}


var auth = {
	username: null,
	token: null,
	salt: null,
	key: null
};


exports.setCredentials = function (account, token) {
	userPref.setValue('token', token);

	auth.username = account;
	auth.token = token;
	auth.salt = null;
	auth.key = null;
	// login will also check the cordova build version
	auth.version = VERSION;
};

/**
 * Called "login" for the outside world. Starts actually the whole process of getting a connection
 * and all other steps until we are allowed to access a game server
 */
exports.login = function (cb) {
	if (state === STATE_LOGGED_IN) {
		console.warn('Already logged in');
		return cb();
	}

	if (state === STATE_LOGGING_IN) {
		console.warn('Already logging in');
		return exports.once('loginEnd', cb);
	}

	if (state === STATE_IN_GAME) {
		connectionManager.disconnect('SWITCHING_TO_LOGIN');
	}

	state = STATE_LOGGING_IN;
	auth.salt = null;
	auth.key = null;

	var wrap = createEventWrapper(connectionManager, function (error) {
		if (error) {
			this.disconnect('LOGIN_ERROR');
			state = STATE_DISCONNECTED;
			exports.emit('loginEnd', error);
		} else {
			state = STATE_LOGGED_IN;
			exports.emit('loginEnd');
		}

		cb(error);
	});

	//TODO: do something sexier here on guest nickname cancel there is popup error
	wrap('disconnect', function () {
		throw new Error('Disconnect during login');
	});

	wrap('open', function () {
		this.send('connecting', createSessionInfo('login'));
	});

	wrap('serverDisconnecting', function (error) {
		wrap.done(error);
	});

	wrap('ProtocolRequired', function (msg) {
		console.log('[Login server protocol] requiredVersion:', msg.requiredVersion, 'currentVersion:', msg.currentVersion);
	});

	wrap('HelloConnectMessage', function (msg) {
		auth.salt = msg.salt;
		auth.key = msg.key;

		var self = this;

		assetHandler.getVersions(function (error, versions) {
			if (error) {
				return wrap.done(error);
			}

			self.send('checkAssetsVersion', versions);
		});
	});

	wrap('assetsVersionChecked', function (instructions) {
		var self = this;

		assetHandler.upgradeAssets(instructions, function (error) {
			if (error) {
				return wrap.done(error);
			}

			self.send('login', auth);
		});
	});

	wrap(
		'IdentificationSuccessMessage',
		'IdentificationSuccessWithLoginTokenMessage',
		function (msg) {
			var loginName = window.gui.playerData.loginName;
			if (!loginName) {
				console.error('dofus.login: loginName is empty');
			} else if (/^\[GUEST]/.test(loginName)) {
				var guestAccount = userPref.getValue('guestAccount', {}, true);
				guestAccount.nickname = msg.nickname;
			}
			userPref.setAccount(msg.nickname);
			userPref.setValue('token', msg.loginToken);

			startAudioSystem();
			powerManager.start();
			if (msg.wasAlreadyConnected) {
				exports.emit('wasAlreadyConnected');
			}
		}
	);

	wrap(
		'IdentificationFailedMessage',
		'IdentificationFailedForBadVersionMessage',
		'IdentificationFailedBannedMessage',
		function (msg) {
			wrap.done(msg);
		}
	);

	wrap('ServersListMessage', function (msg) {
		gameServers = msg.servers;

		wrap.done();
	});

	// start the sequence:

	connectionManager.connect(makeSticky(getLoginServerUrl()));
};


exports.accessGameServer = function (serverId, cb) {
	if (state === STATE_LOGGING_IN) {
		return exports.once('loginEnd', function (error) {
			if (error) {
				return cb(error);
			}

			exports.accessGameServer(serverId, cb);
		});
	}

	if (state === STATE_ACCESSING_GAME) {
		if (serverId === queuedServerId) {
			console.warn('Already accessing this game server (' + serverId + ')');
			return exports.once('accessGameEnd', cb);
		}

		return cb(
			new Error('Already accessing game server ' + queuedServerId + ' (while trying to access ' + serverId + ')')
		);
	}

	queuedServerId = serverId;

	if (state !== STATE_LOGGED_IN) {
		return exports.login(function (error) {
			if (error) {
				return cb(error);
			}

			exports.accessGameServer(serverId, cb);
		});
	}

	var server = getGameServer(serverId);
	var ticket, address, port;

	if (!server) {
		return cb(new Error('Unknown server: ' + serverId));
	}

	state = STATE_ACCESSING_GAME;

	var wrap = createEventWrapper(connectionManager, function (error) {
		if (error) {
			this.disconnect('GAME_HANDSHAKE_ERROR');
			state = STATE_DISCONNECTED;
			exports.emit('accessGameEnd', error);
		} else {
			state = STATE_IN_GAME;
			exports.emit('accessGameEnd');
		}

		queuedServerId = null;
		cb(error);
	});

	wrap('SelectedServerDataMessage', function (msg) {
		ticket = msg.ticket;
		address = msg.address;
		port = msg.port;

		this.disconnect('SWITCHING_TO_GAME');

		this.connect(makeSticky(msg._access));
	});

	wrap('SelectedServerRefusedMessage', function (msg) {
		throw new Error('Server ' + serverId + ' not accessible: ' + msg.error);
	});

	wrap('open', function () {
		this.send('connecting', createSessionInfo({
			address: address,
			port: port,
			id: serverId
		}));
	});

	wrap('serverDisconnecting', function (error) {
		wrap.done(error);
	});

	wrap('ProtocolRequired', function (msg) {
		console.log('[Game server protocol] requiredVersion:', msg.requiredVersion, 'currentVersion:', msg.currentVersion);
	});

	wrap('HelloGameMessage', function () {
		this.sendMessage('AuthenticationTicketMessage', {
			ticket: ticket,
			lang: window.Config.language
		});
	});

	wrap('AuthenticationTicketAcceptedMessage', function () {
		wrap.done();
	});

	wrap('AuthenticationTicketRefusedMessage', function () {
		throw new Error('Server ' + serverId + ' Authentication failed');
	});

	// start the sequence:

	connectionManager.sendMessage('ServerSelectionMessage', { serverId: serverId });
};


connectionManager.on('HelloConnectMessage', function () {
	window.gui.connectionSplashScreen.onStateChange('CONNECTED');
});


connectionManager.on('offline', function () {
	window.gui.connectionSplashScreen.onStateChange('UNSTABLE');
});

connectionManager.on('reconnecting', function (attemptNumber, url) {
	console.info('Reconnecting to ' + url + ' (attempt #' + attemptNumber + ')');

	window.gui.connectionSplashScreen.onStateChange('RECONNECTING', attemptNumber);
});

connectionManager.on('open', function (isReconnect) {
	if (isReconnect) {
		// the following "reconnecting" message should trigger an event from the proxy that is either:
		// "sessionReconnected" or "sessionTimedOut"

		connectionManager.send('reconnecting');
	}
});

connectionManager.on('sessionReconnected', function () {
	// message type "sessionReconnected" sent by the server
	// this is a response to "connecting" if the session was already known on the server (ie: a reconnect)
	// Leave splashscreen until refresh all what is visible on the map (character positions, interactives, etc.)

	// TODO: rename onQuickReconnection to an actual verb (this dofus singleton is its only caller)

	return window.isoEngine.onQuickReconnection(function () {
		window.gui.connectionSplashScreen.onStateChange('CONNECTED');
	});
});

connectionManager.on('sessionTimedOut', function () {
	console.info('Session timed out');
	connectionManager.disconnect('SESSION_TIMED_OUT');
});


// Event received when the proxy server closed our socket
// => only 1 behavior for the client: error popup, back to login screen (no retry)

connectionManager.on('serverDisconnecting', function (msg) {
	console.info('Server disconnecting, reason:', msg.reason);
	connectionManager.disconnect('SOCKET_LOST');
});


/** Here is what we do when we are sure we will not "retry" anymore to reconnect "quickly".
 *  Basically we shut down the UI and everything we can. */

connectionManager.on('disconnect', function (reason) {
	state = STATE_DISCONNECTED;

	if (reason.match(/^SWITCHING_/)) {
		// When switching between login and game proxies we don't need to shut down subsystems,
		// because we expect a connection to another proxy in the very near future.
		return;
	}

	stopAudioSystem();
	powerManager.stop();
	window.gui.disconnect(reason);
	window.isoEngine.disconnect();
	window.gui.connectionSplashScreen.onStateChange(reason === 'RELOAD' ? 'RELOADING' : 'DISCONNECTED');
});


/** Called when other views are ready */

exports.toggleTutorialListeners = function (shouldAdd) {
	if (shouldAdd) {
		tutorial.setTutorialListeners(connectionManager);
	} else {
		tutorial.removeTutorialListeners(connectionManager);
	}
};


// proxy functions to the connectionManager

exports.send = function (callName, data) {
	connectionManager.send(callName, data);
};

exports.sendMessage = function (messageType, messageData) {
	connectionManager.sendMessage(messageType, messageData);
};

exports.disconnect = function (reason) {
	connectionManager.disconnect(reason);
};


/**
 * On browser this makes sure we disconnect before connecting again.
 * This avoids a warning from Dofus game and maybe other troubles when reconnecting on same account.
 * If one day we need more actions to be done we could keep an array of callbacks.
 * NB: this has to be synchronous.
 */
window.addEventListener('beforeunload', function () {
	connectionManager.disconnect('RELOAD');
});



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/index.js
 ** module id = 11
 ** module chunks = 0
 **/