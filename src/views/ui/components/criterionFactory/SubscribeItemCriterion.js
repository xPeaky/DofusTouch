var Criterion = require('./Criterion.js');
var getText = require('getText').getText;
var inherits = require('util').inherits;

function SubscribeItemCriterion(data) {
	Criterion.call(this, data);
}
inherits(SubscribeItemCriterion, Criterion);

SubscribeItemCriterion.prototype.getText = function () {
	if (
		this.operator === Criterion.operators.equal && this.value === 1 ||
		this.operator === Criterion.operators.different && this.value === 0
	) {
		return getText('ui.tooltip.beSubscirber');
	} else {
		return getText('ui.tooltip.dontBeSubscriber');
	}
};

SubscribeItemCriterion.prototype.getCriterion = function ()  {
	var identification = window.gui.playerData.identification;
	if (identification.subscriptionEndDate > 0 || identification.hasRights) {
		return 1;
	}

	return 0;
};

module.exports = SubscribeItemCriterion;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/criterionFactory/SubscribeItemCriterion.js
 ** module id = 382
 ** module chunks = 0
 **/