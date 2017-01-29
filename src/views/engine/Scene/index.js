var Camera        = require('Camera');
var OrderedList   = require('OrderedList');
var WebGLRenderer = require('WebGLRenderer');

/** Compare function used to sort elements relatively to their z-index (position) and layers on the scene */
function cmpPosition(a, b) {
	if (a._layer === b._layer) {
		return a._position - b._position;
	}
	return a._layer - b._layer;
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Creates an image that will be used to highlight areas refreshed on the scene
 */
function createDebugImage() {
	var debugImage = document.createElement('canvas');
	debugImage.width  = 128;
	debugImage.height = 128;

	var ctx = debugImage.getContext('2d');

	// Texture filling, almost transparent
	ctx.fillStyle = 'rgba(200, 100, 30, 0.27)';
	ctx.fillRect(0, 0, 128, 128);

	// Texture outline, almost opaque
	ctx.lineWidth = 2;
	ctx.strokeStyle = 'rgba(200, 100, 30, 0.9)';
	ctx.strokeRect(0, 0, 128, 128);

	return debugImage;
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Manages display of sprites on a given canvas
 * Sprites are organised on layers, the layer with the highest index being on top
 * Sprites on each layer are organised with respect to their z-indexes (position),
 * the sprite with the highest z-index being on top
 * The scene will be rendered into the given canvas with the given dimensions
 *
 * @param {Object} params
 */
function Scene(params) {
	if (params.name       === undefined) { console.error('[Scene] Parameter `name` required.'); }
	if (params.canvas     === undefined) { console.error('[Scene] Parameter `canvas` required.'); }
	if (params.pixelRatio === undefined) { console.error('[Scene] Parameter `pixelRatio` required.'); }

	if (params.textureRatio === undefined && params.usePrecisionRendering) {
		console.error('[Scene] Parameter `textureRatio` required.');
	}

	if (params.w === undefined) { console.error('[Scene] Parameter `w` required.'); }
	if (params.h === undefined) { console.error('[Scene] Parameter `h` required.'); }
	if (params.t === undefined) { console.error('[Scene] Parameter `t` required.'); }
	if (params.l === undefined) { console.error('[Scene] Parameter `l` required.'); }

	if (params.nbCacheableSprites       === undefined) {
		console.error('[Scene] Parameter `nbCacheableSprites` required.');
	}
	if (params.textureMemoryCacheSize   === undefined) {
		console.error('[Scene] Parameter `textureMemoryCacheSize` required.');
	}
	if (params.prerenderQualityRatio    === undefined) {
		console.error('[Scene] Parameter `prerenderQualityRatio` required.');
	}

	// Name of the scene
	this.name = params.name;

	// Canvas in which the scene is rendered
	this.canvas = params.canvas;
	this.canvas.id = this.name + '-canvas';

	// Maximum allowed zoom for the camera
	this.maxZoom = params.maxZoom || 1;

	// Pixel ratio of the device
	this.pixelRatio = params.pixelRatio;

	// Dimension of texture / dimension of the scene
	this.sceneTextureRatio = params.textureRatio;

	this.viewWidth  = this.canvas.width;
	this.viewHeight = this.canvas.height;

	// Dimension of the scene
	this.adjustToCanvasRatio = params.adjustToCanvasRatio || false;

	this.w = params.w;
	this.h = params.h;
	this.l = params.l;
	this.t = params.t;
	this.r = this.l + this.w;
	this.b = this.t + this.h;

	// Center of the scene
	var cx = this.w / 2 + this.l;
	var cy = this.h / 2 + this.t;

	// Adding camera to the scene
	this.camera = new Camera(
		cx, cy, 1.0,
		this.l, this.r, this.t, this.b,
		this.canvas.width, this.canvas.height,
		this.maxZoom
	);

	if (params.cameraAcceleration) {
		this.camera.setDefaultAcceleration(params.cameraAcceleration);
	}

	this.cropping = {
		x: -Infinity,
		y: -Infinity,
		w:  Infinity,
		h:  Infinity
	};

	// Display list that contains all the sprites rendered on the scene
	this.displayList = new OrderedList(cmpPosition);

	// Display list that contains all the sprites rendered on top of the scene
	this.hudDisplayList = new OrderedList(cmpPosition);

	// Holds one sprite that is responsible for rendering static elements on the scene
	// Although it is an object of a single sprite,
	// it should have the same behavior as the display list
	this.staticElements = {
		sprite: null,
		render: function (fromElement, toElement) {
			if (this.sprite !== null) {
				// Drawing sprite without applying transformation
				// because the sprite is static
				this.sprite.draw(fromElement, toElement);
			}
		},
		add: function (sprite) {
			this.sprite = sprite;
			return sprite;
		},
		removeByRef: function (sprite) {
			if (sprite === this.sprite) {
				this.sprite = null;
			}
		},
		reposition: function () {
			// Static elements do not get repositioned
		},
		clear: function () {
			if (this.sprite !== null) {
				this.sprite.remove();
			}
		}
	};

	// List of sprites to update when the scene refreshes
	this.updateList = [];

	// Instantiation of a WebGL Renderer
	this.renderer = new WebGLRenderer(this.canvas, 0, 0,
		params.nbCacheableSprites,
		params.textureMemoryCacheSize,
		params.prerenderQualityRatio,
		false // non-transparent
	);

	// Debug properties
	this._debug = false; // Set to true to switch to debug mode, will display sprites' bounding boxes
	this._textureDebug = this.createTexture(createDebugImage(), 'mapDebug', 'linear', 'permanent');

	this.usePrecisionRendering = params.usePrecisionRendering || false;
	if (this.usePrecisionRendering) {
		// Using Precisions Rendering Optimisation
		// It allows to render only the parts of the scene that changed from the previous refresh

		// List of areas to refresh on the scene
		this.areasToRefresh = [];

		// Texture in which the scene is prerendered
		this.sceneRendering = this.renderer.startTextureUsage(
			this.r - this.l,
			this.b - this.t,
			this.sceneTextureRatio,
			this.name
		);

		this.renderingProgram = this.renderer._programFiltering;
		this.renderingParams = { ratio: 0.15, resolution: 250.0 };

		this.refresh = this._refreshPrecisionRendering;
		this.render  = this._compositePrecisionRendering;
		this.clear   = this._clearPrecisionRendering;
	} else {
		this.refresh = this._refresh;
		this.render  = this._composite;
		this.clear   = this._clear;
	}

	// Setting canvas dimension
	this.setCanvasDimensions(this.canvas.width, this.canvas.height);
}
module.exports = Scene;

Scene.prototype.togglePixelArt = function () {
	if (this.renderingProgram === this.renderer._programPixelArt) {
		this.renderingProgram = this.renderer._programFiltering;
	} else {
		this.renderingProgram = this.renderer._programPixelArt;
	}
};

Scene.prototype.setShader = function (shaderName) {
	switch (shaderName) {
	case 'pixelArt':
		this.renderingProgram = this.renderer._programPixelArt;
		break;
	case 'mapTransition':
		this.renderingProgram = this.renderer._programMapTransition;
		break;
	default:
		this.renderingProgram = this.renderer._programFiltering;
	}
};

/** Setting scene transformation that allows to correctly display the scene
 * with respect to the dimensions of the canvas
 */
Scene.prototype._setSceneTransform = function () {
	// Transformation that allows the scene to be rendered with
	// the correct dimension with respect to the canvas size and ratio
	var widthRatio  = this.canvas.width  / this.w;
	var heightRatio = this.canvas.height / this.h;
	var ratio = Math.max(widthRatio, heightRatio);

	var tx = Math.max(0, this.cropping.x) * this.pixelRatio;
	var ty = Math.max(0, this.cropping.y) * this.pixelRatio;

	this.renderer.setTransform(ratio, 0, 0, ratio, tx, ty);
};

Scene.prototype._setFieldOfView = function () {
	this.viewWidth  = Math.min(this.cropping.w, this.canvas.width  / this.pixelRatio);
	this.viewHeight = Math.min(this.cropping.h, this.canvas.height / this.pixelRatio);
	this.camera.setFieldOfView(this.viewWidth, this.viewHeight);

	this._setSceneTransform();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Setting dimensions of the scene's canvas
 *
 * @param {number} viewWidth  - new canvas width
 * @param {number} viewHeight - new canvas height
 */
Scene.prototype.setCanvasDimensions = function (width, height, left, top, position) {
	this.canvas.style.width  = width.toString()  + 'px';
	this.canvas.style.height = height.toString() + 'px';
	if (left     !== undefined) { this.canvas.style.left = left + 'px'; }
	if (top      !== undefined) { this.canvas.style.top  = top  + 'px'; }
	if (position !== undefined) { this.canvas.style.position = position; }

	var canvasW = width  * this.pixelRatio;
	var canvasH = height * this.pixelRatio;

	this.canvas.width  = canvasW;
	this.canvas.height = canvasH;

	this.renderer.resetDimension(canvasW, canvasH);

	if (this.adjustToCanvasRatio) {
		var w = this.h * canvasW / canvasH;
		this.setDimensions(this.l, this.t, w, this.h);
	}

	this._setFieldOfView();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Setting dimensions of the scene's canvas
 *
 * @param {number} l - left offset
 * @param {number} t - top offset
 * @param {number} w - width
 * @param {number} h - height
 */
Scene.prototype.setDimensions = function (l, t, w, h) {
	this.w = w;
	this.h = h;
	this.l = l;
	this.t = t;
	this.r = this.l + this.w;
	this.b = this.t + this.h;

	// Updating camera bounds
	this.camera.setBounds(this.l, this.r, this.t, this.b);
	this._setSceneTransform();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Forces to update the whole scene
 */
Scene.prototype.requireCompleteRefresh = function () {
	// Adding dimension of the scene to areas to update
	this.areasToRefresh.push([this.l, this.r, this.t, this.b]);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** @desc Refresh the scene
 */
Scene.prototype._refresh = function (dt) {
	var cameraMoved = this.camera.updatePosition(dt);

	// Updating sprite animations
	if (this.updateList.length === 0 && cameraMoved === false) {
		// Nothing changed, no need to redraw the scene
		return;
	}

	this.renderer.clear();
	this._composite();
};

Scene.prototype._composite = function () {
	for (var s = 0; s < this.updateList.length; s += 1) {
		this.updateList[s].refreshAnimation();
	}

	// Resetting list of updated sprites
	this.updateList.length = 0;

	// Rendering all the sprites on the scene
	var zoom = this.pixelRatio * this.camera.zoom * Math.min(this.w / this.canvas.width, this.h / this.canvas.height);

	this.renderer.save();
	this.renderer.translate(zoom / this.camera.zoom * this.viewWidth / 2, zoom / this.camera.zoom * this.viewHeight / 2);
	this.renderer.scale(zoom, zoom);
	this.renderer.translate(-this.camera.x, -this.camera.y);
	for (var spriteRef = this.displayList.first; spriteRef !== null; spriteRef = spriteRef.next) {
		spriteRef.object.render();
	}

	if (this._debug) {
		this._renderDebug();
	}

	this.renderer.restore();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Render debug information
 */
Scene.prototype._renderDebug = function () {
	for (var spriteRef = this.displayList.first; spriteRef !== null; spriteRef = spriteRef.next) {
		var sprite = spriteRef.object;
		this.renderer.drawImage(this._textureDebug, sprite.x, sprite.y, sprite.w, sprite.h);
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** @desc Refresh the scene - using precision rendering
 */
Scene.prototype._refreshPrecisionRendering = function (dt) {
	var sceneUpdated = this.camera.updatePosition(dt);

	// Resetting list of updated sprites
	if (this.updateList.length !== 0) {
		for (var s = 0; s < this.updateList.length; s += 1) {
			this.updateList[s].refreshAnimation(this.areasToRefresh);
		}
		this.updateList.length = 0;
	}

	if (this.areasToRefresh.length !== 0) {
		// Scene needs to be refreshed
		// Combining overlapping areas in O(n2) with n the number of areas to refresh
		for (var a0 = 0; a0 < this.areasToRefresh.length; a0 += 1) {
			var area0 = this.areasToRefresh[a0];
			if ((area0[1] <= area0[0]) || (area0[3] <= area0[2])) {
				// Area is positive
				this.areasToRefresh.splice(a0, 1);
				a0 -= 1;
				continue;
			}

			for (var a1 = 0; a1 < this.areasToRefresh.length; a1 += 1) {
				if (a0 === a1) {
					continue;
				}

				var area1 = this.areasToRefresh[a1];
				var overlapX = ((area0[0] - area1[1]) * (area1[0] - area0[1]) > 0);
				var overlapY = ((area0[2] - area1[3]) * (area1[2] - area0[3]) > 0);
				if (overlapX && overlapY) {
					// areas overlap, merging them together
					area0[0] = Math.min(area0[0], area1[0]);
					area0[1] = Math.max(area0[1], area1[1]);
					area0[2] = Math.min(area0[2], area1[2]);
					area0[3] = Math.max(area0[3], area1[3]);
					this.areasToRefresh.splice(a1, 1);
					a1 -= 1;
					if (a1 < a0) {
						a0 -= 1;
					}
				}
			}
		}

		// There is at least one area to refresh
		this._refreshAreas();
		sceneUpdated = true;
	}

	if (sceneUpdated || this.hudDisplayList.count > 0) {
		// Final compositing of the scene
		this._compositePrecisionRendering();

		if (this._debug) {
			this._renderDebugPrecisionRendering(this.areasToRefresh);
		}
		this.areasToRefresh.length = 0;
	}

	if (this.areasToRefresh.length > 0) {
		this.areasToRefresh.length = 0;
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Refresh the given areas on screen
 */
var dummyFirstSprite = { layer: -Infinity };
var dummyLastSprite  = { layer:  Infinity };
Scene.prototype._refreshAreas = function () {
	// Start rendering into the scene texture
	this.renderer.startTextureRendering(
		this.sceneRendering, // render target (texture)
		this.l, // left   bound of the scene
		this.r, // right  bound of the scene
		this.t, // top    bound of the scene
		this.b  // bottom bound of the scene
	);

	var previousElement = dummyFirstSprite;
	for (var a = 0; a < this.areasToRefresh.length; a += 1) {
		var areaToRefresh = this.areasToRefresh[a];

		// Adapting scissor area to texture size (=== area dimensions * sceneTextureRatio)
		// And increasing area to refresh by 1 pixel on each side
		var scissorX = Math.floor(this.sceneTextureRatio * (areaToRefresh[0] - this.l - 1));
		var scissorY = Math.floor(this.sceneTextureRatio * (areaToRefresh[2] - this.t - 1));
		var scissorW =  Math.ceil(this.sceneTextureRatio * (areaToRefresh[1] - areaToRefresh[0] + 2));
		var scissorH =  Math.ceil(this.sceneTextureRatio * (areaToRefresh[3] - areaToRefresh[2] + 2));

		this.renderer.enableScissor(scissorX, scissorY, scissorW, scissorH);

		for (var spriteRef = this.displayList.first; spriteRef !== null; spriteRef = spriteRef.next) {
			var sprite     = spriteRef.object;
			var spriteBbox = sprite.bbox;
			if (spriteBbox[0] >= spriteBbox[1]) {
				// Element cannot be rendered, negative bounding box
				continue;
			}

			// Testing for sprite overlap with the area to refresh
			var overlapX = ((areaToRefresh[0] - spriteBbox[1]) * (spriteBbox[0] - areaToRefresh[1]) >= 0);
			var overlapY = ((areaToRefresh[2] - spriteBbox[3]) * (spriteBbox[2] - areaToRefresh[3]) >= 0);
			if (overlapX && overlapY) {
				// Element overlaps the area to refresh

				// Rendering static sprites from previous sprite to current
				this.staticElements.render(previousElement, sprite);
				previousElement = sprite;

				sprite.render();
			}
		}

		// Last call to static sprite renderer
		this.staticElements.render(previousElement, dummyLastSprite);
	}

	// Stop rendering into the scene texture
	this.renderer.stopTextureRendering();
	this.renderer.disableScissor();
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Render the scene texture onto the canvas
 */
Scene.prototype._compositePrecisionRendering = function () {
	// Rendering scene texture with correct transformation with respect to updated camera position
	var zoom = this.pixelRatio * this.camera.zoom * Math.min(this.w / this.canvas.width, this.h / this.canvas.height);

	// For performance reason the blending is disabled (scene texture is opaque)
	this.renderer.disableBlending();
	this.renderer.useProgram(this.renderingProgram, this.renderingParams);

	this.renderer.drawImage(this.sceneRendering.texture,
		(this.w / 2 - (this.camera.x - this.l) * zoom),
		(this.h / 2 - (this.camera.y - this.t) * zoom),
		zoom * this.w,
		zoom * this.h
	);

	this.renderer.stopProgram();
	this.renderer.enableBlending();

	if (this.hudDisplayList.count > 0) {
		this.renderer.useProgram(this.renderer._programRegular);
		for (var spriteRef = this.hudDisplayList.first; spriteRef !== null; spriteRef = spriteRef.next) {
			spriteRef.object.render();
		}
		this.renderer.stopProgram();
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Render debug information
 */
Scene.prototype._renderDebugPrecisionRendering = function (areasToRefresh) {
	var zoom = this.camera.zoom * this.pixelRatio * this.w / this.canvas.width;
	this.renderer.save();
	this.renderer.translate(this.w / 2, this.h / 2);
	this.renderer.scale(zoom, zoom);
	this.renderer.translate(-(this.camera.x - this.l), -(this.camera.y - this.t));
	this.renderer.enableBlending();
	for (var a = 0; a < areasToRefresh.length; a += 1) {
		var areaToRefresh = areasToRefresh[a];
		var x = areaToRefresh[0] - this.l;
		var y = areaToRefresh[2] - this.t;
		var w = areaToRefresh[1] - areaToRefresh[0];
		var h = areaToRefresh[3] - areaToRefresh[2];

		this.renderer.drawImage(this._textureDebug, x, y, w, h);
	}
	this.renderer.restore();
};

Scene.prototype.crop = function (cropX, cropY, cropW, cropH) {
	this.cropping.x = cropX;
	this.cropping.y = cropY;
	this.cropping.w = cropW;
	this.cropping.h = cropH;

	var pr = this.pixelRatio;
	cropX = Math.ceil(pr * cropX);
	cropY = Math.ceil(pr * cropY);
	cropW = Math.ceil(pr * cropW);
	cropH = Math.ceil(pr * cropH);

	// Transforming canvas coordinates into viewport coordinates
	cropY = this.canvas.height - cropH - cropY;
	this.renderer.enableScissor(cropX, cropY, cropW, cropH);

	this._setFieldOfView();
};

Scene.prototype.resetCropping = function () {
	this.cropping.x = -Infinity;
	this.cropping.y = -Infinity;
	this.cropping.w =  Infinity;
	this.cropping.h =  Infinity;
	this.renderer.disableScissor();

	this._setFieldOfView();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Converts scene space coordinates (x, y) into canvas space coordinates
 *
 * @param {number} x - scene coordinate x
 * @param {number} y - scene coordinate y
 * @return {object} (x, y) - canvas coordinates
 */
Scene.prototype.convertSceneToCanvasCoordinate = function (x, y) {
	var tx = Math.max(0, this.cropping.x);
	var ty = Math.max(0, this.cropping.y);
	return {
		x: (x - this.camera.x + this.camera.fovW / 2) * this.camera.zoom + tx,
		y: (y - this.camera.y + this.camera.fovH / 2) * this.camera.zoom + ty
	};
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Converts canvas space coordinates (x, y) into scene space coordinates
 *
 * @param {number} x - canvas coordinate x
 * @param {number} y - canvas coordinate y
 * @return {object} (x, y) - scene coordinates
 */
Scene.prototype.convertCanvasToSceneCoordinate = function (x, y) {
	var tx = Math.max(0, this.cropping.x);
	var ty = Math.max(0, this.cropping.y);
	return {
		x: (x - tx) / this.camera.zoom + this.camera.x - this.camera.fovW / 2,
		y: (y - ty) / this.camera.zoom + this.camera.y - this.camera.fovH / 2
	};
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Set camera zoom value
 *
 * @param {number} zoom
 */
Scene.prototype.move = function (cx, cy, tx, ty, scale) {
	cx -= Math.max(0, this.cropping.x);
	cy -= Math.max(0, this.cropping.y);
	this.camera.transform(cx, cy, tx, ty, scale);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** To switch between debug and non-debug mode
 */
Scene.prototype.toggleDebugMode = function () {
	this._debug = !this._debug;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Show given sprites
 *
 * @param {Array} sprites - sprites to show
 */
Scene.prototype.showSprites = function (sprites) {
	for (var i = 0; i < sprites.length; i++) {
		sprites[i].show();
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Hide given sprites
 *
 * @param {Array} sprites - sprites to hide
 */
Scene.prototype.hideSprites = function (sprites) {
	for (var i = 0; i < sprites.length; i++) {
		sprites[i].hide();
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Create texture
 *
 * @param {Image}  image           - image to create the texture from
 * @param {String} textureId       - identified of the texture
 * @param {String} filtering       - filtering used when displaying the texture
 * @param {String} cachingStrategy - caching strategy
 */
Scene.prototype.createTexture = function (image, textureId, filtering, cachingStrategy) {
	return this.renderer.createTexture(image, textureId, filtering, cachingStrategy);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Get texture corresponding to given id for immediate use if present in the scene's renderer
 *
 * @param {String} textureId - identified of the texture
 */
Scene.prototype.useTexture = function (textureId) {
	return this.renderer.useTexture(textureId);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Get texture corresponding to given id and hold it for long term use if present in the scene's renderer
 *
 * @param {String} textureId - identified of the texture
 */
Scene.prototype.holdTexture = function (textureId) {
	return this.renderer.holdTexture(textureId);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Clear scene of all sprites
 */
Scene.prototype.clean = function () {
	// Removes all sprites from the scene
	var spriteRef = this.displayList.first;
	while (spriteRef !== null) {
		var next = spriteRef.next;
		spriteRef.object.remove();
		spriteRef = next;
	}

	this.staticElements.clear();

	// // Clear the canvas
	// this.renderer.clear();
};

Scene.prototype._clear = function (r, g, b, a) {
	this.renderer.setClearColor(r, g, b, a);
	this.renderer.clear();
	this.renderer.resetClearColor();
};

Scene.prototype._clearPrecisionRendering = function (r, g, b, a) {
	this.renderer.startTextureRendering(
		this.sceneRendering, // render target (texture)
		this.l, // left   bound of the scene
		this.r, // right  bound of the scene
		this.t, // top    bound of the scene
		this.b  // bottom bound of the scene
	);

	// Clearing precision rendering texture
	this.renderer.setClearColor(r, g, b, a);
	this.renderer.clear();
	this.renderer.stopTextureRendering();

	// Clearing canvas
	this.renderer.clear();
	this.renderer.resetClearColor();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Get a list of sprites whose pixels are visible at given coordinate
 *
 * @param {number} x - coordinate in x
 * @param {number} y - coordinate in y
 */
// Scene.prototype.getOpaqueSpritesAt = function (x, y) {
// // TODO
// var sprites = [];
// };



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/Scene/index.js
 ** module id = 837
 ** module chunks = 0
 **/