/**
 * @exports analytics/ankAnalytics
 */
var eventIdMap = require('./eventIdMap.js');
var models = require('./models.js');
var eventServerUrls = require('./eventServerUrls.js');
var request = require('./http-request.js');
var dateFormat = require('dateformat');

var logger;
/* event structure sample
{
	"game_id": 11,
	"event_id": 259,
	"session_id": 18906,
	"date": "2015-08-12 11:07:20",
	"data": {
		"level": 32,
		"soft_currency_balance": 26103,
		"hard_currency_balance": 4319,
		"elo_score": 630,
		"relative_soft_currency_gained": 0,
		"relative_hard_currency_gained": 0,
		"relative_xp_gained": 0,
		"event_duration": 0,
		"item_name": "ItemRotoTank_3",
		"territory_id": "6",
		"territory_tile_id": "4",
		"player_id": "525"
	}
}
*/
var alreadyTriggered = false;

var IS_ANALOG = false;
var IS_DEBUG = false;
var USE_URL = false;

var GAME_ID = 18; // From Johan-André Jeanville: our game id is 18
var SESSION_ID = null;
var initialised = false;

function getEventId(eventName) {
	var id = eventIdMap[eventName];
	if (id === undefined) {
		logger.error('ankAnalytics.getEventId: ' + eventName + ' is missing from the event map');
		return -1;
	}
	return id;
}

// just for development mode and activated in the config
function checkModel(eventName, data) {
	var modelParams = models[eventName];
	if (!modelParams) {
		console.error('ankAnalytics checkModel: ' + eventName + ' is missing from the models');
		return;
	}
	var dataKeys = Object.keys(data);
	var missingParams = [];
	for (var i = 0, len = modelParams.length; i < len; i += 1) {
		var modelParam = modelParams[i];
		// the event model is based on the dofus one these params will be ignored for now
		// 'relative_soft_currency_gained', 'relative_hard_currency_gained' and 'time_spent_on_action'
		if (modelParam === 'relative_soft_currency_gained' || modelParam === 'relative_hard_currency_gained' ||
			modelParam === 'time_spent_on_action') {
			continue;
		}
		if (dataKeys.indexOf(modelParam) === -1) {
			missingParams.push(modelParam);
		}
	}
	if (missingParams.length) {
		console.error('ankAnalytics checkModel: missing params on event', eventName, missingParams);
	}
}

/**
 * @param {Object} [config] - if config is not here the module will not be activated
 * @param {boolean} [config.analog] - means don't send the log but console.log it
 * @param {boolean} [config.useUrlMap] - means send the log to the url inside `eventServerUrls`
 * @param {boolean} [config.IS_DEBUG] - should be use just on developmentMode because it is low. debug mode will check
 *     the models structure and tell you if you are missing params from the tags plan
 */
exports.init = function init(config) {
	logger = window.dofus.logger;
	if (!config) {
		return;
	}

	// to activate the model check
	if (config.debug) {
		IS_DEBUG = true;
	}

	if (config.analog) {
		IS_ANALOG = true;
		initialised = true;
	} else if (config.useUrlMap) {
		USE_URL = true;
		initialised = true;
	} else {
		initialised = false;
	}
};

/**
 * @param {number} sessionId - sessionId from haapi (default is 0)
 */
exports.register = function register(sessionId) {
	if (!initialised) {
		return;
	}
	SESSION_ID = sessionId || 0;
};

exports.unregister = function () {
	SESSION_ID = null;
};

/**
 * @param {string} eventName - Name of the event to log
 * @param {Object} [data] - 1 deep layer of data
 */
exports.send = function send(eventName, data) {
	if (!initialised) {
		return;
	}
	data = data || {};

	var eventId = getEventId(eventName);

	if (window.developmentMode && IS_DEBUG) {
		checkModel(eventName, data);
	}

	//jscs:disable requireCamelCaseOrUpperCaseIdentifiers
	var log = {
		game_id: GAME_ID,
		event_id: eventId,
		session_id: SESSION_ID,
		// The format is YYYY-MM-DD HH:MM:SS GMT (confirmed by Johan-André Jeanville)
		date: dateFormat(data.date || Date.now(), 'UTC:yyyy-mm-dd HH:MM:ss') + ' GMT',
		data: data
	};
	//jscs:enable requireCamelCaseOrUpperCaseIdentifiers

	if (IS_ANALOG) {
		logger.info('ankAnalytics.send: ' + eventName, JSON.stringify(log));
	} else if (USE_URL) {
		var serverId = window.gui.serversData.connectedServerId;
		var eventServerURL = eventServerUrls[serverId];

		if (!eventServerURL) {
			if (!alreadyTriggered) {
				alreadyTriggered = true;
				console.error('ankAnalytics send: eventServerURL is missing for server ' + serverId);
			}
			return;
		}
		request(eventServerURL, log, function (error) {
			if (error) {
				return logger.error('ankAnalytics.send:', error);
			}
		});
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/analytics/ankAnalytics.js
 ** module id = 170
 ** module chunks = 0
 **/