var Criterion = require('./Criterion.js');
var getText = require('getText').getText;
var inherits = require('util').inherits;

function MarriedItemCriterion(criterionString) {
	Criterion.call(this, criterionString);
}
inherits(MarriedItemCriterion, Criterion);

MarriedItemCriterion.prototype.getText = function () {
	if ((this.operator === Criterion.operators.equal && this.value === 1) ||
		(this.operator === Criterion.operators.different && this.value === 2)) {
		return getText('ui.tooltip.beMaried');
	} else {
		return getText('ui.tooltip.beSingle');
	}
};

MarriedItemCriterion.prototype.getCriterion = function () {
	return window.gui.playerData.socialData.spouse !== null ? 1 : 2;
};

module.exports = MarriedItemCriterion;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/criterionFactory/MarriedItemCriterion.js
 ** module id = 364
 ** module chunks = 0
 **/