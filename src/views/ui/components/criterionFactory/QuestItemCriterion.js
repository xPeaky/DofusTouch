var Criterion = require('./Criterion.js');
var getText = require('getText').getText;
var util = require('util');

function QuestItemCriterion(criterionString) {
	Criterion.call(this, criterionString);
}
util.inherits(QuestItemCriterion, Criterion);

QuestItemCriterion.prototype.getText = function () {
	var quest = window.gui.playerData.quests.all[this.value];
	if (!quest) {
		return '';
	}

	switch (this.key) {
	case 'Qa':
		return getText('ui.grimoire.quest.active', [quest.nameId]);
	case 'Qc':
		return getText('ui.grimoire.quest.startable', [quest.nameId]);
	case 'Qf':
		return getText('ui.grimoire.quest.done', [quest.nameId]);
	default:
		return '';
	}
};

QuestItemCriterion.prototype.isRespected = function () {
	var quest = window.gui.playerData.quests.all[this.value];
	if (!quest) {
		return '';
	}

	switch (this.key) {
	case 'Qa':
		return window.gui.playerData.quests.active.hasOwnProperty(this.value);
	case 'Qc':
		return true;
	case 'Qf':
		return window.gui.playerData.quests.finished.hasOwnProperty(this.value);
	default:
		return '';
	}
};

module.exports = QuestItemCriterion;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/criterionFactory/QuestItemCriterion.js
 ** module id = 371
 ** module chunks = 0
 **/