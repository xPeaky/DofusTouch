/** @module staticContent
 *  @desc Allows to request data directly from HTTP server.
 *  Initialize must be called before other methods. */

var async = require('async');
var cacheConfig = require('./cacheConfig.js');
var cacheDatabase = require('./indexeddb.js');
var request = require('./http-request.js');

var DUMMY_RECORD_FLAG = cacheDatabase.DUMMY_RECORD_FLAG;

var dataUrl = null;
var lang = null;


/** Initializes the module
 *  @param {map} clientConfig - client config received from server */
exports.initialize = function (clientConfig) {
	dataUrl = clientConfig.dataUrl;
};

/** Initialize the disk cache based on current language
 * @param {function} callback - callback(error) */
function initializeDiskCache(callback) {
	cacheDatabase.initialize(lang + cacheConfig.cacheDatabaseSuffix, cacheConfig, callback);
}
exports.initializeDiskCache = initializeDiskCache;

/** Erase the disk cache of specified languages
 * @param {function} cb - cb(error) */
exports.eraseDiskCache = function (cb) {
	// TODO: Store which databases have been created rather than deleting english and french languages
	var langsToErase = ['en', 'fr'];
	async.eachSeries(langsToErase, function (langToErase, callback) {
		return cacheDatabase.delete(langToErase + cacheConfig.cacheDatabaseSuffix, callback);
	}, cb);
};

/** Called if we change language after init from user's request */
// TODO: Implement change of language
exports.changeLanguage = function (language) {
	lang = language;
};

function requestData(path, data, cb) {
	return request(dataUrl, '/data/' + path, data, lang, cb);
}

/** Gets a dictionary for given language
 * @param {string} language - language code (e.g. 'fr')
 * @param {function} cb - cb(err, dictionary) */
exports.getDictionary = function (language, cb) {
	requestData('dictionary', { lang: language }, function (error, result) {
		if (error) {
			return cb(error);
		}
		lang = language;

		initializeDiskCache(function () {
			cb(null, result);
		});
	});
};

/** Gets a text from its ID
 * @param {string} id - text id
 * @param {function} cb - cb(err, text) */
exports.getText = function (id, cb) {
	var data = {};
	if (Array.isArray(id)) {
		data.ids = id;
	} else {
		data.id = id;
	}
	requestData('text', data, function (error, result) {
		if (error) {
			return cb(error);
		}
		cb(null, result);
	});
};


function mapToArray(objects, options) {
	var keys = Object.keys(objects);
	var len = keys.length;
	var result = new Array(len);

	for (var i = 0; i < len; i++) {
		result[i] = objects[keys[i]];
	}

	if (options && options.sortBy) {
		var key = options.sortBy;
		result.sort(function (a, b) { return a[key] - b[key]; });
	}

	return result;
}


/** Gets a submap of objects from a class given a set of IDs, and returns it to the passed callback
 *
 * @param {String}   type      - table name
 * @param {Number[]} ids       - data ids
 * @param {Function} cb        - callback function
 */
exports.getDataMap = function (type, ids, cb) {
	if (!Array.isArray(ids)) {
		return cb(new TypeError('Data ids should be passed as an array'));
	}

	// Check disk cache
	cacheDatabase.request(type, ids, function (error, diskCache, missingIds) {
		if (error) {
			return cb(error);
		}

		var dataResult = {};

		for (var id in diskCache) {
			// Filter out dummy records saved for invalid IDs in database
			if (diskCache[id][DUMMY_RECORD_FLAG]) {
				continue;
			}
			dataResult[id] = diskCache[id];
		}

		// If no more missing data, return result
		if (missingIds.length === 0) {
			return cb(null, dataResult);
		}

		// send server request
		var data = { class: type, ids: missingIds };
		requestData('map', data, function (error, result) {
			if (error) {
				return cb(error);
			}

			// Merge results
			for (var i = 0, len = missingIds.length; i < len; i++) {
				var id = missingIds[i];
				var newValue = result[id];
				if (newValue) {
					dataResult[id] = newValue;
				} else {
					// DB accepts only objects with a key so we create a dummy one (it will be filtered out when we
					// read from DB)
					result[id] = cacheDatabase.newDummyRecord(cacheConfig.getKey(type), id);
				}
			}

			cacheDatabase.put(type, result, function (error) {
				if (error) {
					console.warn('getDataMap put: Caching data on disk failed with error:', error);
				}
			});

			return cb(null, dataResult);
		});
	});
};

/** Gets an array of objects from a class given a set of IDs, and returns it to the passed callback
 *
 * @param {string}    type             - class name
 * @param {number[]}  ids              - data ids
 * @param {Object}    [options]        - map to array mapping options
 * @param {string}    [options.sortBy] - the property of the object to sort on
 * @param {Function}  cb               - callback function
 */
exports.getDataArray = function (type, ids, options, cb) {
	if (typeof options === 'function') {
		cb = options;
		options = null;
	}

	exports.getDataMap(type, ids, function (error, result) {
		if (error) { return cb(error); }

		cb(null, mapToArray(result, options));
	});
};

/**
 * Gets a submap of objects from a class given a search string, and returns it to the passed callback
 *
 * @param {string}          type               - class name
 * @param {Object}          search             - search object
 * @param {string}          search.match       - search string
 * @param {string}          [search.matchProp] - on which property name we will search (default: nameId)
 * @param {Function}        cb                 - callback function
 */
exports.searchDataMap = function (type, search, cb) {
	// we cannot query the database, but we can update it with what we find

	var data = { class: type, match: search.match, matchProp: search.matchProp };
	requestData('map', data, function (error, result) {
		if (error) {
			return cb(error);
		}

		cacheDatabase.put(type, result, function (error) {
			if (error) {
				console.warn('searchDataMap put: Caching search results on disk failed with error: ' + error);
			}
		});

		return cb(null, result);
	});
};

/** Gets one object from a class
 *
 * @param {String}    type      - table name
 * @param {Number}    id        - data id (or ids)
 * @param {Function}  cb        - callback function
 */
exports.getObject = function (type, id, cb) {
	// id from the DB can be 0, look AlignmentRank DB
	if (!id && id !== 0) {
		return cb(new Error('You must pass an ID'));
	}

	exports.getDataMap(type, [id], function (error, result) {
		if (error) { return cb(error); }

		return cb(null, result[id]);
	});
};


/** Gets one or more objects from a table
 *
 * @param {String}            type      - table name
 * @param {Number|Number[]}   id        - data id (or array of ids)
 * @param {Function}          cb        - callback function
 * @deprecated please use getDataMap instead
 */
exports.getData = function (type, id, cb) {
	if (Array.isArray(id)) {
		return exports.getDataArray(type, id, null, cb);
	}

	exports.getObject(type, id, cb);
};


function _getTableFromMap(map, type, ordered) {
	var result = [];
	for (var key in map) {
		result.push(map[key]);
	}
	if (ordered) {
		var keyName = cacheConfig.getKey(type);
		result.sort(function (a, b) { return a[keyName] - b[keyName]; });
	}
	return result;
}

function _getAllDataMap(type, cb) {
	// code below is just to help us catch bad performance code

	cacheDatabase.requestAll(type, function (error, objects) {
		if (error) { return cb(error); }

		if (objects) {
			return cb(null, objects);
		}

		return requestData('map', { class: type }, function (error, result) {
			if (error) { return cb(error); }

			var keyName = cacheConfig.getKey(type);
			var hasId;
			// Check if we have at least 1 result
			for (var firstId in result) {
				hasId = result[firstId] && result[firstId][keyName] !== undefined;
				break;
			}
			if (!hasId) {
				console.warn('Request to cache table ' + type + ' which has no "' + keyName + '" key; table will not be cached.');
			} else {
				cacheDatabase.putAll(type, result, function (error) {
					if (error) { console.warn('_getAllDataMap putAll: Caching data on disk failed with error: ' + error); }
				});
			}

			return cb(null, result);
		});
	});
}

function _getAllDataMaps(types, cb) {
	var results = {};
	async.eachLimit(types, 5, function (type, callback) {
		return _getAllDataMap(type, function (error, result) {
			if (error) {
				return callback(error);
			}
			results[type] = result;
			return callback();
		});
	}, function done(error) {
		if (error) {
			return cb(error);
		}
		return cb(null, results);
	});
}

function _getAllDataTable(type, ordered, cb) {
	_getAllDataMap(type, function (error, result) {
		if (error) {
			return cb(error);
		}
		return cb(null, _getTableFromMap(result, type, ordered));
	});
}

function _getAllDataTables(types, ordered, cb) {
	var results = {};
	async.eachLimit(types, 5, function (type, callback) {
		return _getAllDataTable(type, ordered, function (error, result) {
			if (error) {
				return callback(error);
			}
			results[type] = result;
			return callback();
		});
	}, function done(error) {
		if (error) {
			return cb(error);
		}
		return cb(null, results);
	});
}

/** Gets all content of specified table
 *
 * @param {String/Array} types     - class name(s)
 * @param {Function}     cb        - callback function
 */
exports.getAllDataTable = function (types, cb) {
	if (Array.isArray(types)) {
		return _getAllDataTables(types, true, cb);
	}
	return _getAllDataTable(types, true, cb);
};
/** This one is called by those who need an array in any order since they will sort it differently anyway */
exports.getAllDataBulk = function (types, cb) {
	if (Array.isArray(types)) {
		return _getAllDataTables(types, false, cb);
	}
	return _getAllDataTable(types, false, cb);
};

/** Gets all content of specified map
 *
 * @param {String/Array} types     - class name(s)
 * @param {Function}     cb        - callback function
 */
exports.getAllDataMap = function (types, cb) {
	if (Array.isArray(types)) {
		return _getAllDataMaps(types, cb);
	}
	return _getAllDataMap(types, cb);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/staticContent/index.js
 ** module id = 36
 ** module chunks = 0
 **/