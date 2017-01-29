var Criterion = require('./Criterion.js');
var inherits = require('util').inherits;

// ankama does not know how to deal with this criterion yet
function StaticCriterionItemCriterion(data) {
	Criterion.call(this, data);
}
inherits(StaticCriterionItemCriterion, Criterion);

StaticCriterionItemCriterion.prototype.isRespected = function () {
	return true;
};

StaticCriterionItemCriterion.prototype.getText = function () {
	return '';
};

module.exports = StaticCriterionItemCriterion;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/criterionFactory/StaticCriterionItemCriterion.js
 ** module id = 380
 ** module chunks = 0
 **/