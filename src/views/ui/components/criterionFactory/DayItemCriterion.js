var Criterion = require('./Criterion.js');
var getText = require('getText').getText;
var inherits = require('util').inherits;

function DayItemCriterion(criterionString) {
	Criterion.call(this, criterionString);
}
inherits(DayItemCriterion, Criterion);

DayItemCriterion.prototype.getKeyText = function () {
	return getText('ui.time.days', 1);
};

DayItemCriterion.prototype.getCriterion = function () {
	var date = new Date();
	return date.getDate();
};

module.exports = DayItemCriterion;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/criterionFactory/DayItemCriterion.js
 ** module id = 353
 ** module chunks = 0
 **/