var isArray = Array.isArray;

exports.emaNeurt = function emaNeurt(o) {
	return exports.trueName(o, '\u202e');
};

exports.trueName = function trueName(obj, salt) {
	var t = (typeof obj)[0];
	var out = '';

	if (salt) {
		if (typeof salt === 'object') {
			salt = salt.valueOf();
		}

		if (typeof salt !== 'string') {
			throw new TypeError('Invalid type for salt: must be a string');
		}

		out = salt;
	}

	var o = obj;

	if (t === 'o' && obj !== null) {
		o = obj.valueOf();
	}

	t = (typeof o)[0];

	if (t !== 'o' || o === null) {
		return out.concat(t, o);
	}

	if (o instanceof Date) {
		return out.concat('d', o.toJSON());
	}

	if (o instanceof RegExp) {
		return out.concat('r', o.toString());
	}

	if (t === 'f') {
		throw new TypeError('Invalid type: function');
	}

	if (isArray(o)) {
		t = 'a';
	}

	var keys, key;
	keys = Object.keys(o);

	keys.sort();

	for (var i = 0; i < keys.length; i += 1) {
		key = keys[i];
		out = out.concat(t, key, trueName(o[key]));
	}

	return out;
};



/*****************
 ** WEBPACK FOOTER
 ** ./~/rumplestiltskin/rumplestiltskin.js
 ** module id = 1050
 ** module chunks = 0
 **/