var Criterion = require('./Criterion.js');
var getText = require('getText').getText;
var inherits = require('util').inherits;

function AreaItemCriterion(criterionString) {
	Criterion.call(this, criterionString);
}
inherits(AreaItemCriterion, Criterion);

AreaItemCriterion.prototype.getText = function () {
	var areaName = window.gui.playerData.position.area.nameId;
	if (this.operator === Criterion.operators.equal) {
		return getText('ui.tooltip.beInArea', [areaName]);
	} else {
		return getText('ui.tooltip.dontBeInArea', [areaName]);
	}
};

AreaItemCriterion.prototype.getCriterion = function () {
	return window.gui.playerData.position.area.id;
};

module.exports = AreaItemCriterion;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/criterionFactory/AreaItemCriterion.js
 ** module id = 349
 ** module chunks = 0
 **/