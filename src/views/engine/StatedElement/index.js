var inherits       = require('util').inherits;
var AnimatedSprite = require('AnimatedSprite');

var ANIMATED_STATES = {
	2: true
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * @class StatedElement
 * @desc  stated element wrapper
 *
 * @author  Cedric Stoquer
 *
 * @param {Object} params - parameters object
 */
function StatedElement(params, animManager) {
	AnimatedSprite.call(this, params, animManager);
	this.state    = -1;                // state information
	this.animated = false; // is the element currently animated ?
}
inherits(StatedElement, AnimatedSprite);
module.exports = StatedElement;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Change element state
 *
 * @param {number}  newState - element new state
 * @param {boolean} [skipTransition] - skip transition animation
 */
StatedElement.prototype.changeState = function (newState, skipTransition) {
	if (this.state === newState) { return; }
	var self = this;
	var animManager = this.animManager;
	var state = this.state;
	this.state = newState;

	if (animManager.isVoidAnimManager) { return; }

	// animation from old state to new state
	var transitionSymbol = {
		id:   'AnimState' + state + '_to_AnimState' + newState + '_0',
		base: 'AnimState' + state + '_to_AnimState' + newState,
		direction: 0
	};

	var newSymbol  = {
		id:   'AnimState' + newState + '_0',
		base: 'AnimState' + newState,
		direction: 0
	};

	var loop = ANIMATED_STATES[newState] || false;

	function assignStaticAnimation() {
		animManager.assignSymbol(newSymbol, loop);

		self.animated = loop;
	}

	// check that transitionSymbol exist in animManager's template
	if (!skipTransition && animManager.template && animManager.template.exposedSymbols[transitionSymbol.id]) {
		this.animated = true;
		animManager.assignSymbol(transitionSymbol, false, assignStaticAnimation);
	} else {
		assignStaticAnimation();
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/StatedElement/index.js
 ** module id = 1015
 ** module chunks = 0
 **/