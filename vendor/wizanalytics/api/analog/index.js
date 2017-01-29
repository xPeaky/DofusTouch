exports.name = 'analog';
exports._basicData = {};

exports.init = function (token) {
	console.log("inititialized with: ", token);
};

// To set the userID to every logs
exports.idendity = function (userId) {
	console.log("Freeze ID: ", userId.valueOf());
};

// To send those data with every logs
exports.register = function (data) {
	for (var key in data) {
		exports._basicData['_' + key] = data[key];
	}
	console.log("Freeze data: ", data);
};

// A maximum of 10 event parameters per event is supported
exports.log = function (name, data) {
	data = data || {};
	for (var key in exports._basicData) {
		data[key] = data[key] || exports._basicData[key];
	}

	console.log("Logging", name, data);
};

exports.screen = function (viewName) {
	console.log("Screen", viewName);
};

exports.revenue = function (data) {
	console.log("Revenue", data);
};


/*****************
 ** WEBPACK FOOTER
 ** ./~/wizanalytics/api/analog/index.js
 ** module id = 163
 ** module chunks = 0
 **/