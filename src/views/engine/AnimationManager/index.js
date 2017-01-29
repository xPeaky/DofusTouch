var inherits        = require('util').inherits;
var Tween           = require('TINAlight').Tween;
var constants       = require('constants');
var audioManager    = require('audioManager');
var templateLoading = require('templateLoading');
var TemporaryAnimationManager = require('TemporaryAnimationManager');

var ANIM_SYMBOLS  = constants.ANIM_SYMBOLS;
var ANIM_SYMETRY  = constants.ANIM_SYMETRY;
var MAP_HALF_SIZE = constants.MAP_SCENE_WIDTH / 2;
var ANIM_SYMBOLS_REVERSE = [4, 3, 2, 3, 4, 7, 6, 7];

function FrameData() {
	this.id = '';
	this.sounds = null;
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** WebGL version of Animation Manager
 *
 * @param {Object} template -
 * @param {number} scale    -
 * @param {Object} tints    -
 *
 * @author Brice Chevalier
 */
function AnimationManager(sprite, template, scale, bonesId, tints) {
	//jscs:disable requireCamelCaseOrUpperCaseIdentifiers
	TemporaryAnimationManager.call(this, sprite);

	this.animationId   = null;
	this.animationName = '';

	this.template = template;
	this.bonesId  = bonesId;
	this.audioVol = 1.0;

	this.scaleX     = scale || 1;
	this.scaleY     = scale || 1;
	this.mirrored   = false;
	this._frame     = -1;
	this._prevFrame = -1;
	this.nbFrames   = 0;
	this.frameData  = new FrameData();

	this.tints = [];
	this.tintsString = '';
	this._setTints(tints);

	this.loadedAnimations = {}; // animations added into AnimationManager beside 'motion'

	// Testing for the existence of a static animation in a diagonal direction
	// In order to determine whether this template would allow a character to move in 8 directions
	var templateSymbols = template.exposedSymbols;
	this.only4Directions = templateSymbols && !(templateSymbols.AnimStatique_0 || templateSymbols.AnimStatique_4);
	this.isFx = this.sprite.isFx;

	// Initialization of the frame tween
	this.tween = new Tween(this, ['frame']);
	this.tween.from({ frame: 0 });

	this._cleared = false;
}
inherits(AnimationManager, TemporaryAnimationManager);
module.exports = AnimationManager;

// The sprite needs to be updated when entering a new frame of the animation
Object.defineProperty(AnimationManager.prototype, 'frame', {
	get: function () { return this._frame; },
	set: function (frame) {
		frame = (frame < this.nbFrames) ? Math.floor(frame) : this.nbFrames - 1;
		if (this._frame === frame) {
			// No need for update, the frame is already correct
			return;
		}

		this._frame = frame;
		this.sprite.forceRefresh();
	}
});

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// override TemporaryAnimationManager.switchAnimationManager with empty function
AnimationManager.prototype.switchAnimationManager = function () {};
AnimationManager.prototype.isTemporary = false;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
AnimationManager.prototype._computeSymbolDirection = function (symbol) {
	if (symbol.direction === -1) {
		return -1;
	}

	if (this.isFx && symbol.direction === 0) {
		return 0;
	}

	if (this.only4Directions && (symbol.direction & 1) === 0) {
		return symbol.direction + 1;
	}

	return symbol.direction;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
AnimationManager.prototype._getSymbolId = function (symbol) {
	symbol = this.applyAnimationModifier(symbol);

	var type  = (symbol.type  || symbol.type  === 0) ? symbol.type : '';
	var param = (symbol.param || symbol.param === 0) ? '_' + symbol.param : '';

	var symbolId = symbol.base + type + param;
	var direction = this._computeSymbolDirection(symbol);
	if (direction !== -1) {
		symbolId += '_' + ANIM_SYMBOLS[direction];
	}

	return symbolId;
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
AnimationManager.prototype._getSymbolModelId = function (symbol) {
	return this.bonesId + '/' + this._getSymbolId(symbol);
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Get the model ids of AnimationManager for an animation symbol.
 *
 * @param {Object} symbol - animation symbol
 */
AnimationManager.prototype.addAnimation = function (symbol, cb) {
	var nAnimationsAdded = 0;
	var nAnimationsToAdd = 1;
	function onAnimationAdded() {
		nAnimationsAdded += 1;
		if (nAnimationsAdded === nAnimationsToAdd) {
			return cb && cb();
		}
	}

	if (!this.hasSubentities) {
		return this._addAnimation(this._getSymbolModelId(symbol), onAnimationAdded);
	}

	// find all AnimationManager to which animation symbol apply
	var subentities = this.subentities;
	var isAdded = true;
	for (var i = 0; i < subentities.length; i++) {
		var subentity = subentities[i];
		var subentitySymbol = subentity.symbolModifier(symbol);
		if (subentitySymbol.parent) {
			var parent = subentitySymbol.parent;
			nAnimationsToAdd += 1;
			isAdded = isAdded && this._addAnimation(this._getSymbolModelId(parent), onAnimationAdded);
		}

		// recursively get add animation for this child
		if (subentitySymbol.child) {
			nAnimationsToAdd += 1;
			isAdded = isAdded && subentity.animManager.addAnimation(subentitySymbol.child, onAnimationAdded);
		}
	}

	onAnimationAdded();
	return isAdded;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Add a new animation template to manager
 * @private
 *
 * @param {Object} symbol - animation symbol to be added
 * @param {Object} models - list of loaded models
 *
 * @return {boolean} is animation correctly added to actor
 */
AnimationManager.prototype._addAnimation = function (templateId, cb) {
	if (!this.bonesId) {
		console.warn('Incorrect bones id:', this.bonesId);
		cb();
		return false;
	}

	// don't add already loaded templates
	if (this.loadedAnimations[templateId]) {
		cb();
		return true;
	}

	var self = this;
	templateLoading.loadTemplate('bone', templateId, '', function (template) {
		self.template.merge(template, false);
		self.loadedAnimations[templateId] = template;
		cb();
	}, this.sprite.renderer);

	return true;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Apply animation modifier on animation symbol if exist */
AnimationManager.prototype.applyAnimationModifier = function (symbol) {
	var modifier = this.animationModifiers[symbol.base];
	if (!modifier) { return symbol; }

	switch (typeof modifier) {
	case 'string':
		// Modifier apply only on base symbol string. This is the most common case
		return {
			base:      modifier,
			type:      symbol.type,
			param:     symbol.param,
			direction: symbol.direction
		};
	case 'function':
		// Modifier apply to the whole symbol. This is used for "creatureMode" (pokemon) animations
		return modifier(symbol);
	default:
		console.error('Wrong animation modifier type');
		return symbol;
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Remove all animations added in manager's template beside 'motion' */
AnimationManager.prototype.cleanupAnimations = function () {
	var template = this.template;
	for (var anim in this.loadedAnimations) {
		var mergedTemplate = this.loadedAnimations[anim];
		template.unmerge(mergedTemplate);
	}
	this.loadedAnimations = {};

	// recursively clean animations in subentities
	for (var i = 0; i < this.subentities.length; i++) {
		this.subentities[i].animManager.cleanupAnimations();
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Remove all animations added in manager's template beside 'motion' */
AnimationManager.prototype.cleanupAnimationsAndRemoveSubentities = function () {
	var template = this.template;
	for (var anim in this.loadedAnimations) {
		var mergedTemplate = this.loadedAnimations[anim];
		template.unmerge(mergedTemplate);
	}
	this.loadedAnimations = {};

	// recursively clean animations in subentities
	for (var i = 0; i < this.subentities.length; i++) {
		this.subentities[i].animManager.cleanupAnimations();
	}

	this.subentities = [];
	this.hasSubentities = false;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
AnimationManager.prototype.clear = function (continueAnimation) {
	if (this._cleared) {
		// This can happen when the connection is slow
		// Should not happen otherwise
		console.warn('[AnimationManager.clear] Trying to clear an already cleared animation manager');
		return;
	}

	if (!continueAnimation) {
		this.stop();
	} else {
		this.tween.fastForwardToEnd();
	}
	this.cleanupAnimationsAndRemoveSubentities();
	this.template.clear();

	this.sprite.renderer.unlockBuffer(this.frameData.id);
	this.frameData.id = '';
	this._cleared = true;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
AnimationManager.prototype._setTints = function (tints) {
	if (!tints) {
		tints = [];
	}

	var newTint;
	var newTints = [];
	var areTintsDifferent = this.tints.length !== tints.length;
	for (var t = 0; t < tints.length; t += 1) {
		var tint = tints[t];
		if (tint) {
			newTint = { r: tint.r / 128, g: tint.g / 128, b: tint.b / 128 };
		} else {
			newTint = { r: 1, g: 1, b: 1 };
		}

		newTints[t] = newTint;

		if (!areTintsDifferent) {
			var oldTint = this.tints[t];
			areTintsDifferent =
				oldTint.r !== newTint.r ||
				oldTint.g !== newTint.g ||
				oldTint.b !== newTint.b;
		}
	}


	this.tints = newTints;

	if (areTintsDifferent) {
		// Constructing tint string
		this.tintsString = '#';
		for (t = 0; t < newTints.length; t += 1) {
			newTint = newTints[t];
			this.tintsString +=
				Math.round(newTint.r * 255).toString(16) +
				Math.round(newTint.g * 255).toString(16) +
				Math.round(newTint.b * 255).toString(16);
		}
	}

	return areTintsDifferent;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
AnimationManager.prototype.setTints = function (tints) {
	if (this._setTints(tints)) {
		// Vertex buffer will have to be reloaded
		// Releasing the currently loaded one
		this.releaseBuffer();
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Generating sprite batch corresponding to the current frame
 *
 */
AnimationManager.prototype.prepareCurrentAnimationFrame = function () {
	return this.template.prepareAnimationFrame(
		this.animationName, this._frame, this.tints, this.scaleX, this.scaleY, this.subentityRefs);
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Get an animation duration
 *
 * @param {string} animationName - animation id
 */
AnimationManager.prototype.getSymbolDuration = function (animationName) {
	var symbol = this.template.exposedSymbols[animationName];
	if (!symbol) { return 0; }
	return symbol.duration;
};

function prepareBatchData(spriteBatch) {
	var nbSprites   = 0;
	var boundsStack = [];

	// For performance reasons the bbox is an array (it is passed as a uniform in WebGL)
	var bbox = [Infinity, -Infinity, Infinity, -Infinity];
	for (var s = 0; s < spriteBatch.length; s += 1) {
		var sprite = spriteBatch[s];
		if (sprite.isMaskTag) {
			if (sprite.isMaskDef) {
				// New mask is being defined
				boundsStack.push(bbox);
				bbox = [Infinity, -Infinity, Infinity, -Infinity];
			}

			if (sprite.isMaskUse) {
				// New mask is being used
				boundsStack.push(bbox);
				bbox = [Infinity, -Infinity, Infinity, -Infinity];
			}

			if (sprite.isMaskStop) {
				// Mask is not being used anymore
				// Collapsing bounding boxes
				var maskedBbox  = bbox;              // Bbox of masked  elements
				var maskingBbox = boundsStack.pop(); // Bbox of masking elements

				bbox    = boundsStack.pop();
				bbox[0] = Math.min(bbox[0], Math.max(maskedBbox[0], maskingBbox[0]));
				bbox[1] = Math.max(bbox[1], Math.min(maskedBbox[1], maskingBbox[1]));
				bbox[2] = Math.min(bbox[2], Math.max(maskedBbox[2], maskingBbox[2]));
				bbox[3] = Math.max(bbox[3], Math.min(maskedBbox[3], maskingBbox[3]));
			}
			continue;
		}

		var v = sprite.vertexPos;
		bbox[0] = Math.min(bbox[0], v[0], v[2], v[4], v[6]);
		bbox[1] = Math.max(bbox[1], v[0], v[2], v[4], v[6]);
		bbox[2] = Math.min(bbox[2], v[1], v[3], v[5], v[7]);
		bbox[3] = Math.max(bbox[3], v[1], v[3], v[5], v[7]);
		nbSprites += 1;
	}

	return {
		bbox: bbox,
		nbSprites: nbSprites,
		spriteBatch: spriteBatch
	};
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Releasing the buffer required to render the current frame
 * Used for better memory management
 */
AnimationManager.prototype.releaseBuffer = function () {
	// Unlocking the previous frame buffer
	this.sprite.renderer.releaseBuffer(this.frameData.id);
	this.frameData.id = '';
	this.sprite.forceRefresh();
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Generates sprite batch and loading it onto the renderer
 * Also attaches sound ids to the animation
 *
 */
AnimationManager.prototype.generateCurrentFrameData = function () {
	if (this.animationId === null) {
		return [Infinity, -Infinity, Infinity, -Infinity];
	}
	var renderer = this.sprite.renderer;
	var previousFrameId = this.frameData.id;

	// Reinitializing frame data
	this.frameData.id     = '';
	this.frameData.sounds = [];

	// Constructing frame id and fetching sound ids
	this._generateCurrentFrameIdAndSounds(this.frameData);

	// Checking whether the sprite batch is already loaded on the GPU
	var batchData = renderer.getBufferData(this.frameData.id);
	if (batchData === undefined) { // batchData should never be null
		// Sprite batch not loaded, constructing the animation sprite batch
		batchData = prepareBatchData(this.prepareCurrentAnimationFrame());

		// Loading it onto the GPU
		renderer.prepareBatchFromSpriteList(this.frameData.id, batchData);
	}

	if (this.frameData.id !== previousFrameId) {
		// Unlocking the previous frame buffer
		renderer.unlockBuffer(previousFrameId);

		// Locking current frame buffer
		renderer.lockBuffer(this.frameData.id);
	}

	// Playing sounds for this frame
	var sounds = this.frameData.sounds;
	var pan = Math.max(-1, Math.min(1, this.sprite._x / MAP_HALF_SIZE - 1));
	for (var i = 0; i < sounds.length; i++) {
		audioManager.playSoundGroup('sfx', sounds[i], this.audioVol, pan);
	}

	return batchData.bbox;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Get sound played at the current frame and generate frame id
 *
 */
AnimationManager.prototype._generateCurrentFrameIdAndSounds = function (frameData) {
	var frame = this._frame;

	// Generating a unique frame id
	frameData.id += this.animationId + frame.toString();

	if (this._prevFrame !== frame) {
		this._prevFrame = frame;

		// Fetching sounds of currently playing animation frame
		var soundList = this.template.getAnimationFrameSound(this.animationName, frame);
		if (soundList) {
			frameData.sounds.push(this.bonesId + '/' + this.animationName + ':' + frame);
		}
	}

	// Fetching subentity sounds corresponding to their respective animation frames
	for (var s = 0; s < this.subentities.length; s += 1) {
		this.subentities[s].animManager._generateCurrentFrameIdAndSounds(frameData);
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** rendering method
 *
 * @param {Object} renderer - Renderer used to draw the animation
 */
AnimationManager.prototype.draw = function (renderer) {
	renderer.drawSpriteBatch(this.frameData.id);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Set the mirroring of the animation
 *
 * @param {number}   direction - direction of the animation
 * @param {boolean}  reversed  - whether the animation exists in reverse in the template
 */
AnimationManager.prototype._setMirroring = function (direction, reversed) {
	if (direction !== -1) {
		// If animation exist already reversed in the template
		// Then the symmetry applies when it does not normally applies
		// Thus the xor
		if (ANIM_SYMETRY[direction] ^ reversed) {
			if (this.scaleX > 0) {
				this.mirrored = true;
				this.scaleX *= -1;
			}
		} else {
			if (this.scaleX < 0) {
				this.mirrored = false;
				this.scaleX *= -1;
			}
		}
	} else {
		if (this.scaleX < 0) {
			this.mirrored = false;
			this.scaleX *= -1;
		}
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** assigning new animation symbol
 *
 * @param {Object}   symbol - animation symbol
 * @param {boolean}  loop   - flag to set if we want animation to play in loop
 * @param {Function} [cb]   - optional function called when animation finish
 */
AnimationManager.prototype.assignSymbol = function (symbol, loop, cb) {
	this.subentityRefs = {}; // Resetting subentities

	if (this.hasSubentities) {
		var parentSymbol = null;
		var staticSymbol = { base: 'AnimStatique', direction: symbol.direction };

		for (var i = 0; i < this.subentities.length; i++) {
			var subentity   = this.subentities[i];
			var animManager = subentity.animManager;
			var subSymbol   = subentity.symbolModifier(symbol);
			parentSymbol    = subSymbol.parent || parentSymbol;

			// recursively assign symbol to subentities.
			if (subSymbol.child) {
				animManager.assignSymbol(subSymbol.child, loop, cb);
				// callback should be transmitted to only one entity
				// TODO: in case symbol is transmitted to several entities, choose the correct one.
				cb = null;
			} else {
				animManager.assignSymbol(staticSymbol, false);
			}
			this.subentityRefs[subentity.bindingPoint] = animManager;
			animManager.mirrored = false;
		}
		symbol = parentSymbol || staticSymbol;
	}

	if (this.tween.playing || this.tween.starting) {
		this.tween.stop();
	}

	var animationName = this._getSymbolId(symbol);
	var direction = this._computeSymbolDirection(symbol);
	if (this.template.hasAnimation(animationName)) {
		this._setMirroring(direction);
	} else {
		// HACK #1: try the reverse animation symbol
		symbol = this.applyAnimationModifier(symbol);

		var type  = (symbol.type  || symbol.type  === 0) ? symbol.type : '';
		var param = (symbol.param || symbol.param === 0) ? '_' + symbol.param : '';
		animationName = symbol.base + type + param + '_' + ANIM_SYMBOLS_REVERSE[direction];

		if (this.template.hasAnimation(animationName)) {
			this._setMirroring(direction, true);
		} else {
			// HACK #2: try all directions of animation symbols
			var animationFound = false;
			for (var d = 0; d < 8; d++) {
				animationName = symbol.base + type + param + '_' + d;
				if (this.template.hasAnimation(animationName)) {
					this._setMirroring(d);
					animationFound = true;
					break;
				}
			}

			if (!animationFound) {
				console.warn('Could not find any Animation ' + symbol.base + ' in template', this.template.id);
				return cb && cb();
			}
		}
	}

	this.animationName = animationName;

	// Generating a unique animation id
	var genericAnimationId = this.template.id + '#' + animationName;
	this.animationId  = genericAnimationId + '#' + this.scaleY + this.tintsString + (this.mirrored ? 'M#' : '#');

	this.nbFrames   = this.template.getAnimationNbFrames(animationName);
	this._prevFrame = -1;
	this._frame     = -1;
	this.frame      = 0;

	if (this.nbFrames === 0) {
		return cb && cb();
	}

	this.tween.reset().to({ frame: this.nbFrames }, this.nbFrames).start(loop);
	if (cb) { this.tween.onceFinish(cb); }
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/* Requires the animation to stop, stops its tween and unlock the currently used buffer */
AnimationManager.prototype.stop = function () {
	if (this.tween.playing || this.tween.starting) {
		this.tween.stop();
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/AnimationManager/index.js
 ** module id = 259
 ** module chunks = 0
 **/