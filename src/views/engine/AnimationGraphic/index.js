function AnimationGraphic(graphicProps, animationData, texture) {
	this.vertexPos = [
		graphicProps.x,
		graphicProps.y,
		graphicProps.x + graphicProps.w,
		graphicProps.y + graphicProps.h
	];

	this.textureCoord = [
		graphicProps.sx / texture.element.width,
		graphicProps.sy / texture.element.height,
		(graphicProps.sx + graphicProps.sw) / texture.element.width,
		(graphicProps.sy + graphicProps.sh) / texture.element.height
	];

	this.id        = graphicProps.id;
	this.tint      = graphicProps.tint;
	this.texture   = texture;
	this.className = graphicProps.className;
	this.nbFrames  = 1;

	this.animationData = animationData;
}
AnimationGraphic.prototype.isGraphic = true;
module.exports = AnimationGraphic;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/AnimationGraphic/index.js
 ** module id = 253
 ** module chunks = 0
 **/