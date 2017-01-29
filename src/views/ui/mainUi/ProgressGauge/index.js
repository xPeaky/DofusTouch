require('./styles.less');
var inherits = require('util').inherits;
var WuiDom   = require('wuidom');
var dimensions = require('dimensionsHelper').dimensions;
var helper = require('helper');

// we may implement more modes later (like mount XP)
var GAUGE_MODE = {
	PLAYER_EXPERIENCE: 'playerExperience',
	FIGHT_TIMER: 'fightTimer'
};


/**
 * @class ProgressGauge
 * @desc  Horizontal progress gauge, to display XP or fight timer
 */
function ProgressGauge() {
	WuiDom.call(this, 'div', { className: 'progressGauge' });

	this.gaugeBg = this.createChild('div', { className: 'gaugeBg' }); // black background
	this.gaugeMask = this.createChild('div', { className: 'gaugeMask' }); // for extremities with special shapes
	this.gaugeFill = this.gaugeMask.createChild('div', { className: 'gaugeFill' }); // the bar itself

	this._resetAnimInfo();
	this._setMode(GAUGE_MODE.PLAYER_EXPERIENCE, { percentage: 0 });
	this._initEvents();
}

inherits(ProgressGauge, WuiDom);
module.exports = ProgressGauge;

/**
 * @desc Setup all ProgressGauge interactions with the game
 */
ProgressGauge.prototype._initEvents = function () {
	var self = this;

	window.gui.on('resize', function () {
		self._resize();
	});

	window.gui.on('CharacterStatsListMessage', function (msg) {
		if (self.gaugeMode !== GAUGE_MODE.PLAYER_EXPERIENCE) { return; }
		var stats = msg.stats;
		self._setExperienceValue(stats.experience, stats.experienceLevelFloor, stats.experienceNextLevelFloor);
	});

	window.gui.fightManager.on('fightEnterPreparation', function (msg) {
		if (msg.isSpectator) { return; }
		self._setMode(GAUGE_MODE.FIGHT_TIMER, { duration: msg.timeMaxBeforeFightStart });
	});

	window.gui.fightManager.on('fightEnterBattle', function () {
		if (window.gui.playerData.isSpectator) { return; }
		if (self.gaugeMode !== GAUGE_MODE.FIGHT_TIMER) { // happens on reconnection
			self._setMode(GAUGE_MODE.FIGHT_TIMER);
		}
		self._pauseAnimation();
	});

	window.gui.timeline.on('setTurnOf', function (fighter, waitTime) {
		if (self.gaugeMode !== GAUGE_MODE.FIGHT_TIMER) { return; }
		var controlledCharacterId = window.gui.playerData.characters.controlledCharacterId;
		if (fighter.id === controlledCharacterId) {
			self._animate(waitTime);
		} else {
			self._setStatic();
			self._setPercentage(0);
		}
	});

	window.gui.fightManager.on('fightEnd', function () {
		self._setMode(GAUGE_MODE.PLAYER_EXPERIENCE, { percentage: 0 });
	});
};

/**
 * @desc Define current gauge mode
 *
 * @param {string} gaugeMode         - a value defined in local GAUGE_MODE constant
 * @param {object} option
 *        {number} option.percentage - (optional, default is 0) set immediatly the bar to a certain percentage
 *        {number} option.duration   - (optional) if this is set and if gaugeMode is `fightTimer`,
 *                                     starts the timer immediatly with the provided duration (ms)
 */
ProgressGauge.prototype._setMode = function (gaugeMode, option) {
	var duration = (option && typeof option.duration === 'number') ? option.duration : null;
	var percentage = (option && typeof option.percentage === 'number') ? option.percentage : 0;
	switch (gaugeMode) {
		case GAUGE_MODE.FIGHT_TIMER:
			this.replaceClassNames(['playerXp'], ['fightTimer']);
			this.gaugeMode = gaugeMode;
			if (duration !== null) {
				this._animate(duration, percentage);
			} else {
				this._setStatic();
				this._setPercentage(percentage);
				this._resetAnimInfo();
			}
			break;
		case GAUGE_MODE.PLAYER_EXPERIENCE:
		default:
			this.replaceClassNames(['fightTimer'], ['playerXp']);
			this.gaugeMode = gaugeMode;
			this._setStatic();
			this._resetAnimInfo();
			this._setPercentage(percentage);
			break;
	}
};

/**
 * @desc Reset current running animation info
 */
ProgressGauge.prototype._resetAnimInfo = function () {
	this.animationInfo = {
		startTime: 0,
		duration: 0,
		startFrom: 0
	};
};

/**
 * @desc Removes all animation parameters
 */
ProgressGauge.prototype._setStatic = function () {
	this.gaugeFill.setStyles({
		webkitAnimation: 'initial',
		webkitAnimationPlayState: 'initial'
	});
};

/**
 * @desc Defines the current (or target) bar percentage
 *
 * @param {number} percentage - percentage between 0 and 100
 */
ProgressGauge.prototype._setPercentage = function (percentage) {
	percentage = Math.max(0, Math.min(100, percentage));
	this.gaugeFill.setStyle(
		'webkitTransform',
		'translate3d(-' + ((100 - percentage) / 2) + '%,0,0) scaleX(' + (percentage / 100) + ')'
	);
};

/**
 * @desc Helpers to set a percentage based from an actor experience values
 *
 * @param {number} xpCurrent   - current actor xp
 * @param {number} xpFloor     - previous level xp
 * @param {number} xpNextFloor - next level xp
 */
ProgressGauge.prototype._setExperienceValue = function (xpCurrent, xpFloor, xpNextFloor) {
	if (this.gaugeMode !== GAUGE_MODE.PLAYER_EXPERIENCE) {
		return console.error(new Error('ProgressGauge is not in experience mode'));
	}
	var expPercentage = ((xpCurrent - xpFloor) / (xpNextFloor - xpFloor)) * 100;
	this._setPercentage(expPercentage);
};

/**
 * @desc Start bar animation
 *
 * @param {number} duration  - duration of the bar fill animation in ms
 * @param {number} startFrom - optional starting percentage value (0~100)
 */
ProgressGauge.prototype._animate = function (duration, startFrom) {
	if (this.gaugeMode !== GAUGE_MODE.FIGHT_TIMER) {
		return console.error(new Error('ProgressGauge._animate: ProgressGauge is not in timer mode'));
	}

	startFrom = startFrom || 0;
	startFrom = Math.max(0, Math.min(100, startFrom));
	var animationDelay = duration / 100 * startFrom;

	this._setStatic();
	this._setPercentage(100);
	helper.forceReflow(this.gaugeFill);

	this.animationInfo = {
		startTime: Date.now(),
		duration: duration,
		startFrom: startFrom
	};

	this.gaugeFill.setStyles({
		webkitAnimation: 'progressGaugeAnimation ' + duration + 'ms linear -' + animationDelay + 'ms',
		webkitAnimationPlayState: 'running'
	});
};

/**
 * @desc Pause bar animation
 */
ProgressGauge.prototype._pauseAnimation = function () {
	if (this.gaugeMode !== GAUGE_MODE.FIGHT_TIMER) {
		return console.error(new Error('ProgressGauge._pauseAnimation: ProgressGauge is not in timer mode'));
	}
	this.gaugeFill.setStyle('webkitAnimationPlayState', 'paused');
};

/**
 * @desc Resize the bar when window is resized
 */
ProgressGauge.prototype._resize = function () {
	if (window.gui.ipadRatio) {
		this.setStyle('width', '100%');
	} else {
		this.setStyle('width', dimensions.shortcutBarSize - 9 + 'px');
	}

	// iOS8 fix: if gaugeFill was already animating when the resize occured, animation needs to be re-set
	var animInfo = this.animationInfo;
	if (this.gaugeMode === GAUGE_MODE.FIGHT_TIMER && animInfo.startTime !== 0) {
		var delta = Date.now() - animInfo.startTime;
		if (delta < animInfo.duration) {
			var alreadyFilled = (delta / animInfo.duration) * (100 - animInfo.startFrom);
			var startFrom = animInfo.startFrom + alreadyFilled;
			this._animate(animInfo.duration - delta, startFrom);
		}
	}
};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/mainUi/ProgressGauge/index.js
 ** module id = 547
 ** module chunks = 0
 **/