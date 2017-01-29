var Criterion = require('./Criterion.js');
var getText = require('getText').getText;
var inherits = require('util').inherits;

function GuildItemCriterion(criterionString) {
	Criterion.call(this, criterionString);
}
inherits(GuildItemCriterion, Criterion);

GuildItemCriterion.prototype.getText = function () {
	if (this.value === 0) {
		return getText('ui.criterion.noguild');
	} else if (this.value === 1) {
		return getText('ui.criterion.hasGuild');
	} else {
		return getText('ui.criterion.hasValidGuild');
	}
};

GuildItemCriterion.prototype.getCriterion = function () {
	var guildData = window.gui.playerData.guild;
	if (!guildData.hasGuild()) {
		return 0;
	} else if (!guildData.current.enabled) {
		return 1;
	} else {
		return 2;
	}
};

module.exports = GuildItemCriterion;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/criterionFactory/GuildItemCriterion.js
 ** module id = 357
 ** module chunks = 0
 **/