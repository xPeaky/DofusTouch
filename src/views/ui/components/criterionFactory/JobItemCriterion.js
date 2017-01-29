var Criterion = require('./Criterion.js');
var getText = require('getText').getText;
var staticContent = require('staticContent');
var util = require('util');

function JobItemCriterion(criterionString) {
	Criterion.call(this, criterionString);

	var arrayParams = this.rawValue.split(',');
	if (arrayParams.length > 1) {
		this._jobId = parseInt(arrayParams[0], 10);
		this._jobLevel = parseInt(arrayParams[1], 10);
	} else {
		this._jobId = parseInt(this.value, 10);
		this._jobLevel = -1;
	}
}
util.inherits(JobItemCriterion, Criterion);

JobItemCriterion.prototype.initialize = function (cb) {
	var self = this;
	staticContent.getData('Jobs', this._jobId, function (error, res) {
		if (error) {
			return cb(error);
		}

		self._jobName = res && res.nameId;
		cb();
	});
};

JobItemCriterion.prototype.getText = function () {
	if (!this._jobName) {
		return '';
	}

	var readableCriterionValue = this._jobName;
	var optionalJobLevel = '';
	if (this._jobLevel >= 0) {
		optionalJobLevel = ' ' + getText('ui.common.short.level') + ' ' + this._jobLevel;
	}

	switch (this.operator) {
	case Criterion.operators.equal :
		return readableCriterionValue + optionalJobLevel;
	case Criterion.operators.different :
		return getText('ui.common.dontBe') + readableCriterionValue + optionalJobLevel;
	case Criterion.operators.superior :
		return readableCriterionValue + ' >' + optionalJobLevel;
	case Criterion.operators.inferior :
		return readableCriterionValue + ' <' + optionalJobLevel;
	default:
		return '';
	}
};

JobItemCriterion.prototype.isRespected = function () {
	var jobs = window.gui.playerData.jobs.list;

	if (this._jobLevel === -1) {
		return jobs.hasOwnProperty(this._jobId);
	}

	var knownJob = jobs[this._jobId];
	if (!knownJob || !knownJob.experience) {
		return false;
	}

	var compareFn = this.operator.compareFn;
	if (!compareFn) {
		return false;
	}

	return compareFn(knownJob.experience.jobLevel, this._jobLevel);
};

module.exports = JobItemCriterion;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/criterionFactory/JobItemCriterion.js
 ** module id = 360
 ** module chunks = 0
 **/