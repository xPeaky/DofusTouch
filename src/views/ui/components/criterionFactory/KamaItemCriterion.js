var Criterion = require('./Criterion.js');
var getText = require('getText').getText;
var util = require('util');

function KamaItemCriterion(criterionString) {
	Criterion.call(this, criterionString);
}
util.inherits(KamaItemCriterion, Criterion);

KamaItemCriterion.prototype.getKeyText = function () {
	return getText('ui.common.kamas');
};

KamaItemCriterion.prototype.getCriterion = function () {
	return window.gui.playerData.inventory.kamas;
};

module.exports = KamaItemCriterion;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/criterionFactory/KamaItemCriterion.js
 ** module id = 361
 ** module chunks = 0
 **/