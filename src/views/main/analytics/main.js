/**
 * @exports analytics/main
 */
var wizAnalytics = require('wizanalytics');
var ankAnalytics = require('./ankAnalytics');
var enrichment = require('./enrichment.js');

var stack = [];
var isRegister = false;

function stackEvent(name, data, options) {
	if (stack.length > 50) {
		console.error('The stackEvent exceed 50 events, the stack is trash');
		stack = [];
	}
	stack.push({
		name: name,
		data: data,
		options: options
	});
}

function sendTheStack() {
	while (stack.length) {
		var event = stack.shift();
		exports.log(event.name, event.data, event.options);
	}
}

/**
 * @param {Object} analyticConfig
 * @param {Object} [analyticConfig.wizAnalytics] - the config for localytics
 * @param {Object} [analyticConfig.ankAnalytics] - the config to send localytics to Ankama
 */
exports.init = function (analyticConfig) {
	analyticConfig = analyticConfig || {};
	var wizAnalyticConfig = analyticConfig.wizAnalytics;

	// initialize wizAnalytics
	for (var api in wizAnalyticConfig) {
		var apiConfig = wizAnalyticConfig[api];
		wizAnalytics.register(api, apiConfig.token, apiConfig.options);
	}

	// initialize ankAnalytics
	ankAnalytics.init(analyticConfig.ankAnalytics);

	require('./onEvent.js');
};

/**
 * @param {number} accountId
 * @param {number|null} [newSessionId]
 * @param {Object} data
 */
exports.register = function (accountId, newSessionId, data) {
	ankAnalytics.register(newSessionId);
	wizAnalytics.freeze(accountId, data);
	isRegister = true;
	sendTheStack();
};

exports.unregister = function () {
	isRegister = false;
	ankAnalytics.unregister();
};

/**
 * @param {string} name - Name of the event to log
 * @param {Object} [data] - 1 deep layer of data
 * @param {Object} [options] - Extra data to add
 * @param {boolean} [options.withPlayerInfo]
 * @param {boolean} [options.withEquipment]
 */
exports.log = function (name, data, options) {
	data = data || {};
	options = options || {};

	if (!isRegister) {
		stackEvent(name, data, options);
		return;
	}

	if (options.withPlayerInfo !== false) {
		enrichment.addCharacterInfo(data);
	}
	if (options.withEquipment) {
		enrichment.addEquippedItem(data);
	}

	wizAnalytics.send(name, data);
	ankAnalytics.send(name, data);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/analytics/main.js
 ** module id = 160
 ** module chunks = 0
 **/