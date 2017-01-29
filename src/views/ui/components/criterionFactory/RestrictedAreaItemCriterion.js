var Criterion = require('./Criterion.js');
var getText = require('getText').getText;
var inherits = require('util').inherits;

// this criterion is not done in ankama's code v2.14. So it's the same as the level one..
function RestrictedAreaItemCriterion(criterionString) {
	Criterion.call(this, criterionString);
}
inherits(RestrictedAreaItemCriterion, Criterion);

RestrictedAreaItemCriterion.prototype.getKeyText = function () {
	return getText('ui.common.level');
};

RestrictedAreaItemCriterion.prototype.getCriterion = function () {
	return window.gui.playerData.characterBaseInformations.level;
};

module.exports = RestrictedAreaItemCriterion;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/criterionFactory/RestrictedAreaItemCriterion.js
 ** module id = 373
 ** module chunks = 0
 **/