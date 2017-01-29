var analytics = require('./main.js');
var tutoEnum = require('./tutorialEnum.js');

var tutoStepTimeStart = 0;
analytics.logTutorialStepStart = function (step) {
	var stepName = tutoEnum.STEP_START[step];
	if (!stepName) {
		return;
	}
	tutoStepTimeStart = Date.now();
	analytics.log(stepName);
};

analytics.logTutorialStepEnd = function (step) {
	var stepName = tutoEnum.STEP_END[step];
	if (!stepName) {
		return;
	}
	var duration = Math.ceil((Date.now() - tutoStepTimeStart) / 1000);
	tutoStepTimeStart = 0;
	//jscs:disable requireCamelCaseOrUpperCaseIdentifiers
	analytics.log(tutoEnum.STEP_END[step], { time_spent_on_action: duration });
	//jscs:enable requireCamelCaseOrUpperCaseIdentifiers
};

analytics.logTutorialSubStep = function (step, subStep) {
	var subSteps = tutoEnum.SUB_STEP[step];
	if (!subSteps || !subSteps[subStep]) {
		return;
	}
	analytics.log(subSteps[subStep]);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/analytics/tutorial.js
 ** module id = 159
 ** module chunks = 0
 **/