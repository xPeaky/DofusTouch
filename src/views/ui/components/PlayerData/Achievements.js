/**
 * @module PlayerData/achievements
 */

var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;

var REWARD_SCALE_CAP = 1.5;
var REWARD_REDUCED_SCALE = 0.7;

/**
 * Achievements
 * @constructor
 */
function Achievements() {
	EventEmitter.call(this);
	this.finishedAchievementsIds = [];
	this.rewardableAchievements = {};
	this.points = 0;
}

inherits(Achievements, EventEmitter);
module.exports = Achievements;

Achievements.prototype.disconnect = function () {
	this.finishedAchievementsIds = [];
	this.rewardableAchievements = {};
	this.points = 0;
};

Achievements.prototype.initialize = function (gui) {
	var self = this;

	gui.on('AchievementListMessage', function (msg) {
		var points = msg.enrichData.points;
		self.finishedAchievementsIds = msg.finishedAchievementsIds;
		for (var i = 0; i < msg.rewardableAchievements.length; i++) {
			self.finishedAchievementsIds.push(msg.rewardableAchievements[i].id);
			self.rewardableAchievements[msg.rewardableAchievements[i].id] = msg.rewardableAchievements[i];
		}
		self.points = points;
		self.emit('achievementListUpdated', msg);
	});

	gui.on('AchievementFinishedMessage', function (msg) {
		var points = msg.enrichData.points;
		self.finishedAchievementsIds.push(msg.id);
		self.rewardableAchievements[msg.id] = msg;
		self.points += points;
		self.emit('achievementFinished', msg);
	});

	gui.on('AchievementRewardSuccessMessage', function (msg) {
		delete self.rewardableAchievements[msg.achievementId];
		self.emit('achievementRewardSuccess', msg.achievementId);
	});
};

Achievements.prototype.getAchievementKamasReward = function (achievement, finishedLevel) {
	if (!finishedLevel) {
		finishedLevel = window.gui.playerData.characterBaseInformations.level;
	}
	return this._getKamasReward(achievement, finishedLevel);
};

Achievements.prototype.getAchievementExperienceReward = function (achievement, finishedLevel) {
	if (!finishedLevel) {
		finishedLevel = finishedLevel || window.gui.playerData.characterBaseInformations.level;
	}
	return this._getExperienceReward(achievement, finishedLevel);
};

// private

Achievements.prototype._getKamasReward = function (achievement, finishedLevel) {
	if (!achievement) {
		return 0;
	}
	var lvl = achievement.kamasScaleWithPlayerLevel ? finishedLevel : achievement.level;
	return Math.floor((Math.pow(lvl, 2) + 20 * lvl - 20) * achievement.kamasRatio);
};

Achievements.prototype._getExperienceReward = function (achievement, finishedlevel) {
	var experienceFactor = window.gui.playerData.experienceFactor;

	function getFixedExperienceReward(level, achExperienceRatio) {
		return Math.floor((level * Math.pow(100 + (2 * level), 2) / 20) * achExperienceRatio);
	}

	if (!achievement) {
		return 0;
	}

	var xpBonus = 1 + experienceFactor / 100;
	var achLevel = achievement.level;
	var achExperienceRatio = achievement.experienceRatio;

	if (finishedlevel > achLevel) {
		var rewLevel = Math.floor(Math.min(finishedlevel, (achLevel * REWARD_SCALE_CAP)));
		var achFixedReward = getFixedExperienceReward(achLevel, achExperienceRatio);
		var rewFixedReward = getFixedExperienceReward(rewLevel, achExperienceRatio);

		var achRewardReduce = ((1 - REWARD_REDUCED_SCALE) * achFixedReward);
		var rewReduceReward = (REWARD_REDUCED_SCALE * rewFixedReward);
		return Math.floor((achRewardReduce + rewReduceReward) * xpBonus);
	}
	var fixedExperienceReward = getFixedExperienceReward(finishedlevel, achExperienceRatio);
	return Math.floor(fixedExperienceReward * xpBonus);
};

Achievements.prototype.completedData = function (achievementId) {
	var isFinished = this.finishedAchievementsIds.indexOf(achievementId) !== -1;
	var isRewardPending = this.rewardableAchievements[achievementId];
	var output = {
		isCompleted: isFinished && !isRewardPending,
		finishedlevel: null
	};

	if (output.isCompleted) {
		return output;
	}

	var rewardableAchievements = this.rewardableAchievements;
	for (var id in rewardableAchievements) {
		var rewardableAchievement = rewardableAchievements[id];
		if (rewardableAchievement.id === achievementId) {
			output.isCompleted = true;
			output.finishedlevel = rewardableAchievement.finishedlevel;
			break;
		}
	}

	return output;
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/PlayerData/Achievements.js
 ** module id = 534
 ** module chunks = 0
 **/