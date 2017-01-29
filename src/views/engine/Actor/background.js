var Actor          = require('./main.js');
var textureLoading = require('textureLoading');
var constants      = require('constants');
var Graphic        = require('Graphic');
var tapFeedback    = require('tapFeedback');
var TeamEnum       = require('TeamEnum');
var TurnNumber     = require('TurnNumber');


var CIRCLE_PATH_RED = 'ui/embedded/teamCircleRed.png';
var CIRCLE_PATH_BLUE = 'ui/embedded/teamCircleBlue.png';



Actor.prototype.addTeamCircle = function () {
	if (this.circleGraphic) { return; }
	var fighter = this.getFighter();
	function assignCircleTexture(texture) {
		if (self.circleGraphic) {
			self.circleGraphic.w = texture.element.width;
			self.circleGraphic.h = texture.element.height;
			self.circleGraphic.texture = texture;
			self._positionCircle();
			self.circleGraphic.forceRefresh();
		} else {
			// circle was removed while texture was loading
			texture.release();
		}
	}
	if (fighter) {
		var team = fighter.data.teamId;
		var self = this;

		this.circleGraphic = new Graphic({
			layer: constants.MAP_LAYER_BACKGROUND,
			x: this.x,
			y: this.y,
			w: 0,
			h: 0,
			scene: this.scene
		});

		var colorPath;
		if (team === 0) {
			colorPath = CIRCLE_PATH_RED;
		} else if (team === 1) {
			colorPath = CIRCLE_PATH_BLUE;
		} else {
			console.error('invalid team number');
		}

		textureLoading.loadTexture(colorPath, assignCircleTexture, this.scene.renderer);
	}
};


Actor.prototype.removeTeamCircle = function () {
	if (this.circleGraphic) {
		this.circleGraphic.remove();
		this.circleGraphic = null;
	}
};

Actor.prototype._positionCircle = function () {
	if (this.circleGraphic) {
		this.circleGraphic.x = this.x - constants.CELL_WIDTH / 2;
		this.circleGraphic.y = this.y - constants.CELL_HEIGHT / 2;
		this.circleGraphic.position = this.position;
		this.circleGraphic.forceRefresh();
	}
};

Actor.prototype.showTeamCircle = function (show) {
	if (this.circleGraphic) {
		if (show) {
			this.circleGraphic.show();
		} else {
			this.circleGraphic.hide();
		}
	}
};

// turnIndicator

Actor.prototype.updateTurnIndicatorPosition = function () {
	var fighter = window.gui.fightManager.getFighter(this.actorId);
	if (fighter && window.gui.fightManager.currentFighterId === fighter.id) {
		if (fighter.data.teamId === TeamEnum.TEAM_CHALLENGER) {
			tapFeedback.moveRedFeedback(this.x, this.y);
		} else {
			tapFeedback.moveBlueFeedback(this.x, this.y);
		}
	}
};

// turn numbers

Actor.prototype.addTurnNumber = function (number) {
	this.removeTurnNumber();
	this._turnNumber = new TurnNumber(this.x, this.y, number);
};

Actor.prototype.removeTurnNumber = function () {
	if (this._turnNumber) {
		this._turnNumber.remove();
		this._turnNumber = null;
	}
};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/Actor/background.js
 ** module id = 619
 ** module chunks = 0
 **/