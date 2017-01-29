var constants = require('constants');

// map of the missing assets extracted from the logs between 2016/06/09 and 2016/07/11
//TODO: please remove line by line from that json as we fix the problems, that json should disappear
var missingAssetMap = require('json!./missingAssetsUniqNotOnCDN.json');

var LOADING_LIMIT             = 30; // Maximum number of assets that can be loaded simultaneously
var NB_RETRIES                = 3;  // Maximum number of times an asset can fail to load before giving up
var MAX_SIMULTANEOUS_REQUESTS = 5; // Maximum number of loading requests within the current javascript loop iteration

var assetsData   = {}; // Loading informations of all the assets that were required to load
var assetBacklog = []; // Assets waiting to start loading

var nbAssetsLoading        = 0; // Number of assets currently being loaded
var nbSimultaneousRequests = 0; // Number of loading requests within the current javascript loop iteration

var setTimeout = window.setTimeout;
function resetCurrentRequestCount() {
	nbSimultaneousRequests = 0;
}

var HTTP_REQUEST_ERROR = window.WizAssetsError && window.WizAssetsError.HTTP_REQUEST_ERROR;
function canRetry(error) {
	return error.code === HTTP_REQUEST_ERROR && error.status > 499;
}

function AssetLoadingData(url, cssFormat, callback, loadBatchIndex) {
	this.url            = url;
	this.cssFormat      = cssFormat;
	this.callback       = callback;
	this.loadBatchIndex = loadBatchIndex;
}

function isForUi(url) {
	return /^\/?ui\//.test(url);
}

function isForWizAssets(url) {
	return !!(!isForUi(url) && window.wizAssets);
}

function initiateAssetLoading(assetUrl) {
	nbAssetsLoading += 1;

	if (!assetUrl) { return notifyAsLoaded('emptyPath', assetUrl); }

	// TODO: try to make something more dynamic
	if (isForUi(assetUrl)) {
		if (window.wizAssets) {
			return notifyAsLoaded(null, assetUrl, constants.CDV_PATH + '/' + assetUrl);
		}
		return notifyAsLoaded(null, assetUrl, window.Config.uiUrl + '/' + assetUrl);
	}

	var remoteUrl = window.Config.assetsUrl + '/' + assetUrl;
	if (!window.wizAssets) {
		return notifyAsLoaded(null, assetUrl, remoteUrl);
	}

	var nbRemainingTries = NB_RETRIES;

	var success = function (onDiskUrl) {
		return notifyAsLoaded(null, assetUrl, onDiskUrl);
	};

	var fail = function (error) {
		nbRemainingTries -= 1;
		if (nbRemainingTries > 0 && canRetry(error)) {
			return window.wizAssets.downloadFile(remoteUrl, assetUrl, success, fail);
		}
		return notifyAsLoaded(error, assetUrl, null);
	};

	// check if the asset is part of the known missing assets
	if (missingAssetMap[assetUrl]) {
		console.warn('initiateAssetLoading: known missing asset "' + assetUrl + '" will be skip');
		return notifyAsLoaded(null, assetUrl, null);
	}

	// WizAsset will return path on disc if present
	// otherwise it will load the asset before returning the path on disc
	return window.wizAssets.downloadFile(remoteUrl, assetUrl, success, fail);
}

function notifyAsLoaded(error, assetUrl, fullUrl) {
	if (error) {
		console.error('notifyAsLoaded: Could not load asset: ' + assetUrl + ' (' + JSON.stringify(error) + ')');
	}

	var assetDataArray = assetsData[assetUrl];

	for (var a = 0; a < assetDataArray.length; a += 1) {
		var assetData = assetDataArray[a];

		var callback       = assetData.callback;
		var loadBatchIndex = assetData.loadBatchIndex;

		var formattedUrl;
		if (fullUrl) {
			formattedUrl = assetData.cssFormat ? 'url("' + fullUrl + '")' : fullUrl;
		} else {
			formattedUrl = null;
		}

		if (callback) {
			callback(formattedUrl, loadBatchIndex);
		}
	}

	// Deleting assets data array corresponding to given asset url
	// It means that the asset corresponding to the given url has been loaded
	delete assetsData[assetUrl];

	// One less asset loading
	nbAssetsLoading -= 1;

	// Assets might be waiting to start loading
	initiateAssetsLoading();
}

function initiateAssetsLoading() {
	while (nbAssetsLoading < LOADING_LIMIT && assetBacklog.length > 0) {
		var assetUrl = assetBacklog.pop();
		initiateAssetLoading(assetUrl);
	}
}

function preloadAsset(assetUrl, cssFormat, cb, loadBatchIndex) {
	var assetData = new AssetLoadingData(assetUrl, cssFormat, cb, loadBatchIndex);

	if (assetsData[assetUrl]) {
		// Asset currently loading
		assetsData[assetUrl].push(assetData);
	} else {
		// Asset not currently loading
		assetsData[assetUrl] = [assetData];
		if (nbAssetsLoading < LOADING_LIMIT) {
			initiateAssetLoading(assetUrl);
		} else {
			assetBacklog.push(assetUrl);
		}
	}
}
exports.preloadAsset = preloadAsset;

function preloadAssets(assetUrls, cssFormat, onAssetLoaded, onAllAssetsLoaded) {
	var fullUrls = [];
	var nAssetsToLoad = assetUrls.length;
	if (nAssetsToLoad === 0) {
		return onAllAssetsLoaded && onAllAssetsLoaded(fullUrls);
	}

	var nAssetsLoaded = 0;
	function onLoad(fullUrl, loadBatchIndex) {
		fullUrls[loadBatchIndex] = fullUrl;

		nAssetsLoaded += 1;
		if (onAssetLoaded) {
			onAssetLoaded(fullUrl, loadBatchIndex);
		}

		if (nAssetsLoaded === nAssetsToLoad) {
			return onAllAssetsLoaded && onAllAssetsLoaded(fullUrls);
		}
	}

	for (var u = 0; u < assetUrls.length; u += 1) {
		preloadAsset(assetUrls[u], cssFormat, onLoad, u);
	}
}
exports.preloadAssets = preloadAssets;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Download specified assets. Return css formated string with asset uri
 *
 *  @param {String[]} assets - list of assets to preload
 *  @param {Function} cb     - asynchronous callback function
 */
exports.preloadImages = function (assetUrls, onAllAssetsLoaded) {
	return preloadAssets(assetUrls, true, null, onAllAssetsLoaded);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
exports.preloadImage = function (assetUrl, cb) {
	return preloadAsset(assetUrl, true, cb);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Download specified assets. Returns asset uri
 *
 *  @param {String[]} assets - list of assets to preload
 *  @param {Function} cb     - asynchronous callback function
 */
exports.preloadImageUrls = function (assetUrls, onAllAssetsLoaded) {
	return preloadAssets(assetUrls, false, null, onAllAssetsLoaded);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
exports.preloadImageUrl = function (assetUrl, cb) {
	return preloadAsset(assetUrl, false, cb);
};

function requestExecution(requestedExecution, assetUrl, fullUrl, onExecutionComplete, urlIndex) {
	if (nbSimultaneousRequests === 0) {
		setTimeout(resetCurrentRequestCount, 0);
	}

	if (nbSimultaneousRequests < MAX_SIMULTANEOUS_REQUESTS) {
		nbSimultaneousRequests += 1;
		requestedExecution(assetUrl, fullUrl, onExecutionComplete, urlIndex);
	} else {
		setTimeout(function () {
			requestExecution(requestedExecution, assetUrl, fullUrl, onExecutionComplete, urlIndex);
		}, 0);
	}
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
function loadAndCreateImage(assetUrl, imageUrl, cb, imageIndex) {
	if (!imageUrl) {
		return cb(constants.EMPTY_IMAGE, imageIndex);
	}

	var imgCrossOrigin = window.Config.imgCrossOrigin;
	var img = new Image();
	if (imgCrossOrigin) {
		img.crossOrigin = imgCrossOrigin;
	}

	var nbRemainingTries = NB_RETRIES;

	img.onload = function () {
		// Resetting callbacks to avoid memory leaks
		this.onload  = null;
		this.onerror = null;
		return cb(this, imageIndex);
	};

	img.onerror = function () {
		nbRemainingTries -= 1;
		if (nbRemainingTries > 0) {
			this.src = imageUrl;
			return;
		}

		// Resetting callbacks to avoid memory leaks
		this.onload  = null;
		this.onerror = null;

		if (isForWizAssets(assetUrl)) {
			//TODO: move the console.error outside the if condition when UI assets problems are fixed
			console.error('loadAndCreateImage: Image not found: ' + imageUrl);
			window.wizAssets.deleteFile(assetUrl, function () {}, function (error) {
				console.error('loadAndCreateImage: Image could not be deleted: ' + imageUrl + ' with error: ' + error);
			});
		}
		return cb(constants.EMPTY_IMAGE, imageIndex);
	};

	img.src = imageUrl;
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Load a list of images to memory
 *
 *  @param {String[]} assets - list of assets to preload. e.g. "gfx/items/1001.png"
 *  @param {Function} cb     - asynchronous callback function
 *
 *  @return {Image[]}
 */
exports.loadImages = function (imageUrls, onImageLoaded, onAllImagesLoaded) {
	var images = [];

	var nImagesCreated  = 0;
	var nImagesToCreate = imageUrls.length;
	if (nImagesToCreate === 0) {
		return onAllImagesLoaded && onAllImagesLoaded(images);
	}

	function onImageCreated(image, imageIndex) {
		images[imageIndex] = image;
		nImagesCreated += 1;
		if (onImageLoaded) {
			onImageLoaded(image, imageIndex);
		}
		if (nImagesCreated === nImagesToCreate) {
			return onAllImagesLoaded && onAllImagesLoaded(images);
		}
	}

	preloadAssets(imageUrls, false, function (fullImageUrl, imageIndex) {
		requestExecution(loadAndCreateImage, imageUrls[imageIndex], fullImageUrl, onImageCreated, imageIndex);
	}, null);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Load one image to memory
 *
 *  @param {String} asset - asset path "gfx/items/1001.png"
 *  @param {Function} cb  - asynchronous callback function
 *
 *  @return {Image}
 */
exports.loadImage = function (imageUrl, cb) {
	preloadAsset(imageUrl, false, function (fullImageUrl) {
		requestExecution(loadAndCreateImage, imageUrl, fullImageUrl, cb);
	});
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
function loadAndParseJson(assetUrl, jsonUrl, cb, jsonFileIndex) {
	if (!jsonUrl) {
		return cb(constants.EMPTY_JSON, jsonFileIndex);
	}

	var nbRemainingTries = NB_RETRIES;

	var xobj = new XMLHttpRequest();
	xobj.onreadystatechange = function () {
		if (~~xobj.readyState !== 4) { return; }
		// In Android Chrome WebView,
		// requesting the cache using XHR returns a status 0 with the right response
		// TODO: Check after each new LudeiWebView releases if this has been fixed
		if (~~xobj.status !== 200 && ~~xobj.status !== 0) {
			nbRemainingTries -= 1;
			if (nbRemainingTries > 0) {
				xobj.open('GET', jsonUrl, true);
				xobj.send();
				return;
			}

			// Loading failed

			//TODO: remove me when UI assets problems are fixed
			if (!isForUi(assetUrl)) {
				console.error('loadAndParseJson: Failed to load json ' + jsonUrl + ': ' + xobj.status);
			}
			return cb(constants.EMPTY_JSON, jsonFileIndex);
		}

		var jsonData;
		try {
			jsonData = JSON.parse(xobj.response);
		} catch (error) {
			//TODO: move the console.error outside the if condition when UI assets problems are fixed
			if (isForWizAssets(assetUrl)) {
				console.error('loadAndParseJson: Could not parse json ' + jsonUrl + ': ' + error);
				window.wizAssets.deleteFile(assetUrl, function () {}, function (error) {
					console.error('loadAndParseJson: json could not be deleted: ' + jsonUrl + ' with error: ' + error);
				});
			}
			return cb(constants.EMPTY_JSON, jsonFileIndex);
		}

		return cb(jsonData, jsonFileIndex);
	};

	xobj.open('GET', jsonUrl, true);
	xobj.send();
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Load a list of images to memory
 *
 *  @param {String[]} assets - list of assets to preload. e.g. "gfx/items/1001.png"
 *  @param {Function} cb     - asynchronous callback function
 *
 *  @return {Image[]}
 */
exports.loadJsons = function (jsonUrls, onJsonLoaded, onAllJsonsLoaded) {
	preloadAssets(jsonUrls, false, function (fullJsonUrls, jsonFileIndex) {
		requestExecution(loadAndParseJson, jsonUrls[jsonFileIndex], fullJsonUrls, onJsonLoaded, jsonFileIndex);
	}, onAllJsonsLoaded);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Load one image to memory
 *
 *  @param {String} asset - asset path "gfx/items/1001.png"
 *  @param {Function} cb  - asynchronous callback function
 *
 *  @return {Image}
 */
exports.loadJson = function (jsonUrl, cb) {
	preloadAsset(jsonUrl, false, function (fullJsonUrl) {
		requestExecution(loadAndParseJson, jsonUrl, fullJsonUrl, cb);
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/assetPreloading/index.js
 ** module id = 5
 ** module chunks = 0
 **/