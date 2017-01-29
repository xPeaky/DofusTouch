var WebGLRenderer = require('./main.js');

function RenderTarget(textureBinder, frameBufferBinder, width, height) {
	this.textureBinder     = textureBinder;
	this.frameBufferBinder = frameBufferBinder;

	this.width  = width;
	this.height = height;

	this.matrixStack = [[
		2,  0, -1, 0, // transform for position x
		0, -2,  1, 0, // transform for position y
		1,  1,  1, 1, // color multiplication
		0,  0,  0, 0  // color addition
	]];

	this.scissor = null;
	this.texture = null;
}

WebGLRenderer.prototype._createRenderTarget = function (textureBinder, frameBufferBinder, width, height) {
	return new RenderTarget(textureBinder, frameBufferBinder, width, height);
};

WebGLRenderer.prototype._setScissor = function (scissor) {
	var gl = this.gl;
	if (scissor === null) {
		gl.disable(gl.SCISSOR_TEST);
	} else {
		gl.enable(gl.SCISSOR_TEST);
		gl.scissor(scissor[0], scissor[1], scissor[2], scissor[3]);
	}
};

WebGLRenderer.prototype.enableScissor = function (x, y, w, h) {
	var scissor = [x, y, w, h];
	this._renderTarget.scissor = scissor;
	this._setScissor(scissor);
};

WebGLRenderer.prototype.disableScissor = function () {
	var scissor = null;
	this._renderTarget.scissor = scissor;
	this._setScissor(scissor);
};

// function upperPowerOfTwo(x) {
// 	x -= 1;
// 	x |= x >> 1;
// 	x |= x >> 2;
// 	x |= x >> 4;
// 	x |= x >> 8;
// 	x |= x >> 16;
// 	return x + 1;
// }

WebGLRenderer.prototype.startTextureUsage = function (w, h, ratio, textureId, filtering) {
	var gl = this.gl;

	ratio = ratio || this.prerenderRatio;
	w = Math.min(Math.ceil(w * ratio), this._maxTextureSize);
	h = Math.min(Math.ceil(h * ratio), this._maxTextureSize);

	// Allocating texture of correct size

	// Creating a new texture and a frame buffer
	var textureBinder     = gl.createTexture();
	var frameBufferBinder = gl.createFramebuffer();

	// Creating a new render target and adding it to the list of render targets
	var renderTarget = new RenderTarget(textureBinder, frameBufferBinder, w, h);

	// Giving correct dimension to the texture
	gl.bindTexture(gl.TEXTURE_2D, textureBinder);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
	this._setFiltering(renderTarget, filtering);

	// Binding texture to frame buffer
	gl.bindFramebuffer(gl.FRAMEBUFFER, frameBufferBinder);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, textureBinder, 0);

	// Switching back to currently used render target
	gl.bindFramebuffer(gl.FRAMEBUFFER, this._renderTarget.frameBufferBinder);

	var textureData = {
		binder: textureBinder,
		width:  w,
		height: h
	};

	// Returning a texture handle
	renderTarget.texture = this.textureCache.addAndHoldElement(textureData, 4 * w * h, textureId);

	return renderTarget;
};

WebGLRenderer.prototype._setRenderTarget = function (renderTarget, clear) {
	var gl = this.gl;

	// Switching render target
	this._renderTarget = renderTarget;
	gl.bindFramebuffer(gl.FRAMEBUFFER, renderTarget.frameBufferBinder);

	// Setting viewport and scissor dimensions corresponding to render target
	gl.viewport(0, 0, renderTarget.width, renderTarget.height);
	this._setScissor(renderTarget.scissor);

	// Clearing if required
	if (clear) {
		gl.clear(gl.COLOR_BUFFER_BIT);
	}

	// Switching to matrix stack corresponding to render target
	this._matrixStack = renderTarget.matrixStack;
};

WebGLRenderer.prototype.startTextureRendering = function (renderTarget, x0, x1, y0, y1, clear) {
	// Adding to target render stack
	this._renderTargetStack.push(renderTarget);
	this._setRenderTarget(renderTarget, clear);

	// Setting proper transformation matrix
	var sx = 2 / Math.max(x1 - x0, 1);
	var sy = 2 / Math.max(y1 - y0, 1);

	var matrix = this._matrixStack[0];

	matrix[0] = sx;
	matrix[4] = 0;
	matrix[1] = 0;
	matrix[5] = sy;

	matrix[2] = -x0 * sx - 1;
	matrix[6] = -y0 * sy - 1;

	matrix[8]  = 1;
	matrix[9]  = 1;
	matrix[10] = 1;
	matrix[11] = 1;
	matrix[12] = 0;
	matrix[13] = 0;
	matrix[14] = 0;
	matrix[15] = 0;
};

WebGLRenderer.prototype.stopTextureRendering = function (deleteFramebuffer) {
	// To debug prerendering
	// this._debugRenderTarget();

	// Popping render target from stack
	var renderTarget = this._renderTargetStack.pop();
	this._setRenderTarget(this._renderTargetStack[this._renderTargetStack.length - 1]);

	if (deleteFramebuffer) {
		this.gl.deleteFramebuffer(renderTarget.frameBufferBinder);
	}
};

WebGLRenderer.prototype._debugRenderTarget = function () {
	var rt = this._renderTargetStack[this._renderTargetStack.length - 1];

	// Fetching pixels of rendered texture (on currently used frame buffer)
	var w = rt.width;
	var h = rt.height;
	var gl = this.gl;
	var pixels = new Uint8Array(w * h * 4);
	gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

	var nPixels  = pixels.length;
	var alphaSum = 0;
	for (var p = 3; p < nPixels; p += 4) {
		alphaSum += pixels[p];
	}

	// For debugging purpose:
	var testCanvas  = document.createElement('canvas');
	var testContext = testCanvas.getContext('2d');
	testCanvas.width  = w;
	testCanvas.height = h;
	document.body.appendChild(testCanvas);
	testCanvas.style.position = 'absolute';
	testCanvas.style.left = 100 + 'px';
	testCanvas.style.top  = 100 + 'px';
	var testData  = testContext.getImageData(0, 0, w, h);
	var testPixel = testData.data;
	for (p = 3; p < nPixels; p += 4) {
		testPixel[p - 3] = pixels[p - 3];
		testPixel[p - 2] = pixels[p - 2];
		testPixel[p - 1] = pixels[p - 1];
		testPixel[p - 0] = pixels[p - 0];
	}
	testContext.putImageData(testData, 0, 0);
	testContext.fillRect(w / 2 - 5, h / 2 - 5, 10, 10);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/WebGLRenderer/renderTarget.js
 ** module id = 273
 ** module chunks = 0
 **/