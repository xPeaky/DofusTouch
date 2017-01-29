exports.name = 'mixpanel';

exports._mixpanel = window.mixpanel = [];
exports._mixpanel.__SV = 1.2;

/**
 * This function initialize a new instance of the Mixpanel tracking object.
 * All new instances are added to the main mixpanel object as sub properties (such as
 * mixpanel.your_library_name) and also returned by this function.  If you wanted
 * to define a second instance on the page you would do it like so:
 *
 *      mixpanel.init("new token", { your: "config" }, "library_name")
 *
 * and use it like this:
 *
 *      mixpanel.library_name.track(...)
 *
 * @param {String} token   Your Mixpanel API token
 * @param {Object} config  A dictionary of config options to override
 * @param {String} name    The name for the new mixpanel instance that you want created
 */

exports.init = function (token, config) {

	require('./api.js');
	window.mixpanel.init(token, config);
	exports._mixpanel = window.mixpanel;
};

// To set the userID to every logs
exports.idendity = function (userId) {
	/* jshint camelcase:false */
	exports._mixpanel.identify(userId);
	exports._mixpanel.people.set_once('firstLogin', new Date());
	exports._mixpanel.people.set('lastLogin', new Date());
	exports._mixpanel.people.increment('nbLogin');
};

// To send those data with every logs
exports.register = function (data) {
	if (data.name) {
		/* jshint camelcase:false */
		exports._mixpanel.people.set('$name', data.name);
		exports._mixpanel.name_tag(data.name);
	}

	exports._mixpanel.register(data);
	exports._mixpanel.people.set(data);
};

// Log an event
exports.log = function (eventName, data) {
	exports._mixpanel.track(eventName, data);
};

exports.screen = function (viewName) {
	/* jshint camelcase:false */
	exports._mixpanel.track_pageview(viewName);
};

// Log revenue
exports.revenue = function (price, data) {
	data = data || {};
	/* jshint sub:true */
	data['$time'] = new Date();
	/* jshint camelcase:false */
	exports._mixpanel.people.track_charge(price, data);
};


/*****************
 ** WEBPACK FOOTER
 ** ./~/wizanalytics/api/mixpanel/index.js
 ** module id = 168
 ** module chunks = 0
 **/