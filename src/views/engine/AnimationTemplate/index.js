var templateCount = 0;
function AnimationTemplate(id) {
	this.id   = id;
	this.name = ('t' + (templateCount++));

	// Symbols exposed by this template
	this.exposedSymbols  = {};

	// Template content: a texture and animation Data
	this.texture         = null;
	this.animationHandle = null;

	this.symbols  = {};

	// List of templates this template has been merged into
	this.parentTemplates = {};

	// Whether the template posses animations
	this.isEmpty = true;
}
module.exports = AnimationTemplate;

AnimationTemplate.prototype.getFullId = function () {
	return this.id;
};

AnimationTemplate.prototype.clear = function () {
	// Releasing animation data and texture
	if (this.texture) { this.texture.release(); }
	if (this.animationHandle) { this.animationHandle.release(); }
};

AnimationTemplate.prototype.merge = function () {};

AnimationTemplate.prototype.unmerge = function () {};

AnimationTemplate.prototype.generateTemplate = function () {};

AnimationTemplate.prototype.getSymbol = function (animationName) {
	var symbol = this.exposedSymbols[animationName];
	if (symbol) { return symbol; }
	return null;
};

AnimationTemplate.prototype.hasAnimation = function (animationName) {
	return !!this.getSymbol(animationName);
};

AnimationTemplate.prototype.getAnimationNbFrames = function (animationName) {
	var symbol = this.getSymbol(animationName);
	if (!symbol) {
		console.warn('Symbol ' + animationName + ' not registered in character\'s template');
		return 0;
	}

	return symbol.nbFrames;
};

AnimationTemplate.prototype.getAnimationDuration = function (animationName) {
	var symbol = this.getSymbol(animationName);
	if (!symbol) {
		console.warn('Symbol ' + animationName + ' not registered in character\'s template');
		return 0;
	}

	return symbol.duration;
};

AnimationTemplate.prototype.getAnimationFrameSound = function (animationName, frame) {
	// TODO:
	// We suppose that sounds are always at the root of the animation
	// Make sure it is always the case
	var symbol = this.getSymbol(animationName);
	if (!symbol) {
		console.warn('Symbol ' + animationName + ' not registered in character\'s template');
		return null;
	}
	return symbol.sounds ? symbol.sounds[frame] : null;
};

AnimationTemplate.prototype.getAnimationSounds = function (templateId) {
	var bonesId = typeof templateId === 'string' ? templateId.split('/').shift() : templateId;
	var animSounds = {};
	for (var symbolId in this.exposedSymbols) {
		var symbol = this.exposedSymbols[symbolId];
		var sounds = symbol.sounds;
		if (!sounds) { continue; }
		for (var frame in sounds) {
			animSounds[bonesId + '/' + symbolId + ':' + frame] = sounds[frame];
		}
	}
	return animSounds;
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/AnimationTemplate/index.js
 ** module id = 257
 ** module chunks = 0
 **/