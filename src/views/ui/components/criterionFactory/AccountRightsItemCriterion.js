var Criterion = require('./Criterion.js');
var getText = require('getText').getText;
var inherits = require('util').inherits;

function AccountRightsItemCriterion(criterionString) {
	Criterion.call(this, criterionString);

	if (window.gui.playerData.identification.hasRights) {
		this._text = getText('ui.social.guildHouseRights') + ' ' + this.getOperatorText()  + ' ' + this.getValueText();
	} else {
		this._text = '';
	}
}
inherits(AccountRightsItemCriterion, Criterion);

AccountRightsItemCriterion.prototype.getText = function () {
	return this._text;
};

module.exports = AccountRightsItemCriterion;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/criterionFactory/AccountRightsItemCriterion.js
 ** module id = 328
 ** module chunks = 0
 **/