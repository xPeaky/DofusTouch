var Criterion = require('./Criterion.js');
var getText = require('getText').getText;
var inherits = require('util').inherits;

function PVPRankItemCriterion(criterionString) {
	Criterion.call(this, criterionString);
}
inherits(PVPRankItemCriterion, Criterion);

PVPRankItemCriterion.prototype.getKeyText = function () {
	return getText('ui.pvp.rank');
};

module.exports = PVPRankItemCriterion;


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/criterionFactory/PVPRankItemCriterion.js
 ** module id = 370
 ** module chunks = 0
 **/