var EventEmitter = require('events.js').EventEmitter;
var serializeArguments = require('./serialize.js');
var windowsManager = require('windowsManager');

var logLevels = {};

var clientCfg;

var logger = new EventEmitter();
var console = window.console;

var STACK_LIMIT_ENTRIES = 10;

// Make default console object if non-existent

if (!console) {
	console = {
		log: function () {},
		info: function () {},
		debug: function () {},
		warn: function () {},
		error: function () {}
	};
}

// Channel dictionary

var consoleLogChannels = {
	log:   'verbose',
	debug: 'debug',
	info:  'info',
	warn:  'warning',
	error: 'error'
};

var consoleLogStyle = {
	verbose: 'color: #AAA',
	debug: 'color: #0AA;',
	info: 'color: #00A; font-weight: bold;',
	notice:  'color: #0A0;',
	warning:  'color: #F55;',
	error: 'color: #A00;',
	critical: 'color: #A00; font-weight: bold;',
	alert: 'color: #A00; font-weight: bold; text-decoration: underline;',
	emergency: 'background-color: #A00; font-weight: bold;'
};

// Make safe copies of console log methods

Object.keys(consoleLogChannels).forEach(function (methodName) {
	if (typeof console[methodName] === 'function') {
		// Default for all recent browsers
		console['_' + methodName] = console[methodName];
	} else if (typeof console[methodName] === 'object') {
		// Exist as object in IE9, rebinding to use it as function
		console['_' + methodName] = Function.prototype.bind.call(console[methodName], console);
	}
});

function setChannelFunction(channelName) {
	if (logger[channelName]) {
		// already set
		return;
	}

	logger[channelName] = function log() {
		logger.emit(channelName, arguments);
	};
}

function getCharacterInfo() {
	var output = {};
	if (!window.gui.playerData) {
		return output;
	}
	var playerData = window.gui.playerData;
	var identification = playerData.identification || {};
	var characterBaseInfo = playerData.characterBaseInformations || {};
	var position = playerData.position || {};
	var fightManager = window.gui.fightManager || {};
	var appInfo = window.appInfo;

	var cordovaBuildVersion = appInfo && appInfo.version;

	output.nickname = identification.nickname;
	output.accountId = identification.accountId;

	// character information

	output.charaName = characterBaseInfo.name;
	output.charaId = characterBaseInfo.id;
	output.breed = characterBaseInfo.breed;
	output.level = characterBaseInfo.level;

	// map information

	output.mapId = position.mapId;

	// UI information

	output.openWindows = windowsManager.getOpenWindows();
	// last closed window (mostly for async problems)
	output.lastClosedWindow = windowsManager.getLastClosedWindow();

	// fight manager

	output.fightState = fightManager.fightState;

	// cordova build version

	output.cordovaBuildVersion = cordovaBuildVersion;

	return output;
}

// Writer classes
// --------------

// Console

function ConsoleWriter() {
}

ConsoleWriter.prototype.addChannel = function (channelName) {
	var slice = Array.prototype.slice;
	var prefix = '%c[' + channelName + ']';
	var color = 'background-color: transparent;';
	var logLevel = logLevels[channelName] || 0;
	var fn;

	if (consoleLogStyle[channelName]) {
		color = consoleLogStyle[channelName];
	}

	if (logLevel > logLevels.warning) {
		fn = console._error;
	}

	if (!fn && logLevel >= logLevels.warning) {
		fn = console._warn;
	}

	if (!fn && console._info && logLevel >= logLevels.info) {
		fn = console._info;
	}

	if (!fn && console._debug && logLevel >= logLevels.debug) {
		fn = console._debug;
	}

	if (!fn) {
		fn = console._log;
	}

	logger.on(channelName, function writeToConsole(args) {
		var logs = slice.call(args);
		var pre = prefix;

		if (console.group && logger.groups) {
			console.group(pre, color);
			fn.apply(console, logs);
			console.groupEnd();
			return;
		}

		if (typeof logs[0] === 'string') {
			pre = pre + ' ' + logs.shift();
		}
		args = [pre, color].concat(logs);
		fn.apply(console, args);
	});
};


// Server

function ServerWriter() {
}

ServerWriter.prototype.addChannel = function (channelName) {
	// calculate browser info

	var nav = window.navigator || {};

	var clientInfo = {
		userAgent:    nav.userAgent || 'unknown',
		clientConfig: clientCfg
	};

	logger.on(channelName, function (args) {
		var report = serializeArguments(args);

		if (!report.data) {
			report.data = {};
		}

		// limit the stack to a limited number of entries
		if (Array.isArray(report.data.error) && report.data.error.length > STACK_LIMIT_ENTRIES) {
			report.data.error.length = STACK_LIMIT_ENTRIES;
		}

		// add character info
		clientInfo.characterInfo = getCharacterInfo();
		report.data.clientInfo = clientInfo;
		var url = (window.Config && window.Config.dataUrl) || '';

		//TODO: if cannot stringify?

		var headers = {};
		headers.Accept = 'application/json';
		headers['Content-Type'] = 'application/json';
		window.fetch(url + '/logger', {
			method:  'post',
			headers: headers,
			body:    JSON.stringify({
				channelName: channelName,
				message:     report.message,
				data:        report.data,
				report:      report
			})
		});
	});
};

var writerClasses = {
	console: ConsoleWriter,
	server:  ServerWriter
};

var writers = {};

function getOrCreateWriter(writerType) {
	var writer = writers[writerType];

	if (writer) {
		return writer;
	}

	var WriterClass = writerClasses[writerType];

	if (!WriterClass) {
		console.error('Unknown writer type:', writerType);
		return;
	}

	writer = new WriterClass();

	writers[writerType] = writer;

	return writer;
}

function setupChannels(config) {
	var allChannelNames = Object.keys(logLevels);

	for (var i = 0, len = allChannelNames.length; i < len; i++) {
		var channelName = allChannelNames[i];

		// make sure events are emitted for this channel

		setChannelFunction(channelName);

		// if there are any writers that care about this channel, make them listen for it

		for (var writerType in config) {
			var writerChannels = config[writerType];
			var writer = getOrCreateWriter(writerType);

			if (writer && writerChannels.indexOf(channelName) !== -1) {
				writer.addChannel(channelName);
			}
		}
	}
}

var skippingKeyFromClientConfig = {
	logging: true,
	haapi: true,
	adjust: true,
	analytics: true,
	serverLanguages: true
};

function createClientConfig(cfg) {
	if (clientCfg) {
		return;
	}
	clientCfg = {};
	for (var key in cfg) {
		if (cfg.hasOwnProperty(key)) {
			// skip some useless client config information
			if (skippingKeyFromClientConfig[key]) {
				continue;
			}
			clientCfg[key] = cfg[key];
		}
	}
}

logger.setup = function (cfg) {
	cfg = cfg || {};
	var logging = cfg.logging || {};

	createClientConfig(cfg);

	logLevels = logging.logLevels || {};

	logger.groups = logging.groups;

	setupChannels(logging.config);

	if (!logging.disableOverride) {
		logger.overrideConsole();
		logger.logUncaughtExceptions('error', false);
	}
};

logger.overrideConsole = function () {
	Object.keys(consoleLogChannels).forEach(function (methodName) {
		var channelName = consoleLogChannels[methodName];
		console[methodName] = function readFromConsole() {
			logger.emit(channelName, arguments);
		};
	});
};

logger.logUncaughtExceptions = function (channelName, continueErrorFlow) {
	// be aware: not all browsers implement column and error

	var ErrorEvent = window.ErrorEvent;

	if (window.onerror) {
		logger.debug('window.onerror was already assigned, overwriting.');
	}

	window.onerror = function (message, url, lineno, colno, error) {
		// The ErrorEvent object gives us the most information but not all browsers support it.
		// Extract it from the first argument, or from the window object if possible.

		if (ErrorEvent && message instanceof ErrorEvent) {
			// ErrorEvent as first argument

			logger.emit(channelName, [message, error]);
		} else if (ErrorEvent && window.event instanceof ErrorEvent) {
			// ErrorEvent on window.event

			logger.emit(channelName, [window.event, error]);
		} else {
			// There is no ErrorEvent object, so we create something similar
			// note: colno is not passed by older browsers

			var args = [
				{
					message: message,
					url:     url,
					lineno:  lineno,
					colno:   colno
				}
			];

			// modern browsers will add the thrown error object as the 5th argument

			if (error) {
				args.push(error);
			}

			logger.emit(channelName, args);
		}

		if (!continueErrorFlow) {
			// this doesn't work when using addEventListener instead of direct assignment to onerror

			return true;
		}
	};
};

module.exports = logger;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/clientLogger/index.js
 ** module id = 17
 ** module chunks = 0
 **/