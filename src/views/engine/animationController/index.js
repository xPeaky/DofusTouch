/** @module animationController */
var constants = require('constants');
var TINAlight = require('TINAlight');

var FRAME_INTERVAL = 1000 / constants.FPS;

// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
var requestAnimFrame =
	window.requestAnimationFrame ||
	window.webkitRequestAnimationFrame ||
	window.mozRequestAnimationFrame ||
	window.oRequestAnimationFrame ||
	window.msRequestAnimationFrame ||
	function (callback) {
		window.setTimeout(callback, FRAME_INTERVAL);
	};

var animationController = {
	gameScenes: [],
	previousUpdate: Date.now(),

	//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
	/** Add scene
	 *
	 * @param {Scene} scene
	 */
	addScene: function (scene) {
		var idx = this.gameScenes.indexOf(scene);
		if (idx === -1) {
			this.gameScenes.push(scene);
		} else {
			console.warn('[animationController.addScene] Scene already in the animation controller');
		}
	},

	//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
	/** Remove scene
	 *
	 * @param {Scene} scene
	 */
	removeScene: function (scene) {
		var idx = this.gameScenes.indexOf(scene);
		if (idx !== -1) {
			this.gameScenes.splice(idx, 1);
		} else {
			console.warn('[animationController.removeScene] Scene not in the animation controller');
		}
	},

	//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
	/** start the animation controller
	*/
	start: function () {
		var self = this;
		function selfUpdate() {
			TINAlight.update();

			var now = Date.now();
			var dt  = Math.min(now - self.previousUpdate, 200); // Slowing the game down if fps smaller than 5
			var isDifferentFrame = dt > FRAME_INTERVAL;

			if (isDifferentFrame) {
				self.previousUpdate = now - (dt % FRAME_INTERVAL);
				dt /= FRAME_INTERVAL;

				var scenes = self.gameScenes;
				for (var s = 0; s < scenes.length; s += 1) {
					scenes[s].refresh(dt);
				}
			}

			requestAnimFrame(selfUpdate);
		}

		selfUpdate();
	},

	//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
	/** stop all animations
	*/
	stop: function () {
		TINAlight.stop();
	}
};

module.exports = animationController;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/animationController/index.js
 ** module id = 843
 ** module chunks = 0
 **/