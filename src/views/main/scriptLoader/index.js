
/** Loads a script, calls the cb() when loaded or cb(err) if failed */
function loadScript(url, cb) {
	// Adding the script tag to the head as suggested before
	var head = document.getElementsByTagName('head')[0];
	var script = document.createElement('script');
	//script.onreadystatechange = cb; //for IE
	script.onload = function () {
		// Resetting callbacks to avoid memory leaks
		this.onload  = null;
		this.onerror = null;
		return cb();
	};
	script.onerror = function () {
		// Resetting callbacks to avoid memory leaks
		this.onload  = null;
		this.onerror = null;
		return cb(new Error('Error loading script: ' + url));
	};

	script.type = 'text/javascript';
	script.src = url;

	// Fire the loading
	head.appendChild(script); //NB: we get an error ERR_CONNECTION_REFUSED in console log but cannot catch it
}

function loadJson(url, cb) {
	var req = new XMLHttpRequest();
	req.overrideMimeType('application/json');

	req.onreadystatechange = function () {
		if (~~req.readyState !== 4) {
			return;
		}

		req.onreadystatechange = null;

		if (~~req.status !== 200) {
			return cb(new Error('Error loading json: ' + url));
		}

		var response;

		try {
			response = JSON.parse(req.responseText);
		} catch (e) {
			return cb(e);
		}

		return cb(null, response);
	};

	req.open('GET', url, true);
	req.send(null);
}

module.exports.loadScript = loadScript;
module.exports.loadJson = loadJson;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/scriptLoader/index.js
 ** module id = 15
 ** module chunks = 0
 **/