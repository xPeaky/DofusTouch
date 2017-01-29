exports.name = 'localytics';

var defaultDimension;

/**
 * @param {string} token
 * @param {Object} [options] - options required by Localytics
 */
exports.init = function (token, options) {
	var localyticsSession = require('./api.js');
	options = options || {};

	// Will force the SDK to use the ID passed by setCustomerId
	options.useCustomerId = true;

	// Default: session expires on restart
	options.sessionTimeoutSeconds = options.sessionTimeoutSeconds || false;

	// Default: No polling, not needed for one page app
	options.polling = options.polling || 0;

	// Create an instance of LocalyticsSession
	exports._localyticsSession = localyticsSession(token, options);

	defaultDimension = options.defaultDimension;

	// Open a new session
	exports._localyticsSession.open();

	// Upload previous data saved in localStorage (if any)
	exports._localyticsSession.upload();
};

/**
 * Set the ID of the user
 * @param userId
 */
exports.idendity = function (userId) {
	// Set the ID of the user
	exports._localyticsSession.setCustomerId(userId);
};


/**
 * Register other data to identify the user (name, email)
 * @param {Object} data - a flat object
 */
exports.register = function (data) {
	for (var key in data) {
		exports._localyticsSession.setIdentifier("customer_" + key, data[key]);
	}
};

var timeoutId = null;

/**
 * Log any event
 * @param {string} name - the name of the event
 * @param {Object} data
 */
exports.log = function (name, data) {
	exports._localyticsSession.tagEvent(name, data, defaultDimension);

	if (timeoutId) {
		return;
	}

	// upload logs max once per second
	timeoutId = window.setTimeout(function () {
		exports._localyticsSession.upload();
		timeoutId = null;
	}, 1000);
};

/**
 * Log the flow
 * @param {string} viewName
 */
exports.screen = function (viewName) {
	exports._localyticsSession.tagScreen(viewName);
};

/**
 * Log revenue
 * @param {number} price
 * @param {Object} data
 */
exports.revenue = function (price, customDimension) {
	exports._localyticsSession.tagEvent('revenue', { price: price }, customDimension, price);
	exports._localyticsSession.upload();
};


/*****************
 ** WEBPACK FOOTER
 ** ./~/wizanalytics/api/localytics/index.js
 ** module id = 166
 ** module chunks = 0
 **/