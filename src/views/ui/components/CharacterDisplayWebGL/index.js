require('./styles.less');
var inherits      = require('util').inherits;
var WuiDom        = require('wuidom');
var Canvas        = require('Canvas');
var Entity        = require('Entity');
var constants     = require('constants');
var WebGLRenderer = require('WebGLRenderer');
var Delay         = require('TINAlight').Delay;


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
var characterDisplayCanvas   = null;
var characterDisplayRenderer = null;
var characterDisplayScene    = null;

var CANVAS_WIDTH  = Math.ceil(constants.PIXEL_RATIO * 512);
var CANVAS_HEIGHT = Math.ceil(constants.PIXEL_RATIO * 512);
var MAX_SCALE = 2.5;

function noOp() {
	return null;
}

function initScene() {
	characterDisplayCanvas        = document.createElement('canvas');
	characterDisplayCanvas.id     = 'characterDisplayCanvas';
	characterDisplayCanvas.width  = CANVAS_WIDTH;
	characterDisplayCanvas.height = CANVAS_HEIGHT;

	// for debugging purpose
	/*document.getElementsByTagName('body')[0].appendChild(characterDisplayCanvas);
	characterDisplayCanvas.style.zIndex = 99;
	characterDisplayCanvas.style.width  = CANVAS_WIDTH  + 'px';
	characterDisplayCanvas.style.height = CANVAS_HEIGHT + 'px';
	characterDisplayCanvas.style.top    = 0;
	characterDisplayCanvas.style.position = 'absolute';
	characterDisplayCanvas.style.pointerEvents = 'none';*/


	characterDisplayRenderer = new WebGLRenderer(
		characterDisplayCanvas,
		CANVAS_WIDTH,
		CANVAS_HEIGHT,
		constants.MAX_SPRITES_BUFFER_CHARACTER_DISPLAY,
		constants.MAX_TEXTURE_MEMORY_CHARACTER_DISPLAY,
		constants.PRERENDER_RATIO_CHARACTER_DISPLAY,
		true // transparent
	);

	characterDisplayScene = {
		renderer: characterDisplayRenderer,
		updateList:  { push: noOp },
		displayList: { add: noOp, removeByRef: noOp }
	};

	return characterDisplayScene;
}


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** character / model renderer
 *
 * @param {Object} options - options parameter
 *        {number|string} options.scale - scale to render character.
 *                                     if set to 'cover',  it will be maximized to fit inside canvas
 *                                     if set to 'width',  it will be maximized to be contained horizontaly
 *                                     if set to 'height', it will be maximized to be contained verticaly
 *        {number|string} options.horizontalAlign - Horizontal alignement: left, center or right
 *        {number|string} options.verticalAlign   - Vertical alignement: top, center or bottom
 */
function CharacterDisplay(options) {
	WuiDom.call(this, 'div', options);
	this.addClassNames('CharacterDisplay');

	options     = options || {};
	this.canvas = this.appendChild(new Canvas());
	this.ctx    = this.canvas.getContext('2d');
	this.entity = null;
	this.scale  = options.scale !== undefined ? options.scale : 1;
	this._scale = Infinity;

	// Whether the character can be displayed in 8 directions or only 4
	this.only4Directions = false;

	if (this.scale === 'fitin') {
		this.horizontalAlign = options.horizontalAlign || 'left';
		this.verticalAlign   = options.verticalAlign   || 'bottom';
	} else {
		this.horizontalAlign = options.horizontalAlign || 'none';
		this.verticalAlign   = options.verticalAlign   || 'none';
	}

	// force resize to be called after dom initialisation, as we use getComputedStyle
	this.canvasInitialized = false; // Will be set to true after dom initialisation
	this.renderingRequired = false; // Whether rendering has been requested before dom initalisation

	var self = this;
	window.setTimeout(function () {
		if (!self.rootElement) { return; }
		self.canvasInitialized = true;
		self.resize();
	}, 0);
}

inherits(CharacterDisplay, WuiDom);
module.exports = CharacterDisplay;


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Set displayed character look. Load models and create animation manager and entity.
 *
 * @param {Object}   look                    - entity look object
 * @param {Object}   [options]               - animation manager creation options
 * @param {string}   [options.boneType]      - bone type, i.e. bone path prefix
 * @param {string}   [options.skinType]      - skin type, i.e. skin path prefix
 * @param {boolean}  [options.riderOnly]     - Set this flag to remove mount from entity look.
 * @param {number}   [options.direction]     - initial direction entity should face
 * @param {boolean}  [options.keepDirection] - restore entity direction after look change
 * @param {string}   [options.animation]     - animation base name
 * @param {boolean}  [options.keepModels]    - keep a reference to models (used for texture reload)
 * @param {Function} cb
 */
CharacterDisplay.prototype.setLook = function (look, options, cb) {
	var self = this;
	options = options || {};

	if (this.entity === null) {
		this.entity = new Entity({ scene: characterDisplayScene || initScene() });

		// Specifying subentities as not showing
		var showSubentities = options.showSubentities;
		this.entity.showSubentities = (showSubentities === null || showSubentities === undefined) ? true : showSubentities;
	}

	var direction = options.direction !== undefined ? options.direction : 1;
	if (!options.keepDirection) { this.entity.direction = direction; }

	if (options.riderOnly) { look = Entity.getLookWithoutMount(look); }

	var spinnerDisplayed = false;
	var requestSatisfied = false;

	// Waiting for more than 30 tups (500ms)? Displaying a spinner
	var delay = new Delay(30, function () {
		if (!requestSatisfied) {
			if (self.rootElement) { // the wuidom may not be here after 30 tups
				self.addClassNames('spinner');
				spinnerDisplayed = true;
			}
		}
	});
	delay.start(false);

	this.entity.setLook(look, options, function () {
		requestSatisfied = true;
		if (spinnerDisplayed && self.rootElement) {
			self.delClassNames('spinner');
		}

		if (self.entity === null || !self.rootElement) {
			// This instance of CharacterDisplay was released
			// bailing out
			return cb && cb();
		}

		// Adding a modifier for character with bones 1. 'AnimStatique' must be post-fixed with body skin id.
		if (look.bonesId === 1 && look.skins[0]) {
			self.entity.animManager.addAnimationModifier('AnimStatique', 'AnimStatique' + look.skins[0]);
		}

		self.only4Directions = self.entity.animManager.only4Directions;

		// if an animation is provided in options, assign it to symbol
		if (options.animation) {
			self.entity.animSymbol.base = options.animation;
		}

		self._scale = Infinity;

		self._render();

		return cb && cb();
	});
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Remove entity, clear rendering and cleanup memory */
CharacterDisplay.prototype.release = function () {
	if (!characterDisplayRenderer) { return; }

	// remove entity
	if (this.entity !== null) {
		this.entity.remove();
		this.entity = null;
	}

	// reset scale
	this._scale = Infinity;

	// clean canvas
	this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Clears canvas */
CharacterDisplay.prototype.clear = function () {
	// clear canvas
	this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Change character direction by rotating it.
 *
 * @param {boolean} isClockwise - rotation way
 */
CharacterDisplay.prototype.rotateCharacter = function (isClockwise) {
	if (!this.canvasInitialized) { return; }
	var direction = this.entity.direction;

	if (this.only4Directions) {
		if ((direction & 1) === 0) {
			direction += 1;
		}

		direction += isClockwise ? 2 : -2;
		if (direction > 7) { direction = 1; }
		if (direction < 0) { direction = 7; }
	} else {
		direction += isClockwise ? 1 : -1;
		if (direction > 7) { direction = 0; }
		if (direction < 0) { direction = 7; }
	}

	this.entity.direction = direction;
	this._render();
	return direction;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Resize canvas accordingly to its dom dimensions
 */
CharacterDisplay.prototype.resize = function () {
	var canvas = this.canvas;
	var width  = parseInt(this.getComputedStyle('width'), 10);
	var height = parseInt(this.getComputedStyle('height'), 10);
	var previousWidth  = canvas.width;
	var previousHeight = canvas.height;
	canvas.width  = width  * constants.PIXEL_RATIO;
	canvas.height = height * constants.PIXEL_RATIO;
	canvas.style.width  = width  + 'px';
	canvas.style.height = height + 'px';

	if (canvas.width === 0 || canvas.height === 0) {
		return;
	}

	if (this.renderingRequired || canvas.width !== previousWidth || canvas.height !== previousHeight) {
		this._render();
	}
};

CharacterDisplay.prototype.setScale = function (scale) {
	if (scale === this.scale) {
		return;
	}
	this.scale = scale;
	this._render();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Compute the scale based on the given string parameter
 * @private
 * @param {string} scale - keyword or percentage defining how to compute the scale
 * @param {number} w     - width of the canvas
 * @param {number} h     - height of the canvas
 * @param {number} x     - origin position in target canvas on x
 * @param {number} y     - origin position in target canvas on y
 * @param {Array}  bbox  - bounding box of the entity
 */
CharacterDisplay.prototype._computeScale = function (scale, w, h, x, y, bbox) {
	var computedScale;
	if (scale === 'cover') {
		// maximize rendering inside canvas bounds
		computedScale = this._scale = Math.min(
			this._scale,
			x / Math.abs(bbox[0]),
			x / Math.abs(bbox[1]),
			y / Math.abs(bbox[2]),
			y / Math.abs(bbox[3])
		);
	} else if (scale === 'width') {
		computedScale = this._scale = Math.min(this._scale, w / (bbox[1] - bbox[0]));
	} else if (scale === 'height') {
		computedScale = this._scale = Math.min(this._scale, h / (bbox[2] - bbox[3]));
	} else if (scale === 'fitin') {
		computedScale = this._scale = Math.min(this._scale, w / (bbox[1] - bbox[0]), h / (bbox[2] - bbox[3]));
		computedScale = Math.min(computedScale, MAX_SCALE);
	} else if (scale[scale.length - 1] === '%') {
		var parsedScale = parseFloat(scale);
		if (isNaN(parsedScale)) {
			parsedScale = this._scale;
		} else {
			parsedScale *= 0.01;
		}
		var widthRatio = w / (bbox[1] - bbox[0]);
		var heightRatio = h / (bbox[2] - bbox[3]);
		var constrainedRatio = widthRatio > heightRatio ? heightRatio : widthRatio;
		computedScale = this._scale = parsedScale * constrainedRatio;
		computedScale = Math.min(computedScale, MAX_SCALE);
	}
	return computedScale || this._scale;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Render entity at correct scale, and copy result in canvas element
 * @private
 */
CharacterDisplay.prototype._render = function () {
	if (!this.canvasInitialized) {
		this.renderingRequired = true;
		return;
	}

	if (!characterDisplayRenderer || !this.entity) { return; }

	var canvas   = this.canvas;
	var w        = canvas.width;
	var h        = canvas.height;
	var gl       = characterDisplayRenderer.gl;
	var entity   = this.entity;
	var scale    = this.scale;

	// test if canvas size is correctly initialised
	if (w === 0 || h === 0) {
		var self = this;
		// call resize in a separate thread, to let dom element be initialised
		window.setTimeout(function () {
			self.resize();
			if (canvas.width === 0 || canvas.height === 0) {
				// dom size is still 0. returning.
				return console.warn('[CharacterDisplay._render] Character display size must be greater than zero.');
			}
		}, 0);
		return;
	}

	// reset rendering
	characterDisplayRenderer.clear();

	entity.x = 0;
	entity.y = 0;
	entity.scaleX =  constants.PIXEL_RATIO;
	entity.scaleY = -constants.PIXEL_RATIO; // reverse image as webGL rendering is done upside down compared to 2D
	                                        // canvas.

	// Prepare entity animation
	entity.updateAnimation();
	entity.refreshAnimation();

	var bbox = entity.bbox;
	if (bbox[1] < bbox[0] || bbox[2] < bbox[3]) {
		// The entity animation frame is empy

		// Logging an error to figure out the source of the issue in production
		var templateId = entity.animManager.template.id;
		var animName = entity.animSymbol.base;
		console.error(new Error('Entity animation frame is empty, template:' + templateId + ', animation:' + animName));

		// Leaving the canvas untouched
		return;
	}

	// the origin position in target canvas
	var x = w * 0.5;
	var y = h * 0.85;

	if (typeof scale === 'string') {
		scale = this._computeScale(scale, w, h, x, y, bbox);
	}

	entity.scaleX *= scale;
	entity.scaleY *= scale;

	// recompute bounding box after scale
	var l = Math.floor(bbox[0] * scale);
	var r = Math.ceil(bbox[1] * scale);
	var t = -Math.floor(bbox[2] * scale);
	var b = -Math.ceil(bbox[3] * scale);
	var ww = r - l;
	var hh = b - t;

	if (ww === 0 || hh === 0) { return console.warn('[CharacterDisplay._render] Character to render is of size 0.'); }

	// position sprite in top left corner of renderer
	entity.x = -l;
	entity.y = b;

	entity.render();

	// Releasing buffer
	entity.animManager.releaseBuffer();

	// Fetching pixels of rendered texture
	var pixels = new Uint8Array(ww * hh * 4);
	gl.readPixels(0, CANVAS_HEIGHT - hh, ww, hh, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

	// copy pixels
	var imageData = this.ctx.createImageData(ww, hh);
	var pixelData = imageData.data;
	for (var p = 0; p < pixels.length; p++) {
		pixelData[p] = pixels[p];
	}

	// put pixel buffer in canvas at correct position
	var x0, y0;
	switch (this.horizontalAlign) {
	case 'left':   x0 = 0;            break;
	case 'center': x0 = (w - ww) / 2; break;
	case 'right':  x0 = w - ww;       break;
	default:       x0 = x + l;        break;
	}

	switch (this.verticalAlign) {
	case 'top':    y0 = 0;            break;
	case 'center': y0 = (h - hh) / 2; break;
	case 'bottom': y0 = h - hh;       break;
	default:       y0 = y + t;        break;
	}

	this.ctx.clearRect(0, 0, w, h);
	this.ctx.putImageData(imageData, x0, y0);
};




/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/CharacterDisplayWebGL/index.js
 ** module id = 237
 ** module chunks = 0
 **/