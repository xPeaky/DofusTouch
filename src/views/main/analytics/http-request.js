var retry = require('retry');

/**
 * get the error if there is one
 * @param  {number} eventId - event id
 * @param  {string|number} status - status code from xhr
 * @return {string|null} - the error message
 */
function getError(eventId, status) {
	var error;
	// the event server will send me a 204 no contents
	if (~~status !== 204) {
		error = 'analytics.request: event ' + eventId + ', xhrError: ' + status;
	}
	return error;
}

/**
 * @param {string} url - the eventServer url
 * @param {object} data - the event
 * @param {number} data.event_id - the event id
 * @param {function} cb
 */
module.exports = function request(url, data, cb) {
	if (!url) {
		return cb(new Error('analytics.request: url is empty'));
	}

	data = data || {};
	//jscs:disable requireCamelCaseOrUpperCaseIdentifiers
	var eventId = data.event_id;
	//jscs:enable requireCamelCaseOrUpperCaseIdentifiers

	var xobj = new XMLHttpRequest();
	xobj.timeout = 5000;

	/*
		retry.operation possible options:
			- retries: The maximum amount of times to retry the operation. Default is 10.
			- factor: The exponential factor to use. Default is 2.
			- minTimeout: The number of milliseconds before starting the first retry. Default is 1000.
			- maxTimeout: The maximum number of milliseconds between two retries. Default is Infinity.
			- randomize: Randomizes the timeouts by multiplying with a factor between 1 to 2. Default is false.

		Example: retry.operation({ retries: 5 }) will retry after (previous time * factor + minTimeout) seconds
		will retry
			 1s  (0  * 2 + 1s),
			 3s  (1s * 2 + 1s),
			 7s  (3s * 2 + 1s),
			15s, (7s * 2 + 1s),
			31s  (15 * 2 + 1s) after the initial send
	*/
	var operation = retry.operation({ retries: 4, randomize: true }); // retry 4 times in a range of 20-30 seconds

	xobj.onreadystatechange = function () {
		if (~~xobj.readyState !== 4) {
			return;
		}

		// if error it will retry
		var error = getError(eventId, xobj.status);
		if (operation.retry(error)) {
			console.warn('analytics.request failed event', eventId, 'will retry...');
			return;
		}

		// if error and no more retries, callback on the mainError
		// (the mainError is the most common error that occurs during the retries)
		if (error) {
			return cb(operation.mainError());
		}
		cb();
	};

	operation.attempt(function () {
		xobj.open('POST', url, true);
		xobj.setRequestHeader('Content-type', 'application/json');
		xobj.send(JSON.stringify(data));
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/analytics/http-request.js
 ** module id = 174
 ** module chunks = 0
 **/