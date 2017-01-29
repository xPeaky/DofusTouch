var Criterion = require('./Criterion.js');
var getText = require('getText').getText;
var inherits = require('util').inherits;

function AlignmentItemCriterion(criterionString) {
	Criterion.call(this, criterionString);
}
inherits(AlignmentItemCriterion, Criterion);

AlignmentItemCriterion.prototype.getKeyText = function () {
	return getText('ui.common.alignment');
};

AlignmentItemCriterion.prototype.getOperatorText = function () {
	if (this.operator === Criterion.operators.different) {
		return ' ' + getText('ui.common.differentFrom') + getText('ui.common.colon');
	}

	return Criterion.prototype.getOperatorText.call(this);
};

AlignmentItemCriterion.prototype.getValueText = function () {
	return window.gui.databases.AlignmentSides[this.value].nameId;
};

AlignmentItemCriterion.prototype.getCriterion = function () {
	return window.gui.playerData.characters.mainCharacter.characteristics.alignmentInfos.alignmentSide;
};

module.exports = AlignmentItemCriterion;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/criterionFactory/AlignmentItemCriterion.js
 ** module id = 331
 ** module chunks = 0
 **/