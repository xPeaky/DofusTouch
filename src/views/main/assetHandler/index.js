var async = require('async');
var staticContent = require('staticContent');

var assetsVersionKey = 'plugins.wizassets.assetsversion';
var staticDataVersionKey = 'client.main.staticdataversion';

var ASSETS_DEFAULT_KEY_VALUE = '0.0.0';
var STATIC_DATA_DEFAULT_KEY_VALUE = '1';

function getKey(keyName, defaultValue, cb) {
	function success(version) {
		if (!version && version !== 0) {
			version = defaultValue;
		}
		return cb(null, version);
	}
	function fail(error) {
		return cb(error);
	}

	var appPreferences = window.plugins && window.plugins.appPreferences;
	if (appPreferences) {
		return appPreferences.fetch(success, fail, keyName);
	}

	var version;
	try {
		version = window.localStorage.getItem(keyName);
	} catch (err) {
		return async.setImmediate(function () {
			return fail(err);
		});
	}
	return async.setImmediate(function () {
		return success(version);
	});
}

function setKey(keyValue, keyName, cb) {
	var appPreferences = window.plugins && window.plugins.appPreferences;
	if (appPreferences) {
		return appPreferences.store(function (/*msg*/) {
			// we remove the success parameter (on android it returns the string 'OK')
			cb();
		}, cb, keyName, keyValue);
	}

	try {
		window.localStorage.setItem(keyName, keyValue);
	} catch (err) {
		return async.setImmediate(function () {
			return cb(err);
		});
	}
	return async.setImmediate(cb);
}

exports.upgradeAssets = function (instructions, callback) {
	if (!instructions.staticDataVersion && !instructions.assetsVersion) {
		// Assets and static data versions are up-to-date
		return callback();
	}

	function eraseAssets(cb) {
		var version = instructions.assetsVersion;
		if (!version) {
			return cb();
		}

		function saveAssetsVersion() {
			return setKey(version, assetsVersionKey, cb);
		}

		var wizAssets = window.wizAssets;
		if (wizAssets) {
			return wizAssets.deleteFiles(instructions.changedFiles, saveAssetsVersion, cb);
		} else {
			return saveAssetsVersion();
		}
	}

	function eraseStaticData(cb) {
		var version = instructions.staticDataVersion;
		if (!version) {
			return cb();
		}
		staticContent.eraseDiskCache(function (error) {
			if (error) {
				return cb(error);
			}
			setKey(version, staticDataVersionKey, function (error) {
				if (error) {
					return cb(error);
				}
				staticContent.initializeDiskCache(cb);
			});
		});
	}

	async.series([
		eraseStaticData,
		eraseAssets
	], function (error) {
		if (error) {
			return callback(error);
		}
		// TODO: Send feedback to user: the assets have been updated (actually we removed the old ones)
		return callback();
	});
};

exports.getVersions = function (callback) {
	var versions = {};

	function addVersion(versionName, keyName, defaultValue, cb) {
		getKey(keyName, defaultValue, function (error, version) {
			if (error) {
				return cb(error);
			}
			versions[versionName] = version;
			return cb();
		});
	}

	function addAssetsVersion(cb) {
		return addVersion('assetsVersion', assetsVersionKey, ASSETS_DEFAULT_KEY_VALUE, cb);
	}

	function addStaticDataVersion(cb) {
		return addVersion('staticDataVersion', staticDataVersionKey, STATIC_DATA_DEFAULT_KEY_VALUE, cb);
	}

	async.series([
		addStaticDataVersion,
		addAssetsVersion
	], function (error) {
		if (error) {
			return callback('Could not get the client assets version: ' + error);
		}
		return callback(null, versions);
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/assetHandler/index.js
 ** module id = 155
 ** module chunks = 0
 **/