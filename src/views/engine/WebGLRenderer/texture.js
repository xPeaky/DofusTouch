var WebGLRenderer = require('./main.js');

function isPowerOfTwo(x) {
	return (x & (x - 1)) === 0;
}

WebGLRenderer.prototype._setFiltering = function (dimensions, filtering, textureId) {
	var gl = this.gl;

	var minFilter = gl.LINEAR;
	var magFilter = gl.LINEAR;
	switch (filtering) {
	case 'nearest':
		magFilter = gl.NEAREST;
		break;
	case 'mipmap':
		if (isPowerOfTwo(dimensions.width) && isPowerOfTwo(dimensions.height)) {
			minFilter = gl.LINEAR_MIPMAP_LINEAR;
			gl.generateMipmap(gl.TEXTURE_2D);
		} else {
			// Mipmap not supported on non-power of 2 images
			// Fallback to linear filtering
			console.warn(
				'[WebGLRenderer._setFiltering]',
				'Cannot build mipmap from image', textureId, ' because its dimensions are not a power of 2.'
			);
		}
		break;
	}

	// Set the parameters so we can render any image size
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);

	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
};


WebGLRenderer.prototype.holdTexture = function (textureId) {
	return this.textureCache.holdElement(textureId);
};

WebGLRenderer.prototype.useTexture = function (textureId) {
	return this.textureCache.useElement(textureId);
};

WebGLRenderer.prototype.createTexture = function (imageData, textureId, filtering, type) {
	var textureHandle = this.textureCache.holdElement(textureId);
	if (textureHandle) {
		// Texture already in cache
		return textureHandle;
	}

	var gl = this.gl;

	// Creating a new texture
	var textureBinder = gl.createTexture();

	// Binding it
	gl.bindTexture(gl.TEXTURE_2D, textureBinder);

	// Alpha premultiplication will be applied when loading the texture
	gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);

	// Loading the image onto the GPU
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imageData);

	// Setting its filtering
	this._setFiltering(imageData, filtering, textureId);

	var textureData = {
		binder: textureBinder,
		width:  imageData.width,
		height: imageData.height
	};

	return this.textureCache.addAndHoldElement(textureData, 4 * imageData.width * imageData.height, textureId, type);
};

WebGLRenderer.prototype.getEmptyTexture = function () {
	return this.emptyTexture;
};





/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/WebGLRenderer/texture.js
 ** module id = 275
 ** module chunks = 0
 **/