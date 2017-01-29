var operators = {
	superior: {
		token: '>',
		compareFn: function (a, b) { return a > b; },
		text: ' > '
	},
	inferior: {
		token: '<',
		compareFn: function (a, b) { return a < b; },
		text: ' < '
	},
	equal: {
		token: '=',
		compareFn: function (a, b) { return a === b; },
		text: ': '
	},
	different: {
		token: '!',
		compareFn: function (a, b) { return a !== b; },
		text: '! '
	}
};


function Criterion(criterionString) {
	for (var operatorId in operators) {
		var token = operators[operatorId].token;

		if (criterionString.indexOf(token) === -1) {
			continue;
		}

		this.operator = operators[operatorId];

		var splitCriterion = criterionString.split(token);
		this.key = splitCriterion[0];
		this.rawValue = splitCriterion[1];
		this.value = parseInt(this.rawValue, 10);
		return;
	}

	// We didn't find one of the 4 basic operators
	this.key = criterionString.substring(0, 2);
	var operator = criterionString.substring(2, 3);
	this.operator = {
		token: operator,
		text: operator,
		compareFn: function () { return true; }
	};
	this.rawValue = criterionString.substring(3);
	this.value = parseInt(this.rawValue, 10);
}

Criterion.prototype.initialize = function (cb) {
	cb();
};

Criterion.prototype.getOperatorText = function () {
	if (!this.operator) {
		return '';
	}

	return this.operator.text;
};

Criterion.prototype.getKeyText = function () {
	return this.key;
};

Criterion.prototype.getValueText = function () {
	return this.value;
};

Criterion.prototype.isRespected = function () {
	if (!this.operator) {
		return true;
	}

	var compareFn = this.operator.compareFn;

	if (!compareFn) {
		return false;
	}

	return compareFn(this.getCriterion(), this.value);
};

Criterion.prototype.getText = function () {
	return this.getKeyText() + ' ' +  this.getOperatorText() + ' ' + this.getValueText();
};

Criterion.prototype.getCriterion = function () {
	return 0;
};

module.exports = Criterion;
module.exports.operators = operators;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/criterionFactory/Criterion.js
 ** module id = 329
 ** module chunks = 0
 **/