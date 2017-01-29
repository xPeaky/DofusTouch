var Criterion = require('./Criterion.js');
var getText = require('getText').getText;
var util = require('util');

function MaxRankCriterion(criterionString) {
	Criterion.call(this, criterionString);
}
util.inherits(MaxRankCriterion, Criterion);

MaxRankCriterion.prototype.getCriterion = function () {
	return window.gui.playerData.partyData.arenaStats.bestDailyRank;
};

MaxRankCriterion.prototype.getText = function () {
	var readableOperator;
	if (this.operator === Criterion.operators.different) {
		readableOperator = getText('ui.common.differentFrom') + ' >';
	} else {
		readableOperator =  '>';
	}

	return getText('ui.common.pvpMaxRank') + ' ' + readableOperator  + ' ' + this.value;
};

module.exports = MaxRankCriterion;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/criterionFactory/MaxRankCriterion.js
 ** module id = 365
 ** module chunks = 0
 **/