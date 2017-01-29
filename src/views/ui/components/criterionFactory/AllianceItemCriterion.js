var Criterion = require('./Criterion.js');
var getText = require('getText').getText;
var inherits = require('util').inherits;

function AllianceItemCriterion(criterionString) {
	Criterion.call(this, criterionString);

	if (this.value === 0) {
		this._text = getText('ui.criterion.noAlliance');
	} else if (this.value === 1) {
		this._text = getText('ui.criterion.hasAlliance');
	} else {
		this._text = getText('ui.criterion.hasValidAlliance');
	}
}
inherits(AllianceItemCriterion, Criterion);

AllianceItemCriterion.prototype.getText = function () {
	return this._text;
};

AllianceItemCriterion.prototype.getCriterion = function () {
	var playerAlliance = window.gui.playerData.alliance;

	if (!playerAlliance.hasAlliance()) {
		return 0;
	} else if (!playerAlliance.current.enabled) {
		return 1;
	} else {
		return 2;
	}
};

module.exports = AllianceItemCriterion;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/criterionFactory/AllianceItemCriterion.js
 ** module id = 346
 ** module chunks = 0
 **/