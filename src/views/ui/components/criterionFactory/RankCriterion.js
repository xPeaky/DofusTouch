var Criterion = require('./Criterion.js');
var getText = require('getText').getText;
var inherits = require('util').inherits;

function RankCriterion(criterionString) {
	Criterion.call(this, criterionString);
}
inherits(RankCriterion, Criterion);

RankCriterion.prototype.getKeyText = function () {
	return getText('ui.common.pvpRank');
};

RankCriterion.prototype.getOperatorText = function () {
	if (this.operator === Criterion.operators.different) {
		return getText('ui.common.differentFrom') + ' >';
	} else {
		return '>';
	}
};

RankCriterion.prototype.getCriterion = function () {
	return window.gui.playerData.partyData.arenaStats.rank;
};

module.exports = RankCriterion;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/criterionFactory/RankCriterion.js
 ** module id = 372
 ** module chunks = 0
 **/