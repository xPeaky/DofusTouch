require('./styles.less');
var dimensions = require('dimensionsHelper').dimensions;
var inherits = require('util').inherits;
var WuiDom = require('wuidom');
var gripBehavior = require('gripBehavior');
var getText = require('getText').getText;
var addTooltip = require('TooltipBox').addTooltip;
var assetPreloading = require('assetPreloading');
var highlightCells = require('./challengeMap.js').highlightCells;
var connectionManager = require('dofusProxy/connectionManager.js');

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** @class */
function ChallengeIndicator() {
	WuiDom.call(this, 'div', { className: 'ChallengeIndicator', hidden: true });
	gripBehavior(this);

	this.neverShowedYet = true;

	this.challengeSlot = this.createChild('div', { className: 'challengeSlot' });

	this.challenges = {};
	this.challengesResult = {};

	this._registerListeners(window.gui);
}
inherits(ChallengeIndicator, WuiDom);
module.exports = ChallengeIndicator;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Set listeners for this component
 *  @private
 *  @param {Object} gui - object on which event are registered to.
 */
ChallengeIndicator.prototype._registerListeners = function (gui) {
	var self = this;

	/** @event module:protocol/fightChallenge.client_ChallengeInfoMessage */
	gui.on('ChallengeInfoMessage', function (msg) {
		self.setChallenge(msg);
	});

	/** @event module:protocol/fightChallenge.client_ChallengeResultMessage */
	gui.on('ChallengeResultMessage', function (msg) {
		if (!self.challenges[msg.challengeId]) {
			self.challengesResult[msg.challengeId] = msg;
			return;
		}
		self.setChallengeResult(msg);
	});

	/**
	 * @event module:protocol/fightChallenge.client_ChallengeTargetsListMessage
	 * @desc  Information on targets linked to a challenge's objectives
	 * {array} msg.targetIds   - ids of targets
	 * {array} msg.targetCells - cells of targets (-1 if invisible)
	 */
	connectionManager.on('ChallengeTargetsListMessage', function (/*msg*/) {
		highlightCells();
	});

	/** @event module:protocol/contextFight.client_GameFightEndMessage */
	gui.on('GameFightEndMessage', function () {
		// hide and reset the challenge box once fight has ended
		self.hide();
		self.reset();
	});

	/** @event module:protocol/contextFight.client_GameFightJoinMessage */
	// TODO: might better be 'GameFightStartingMessage' that comes before ?
	gui.on('GameFightJoinMessage', function () {
		//TODO
	});

	gui.on('disconnect', function () {
		self.hide();
		self.reset();
	});
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Set current challenge data
 *
 * @param {Object} data - current challenge data
 *
 * @param {Number} data.challengeId - challenge id
 * @param {Number} data.targetId    - id of fighter targeted for this challenge (0 if none)
 * @param {Number} data.xpBonus     - experience bonus.
 * @param {Number} data.dropBonus   - drop bonus
 */
ChallengeIndicator.prototype.setChallenge = function (data) {
	var self = this;
	var challengeData = data;

	var fighter = window.gui.fightManager.getFighter(challengeData.targetId);
	if (fighter) {
		challengeData._targetFighter = fighter;

		if (challengeData._targetFighter) {
			var targetStr = challengeData._targetFighter.name +
				' (' + getText('ui.common.level') + ' ' +
					challengeData._targetFighter.level + ')';
			challengeData._description = challengeData._description.replace('%1', targetStr);
		}
	}

	var challengeIcon = this.challengeSlot.createChild('div', { className: 'challengeIcon' });
	challengeIcon.challengeState = challengeIcon.createChild('div', { className: 'challengeState' });

	var challengeDetails = new WuiDom('div', { className: 'challengeDetails', name: 'challengeDetails' });
	challengeDetails.challengeName = challengeDetails.createChild('div', {
		className: 'challengeName',
		text: challengeData._name
	});
	challengeDetails.challengeDesc = challengeDetails.createChild('div', {
		className: 'challengeDesc',
		text: challengeData._description
	});
	challengeDetails.challengeLoot = challengeDetails.createChild('div', {
		className: 'challengeLoot',
		text: getText('ui.common.loot') + ' +' + challengeData.dropBonus + '%'
	});
	challengeDetails.challengeXp = challengeDetails.createChild('div', {
		className: 'challengeXp',
		text: getText('ui.common.xp') + ' +' + challengeData.xpBonus + '%'
	});
	challengeDetails.challengeStatus = challengeDetails.createChild('div', {
		className: 'challengeStatus',
		text: getText('ui.fight.challenge.inProgress')
	});

	addTooltip(challengeIcon, challengeDetails);

	var challengeId = data.challengeId;
	challengeIcon.on('tap', function () {
		window.dofus.sendMessage('ChallengeTargetsListRequestMessage', { challengeId: challengeId });
	});

	this.challenges[challengeId] = {
		icon: challengeIcon,
		details: challengeDetails,
		data: challengeData
	};

	challengeData.iconUrl = 'none';
	assetPreloading.preloadImage('gfx/challenges/' + challengeId + '.png', function (url) {
		challengeIcon.setStyle('backgroundImage', url);
		challengeData.iconUrl = url; // keep url for fightEndWindow.
		self.show();
	});

	var challengeResult = this.challengesResult[challengeId];
	if (challengeResult) {
		this.setChallengeResult(challengeResult);
	}

	// If this will be the first time to appear, we enforce position to "mapLeft"
	// (after that, player can move it around the map as he prefers)
	if (this.neverShowedYet) {
		this.neverShowedYet = false;
		this.setStyle('left', dimensions.mapLeft + 'px');
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * Set the challenge status (green tick if success or red cross if failed)
 */
ChallengeIndicator.prototype.setChallengeResult = function (msg) {
	var challenge = this.challenges[msg.challengeId];
	if (msg.success) {
		challenge.icon.challengeState.addClassNames('success');
		challenge.details.challengeStatus.addClassNames('success');
		challenge.details.challengeStatus.setText(getText('ui.fight.challenge.complete'));
	} else {
		challenge.icon.challengeState.addClassNames('fail');
		challenge.details.challengeStatus.addClassNames('fail');
		challenge.details.challengeStatus.setText(getText('ui.fight.challenge.failed'));
	}
	challenge.data.success = msg.success;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Reset challenge icon */
ChallengeIndicator.prototype.reset = function () {
	for (var id in this.challenges) {
		this.challenges[id].icon.destroy();
		this.challenges[id].details.destroy();
		delete this.challenges[id];
	}
	this.challengesResult = {};
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/mainUi/ChallengeIndicator/index.js
 ** module id = 435
 ** module chunks = 0
 **/