var querystring = require('querystring');
var retry = require('retry'); // see comments about retry in main/analytics


/**
 * @param {string} serverPath
 * @param {string} path
 * @param {object} [data]
 * @param {string} [data.lang] - language
 * @param {string} [data.id]
 * @param {array} [data.ids]
 * @param {string} [data.class] - table name
 * @param {string} defaultLang
 * @param {function} cb
 */
module.exports = function request(serverPath, path, data, defaultLang, cb) {
	if (!serverPath) {
		return cb(new Error('staticContent is not initialized. Cannot perform request: ' + path));
	}

	var operation = retry.operation({ retries: 4, randomize: true }); // retry 4 times in a range of 20-30 seconds

	data = data || {};
	var xobj = new XMLHttpRequest();

	xobj.onreadystatechange = function () {
		if (~~xobj.readyState !== 4) {
			return;
		}
		var error;
		if (~~xobj.status !== 200) { error = 'staticContent xhrError: ' + xobj.status; }
		if (operation.retry(error)) {
			return console.warn('staticContent.request failed code ', xobj.status + ', will retry...');
		}
		if (error) {
			return cb(operation.mainError());
		}

		var result;
		try {
			result = JSON.parse(xobj.response);
		} catch (e) {
			return cb(e);
		}

		cb(null, result);
	};

	var query = {
		lang: data.lang || defaultLang,
		v: window.Config.buildVersion
	};

	var req = serverPath + path + '?' + querystring.stringify(query);

	operation.attempt(function () {
		xobj.open('POST', req, true);
		xobj.setRequestHeader('Content-type', 'application/json');
		xobj.send(JSON.stringify(data));
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/staticContent/http-request.js
 ** module id = 40
 ** module chunks = 0
 **/