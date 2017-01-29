var Criterion = require('./Criterion.js');
var getText = require('getText').getText;
var inherits = require('util').inherits;

function GuildLevelItemCriterion(criterionString) {
	Criterion.call(this, criterionString);
}
inherits(GuildLevelItemCriterion, Criterion);

GuildLevelItemCriterion.prototype.getKeyText = function () {
	return getText('ui.guild.guildLevel');
};

GuildLevelItemCriterion.prototype.getCriterion = function () {
	var guildData = window.gui.playerData.guild;
	if (!guildData.hasGuild()) {
		return 0;
	}

	return guildData.current.guildLevel;
};

module.exports = GuildLevelItemCriterion;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/criterionFactory/GuildLevelItemCriterion.js
 ** module id = 358
 ** module chunks = 0
 **/