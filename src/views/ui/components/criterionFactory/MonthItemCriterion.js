var Criterion = require('./Criterion.js');
var getText = require('getText').getText;
var util = require('util');

function MonthItemCriterion(criterionString) {
	Criterion.call(this, criterionString);
}
util.inherits(MonthItemCriterion, Criterion);

MonthItemCriterion.prototype.getKeyText = function () {
	return getText('ui.time.months');
};

MonthItemCriterion.prototype.getCriterion = function () {
	var date = new Date();
	return date.getMonth();
};

module.exports = MonthItemCriterion;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/criterionFactory/MonthItemCriterion.js
 ** module id = 366
 ** module chunks = 0
 **/