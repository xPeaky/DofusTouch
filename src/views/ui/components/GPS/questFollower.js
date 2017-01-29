var EventEmitter = require('events.js').EventEmitter;
var inherits = require('util').inherits;
var userPref = require('UserPreferences');

// TODO: in the future we want to split the concepts of "following" a quest or an objective and "displaying" it,
// to have for instance an option button "hide followed quest". To achieve that, all GPS methods that are managing
// at the same time both concepts will have to be splitted in two and moved partially in here where the "following"
// logic should happen, the GPS being strictly displaying. cf. DOT-1660

var QuestFollower = function () {
	this.userPrefKey = null;
	this.followedQuests = {};
};
inherits(QuestFollower, EventEmitter);

QuestFollower.prototype.init = function () {
	var self = this;
	var gui = window.gui;
	gui.playerData.on('characterSelectedSuccess', function () { // we need player id
		self.userPrefKey = gui.playerData.id + '-followedQuests';
		self.followedQuests = userPref.getValue(self.userPrefKey, {});
	});
	gui.on('disconnect', this._clear);
};

QuestFollower.prototype._clear = function () {
	this.userPrefKey = null;
	this.followedQuests = {};
};

QuestFollower.prototype._save = function () {
	userPref.setValue(this.userPrefKey, this.followedQuests);
};

QuestFollower.prototype.followQuest = function (id, addObjectives) {
	var gui = window.gui;
	var quest = gui.playerData.quests.active[id];
	if (!quest) {
		return console.warn('followQuest: quest id ' + id + ' is not active');
	}
	this.followedQuests[id] = true;
	this._save();
	if (!quest.objectives) {
		return console.warn('followQuest: quest id ' + id + ' has no objectives');
	}
	if (addObjectives) {
		gui.GPS.addQuestNextObjective(id);
	}
};

QuestFollower.prototype.unfollowQuest = function (id, removeObjectives) {
	delete this.followedQuests[id];
	this._save();
	if (removeObjectives) {
		window.gui.GPS.removeQuestObjectives(id);
	}
};

QuestFollower.prototype.unfollowAllQuests = function () {
	var gui = window.gui;
	var quests = gui.playerData.quests.active;
	for (var questId in quests) {
		gui.GPS.removeQuestObjectives(questId);
	}
	this.followedQuests = {};
	this._save();
};

QuestFollower.prototype.isQuestFollowed = function (id) {
	return !!this.followedQuests[id];
};

module.exports = new QuestFollower();


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/GPS/questFollower.js
 ** module id = 473
 ** module chunks = 0
 **/