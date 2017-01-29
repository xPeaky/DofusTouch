var registeredApi = [];

function register(apiName, token, config) {
	try {
		var api = require('./api/' + apiName + '/index.js');
		api.init(token, config);
		registeredApi.push(api);
	} catch (e) {
		console.error("Analytics Error: Initialization failed", apiName, e);
	}
}

function freeze(userId, data) {
	for (var i = 0; i < registeredApi.length; i += 1) {
		var api = registeredApi[i];
		if (api.idendity) {
			try {
				api.idendity(userId.valueOf());
			} catch (e) {
				console.error("Analytics Error: couldn't set identity", api.name, e);
			}
		}

		if (api.register) {
			try {
				api.register(data);
			} catch (e) {
				console.error("Analytics Error: couldn't freeze data", api.name, e);
			}
		}
	}
}

function send(eventName, data) {
	for (var i = 0; i < registeredApi.length; i += 1) {
		var api = registeredApi[i];
		try {
			api.log(eventName, data);
		} catch (e) {
			console.error("Analytics Error: couldn't log", eventName, api.name, e);
		}
	}
}

function screen(screenName) {
	for (var i = 0; i < registeredApi.length; i += 1) {
		var api = registeredApi[i];
		if (api.screen) {
			try {
				api.screen(screenName);
			} catch (e) {
				console.error("Analytics Error: not able to register the screen", api.name, e);
			}
		}
	}
}

function revenue(price, data) {
	for (var i = 0; i < registeredApi.length; i += 1) {
		var api = registeredApi[i];
		if (api.revenue) {
			try {
				api.revenue(price, data);
			} catch (e) {
				console.error("Analytics Error: couldn't log revenue", api.name, e);
			}
		}
	}
}

exports.freeze = freeze;
exports.send = send;
exports.screen = screen;
exports.revenue = revenue;
exports.register = register;


/*****************
 ** WEBPACK FOOTER
 ** ./~/wizanalytics/index.js
 ** module id = 161
 ** module chunks = 0
 **/