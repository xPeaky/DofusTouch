var Criterion = require('./Criterion.js');
var inherits = require('util').inherits;

function SpecializationItemCriterion(criterionString) {
	Criterion.call(this, criterionString);
}
inherits(SpecializationItemCriterion, Criterion);

SpecializationItemCriterion.prototype.getCriterion = function () {
	return window.gui.playerData.characters.mainCharacter.characteristics.alignmentInfos.alignmentGrade;
};

module.exports = SpecializationItemCriterion;


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/criterionFactory/SpecializationItemCriterion.js
 ** module id = 378
 ** module chunks = 0
 **/