var Criterion = require('./Criterion.js');
var getText = require('getText').getText;
var inherits = require('util').inherits;
var staticContent = require('staticContent');

function SubareaItemCriterion(data) {
	Criterion.call(this, data);
}
inherits(SubareaItemCriterion, Criterion);

SubareaItemCriterion.prototype.initialize = function (cb) {
	var self = this;
	this._name = '';

	staticContent.getData('SubAreas', this.value, function (error, res) {
		if (error) {
			return cb(error);
		}

		self._name = res.nameId;
		cb();
	});
};

SubareaItemCriterion.prototype.getText = function () {
	if (!this._name) {
		return '';
	}

	switch (this.operator) {
	case Criterion.operators.equal:
		return getText('ui.tooltip.beInSubarea', [this._name]);
	case Criterion.operators.different:
		return getText('ui.tooltip.dontBeInSubarea', [this._name]);
	default :
		return '';
	}
};

SubareaItemCriterion.prototype.getCriterion = function () {
	return window.gui.playerData.position.subAreaId;
};

module.exports = SubareaItemCriterion;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/criterionFactory/SubareaItemCriterion.js
 ** module id = 381
 ** module chunks = 0
 **/