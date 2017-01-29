var async = require('async');
var inherits = require('util').inherits;
var EventEmitter = require('events.js').EventEmitter;
var staticContent = require('staticContent');
var assetPreloading = require('assetPreloading');
var constants       = require('constants');

var IMG_PATH = constants.IMG_PATH;
var MAP_PATH = constants.MAP_PATH;
var BG_PATH  = constants.BACKGROUND_PATH;
var FG_PATH  = constants.FOREGROUND_PATH;

function PreloadCmd() {
	EventEmitter.call(this);
	this._INCARNAM_AREA_ID = 45;
}

inherits(PreloadCmd, EventEmitter);
module.exports = PreloadCmd;

PreloadCmd.prototype._onError = function (err) {
	this.emit('error', err);
};

PreloadCmd.prototype._onEnd = function (params) {
	this.emit('end', params);
};

PreloadCmd.prototype._secondLeft = function (percent, start) {
	var now = Date.now();
	var elapsedSecond = ~~((now - start) / 1000);
	var estimateSecond = ~~(elapsedSecond / percent);
	return estimateSecond - elapsedSecond;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Download assets (json + images) for given map id onto the disk
 *
 *  @param {String[]} mapId - Id of the map to preload
 *  @param {Function} cb    - asynchronous callback function
 */
// WARNING: this method was not tested!
// TODO: test this method
function preloadMap(mapId, cb) {
	var mapJsonPath = MAP_PATH + mapId + '.json';
	assetPreloading.loadJson(mapJsonPath, function (mapJson) {
		var assetUrls = [BG_PATH + mapId + '.jpg'];

		if (mapJson.foreground) {
			assetUrls.push(FG_PATH + mapId + '.jpg');
		}

		var layer = mapJson.midgroundLayer;
		for (var keys = Object.keys(layer), k = 0; k < keys.length; k++) {
			var cellId = keys[k];
			var elemList = layer[cellId];
			for (var i = 0; i < elemList.length; i++) {
				var elem = elemList[i];
				var gfxId = elem.g;
				if (!gfxId) { continue; }
				var extention = elem.jpg ? 'jpg' : 'png';
				var fileName  = extention + '/' + gfxId + '.' + extention;
				assetUrls.push(IMG_PATH + fileName);
			}
		}

		assetPreloading.preloadAssets(assetUrls, false, null, function (imageUrls) {
			cb(null, imageUrls);
		});
	});
}

PreloadCmd.prototype.preloadArea = function (area) {
	area = area || '';
	var self = this;
	var areaId = 0;

	// for now we just understand incarnam
	if (area.toLowerCase() === 'incarnam') {
		areaId = this._INCARNAM_AREA_ID;
	}

	if (!areaId) {
		return this._onError('noArea');
	}

	staticContent.getAllDataMap('SubAreas', function (err, subAreasData) {
		if (err) {
			return self._onError(err);
		}

		// gathering all map ids with the wanted area id

		var allMapIds = [];

		for (var key in subAreasData) {
			if (subAreasData.hasOwnProperty(key)) {
				var subArea = subAreasData[key];
				var mapsIds = subArea.mapIds || [];
				if (subArea.areaId !== areaId) {
					continue;
				}
				allMapIds = allMapIds.concat(mapsIds);
			}
		}

		// preload

		var nbTotalMaps = allMapIds.length;
		var count = 0;
		var startTime = Date.now();
		return async.forEachSeries(allMapIds, function (mapId, callback) {
			return preloadMap(mapId, function (err) {
				if (err) {
					self._onError(err);
					return callback(err);
				}

				// update the percent and the second left estimation
				var percent = Math.round(count / nbTotalMaps * 100) / 100;
				var secondLeft = self._secondLeft(percent, startTime);

				count++;
				self.emit('step', {
					count:       count,
					nbTotalMaps: nbTotalMaps,
					percent:     percent,
					secondLeft:  secondLeft
				});
				return callback();
			});
		}, function (err) {
			if (err) {
				return self._onError(err);
			}
			return self._onEnd({
				area:          area,
				elapsedSecond: ~~((Date.now() - startTime) / 1000)
			});
		});
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/AdminConsoleWindow/PreloadCmd/index.js
 ** module id = 645
 ** module chunks = 0
 **/