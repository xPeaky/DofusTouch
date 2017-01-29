var AnimationGraphic = require('AnimationGraphic');

function AtlasAnimation(animProps, animationData, texture) {
	var frames = animProps.frames;
	this.frames = [];
	for (var f = 0; f < frames.length; f += 1) {
		this.frames.push(new AnimationGraphic(frames[f].position, animationData, texture));
	}

	this.id        = animProps.id;
	this.className = animProps.className;
	this.sounds    = animProps.sounds;
	this.duration  = animProps.duration;
	this.nbFrames  = this.frames.length;

	this.animationData = animationData;
}

AtlasAnimation.prototype.isAnim = true;
module.exports = AtlasAnimation;


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/AtlasAnimation/index.js
 ** module id = 255
 ** module chunks = 0
 **/