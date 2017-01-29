var async = require('async');
var getText = require('getText').getText;

var operators = {};
var createAndAddCriterion; // declaration order issue

function initOperators() {
	operators.or = {
		token: '|',
		isRespectedFn: function (list) {
			for (var i = 0, len = list.length; i < len; i += 1) {
				if (list[i].isRespected()) {
					return true;
				}
			}
			return false;
		},
		text: getText('ui.common.or')
	};

	operators.and = {
		token: '&',
		isRespectedFn: function (list) {
			for (var i = 0, len = list.length; i < len; i += 1) {
				if (!list[i].isRespected()) {
					return false;
				}
			}
			return true;
		},
		text: getText('ui.common.and')
	};
}

function GroupCriterion(groupCriterionString, criterionFactory, item) {
	if (!operators.or) {
		initOperators();
	}

	// parsing the string. 2 cases:
	// 1) we encounter a '(' then we look for the same level first ')' and we create a group with that
	// 2) we encounter a  '&' or '|' (or the end of the string) we create a criterion with what was before

	this.criterions = [];
	var workingString = '';

	var lookingForClosingBracket = false;
	var bracketLevel = -1;
	var isGroup = false;

	for (var i = 0, len = groupCriterionString.length; i < len; i += 1) {
		var char = groupCriterionString[i];

		if (i === len - 1) {
			workingString += char;
			createAndAddCriterion(this.criterions, isGroup, workingString, criterionFactory, item);
		} else if (lookingForClosingBracket) {
			if (char === ')') {
				if (bracketLevel === 0) {
					lookingForClosingBracket = false;
				} else {
					bracketLevel -= 1;
					workingString += char;
				}
			} else {
				workingString += char;
			}
		} else if (char === '(') {
			bracketLevel += 1;
			lookingForClosingBracket = true;
			isGroup = true;
		} else if (char === '&' || char === '|') {
			createAndAddCriterion(this.criterions, isGroup, workingString, criterionFactory, item);
			bracketLevel = -1;
			isGroup = false;
			this.operator = char === '&' ? operators.and : operators.or;
			workingString = '';
		} else {
			workingString += char;
		}
	}
}

createAndAddCriterion = function (list, isGroup, workingString, criterionFactory, item) {
	if (isGroup) {
		list.push(new GroupCriterion(workingString, criterionFactory, item));
	} else {
		var criterion = criterionFactory.createCriterion(workingString, item);
		if (criterion) {
			list.push(criterion);
		}
	}
};

function initializeCriterion(criterionObject, cb) {
	criterionObject.initialize(cb);
}

GroupCriterion.prototype.initialize = function (cb) {
	async.each(this.criterions, initializeCriterion, cb);
};

GroupCriterion.prototype.isRespected = function () {
	if (!this.criterions.length) {
		return true;
	}

	if (this.criterions.length === 1) {
		return this.criterions[0].isRespected();
	}

	return this.operator.isRespectedFn(this.criterions);
};

GroupCriterion.prototype.getOperatorText = function () {
	if (!this.operator) {
		return '';
	}

	return this.operator.text;
};

GroupCriterion.prototype.getText = function () {
	var elementsText = [];
	for (var i = 0, len = this.criterions.length; i < len; i += 1) {
		var element = this.criterions[i];
		if (element.criterions) {
			elementsText.push('(' + element.getText() + ')');
		} else {
			elementsText.push(element.getText());
		}
	}

	return elementsText.join(' ' + this.operator.text + ' ');
};

module.exports = GroupCriterion;
module.exports.operators = operators;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/criterionFactory/GroupCriterion.js
 ** module id = 327
 ** module chunks = 0
 **/