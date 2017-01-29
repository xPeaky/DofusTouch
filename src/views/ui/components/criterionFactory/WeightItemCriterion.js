var Criterion = require('./Criterion.js');
var getText = require('getText').getText;
var inherits = require('util').inherits;

function WeightItemCriterion(criterionString) {
	Criterion.call(this, criterionString);
}
inherits(WeightItemCriterion, Criterion);

WeightItemCriterion.prototype.getKeyText = function () {
	return getText('ui.common.weight');
};

WeightItemCriterion.prototype.getCriterion = function () {
	return window.gui.playerData.inventory.weight;
};

module.exports = WeightItemCriterion;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/criterionFactory/WeightItemCriterion.js
 ** module id = 384
 ** module chunks = 0
 **/