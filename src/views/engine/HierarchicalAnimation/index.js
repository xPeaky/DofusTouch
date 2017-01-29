function Child(childProps) {
	this.id        = childProps.id;
	this.matrices  = childProps.matrices;
	this.colors    = childProps.colors;
	this.frames    = childProps.frames;

	// TODO: verify that comment is valid
	// In the swf file symbols are defined in descending order
	// But we want to use them in ascending order (same as rendering order)
	// Therefore mask start and end are reversed

	this.maskStart = childProps.maskStart || false;
	this.maskEnd   = childProps.maskEnd   || false;
}

function HierarchicalAnimation(animProps, animationData) {
	var children = animProps.children;

	this.children = [];
	var lastFrame = 0;
	for (var c = 0; c < children.length; c += 1) {
		var childProps = children[c];
		this.children.push(new Child(childProps));
		if (lastFrame < childProps.frames[1]) {
			lastFrame = childProps.frames[1];
		}
	}

	this.id        = animProps.id;
	this.duration  = animProps.duration;
	this.className = animProps.className;
	this.sounds    = animProps.sounds;
	this.nbFrames  = lastFrame + 1;

	this.animationData = animationData;
}

HierarchicalAnimation.prototype.isAnim = true;
module.exports = HierarchicalAnimation;


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/HierarchicalAnimation/index.js
 ** module id = 254
 ** module chunks = 0
 **/