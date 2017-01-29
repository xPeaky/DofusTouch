var constants       = require('constants');
var assetPreloading = require('assetPreloading');

// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * @module Texture Loader
 * @desc   API to load an image and create a texture from it
 *
 * @author  Brice Chevalier
 *
 */

exports.loadTexture = function (textureUrl, cb, textureCache, filtering, cachingStrategy) {
	var textureHandle = textureCache.holdTexture(textureUrl);
	if (textureHandle) {
		cb(textureHandle);
		return;
	}

	assetPreloading.loadImage(textureUrl, function (image) {
		var textureHandle;
		if (image === constants.EMPTY_IMAGE) {
			// Returning empty texture if something wrong happened
			textureHandle = textureCache.getEmptyTexture();
		} else {
			textureHandle = textureCache.createTexture(image, textureUrl, filtering, cachingStrategy);
		}

		cb(textureHandle);
	});
};

exports.loadTextures =
	function (textureUrls, onTextureLoaded, onAllTexturesLoaded, textureCache, filtering, cachingStrategy) {
	var texturesToLoadUrls    = [];
	var texturesToLoadIndexes = [];

	var nTextures = textureUrls.length;
	for (var t = 0; t < nTextures; t += 1) {
		var textureUrl = textureUrls[t];
		var textureHandle = textureCache.holdTexture(textureUrl);
		if (textureHandle) {
			onTextureLoaded(textureHandle, t);
		} else {
			texturesToLoadUrls.push(textureUrl);
			texturesToLoadIndexes.push(t);
		}
	}

	if (texturesToLoadUrls.length === 0) {
		return onAllTexturesLoaded && onAllTexturesLoaded();
	}

	assetPreloading.loadImages(texturesToLoadUrls, function (image, textureIndex) {
		var textureUrl = texturesToLoadUrls[textureIndex];
		var textureHandle;
		if (image === constants.EMPTY_IMAGE) {
			// Returning empty texture if something wrong happened
			textureHandle = textureCache.getEmptyTexture();
		} else {
			textureHandle = textureCache.createTexture(image, textureUrl, filtering, cachingStrategy);
		}

		onTextureLoaded(textureHandle, texturesToLoadIndexes[textureIndex]);
	}, onAllTexturesLoaded);
};








/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/textureLoading/index.js
 ** module id = 252
 ** module chunks = 0
 **/