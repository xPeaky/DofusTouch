var querystring = require('querystring');
var logger = require('dofusProxy').logger;

var HAAPI_KEY_TIMEOUT = 1000 * 3600 * 24 * 30; // 30 days

function checkStatus(response) {
	if (response.status < 400 || response.status > 599) {
		return response;
	} else {
		var error = new Error(response.statusText);
		error.response = response;
		throw error;
	}
}

var haapiKey;
var haapiUsername;

function setHaapiUsername(key) {
	try {
		window.localStorage.setItem('HAAPI_USERNAME', key);
		haapiUsername = key;
		return key;
	} catch (error) {
		return false;
	}
}

/**
 *
 * @param {string|null} key - if the key is null the localstorage will be clean
 * @param {Object} [opts]
 * @param {boolean} [opts.save]
 * @param {number} [opts.timeout] - by default it will be 30 days
 * @return {string|null} return the key or null
 */
function setHaapiKey(key, opts) {
	opts = opts || {};
	haapiKey = key;

	if (!opts.save) {
		return key;
	}

	try {
		if (!key) {
			window.localStorage.removeItem('HAAPI_KEY');
			window.localStorage.removeItem('HAAPI_KEY_TIMEOUT');
			return key;
		}

		var timeout = key ? Date.now() + HAAPI_KEY_TIMEOUT : null;

		window.localStorage.setItem('HAAPI_KEY', key);
		window.localStorage.setItem('HAAPI_KEY_TIMEOUT', opts.timeout || timeout);
	} catch (error) {
		logger.warning('Failed to store HAAPI_KEY in local storage:', error);
		return null;
	}

	return key;
}

function getHaapiKeyFromStorage() {
	var now = Date.now();
	var key = window.localStorage.getItem('HAAPI_KEY');
	var expiration = window.localStorage.getItem('HAAPI_KEY_TIMEOUT');

	if (!key || !expiration || expiration < now) {
		return setHaapiKey(null, { save: true });
	}

	return setHaapiKey(key, { save: false });
}

/**
 * Return the key
 * /!\ also return the key (cache), even if the user did not save the token but already login (used for the `Change
 * character from the combo box`)
 * @returns {*}
 */
function getHaapiKey() {
	if (haapiKey) {
		return haapiKey;
	}

	return getHaapiKeyFromStorage();
}

function processRequest(request, callback) {
	request.then(checkStatus).then(function (response) {
		response.json().then(function (data) {
			if (data._statusCode || response.status > 599) {
				throw data;
			}

			// FIXME: if this callback is throwing an error, it is called a second time by the following catch
			callback(null, data);
		}).catch(callback);
	}).catch(callback);
}

function fetch(url, data, callback) {
	var dataUrl = window.Config.dataUrl;
	url = dataUrl + url;

	var queryString = querystring.stringify(data);

	processRequest(window.fetch([url, queryString].join('?')), callback);
}

function fetchDirectly(url, data, callback) {
	var key = getHaapiKey();
	var dataUrl = window.Config.haapi.url;
	url = dataUrl + url;

	var headers = {
		Accept: 'application/json'
	};

	if (key) {
		headers.APIKEY = key;
	}

	var queryString = querystring.stringify(data);

	processRequest(window.fetch([url, queryString].join('?'), {
		headers: headers
	}), callback);
}

function postDirectly(url, data, callback) {
	var key = getHaapiKey();
	var dataUrl = window.Config.haapi.url;
	url = dataUrl + url;

	var headers = {
		Accept: 'application/json'
	};

	if (key) {
		headers.apikey = key;
	}

	processRequest(window.fetch(url, {
		method: 'post',
		headers: headers,
		body: querystring.stringify(data)
	}), callback);
}

exports.hasKeyFromStorage = function () {
	return !!getHaapiKeyFromStorage();
};

exports.hasKey = function () {
	return !!getHaapiKey();
};

exports.getHaapiKey = getHaapiKey;

exports.resetHaapiKey = function () {
	setHaapiKey(null, { save: true });
};

exports.getHaapiUsername = function () {
	if (haapiUsername) {
		return haapiUsername;
	}

	haapiUsername = window.localStorage.getItem('HAAPI_USERNAME');

	return haapiUsername;
};

exports.createGuest = function (callback) {
	fetch('/haapi/createGuest', {
		lang: window.Config.language
	}, callback);
};

exports.validateGuest = function (data, callback) {
	data.lang = window.Config.language;
	fetch('/haapi/validateGuest', data, callback);
};

exports.createAccount = function (data, callback) {
	data.lang = window.Config.language;
	fetch('/haapi/createAccount', data, callback);
};

exports.createApiKey = function (data, callback) {
	postDirectly('/Api/CreateApiKey', data, callback);
};

exports.createToken = function (callback) {
	fetchDirectly('/Account/CreateToken', {
		game: window.Config.haapi.id
	}, callback);
};

exports.login = function (username, password, save, callback) {
	function setUsernameAndSignOnWithToken(error, createTokenResponse) {
		if (error) {
			return callback(error);
		}
		setHaapiUsername(username);
		createTokenResponse.username = username;

		return callback(null, createTokenResponse);
	}

	if (arguments.length === 1) {
		callback = username;
		username = exports.getHaapiUsername();

		if (getHaapiKey()) {
			return exports.createToken(setUsernameAndSignOnWithToken);
		}

		return callback({ reason: 'NOKEY' });
	}

	exports.createApiKey({
		login: username,
		password: password,
		//jscs:disable requireCamelCaseOrUpperCaseIdentifiers
		long_life_token: save
	}, function (error, response) {
		if (error) {
			// createApiKey error and signOnWithToken error are the same
			return callback(error);
		}
		var timeout = new Date(response.expiration_date).getTime();
		//jscs:enable requireCamelCaseOrUpperCaseIdentifiers

		setHaapiKey(response.key, {
			save: save,
			timeout: timeout
		});

		return exports.createToken(setUsernameAndSignOnWithToken);
	});
};

exports.getForumTopicsList = function (callback) {
	var language = window.Config.language;
	fetch('/haapi/getForumTopicsList', {
		lang: language
	}, callback);
};

exports.getForumPostsList = function (topicId, callback) {
	var language = window.Config.language;
	fetch('/haapi/getForumPostsList', {
		lang: language,
		topicId: topicId
	}, callback);
};

exports.getNewsList = function (count, callback) {
	var language = window.Config.language;
	fetch('/haapi/getNewsList', {
		lang: language,
		count: count
	}, callback);
};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/haapi/index.js
 ** module id = 51
 ** module chunks = 0
 **/