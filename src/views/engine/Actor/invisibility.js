var Actor = require('./main.js');
var Tween = require('TINAlight').Tween;

var INVISIBLE_HIGHLIGHT   = { red: 0, green: 0, blue: 0, alpha: 0 };
var TRANSPARENT_HIGHLIGHT = { red: 1, green: 1, blue: 1, alpha: 0.6 };

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Update actor invisibility
 *
 * @param {number} state  - invisibility state { 1: INVISIBLE, 2: DETECTED, 3: VISIBLE }
 * @param {number} teamId - team id of actor
 */
Actor.prototype.setInvisibility = function (state, teamId) {
	this.showTeamCircle(state !== 1);
	if (state === 3) {
		this.removeHighlight();
		this.isInvisible = false;
		this.actorManager.addActorOccupation(this);
	} else {
		var userTeamId = this.actorManager.userActor.getFighterData().teamId;
		if (teamId === userTeamId) {
			this.setHighlight(TRANSPARENT_HIGHLIGHT);
		} else {
			this.setHighlight(INVISIBLE_HIGHLIGHT);
			this.isInvisible = true;
			this.actorManager.removeActorOccupation(this);
			this.actorManager.turnIndicatorOff();
		}
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Play detected animation */
Actor.prototype.invisibleDetectedAnimation = function () {
	var detectedHighlight = { red: 0, green: 0, blue: 0, alpha: 1 };
	this.setHighlight(detectedHighlight);

	// tween alpha
	Tween(this.highlight, ['alpha'])
		.from({ alpha: 1 })
		.to({ alpha: 0 }, 30)
		.start(false);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/Actor/invisibility.js
 ** module id = 614
 ** module chunks = 0
 **/