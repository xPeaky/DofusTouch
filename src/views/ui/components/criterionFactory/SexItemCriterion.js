var Criterion = require('./Criterion.js');
var getText = require('getText').getText;
var inherits = require('util').inherits;

function SexItemCriterion(criterionString) {
	Criterion.call(this, criterionString);
}
inherits(SexItemCriterion, Criterion);

SexItemCriterion.prototype.getText = function () {
	if (this.value === 1) {
		return getText('ui.tooltip.beFemale');
	} else {
		return getText('ui.tooltip.beMale');
	}
};

SexItemCriterion.prototype.getCriterion = function () {
	return window.gui.playerData.characterBaseInformations.sex ? 1 : 0;
};

module.exports = SexItemCriterion;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/criterionFactory/SexItemCriterion.js
 ** module id = 376
 ** module chunks = 0
 **/