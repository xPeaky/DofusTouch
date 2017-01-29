var Criterion = require('./Criterion.js');
var getText = require('getText').getText;
var inherits = require('util').inherits;

/**
 * Condition on whether possess an object with the same GID
 */
function ObjectItemCriterion(criterionString, item) {
	Criterion.call(this, criterionString);

	this._objectName = item.nameId;
}
inherits(ObjectItemCriterion, Criterion);

ObjectItemCriterion.prototype.isRespected = function () {
	var inventoryContent = window.gui.playerData.inventory.objects;
	var mustPossess = this.operator === Criterion.operators.equal;

	for (var objectUID in inventoryContent) {
		var item = inventoryContent[objectUID];

		if (item.objectGID === this.value) {
			return mustPossess;
		}
	}

	return !mustPossess;
};

ObjectItemCriterion.prototype.getText = function () {
	if (this.operator === Criterion.operators.different) {
		return getText('ui.common.doNotPossess', [this._objectName]);
	} else {
		return getText('ui.common.doPossess', [this._objectName]);
	}
};

module.exports = ObjectItemCriterion;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/criterionFactory/ObjectItemCriterion.js
 ** module id = 368
 ** module chunks = 0
 **/