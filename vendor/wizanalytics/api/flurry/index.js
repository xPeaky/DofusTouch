exports.name = 'flurry';

exports.init = function (token) {

	require('./api.js');
	exports._flurry = window.FlurryAgent;
	exports._flurry.startSession(token);
};


// To set the userID to every logs
exports.idendity = function (userId) {
	exports._flurry.setUserId(userId);
};

// To send those data with every logs
exports.register = function (data) {
	exports._basicData = data || {};
};

// A maximum of 10 event parameters per event is supported
exports.log = function (name, data) {

	data = data || {};

	for (var key in exports._basicData) {
		data[key] = data[key] || exports._basicData[key];
	}

	exports._flurry.logEvent(name, data);
};

exports.screen = function (viewName) {
	exports._flurry.logEvent("screen", { view: viewName });
};


/*****************
 ** WEBPACK FOOTER
 ** ./~/wizanalytics/api/flurry/index.js
 ** module id = 164
 ** module chunks = 0
 **/