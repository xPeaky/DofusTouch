var inherits       = require('util').inherits;
var SpriteAbstract = require('SpriteAbstract');

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * @class Sprite
 * @desc  Element that is meant to be renderer on screen.
 * Everytime one of its attribute that affects its aspect
 * is modified then the sprite becomes isOutdated and its
 * renderer is notified.
 *
 * @author Brice Chevalier
 *
 * @param {Object} params - parameters object
 */
function Sprite(params) {
	SpriteAbstract.call(this, params);

	this._layer = params.layer || 0; // position layer

	this._x = params.x || 0; // x coordinate on screen
	this._y = params.y || 0; // y coordinate on screen

	// TODO: try to optim out scaleX and scaleY
	this._scaleX    = params.sx || 1;
	this._scaleY    = params.sy || 1;
	this._rotation  = params.rotation || 0;
	this._spriteRef = null;

	this.isDisplayed = false;

	// Whether the sprite is white-listed for removal
	this.isWhiteListed = false;

	// Scene holding the sprite
	this.scene = params.scene;

	// Scene attributes, localized for faster access
	this.renderer    = this.scene.renderer;
	this.updateList  = this.scene.updateList;
	this.displayList = this.scene.displayList;

	if (this.holdsStatics) {
		this.displayList = this.scene.staticElements;
	}

	if (params.isHudElement) {
		this.displayList = this.scene.hudDisplayList;
	}

	// Whether the sprite has already been cleared
	this._cleared = false;

	this.show();
}
inherits(Sprite, SpriteAbstract);
module.exports = Sprite;

// Custom getters and setters for properties that affect the rendering of the sprite
Object.defineProperty(Sprite.prototype, 'x', {
	get: function () { return this._x; },
	set: function (x) {
		this._x = x;
		this.forceRefresh();
	}
});

Object.defineProperty(Sprite.prototype, 'y', {
	get: function () { return this._y; },
	set: function (y) {
		this._y = y;
		this.forceRefresh();
	}
});

Object.defineProperty(Sprite.prototype, 'scaleX', {
	get: function () { return this._scaleX; },
	set: function (scaleX) {
		this._scaleX = scaleX;
		this.forceRefresh();
	}
});

Object.defineProperty(Sprite.prototype, 'scaleY', {
	get: function () { return this._scaleY; },
	set: function (scaleY) {
		this._scaleY = scaleY;
		this.forceRefresh();
	}
});

Object.defineProperty(Sprite.prototype, 'rotation', {
	get: function () { return this._rotation; },
	set: function (rotation) {
		this._rotation = rotation;
		this.forceRefresh();
	}
});

Object.defineProperty(Sprite.prototype, 'layer', {
	get: function () { return this._layer; },
	set: function (layer) {
		if (layer !== this._layer) {
			this._layer = layer;
			if (this.isDisplayed) { this._show(); } // TODO: remove this hack
			this.forceRefresh();
		}
	}
});

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Render element
 *
 */
Sprite.prototype.render = function () {
	this.renderer.save();

	// Applying tint
	this.renderer.multiplyColor(this.tint[0], this.tint[1], this.tint[2], this.tint[3]);

	// Applying transformations
	this.renderer.translate(this._x, this._y);
	if (this._rotation !== 0) {
		this.renderer.rotate(this._rotation);
	}
	this.renderer.scale(this._scaleX, this._scaleY);

	// Rendering
	this.draw(this.renderer);

	this.renderer.restore();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
Sprite.prototype._show = function () {
	if (this._spriteRef === null) {
		// Adding it to the list
		this._spriteRef = this.displayList.add(this);
	} else {
		// Repositioning at correct position in the list
		this._spriteRef = this.displayList.reposition(this._spriteRef);
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
Sprite.prototype._hide = function () {
	if (this._spriteRef !== null) {
		if (!this.displayList.removeByRef(this._spriteRef)) {
			console.warn('[Sprite.remove] Sprite not found in display list', this, this.displayList);
		}

		this._spriteRef = null;
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
Sprite.prototype.show = function () {
	this._show();
	this.isDisplayed = true;
	this.forceRefresh();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
Sprite.prototype.hide = function () {
	this._hide();
	this.isDisplayed = false;
	this.forceRefresh();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
Sprite.prototype.forceRefresh = function () {
	if (this.isOutdated === false) {
		this.updateList.push(this);
		this.isOutdated = true;
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
Sprite.prototype.setWhiteListedness = function (whiteListedness) {
	this.isWhiteListed = whiteListedness;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
Sprite.prototype.remove = function () {
	this.hide();
	if (this.isWhiteListed === false) {
		if (this._cleared === true) {
			// Already cleared
			return;
		}
		this._cleared = true;
		this.clear();
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
Sprite.prototype.isWithinBounds = function (x, y) {
	return (this.bbox[0] <= x) && (x <= this.bbox[1]) && (this.bbox[2] <= y) && (y <= this.bbox[3]);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
Sprite.prototype.refreshAnimation = function (areasToRefresh) {
	this.isOutdated = false;

	if (this.isDisplayed === false) {
		// Current bounding box will be returned as the area to refresh
		if (areasToRefresh !== undefined) {
			areasToRefresh.push(this.bbox);
		}

		// And replacing current bounding box by an empty box
		this.bbox = [Infinity, -Infinity, Infinity, -Infinity];
		return;
	}

	// Fetching bounding box for the current frame
	var bboxInterval = this.bbox;
	var relativeBBox = this.generateCurrentFrameData();

	// Setting the bounding box for the current animation relative to its position
	if (this._rotation === 0) {
		// Fast case (optimisation), the sprite has no rotation
		this.bbox = [
			this._x + this._scaleX * (this._scaleX > 0 ? relativeBBox[0] : relativeBBox[1]),
			this._x + this._scaleX * (this._scaleX > 0 ? relativeBBox[1] : relativeBBox[0]),
			this._y + this._scaleY * relativeBBox[2],
			this._y + this._scaleY * relativeBBox[3]
		];
	} else {
		var cos = Math.cos(this._rotation);
		var sin = Math.sin(this._rotation);

		var l = this._scaleX * relativeBBox[0];
		var r = this._scaleX * relativeBBox[1];
		var t = this._scaleY * relativeBBox[2];
		var b = this._scaleY * relativeBBox[3];

		var x0 = (cos * l - sin * t);
		var y0 = (sin * l + cos * t);

		var x1 = (cos * r - sin * t);
		var y1 = (sin * r + cos * t);

		var x2 = (cos * l - sin * b);
		var y2 = (sin * l + cos * b);

		var x3 = (cos * r - sin * b);
		var y3 = (sin * r + cos * b);

		this.bbox = [
			this._x + Math.min(x0, x1, x2, x3),
			this._x + Math.max(x0, x1, x2, x3),
			this._y + Math.min(y0, y1, y2, y3),
			this._y + Math.max(y0, y1, y2, y3)
		];
	}

	// Computing total surface to refresh
	bboxInterval[0] = Math.floor(Math.min(bboxInterval[0], this.bbox[0]));
	bboxInterval[1] =  Math.ceil(Math.max(bboxInterval[1], this.bbox[1]));
	bboxInterval[2] = Math.floor(Math.min(bboxInterval[2], this.bbox[2]));
	bboxInterval[3] =  Math.ceil(Math.max(bboxInterval[3], this.bbox[3]));

	if (areasToRefresh !== undefined) {
		areasToRefresh.push(bboxInterval);
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// Texture placeholder for sprites whose animation manager has not been initialized
var PLACEHOLDER_TEXTURE = null;
var PLACEHOLDER_DIM = 32;

function initTexture(renderer) {
	var canvas = document.createElement('canvas');
	canvas.width  = PLACEHOLDER_DIM;
	canvas.height = PLACEHOLDER_DIM;

	var ctx = canvas.getContext('2d');

	ctx.fillStyle = '#FF0000';
	ctx.fillRect(0, 0, PLACEHOLDER_DIM, PLACEHOLDER_DIM);

	PLACEHOLDER_TEXTURE = renderer.createTexture(canvas, null, 'nearest', 'permanent');
	return PLACEHOLDER_TEXTURE;
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// Methods that will be overridden by the animation manager
Sprite.prototype.draw = function () {
	if (window.isoEngine.debug) {
		this.renderer.drawImage(
			PLACEHOLDER_TEXTURE || initTexture(this.renderer),
			-PLACEHOLDER_DIM / 2,
			-PLACEHOLDER_DIM / 2,
			 PLACEHOLDER_DIM,
			 PLACEHOLDER_DIM
		);
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
Sprite.prototype.generateCurrentFrameData = function () {
	return [
		-PLACEHOLDER_DIM / 2,
		 PLACEHOLDER_DIM / 2,
		-PLACEHOLDER_DIM / 2,
		 PLACEHOLDER_DIM / 2
	];
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
Sprite.prototype.clear         =
Sprite.prototype.releaseBuffer =
function () {};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/Sprite/index.js
 ** module id = 243
 ** module chunks = 0
 **/