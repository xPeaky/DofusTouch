var Criterion = require('./Criterion.js');
var getText = require('getText').getText;
var inherits = require('util').inherits;

function AlignmentLevelItemCriterion(criterionString) {
	Criterion.call(this, criterionString);

	this._text = getText('ui.tooltip.AlignmentLevel') + ' ' + this.getOperatorText() + ' ' + this.value;
}
inherits(AlignmentLevelItemCriterion, Criterion);

AlignmentLevelItemCriterion.prototype.getText = function () {
	return this._text;
};

AlignmentLevelItemCriterion.prototype.getCriterion = function () {
	var playerData = window.gui.playerData;
	return playerData.characters.mainCharacter.characteristics.alignmentInfos.characterPower - playerData.id;
};

module.exports = AlignmentLevelItemCriterion;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/criterionFactory/AlignmentLevelItemCriterion.js
 ** module id = 332
 ** module chunks = 0
 **/