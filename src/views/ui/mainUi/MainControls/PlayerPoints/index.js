require('./styles.less');
var addTooltip = require('TooltipBox').addTooltip;
var inherits = require('util').inherits;
var getText = require('getText').getText;
var NetworkIndicator = require('MainControls/NetworkIndicator');
var WuiDom = require('wuidom');
var userPref = require('UserPreferences');


/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @class PlayerPoints
 *
 * @desc  Display following player points:
 *        ~ actions points in a blue circle
 *        ~ movement points in a green circle
 *        ~ life points in a red heartshaped gauge. Display type can be changed when tapping on it.
 */
function PlayerPoints() {
	WuiDom.call(this, 'div', { className: 'playerPoints' });
	var self = this;

	this._lifePoints = 1; // default value
	this._maxLifePoints = 1;  // default value

	window.gui.on('connected', function () {
		self.lifeDisplay = userPref.getValue('lifeDisplayMode', 'simple');
	});

	window.gui.on('disconnect', function () {
		self.lifeGauge.setStyle('height', '0%');
		self.lifePointsNumber.clearContent();
	});

	var actionAndMovement = this.actionAndMovement = this.createChild('div', { className: 'actionAndMovement' });
	this.actionPointsNumber = actionAndMovement.createChild('div', { className: ['number', 'actionPoints'] });
	this.movementPointsNumber = actionAndMovement.createChild('div', { className: ['number', 'movementPoints'] });

	addTooltip(this.actionPointsNumber, getText('ui.common.ap'));
	addTooltip(this.movementPointsNumber, getText('ui.common.mp'));

	var lifePointsWrapper = this.createChild('div', { className: 'lifePointsWrapper' });
	var lifeHeart = lifePointsWrapper.createChild('div', { className: 'lifeHeart' });
	this.lifeGauge = lifeHeart.createChild('div', { className: 'lifeGauge' });
	lifePointsWrapper.createChild('div', { className: 'highlights' });
	this.lifePointsNumberWrapper = lifePointsWrapper.createChild('div', { className: 'numberWrapper' });
	this.lifePointsNumber = this.lifePointsNumberWrapper.createChild('div', { className: 'number' });

	lifePointsWrapper.appendChild(new NetworkIndicator());

	addTooltip(lifeHeart, getText('ui.common.lifePoints'));
	lifeHeart.on('tap', function () {
		self.switchLifeDisplay();
	});

	function updateLifePoints(points) {
		self._lifePoints = points;
		self.displayLifePoints();
	}
	function updateMaxLifePoints(points) {
		self._maxLifePoints = points;
		self.displayLifePoints();
	}
	function updateActionPoints(points) {
		self.actionPointsNumber.setText(points);
	}
	function updateMovementPoints(points) {
		self.movementPointsNumber.setText(points);
	}

	window.gui.playerData.on('lifePointsUpdated', function (points) {
		updateLifePoints(points);
	});
	window.gui.playerData.on('maxLifePointsUpdated', function (points) {
		updateMaxLifePoints(points);
	});
	window.gui.playerData.on('actionPointsCurrentUpdated', function (points) {
		updateActionPoints(points);
	});
	window.gui.playerData.on('movementPointsCurrentUpdated', function (points) {
		updateMovementPoints(points);
	});
}
inherits(PlayerPoints, WuiDom);


/** Switch life point display method. */
PlayerPoints.prototype.switchLifeDisplay = function () {
	switch (this.lifeDisplay) {
	case 'simple' :
		this.lifeDisplay = 'total';
		break;
	case 'total' :
		this.lifeDisplay = 'percentage';
		break;
	case 'percentage' :
		this.lifeDisplay = 'simple';
		break;
	}
	userPref.setValue('lifeDisplayMode', this.lifeDisplay);
	this.displayLifePoints();
};

/** Render player life points, and update life gauge. */
PlayerPoints.prototype.displayLifePoints = function () {
	var percentage = (this._lifePoints / this._maxLifePoints) * 100;
	this.lifeGauge.setStyle('height', percentage + '%');

	switch (this.lifeDisplay) {
	case 'simple' :
		this.lifePointsNumber.setHtml(this._lifePoints);
		break;
	case 'total' :
		this.lifePointsNumber.setHtml(this._lifePoints + '<br>' + this._maxLifePoints);
		break;
	case 'percentage' :
		this.lifePointsNumber.setHtml(Math.round(percentage) + '<br>%');
		break;
	}
};

module.exports = PlayerPoints;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/mainUi/MainControls/PlayerPoints/index.js
 ** module id = 496
 ** module chunks = 0
 **/