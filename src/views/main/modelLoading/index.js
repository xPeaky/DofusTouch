/** @module loadTemplate */

var constants        = require('constants');
var assetPreloading  = require('assetPreloading');

// Root of different types of animations/textures
var MODELS_PATH = {
	skin:        constants.SKIN_PATH,
	bone:        constants.BONE_PATH,
	icon:        constants.ICON_PATH,
	bitmapFonts: constants.BITMAP_FONTS,
	ornaments:   constants.ORNAMENT_PATH,
	embedded:    constants.EMBEDDED_PATH
};

/**
 * @method
 * @desc Load and create a template with the appropriate texture and animation
 *
 * @param  {string}   modelType    - Type of the model to load
 * @param  {array}    modelId      - Id of the model to create
 * @param  {function} cb           - Callback method triggered when the template has been created
 * @param  {object}   textureCache - Cache to fetch and store the texture of the template
 */
exports.loadModel = function (modelType, modelId, cb, textureCache, filtering, cachingStrategy) {
	var modelPath = MODELS_PATH[modelType] + modelId;
	var imageUrl  = modelPath + '.png';
	var jsonUrl   = modelPath + '.json';

	var image, jsonData; // To store the image and json when they are loaded

	var nAssetsLoaded = 0;
	var nAssetsToLoad = 1; // At least the json has to be loaded

	var loadImage;
	if (textureCache) {
		// Using a cache
		image = textureCache.holdTexture(imageUrl);
		if (image) {
			// Image in cache
			loadImage = false;
		} else {
			// Image not in cache
			loadImage = true;
			nAssetsToLoad += 1;
		}
	} else {
		// Not using a cache, the image will have to be loaded
		loadImage = true;
		nAssetsToLoad += 1;
	}

	function onJsonLoaded(justLoadedJsonData) {
		jsonData = justLoadedJsonData;
		nAssetsLoaded += 1;
		if (nAssetsLoaded === nAssetsToLoad) {
			return cb && cb(jsonData, image);
		}
	}

	assetPreloading.loadJson(jsonUrl, onJsonLoaded);

	if (loadImage === false) {
		return;
	}

	function onImageLoaded(justLoadedImage) {
		if (textureCache) {
			// Using a cache, creating a texture
			image = textureCache.createTexture(justLoadedImage, imageUrl, filtering, cachingStrategy);
		} else {
			// Not using a cache, returning the image as such
			image = justLoadedImage;
		}

		nAssetsLoaded += 1;
		if (nAssetsLoaded === nAssetsToLoad) {
			return cb && cb(jsonData, image);
		}
	}

	assetPreloading.loadImage(imageUrl, onImageLoaded);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/modelLoading/index.js
 ** module id = 290
 ** module chunks = 0
 **/