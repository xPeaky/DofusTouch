
//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
function Highlight(sprite) {
	this.sprite = sprite;

	this._red   = 1;
	this._green = 1;
	this._blue  = 1;
	this._alpha = 1;
}

Object.defineProperty(Highlight.prototype, 'red', {
	get: function () { return this._red; },
	set: function (value) {
		this._red = value;

		// updating sprite tint's red component
		var sprite = this.sprite;
		sprite.tint[0] = sprite.hue[0] * value;
		sprite.forceRefresh();
	}
});

Object.defineProperty(Highlight.prototype, 'green', {
	get: function () { return this._green; },
	set: function (value) {
		this._green = value;

		// updating sprite tint's green component
		var sprite = this.sprite;
		sprite.tint[1] = sprite.hue[1] * value;
		sprite.forceRefresh();
	}
});

Object.defineProperty(Highlight.prototype, 'blue', {
	get: function () { return this._blue; },
	set: function (value) {
		this._blue = value;

		// updating sprite tint's blue component
		var sprite = this.sprite;
		sprite.tint[2] = sprite.hue[2] * value;
		sprite.forceRefresh();
	}
});

Object.defineProperty(Highlight.prototype, 'alpha', {
	get: function () { return this._alpha; },
	set: function (value) {
		this._alpha = value;

		// updating sprite tint's alpha component
		var sprite = this.sprite;
		sprite.tint[3] = sprite.hue[3] * value;
		sprite.forceRefresh();
	}
});

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
function SpriteAbstract(params) {
	this.id = params.id;
	this._position = params.position || 0; // position in the map, correspond to cell id + decimal value
	this.bbox = [Infinity, -Infinity, Infinity, -Infinity];

	this.renderer = null;

	this._highlight = new Highlight(this); // highlight tint of the sprite

	this._hue = params.hue || [1, 1, 1, 1]; // default tint of the sprite
	this.tint = this.hue.slice(); // final tint of the sprite (hue * highlight)

	this._alpha = 1;
	this.alpha = params.alpha === undefined ? 1 : params.alpha;

	this.isOutdated = false;
}
module.exports = SpriteAbstract;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
Object.defineProperty(SpriteAbstract.prototype, 'position', {
	get: function () { return this._position; },
	set: function (position) {
		if (position !== this._position) {
			this._position = position;
			if (this.isDisplayed) { this._show(); } // TODO: remove this hack
			this.forceRefresh();
		}
	}
});

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
Object.defineProperty(SpriteAbstract.prototype, 'hue', {
	get: function () { return this._hue; },
	set: function (hue) {
		if (hue !== this._hue) {
			this._hue = hue;

			this.tint[0] = this.hue[0] * this._highlight.red;
			this.tint[1] = this.hue[1] * this._highlight.green;
			this.tint[2] = this.hue[2] * this._highlight.blue;
			this.tint[3] = this.hue[3] * this._highlight.alpha * this._alpha;

			if (this.isDisplayed) { this._show(); } // TODO: remove this hack
			this.forceRefresh();
		}
	}
});

Object.defineProperty(SpriteAbstract.prototype, 'highlight', {
	get: function () { return this._highlight; },
	set: function (highlight) {
		this.setHighlight(highlight);
	}
});

Object.defineProperty(SpriteAbstract.prototype, 'alpha', {
	get: function () { return this._alpha; },
	set: function (alpha) {
		if (alpha === this._alpha) {
			return;
		}

		this._alpha = alpha;
		this.tint[3] = this.hue[3] * this._highlight.alpha * this._alpha;

		this.forceRefresh();
	}
});

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
SpriteAbstract.prototype.setHighlight = function (highlight) {
	if (highlight === null) {
		this.removeHighlight();
		return;
	}

	this._highlight._red   = highlight.red;
	this._highlight._green = highlight.green;
	this._highlight._blue  = highlight.blue;
	this._highlight._alpha = highlight.alpha;

	this.tint[0] = this.hue[0] * highlight.red;
	this.tint[1] = this.hue[1] * highlight.green;
	this.tint[2] = this.hue[2] * highlight.blue;
	this.tint[3] = this.hue[3] * highlight.alpha * this._alpha;

	this.forceRefresh();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
SpriteAbstract.prototype.removeHighlight = function () {
	this.tint[0] = this.hue[0];
	this.tint[1] = this.hue[1];
	this.tint[2] = this.hue[2];
	this.tint[3] = this.hue[3] * this._alpha;

	this.forceRefresh();
};

SpriteAbstract.prototype.forceRefresh = function () {};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/SpriteAbstract/index.js
 ** module id = 244
 ** module chunks = 0
 **/