// Formulas taken directly from ankama client's code.
// Note : they are casting float to unint, which is equal to Math.floor instead of Math.round


exports.calculateStepKamasRatio = function (stepData) {
	var playerLevel = window.gui.playerData.characterBaseInformations.level;
	var lvl = stepData.kamasScaleWithPlayerLevel ? playerLevel : stepData.optimalLevel;
	return Math.floor((Math.pow(lvl, 2) + 20 * lvl - 20) * stepData.kamasRatio * stepData.duration);
};

function getFixedExperienceReward(level, stepData) {
	return Math.floor((level * Math.pow(100 + (2 * level), 2) / 20) * stepData.duration * stepData.xpRatio);
}

exports.calculateStepXpRatio = function (stepData) {
	var REWARD_SCALE_CAP = 1.5;
	var REWARD_REDUCED_SCALE = 0.7;
	var playerLevel = window.gui.playerData.characterBaseInformations.level;
	var experienceFactor = 1 + window.gui.playerData.experienceFactor / 100;
	var optimalLevel = stepData.optimalLevel;

	if (playerLevel > optimalLevel) {
		var rewLevel =  Math.floor(Math.min(playerLevel, (optimalLevel * REWARD_SCALE_CAP)));
		var step1 = (1 - REWARD_REDUCED_SCALE) * getFixedExperienceReward(optimalLevel, stepData);
		var step2 = REWARD_REDUCED_SCALE * getFixedExperienceReward(rewLevel, stepData);
		return Math.floor((step1 + step2) * experienceFactor);
	}

	return Math.floor(getFixedExperienceReward(playerLevel, stepData) * experienceFactor);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/questStepHelper/index.js
 ** module id = 749
 ** module chunks = 0
 **/