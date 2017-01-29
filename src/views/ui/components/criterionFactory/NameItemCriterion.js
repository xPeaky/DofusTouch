var Criterion = require('./Criterion.js');
var getText = require('getText').getText;
var util = require('util');

function NameItemCriterion(criterionString) {
	Criterion.call(this, criterionString);
}
util.inherits(NameItemCriterion, Criterion);

NameItemCriterion.prototype.getText = function () {
	var text;

	switch (this.operator.token) {
	case '!':
	case '=':
		text = this.operator.token + ' ' + this.rawValue;
		break;
	case '~':
		text = '= ' + this.rawValue;
		break;
	case 'S':
	case 's':
		text = getText('ui.criterion.startWith', [this.rawValue]);
		break;
	case 'E':
	case 'e':
		text = getText('ui.criterion.endWith', [this.rawValue]);
		break;
	case 'v':
		text = getText('ui.criterion.valid');
		break;
	case 'i':
		text = getText('ui.criterion.invalid');
		break;
	default:
		text = '';
	}

	return getText('ui.common.name') + ' ' + text;
};

NameItemCriterion.prototype.isRespected = function () {
	var name = window.gui.playerData.characterBaseInformations.name;

	switch (this.operator.token) {
	case '=':
		return name === this.rawValue;
	case '!':
		return name !== this.rawValue;
	case '~':
		return name.toLowerCase() === this.rawValue.toLowerCase();
	case 'S':
		return name.toLowerCase().indexOf(this.rawValue.toLowerCase()) === 0;
	case 's':
		return name.indexOf(this.rawValue) === 0;
	case 'E':
		return name.toLowerCase().indexOf(this.rawValue.toLowerCase()) === name.length - this.rawValue.length;
	case 'e':
		return name.indexOf(this.rawValue) === name.length - this.rawValue.length;
	default:
	case 'v':
	case 'i':
		return false;
	}
};

module.exports = NameItemCriterion;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/criterionFactory/NameItemCriterion.js
 ** module id = 367
 ** module chunks = 0
 **/