var Criterion = require('./Criterion.js');
var getText = require('getText').getText;
var util = require('util');

function LevelItemCriterion(criterionString) {
	Criterion.call(this, criterionString);
}
util.inherits(LevelItemCriterion, Criterion);

LevelItemCriterion.prototype.getKeyText = function () {
	return getText('ui.common.level');
};

LevelItemCriterion.prototype.getCriterion = function () {
	return window.gui.playerData.characterBaseInformations.level;
};

module.exports = LevelItemCriterion;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/criterionFactory/LevelItemCriterion.js
 ** module id = 362
 ** module chunks = 0
 **/