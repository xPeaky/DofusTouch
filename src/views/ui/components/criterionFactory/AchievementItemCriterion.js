var Criterion = require('./Criterion.js');
var getText = require('getText').getText;
var staticContent = require('staticContent');
var inherits = require('util').inherits;

function AchievementItemCriterion(criterionString) {
	Criterion.call(this, criterionString);
}
inherits(AchievementItemCriterion, Criterion);

AchievementItemCriterion.prototype.initialize = function (cb) {
	var self = this;
	staticContent.getData('Achievements', this.value, function (error, res) {
		if (error) {
			return cb(error);
		}

		self._valueText =  ' \'' + res.nameId + '\'';
		self._keyText = getText('ui.tooltip.unlockAchievement', [self._valueText]);

		cb();
	});
};

AchievementItemCriterion.prototype.isRespected = function () {
	var achievementFinishedList = window.gui.playerData.achievements.finishedAchievementsIds;
	return achievementFinishedList.indexOf(this.value) !== -1;
};

AchievementItemCriterion.prototype.getKeyText = function () {
	return this._keyText;
};

AchievementItemCriterion.prototype.getOperatorText = function () {
	if (this.operator === Criterion.operators.different) {
		return getText('ui.tooltip.dontUnlockAchievement', [this._valueText]);
	}

	return Criterion.prototype.getOperatorText.call(this);
};

AchievementItemCriterion.prototype.getValueText = function () {
	return this._valueText;
};

module.exports = AchievementItemCriterion;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/criterionFactory/AchievementItemCriterion.js
 ** module id = 330
 ** module chunks = 0
 **/