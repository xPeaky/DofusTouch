require('./IndexedDBShim.min.js');

var db;
var config;

var indexedDB = window.indexedDB || window.shimIndexedDB;
var IDBTransaction = window.IDBTransaction;

var DUMMY_RECORD_FLAG = exports.DUMMY_RECORD_FLAG = 'MISSING_ID';


exports.newDummyRecord = function (keyName, id) {
	var dummyRecord = {};
	dummyRecord[DUMMY_RECORD_FLAG] = true;
	dummyRecord[keyName] = id;
	return dummyRecord;
};

function convertIdToString(id) {
	if (typeof id === 'string') {
		return id;
	}
	return id.toString();
}

function convertIdToNumber(id) {
	if (typeof id === 'number') {
		return id;
	}
	var ret = parseInt(id, 10);
	return isNaN(ret) ? null : ret;
}

function defineParseIdFunction(objectStoreName) {
	if (config.hasStringId(objectStoreName)) {
		return convertIdToString;
	} else {
		return convertIdToNumber;
	}
}

function createObjectStores(db) {
	var types = config.typeNames;

	function createObjectStore(name) {
		var key = config.getKey(name);
		var objectStore = db.createObjectStore(name, { keyPath: key });

		// TODO: Implement index creation

		var transaction = objectStore.transaction;

		transaction.oncomplete = function (/* event */) {
		};

		transaction.onabort = function (/* event */) {
			console.error(new Error('Object store creation aborted for:' + name + ', with error:' + transaction.error));
		};

		transaction.onerror = function (/* event */) {
			console.error(new Error('Object store creation failed for:' + name + ', with error:' + transaction.error));
		};
	}

	for (var i = 0, length = types.length; i < length; ++i) {
		createObjectStore(types[i]);
	}

	if (config.cacheCompletion) {
		createObjectStore(config.cacheCompletion);
	}
}

exports.initialize = function (name, cacheConfig, callback) {
	if (!indexedDB) {
		return callback(new Error('This browser doesn\'t support a stable version of IndexedDB.'));
	}

	if (db) {
		db.close();
		db = null;
	}

	config = cacheConfig;

	var request = indexedDB.open(name);

	request.onupgradeneeded = function (event) {
		var db = event.target.result;

		db.onerror = function (event) {
			console.error(new Error('IndexedDB database error: ' + event.target.errorCode));
		};

		createObjectStores(db);
	};

	request.onsuccess = function (/* event */) {
		db = request.result;

		db.onerror = function (event) {
			console.error(new Error('IndexedDB database error: ' + event.target.errorCode));
		};

		callback();
	};

	request.onerror = function (event) {
		callback(new Error('Opening IndexedDB database failed with error: ' + event.target.errorCode));
	};
};

exports.delete = function (name, cb) {
	if (db && db.name === name) {
		db.close();
		db = null;
	}

	var request = indexedDB.deleteDatabase(name);
	request.onsuccess = function () {
		return cb();
	};
	request.onerror = function () {
		return cb(new Error('Could not delete database'));
	};
	request.onblocked = function () {
		return cb(new Error('Could not delete database due to the operation being blocked'));
	};
};

function _request(objectStoreName, ids, callback) {
	var objectsFound = {};
	var missingIds = [];

	if (!ids.length) {
		return callback(null, objectsFound, missingIds);
	}

	var transaction = db.transaction(objectStoreName, IDBTransaction.READ_ONLY);
	var objectStore = transaction.objectStore(objectStoreName);

	var parseId = defineParseIdFunction(objectStoreName);

	function requestId(id) {
		if (id === undefined || id === null) {
			console.error(new Error('IndexedDB id to get in object store: ' + objectStoreName + ', is invalid: ' + id));
			return;
		}

		id = parseId(id);
		if (id === null) {
			console.error(new Error('IndexedDB id to get in object store: ' + objectStoreName + ', is invalid: ' + id));
			return;
		}
		var request = objectStore.get(id);
		request.onsuccess = function (event) {
			if (event.target.result) {
				objectsFound[id] = event.target.result;
			} else {
				missingIds.push(id);
			}
		};
		request.onerror = function (event) {
			console.error(
				'Requesting id:', id + ', in store:', objectStoreName + ', failed with error:',
				event.target.errorCode
			);
			missingIds.push(id);
		};
	}

	for (var i = 0, length = ids.length; i < length; ++i) {
		requestId(ids[i]);
	}

	transaction.oncomplete = function (/* event */) {
		callback(null, objectsFound, missingIds);
	};
	transaction.onabort = function (/* event */) {
		var error = transaction.error || {};
		callback(new Error('IndexedDB request transaction aborted with error: ' + error.name + ', ' + error.message));
	};
	transaction.onerror = function (/* event */) {
		var error = transaction.error || {};
		callback(new Error('IndexedDB request transaction failed with error: ' + error.name + ', ' + error.message));
	};
}

function _put(objectStoreName, objects, callback) {
	var id;
	var isEmpty = true;
	for (id in objects) {
		isEmpty = false;
		break;
	}
	if (isEmpty) {
		return callback();
	}
	var transaction = db.transaction(objectStoreName, IDBTransaction.READ_WRITE);
	var objectStore = transaction.objectStore(objectStoreName);

	var keyName = config.getKey(objectStoreName);
	var parseId = defineParseIdFunction(objectStoreName);

	function putObject(object) {
		if (!object) {
			console.error('IndexedDB object to put in object store: ' + objectStoreName + ', is invalid: ' + object);
			return;
		}

		object[keyName] = parseId(object[keyName]);
		if (object[keyName] === null) {
			console.error('IndexedDB object to put in object store: ' + objectStoreName + ', is invalid: ' + object);
			return;
		}
		var request = objectStore.put(object);
		request.onsuccess = function (/* event */) {
		};
		request.onerror = function (event) {
			console.error(new Error('IndexedDB put object in store:' + objectStoreName + ', failed with error: ' +
				event.target.errorCode));
		};
	}

	for (id in objects) {
		putObject(objects[id]);
	}

	transaction.oncomplete = function (/* event */) {
		callback();
	};
	transaction.onabort = function (/* event */) {
		var error;
		try {
			error = 'IndexedDB put transaction aborted with error: ' + JSON.stringify(transaction.error);
		} catch (err) {
			error = 'IndexedDB put transaction aborted with exception: ' + err;
		}
		callback(new Error(error));
	};
	transaction.onerror = function (/* event */) {
		callback(new Error('IndexedDB put transaction failed with error: ' + transaction.error));
	};
}

function requestAll(objectStoreName, callback) {
	var objectsFound = {};

	var transaction = db.transaction(objectStoreName, IDBTransaction.READ_ONLY);
	var objectStore = transaction.objectStore(objectStoreName);
	var keyName = config.getKey(objectStoreName);

	var request = objectStore.openCursor();
	request.onsuccess = function (event) {
		var cursor = event.target.result;
		if (cursor) {
			var record = cursor.value;
			if (!record[DUMMY_RECORD_FLAG]) {
				objectsFound[record[keyName]] = record;
			}
			cursor.continue();
		}
	};
	request.onerror = function (/* event */) {
		console.error(new Error('IndexedDB opening cursor on object store: ' + objectStoreName + ', failed.'));
	};

	transaction.oncomplete = function (/* event */) {
		callback(null, objectsFound);
	};
	transaction.onabort = function (/* event */) {
		callback(new Error('IndexedDB requestAll transaction aborted with error: ' + transaction.error));
	};
	transaction.onerror = function (/* event */) {
		callback(new Error('IndexedDB requestAll transaction failed with error: ' + transaction.error));
	};
}

exports.request = function (objectStoreName, ids, callback) {
	if (!db) {
		callback(new Error('IndexedDB request failed: disk cache not yet initialized'));
		return;
	}

	if (!db.objectStoreNames.contains(objectStoreName)) {
		callback(new Error('IndexedDB request failed: object store: ' + objectStoreName + ' not found in disk cache'));
		return;
	}

	_request(objectStoreName, ids, callback);
};

function put(objectStoreName, objects, callback) {
	if (!db) {
		callback(new Error('IndexedDB request failed: disk cache not yet initialized'));
		return;
	}

	if (!db.objectStoreNames.contains(objectStoreName)) {
		callback(new Error('IndexedDB request failed: object store: ' + objectStoreName + ' not found in disk cache'));
		return;
	}

	_put(objectStoreName, objects, callback);
}
exports.put = put;

exports.requestAll = function (objectStoreName, callback) {
	if (!db) {
		callback(new Error('IndexedDB request failed: disk cache not yet initialized'));
		return;
	}

	var cacheCompletion = config.cacheCompletion;
	if (!cacheCompletion || !db.objectStoreNames.contains(cacheCompletion)) {
		callback(new Error('IndexedDB isCacheComplete failed: cache completion not initialized'));
		return;
	}

	_request(cacheCompletion, [objectStoreName], function (error, objects) {
		if (error) {
			return callback(error);
		}

		var isCacheComplete = objects[objectStoreName];
		if (!isCacheComplete) {
			return callback(null, null);
		}

		if (!db.objectStoreNames.contains(objectStoreName)) {
			callback(new Error('IndexedDB request failed: object store: ' + objectStoreName +
				' not found in disk cache'));
			return;
		}

		requestAll(objectStoreName, callback);
	});
};

exports.putAll = function (objectStoreName, objects, callback) {
	put(objectStoreName, objects, function (error) {
		if (error) {
			return callback(error);
		}

		var cacheCompletion = config.cacheCompletion;
		if (!cacheCompletion || !db.objectStoreNames.contains(cacheCompletion)) {
			callback(new Error('IndexedDB putAll operation called but cache completion is not set up'));
			return;
		}

		var completedType = { completedType: { id: objectStoreName } };
		put(cacheCompletion, completedType, function (error) {
			if (error) {
				return callback(error);
			}
			return callback();
		});
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/staticContent/indexeddb.js
 ** module id = 38
 ** module chunks = 0
 **/