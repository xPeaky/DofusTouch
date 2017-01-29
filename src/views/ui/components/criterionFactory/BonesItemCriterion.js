var Criterion = require('./Criterion.js');
var getText = require('getText').getText;
var inherits = require('util').inherits;

function BonesItemCriterion(criterionString) {
	Criterion.call(this, criterionString);

	if (this.value === 0 && this.key === 'B') {
		this._text =  getText('ui.criterion.initialBones');
	} else {
		this._text =  getText('ui.criterion.bones') + ' ' + this.getOperatorText()  + ' ' + this.value;
	}
}
inherits(BonesItemCriterion, Criterion);

BonesItemCriterion.prototype.getText = function () {
	return this._text;
};

BonesItemCriterion.prototype.getCriterion = function () {
	return window.gui.playerData.characterBaseInformations.entityLook.bonesId;
};

module.exports = BonesItemCriterion;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/criterionFactory/BonesItemCriterion.js
 ** module id = 350
 ** module chunks = 0
 **/