var Criterion = require('./Criterion.js');
var getText = require('getText').getText;
var inherits = require('util').inherits;

function RideItemCriterion(criterionString) {
	Criterion.call(this, criterionString);
}
inherits(RideItemCriterion, Criterion);

RideItemCriterion.prototype.getText = function () {
	if ((this.operator === Criterion.operators.equal && this.value === 1) ||
		(this.operator === Criterion.operators.different && this.value === 0)) {
		return getText('ui.tooltip.mountEquiped');
	}

	if ((this.operator === Criterion.operators.equal && this.value === 1) ||
		(this.operator === Criterion.operators.different && this.value === 0)) {
		return getText('ui.tooltip.mountNonEquiped');
	}

	return '';
};

RideItemCriterion.prototype.getCriterion = function () {
	return window.gui.playerData.isRiding ? 1 : 0;
};

module.exports = RideItemCriterion;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/criterionFactory/RideItemCriterion.js
 ** module id = 374
 ** module chunks = 0
 **/