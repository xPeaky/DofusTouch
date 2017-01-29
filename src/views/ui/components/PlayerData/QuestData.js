var async = require('async');
var EventEmitter = require('events.js').EventEmitter;
var questFactory = require('questFactory');
var inherits = require('util').inherits;
var fifo = require('helper').createFifo();

function QuestData() {
	EventEmitter.call(this);

	this._reset();
}
inherits(QuestData, EventEmitter);
module.exports = QuestData;

QuestData.prototype._reset = function () {
	this.finished = {};
	this.active = {};
	this.all = {};
	this.initialized = false;
};

QuestData.prototype.connect = function (reconnectInFight) {
	if (reconnectInFight) {
		// story: server ignores our request if we reconnect in fight, unless we wait "enough"
		return window.gui.once('GameFightStartingMessage', function () {
			window.dofus.sendMessage('QuestListRequestMessage');
		});
	}
	window.dofus.sendMessage('QuestListRequestMessage');
};

QuestData.prototype.disconnect = function () {
	this._reset();
};

QuestData.prototype.initialize = function (gui) {
	var self = this;

	gui.on('QuestListMessage', function (msg) {
		async.parallel([
			function (cb) {
				questFactory.createFinishedQuestsMap(msg.finishedQuestsIds,  msg.finishedQuestsCounts, function (error, questMap) {
					if (error) {
						return cb(error);
					}

					for (var questId in questMap) {
						self.finished[questId] = self.all[questId] = questMap[questId];
					}

					cb();
				});
			},
			function (cb) {
				questFactory.initializeActiveQuests(msg.activeQuests, function (error, questMap) {
					if (error) {
						return cb(error);
					}

					for (var questId in questMap) {
						self.active[questId] = self.all[questId] = questMap[questId];
					}

					cb();
				});
			}
		], function (error) {
			if (error) {
				return console.error(error);
			}
			self.initialized = true;
			self.emit('listUpdated');
		});
	});

	gui.on('QuestStartedMessage', function (msg) {
		// in case it's a quest we already finished
		delete self.finished[msg.questId];

		// ask for information about this new quest
		window.dofus.sendMessage('QuestStepInfoRequestMessage', { questId: msg.questId });
	});

	gui.on('QuestObjectiveValidatedMessage', function (msg) {
		var quest = self.active[msg.questId];

		window.dofus.sendMessage('QuestStepInfoRequestMessage', { questId: quest.questId });

		for (var i = 0, len = quest.objectives.length; i < len; i += 1) {
			var objective = quest.objectives[i];
			if (objective.objectiveId === msg.objectiveId) {
				objective.objectiveStatus = false;
				self.emit('objectiveValidated', quest, msg.objectiveId);
				return self.emit('questUpdate', msg.questId);
			}
		}
	});

	gui.on('QuestStepInfoMessage', function (msg) {
		fifo.push(function (cb) {
			if (!msg.infos.objectives) {
				return cb();
			}

			var questData = msg.infos;

			// if there is no infos data, ignore it. Flash version still emit it with 'infosAvailable' false,
			// but no where in the code uses it. Just gonna don't do anything here for now.
			if (!questData) {
				return cb();
			}

			var questId = questData.questId;
			var quest = self.active[questId] || questData; // if do not has the existing, use the infos data

			quest.stepId = questData.stepId;
			quest.objectives = questData.objectives;

			if (!quest.dbQuest) { // new quest
				questFactory.initializeActiveQuests([quest], function (error, questMap) {
					if (error) {
						return cb(error);
					}

					// in the case of using the infos data, we need to add it into active and all
					self.active[questId] = self.all[questId] = questMap[questId];

					self.emit('questStarted', questId);
					cb();
				});
			} else { // we already have the static data, just update the objectives
				questFactory.updateQuestObjectives(quest, function (error) {
					if (error) {
						return cb(error);
					}

					self.emit('questUpdate', quest.questId);
					cb();
				});
			}
		});
	});

	gui.on('QuestStepStartedMessage', function (msg) {
		var quest = self.active[msg.questId];
		if (!quest) {
			return;
		}

		quest.stepId = msg.stepId; // update current step. ask for the objectives info about this step
		window.dofus.sendMessage('QuestStepInfoRequestMessage', { questId: quest.questId });
	});

	gui.on('QuestStepValidatedMessage', function (msg) {
		var quest = self.active[msg.questId];
		if (!quest) {
			return;
		}

		// set the current stepId to the next stepId
		var stepList = quest.dbQuest.stepIds;
		var stepIndex = stepList.indexOf(msg.stepId);
		quest.stepId = stepList[stepIndex + 1];

		self.emit('stepValidated', quest, msg.stepId);

		// ask for the objectives info about this step
		window.dofus.sendMessage('QuestStepInfoRequestMessage', { questId: quest.questId });
	});

	gui.on('QuestValidatedMessage', function (msg) {
		var quest = self.active[msg.questId];
		delete self.active[msg.questId];

		quest.finishedCount = 1;
		self.finished[msg.questId] = self.all[msg.questId] = quest;

		// TODO here ankama removes the flags of the quest from the map:
		// TODO each quest has steps. each step has a list of objectives. each objective has coordinates for the flag.
		/*for each(var step : QuestStep in questValidated.steps)
		{
			for each(var questStepObjId : int in step.objectiveIds)
			{
				KernelEventsManager.getInstance().processCallback(HookList.RemoveMapFlag,
					"flag_srv"+CompassTypeEnum.COMPASS_TYPE_QUEST+"_"+qvmsg.questId+"_"+questStepObjId,
					PlayedCharacterManager.getInstance().currentWorldMap.id);
			}
		}*/
		self.emit('questFinished', quest);
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/PlayerData/QuestData.js
 ** module id = 540
 ** module chunks = 0
 **/