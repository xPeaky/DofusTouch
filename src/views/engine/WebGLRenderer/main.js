var constants = require('constants');
var Cache3State = require('Cache3State');
var SuperFastMemoryPartitioner = require('SuperFastMemoryPartitioner');
var _isWebGlSupported = null;

function WebGLRenderer(canvas, width, height, maxSpritesInMemory, maxTextureMemory, prerenderRatio, transparent) {
	this.canvas = canvas;

	// Get A WebGL context
	var gl = this.gl = WebGLRenderer.getWebGlContext(this.canvas, false, transparent);

	gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
	gl.enable(gl.BLEND);
	gl.activeTexture(gl.TEXTURE0);

	this.resetClearColor();

	// Generating size attributes
	var floatSize = 4;
	var shortSize = 2;
	var byteSize  = 1;

	var nbPosComponents = 2;
	var nbTexComponents = 2;
	var nbColComponents = 8;

	this._vertexSize = floatSize * nbPosComponents + shortSize * nbTexComponents + byteSize * nbColComponents;
	this._spriteSize = 6 * this._vertexSize;
	this._lineSize   = 2 * this._vertexSize;
	this._boxSize    = 6 * this._vertexSize;

	this._initPrograms();

	// Allocating vertex buffer memory
	this.initBuffer(maxSpritesInMemory);

	this.sFMPartitioner = new SuperFastMemoryPartitioner(this._spriteSize, maxSpritesInMemory * this._spriteSize);

	this._initTextureCache(maxTextureMemory);

	this._programs = [];
	this.useProgram(this._programRegular);

	// Additional properties to handle several render targets
	// Could also be used for blendings and filters
	var defaultBuffer  = gl.getParameter(gl.FRAMEBUFFER_BINDING);
	this._renderTarget = this._createRenderTarget(null, defaultBuffer, 1, 1);

	this._renderTargetStack = [this._renderTarget];

	this._matrixStack = this._renderTarget.matrixStack;

	// Setting dimension of the viewport
	this._width  = 1;
	this._height = 1;
	this.resetDimension(width || 0, height || 0);

	this._maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);

	this.prerenderRatio = prerenderRatio;
	this.maskQuality    = 0.5; // Masks rendering quality reduced for performance reasons

	this._drawModes = {
		lines:     gl.LINES,
		triangles: gl.TRIANGLES
	};

	// Generating empty texture
	this.emptyTexture = this.createTexture(constants.EMPTY_IMAGE, 'empty_texture', 'linear', 'permanent');
}
module.exports = WebGLRenderer;

WebGLRenderer.prototype.resetClearColor = function () {
	this.gl.clearColor(0.0, 0.0, 0.0, 0.0);
};

WebGLRenderer.prototype.setClearColor = function (r, g, b, a) {
	this.gl.clearColor(r, g, b, a);
};

WebGLRenderer.prototype._initTextureCache = function (maxTextureMemory) {
	var gl = this.gl;
	function deleteTexture(textureData) {
		// Removing texture from GPU Memory
		gl.deleteTexture(textureData.binder);
	}

	this.textureCache = new Cache3State(maxTextureMemory, deleteTexture);
};

WebGLRenderer.prototype.resetDimension = function (width, height) {
	var prevWidth  = this._width;
	var prevHeight = this._height;

	this._width  = width;
	this._height = height;

	this.gl.viewport(0, 0, width, height);

	var renderTarget = this._renderTargetStack[0];
	renderTarget.width  = width;
	renderTarget.height = height;

	// Computing new viewport transformation with respect to previous and current dimension
	var sw = prevWidth  / this._width;
	var sh = prevHeight / this._height;
	var matrixStack  = renderTarget.matrixStack;
	for (var m = 0; m < matrixStack.length; m += 1) {
		var matrix = matrixStack[m];
		matrix[0] *= sw;
		matrix[1] *= sw;
		matrix[2] = (matrix[2] + 1.0) * sw - 1.0;

		matrix[4] *= sh;
		matrix[5] *= sh;
		matrix[6] = (matrix[6] - 1.0) * sh + 1.0;
	}
};

WebGLRenderer.prototype.getNbBytesPerSprite = function () {
	return this._spriteSize;
};

WebGLRenderer.prototype.getNbBytesPerLine = function () {
	return this._lineSize;
};

WebGLRenderer.prototype.getNbBytesPerBox = function () {
	return this._boxSize;
};

WebGLRenderer.prototype.getNbBytesPerVertex = function () {
	return this._vertexSize;
};

WebGLRenderer.prototype.enableBlending = function () {
	var gl = this.gl;
	gl.enable(gl.BLEND);
};

WebGLRenderer.prototype.disableBlending = function () {
	var gl = this.gl;
	gl.disable(gl.BLEND);
};

WebGLRenderer.prototype.drawImage = function (texture, x, y, w, h) {
	if (!texture) {
		// Ignoring the draw
		return;
	}

	var matrix = this._matrixStack[0];

	// Saving matrix
	var a = matrix[0];
	var b = matrix[4];
	var c = matrix[1];
	var d = matrix[5];
	var e = matrix[2];
	var f = matrix[6];

	// Applying transformations
	matrix[2] += a * x + c * y;
	matrix[6] += b * x + d * y;
	matrix[0] *= w;
	matrix[4] *= w;
	matrix[1] *= h;
	matrix[5] *= h;

	// Loading transformation matrix
	this.gl.uniformMatrix4fv(this._currentProgram.uniforms.uMatrix, false, matrix);

	// Setting texture
	var textureBinder = this.textureCache.useElement(texture.id).element.binder;
	this.gl.bindTexture(this.gl.TEXTURE_2D, textureBinder);

	// Draw
	this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

	// Restoring matrix
	matrix[0] = a;
	matrix[4] = b;
	matrix[1] = c;
	matrix[5] = d;
	matrix[2] = e;
	matrix[6] = f;
};

WebGLRenderer.prototype.clear = function () {
	this.gl.clear(this.gl.COLOR_BUFFER_BIT);
};

WebGLRenderer.isWebGlSupported = function () {
	if (_isWebGlSupported !== null) {
		return _isWebGlSupported;
	}

	var canvas = document.createElement('canvas');
	_isWebGlSupported = !!WebGLRenderer.getWebGlContext(canvas, true);
	return _isWebGlSupported;
};

WebGLRenderer.getWebGlContext = function (canvas, silentError, transparent) {
	var gl = null;
	try {
		var contextOptions = {
			alpha: transparent,
			depth: false,
			stencil: false,
			antialias: false
		};

		gl = canvas.getContext('webgl', contextOptions) || canvas.getContext('experimental-webgl', contextOptions);
	} catch (err) {
		if (!silentError) {
			throw new Error('Could not initialise WebGL (' + err.message + ')');
		}
		return null;
	}
	if (!gl) {
		if (!silentError) {
			throw new Error('Could not initialise WebGL, sorry :-(');
		}
		return null;
	}
	return gl;
};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/WebGLRenderer/main.js
 ** module id = 268
 ** module chunks = 0
 **/