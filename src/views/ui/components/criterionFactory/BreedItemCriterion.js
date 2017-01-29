var Criterion = require('./Criterion.js');
var getText = require('getText').getText;
var inherits = require('util').inherits;

function BreedItemCriterion(criterionString) {
	Criterion.call(this, criterionString);

	var readableCriterionRef = window.gui.databases.Breeds[this.value].shortNameId;
	if (this.operator === Criterion.operators.equal) {
		this._text = getText('ui.tooltip.beABreed', [readableCriterionRef]);
	} else {
		this._text = getText('ui.tooltip.dontBeABreed', [readableCriterionRef]);
	}
}
inherits(BreedItemCriterion, Criterion);

BreedItemCriterion.prototype.getText = function () {
	return this._text;
};

BreedItemCriterion.prototype.getCriterion = function () {
	return window.gui.playerData.characterBaseInformations.breed;
};

module.exports = BreedItemCriterion;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/criterionFactory/BreedItemCriterion.js
 ** module id = 351
 ** module chunks = 0
 **/