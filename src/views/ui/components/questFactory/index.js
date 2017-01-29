var async = require('async');
var processText = require('getText').processText;
var staticContent = require('staticContent');
var objectivesMapIdFix = require('./objectivesMapIdFix.js');

// each objective has a typeId (10 different) which gives us a sentence to fill in with given parameters.
// this map describes for each objective type, the kind of information expected in the parameters.
var objectiveParamsType = {
	QuestObjectiveBringItemToNpc: [{ type: 'table', id: 'Npcs' }, { type: 'table', id: 'Items' }],
	QuestObjectiveBringSoulToNpc: [{ type: 'table', id: 'Npcs' }, { type: 'table', id: 'Monsters' }],
	QuestObjectiveDiscoverMap: [{ type: 'getText', id: 'GetText' }],
	QuestObjectiveDiscoverSubArea: [{ type: 'table', id: 'SubAreas' }],
	QuestObjectiveDuelSpecificPlayer: [{ type: 'getText', id: 'GetText' }],
	QuestObjectiveFightMonster: [{ type: 'table', id: 'Monsters' }],
	QuestObjectiveFightMonstersOnMap: [{ type: 'table', id: 'Monsters' }],
	QuestObjectiveFreeForm: [{ type: 'getText', id: 'GetText' }],
	QuestObjectiveGoToNpc: [{ type: 'table', id: 'Npcs' }],
	QuestObjectiveMultiFightMonster: [{ type: 'table', id: 'Monsters' }]
};

function gatherObjectivesData(data, dbParams, index, objectiveParam, paramIdType) {
	if (!data[objectiveParam.id]) {
		data[objectiveParam.id] = [];
		paramIdType[objectiveParam.id] = objectiveParam.type;
	}

	data[objectiveParam.id].push(dbParams[index]);
}

var fetchObjectiveDataFn = {
	table: function (objectiveRequiredData, paramId, callback) {
		staticContent.getDataMap(paramId, objectiveRequiredData[paramId], function (error, data) {
			objectiveRequiredData[paramId] = data;
			callback(error);
		});
	},
	getText: function (objectiveRequiredData, paramId, callback) {
		staticContent.getText(objectiveRequiredData[paramId], function (error, texts) {
			objectiveRequiredData[paramId] = texts;
			callback(error);
		});
	}
};

var processObjectiveParamsFn = {
	table: function (dbParams, data, index, objectiveParam) {
		dbParams[index] = data[objectiveParam.id][dbParams[index]].nameId;
	},
	getText: function (dbParams, data, index) {
		dbParams[index] = data.GetText[dbParams[index]];
	}
};

function initializeQuestsObjective(quests, cb) {
	var objectiveTypes = window.gui.databases.QuestObjectiveTypes;
	var objectiveRequiredData = {}; // map { parameter id => [id1, id2 ...] }, ie. 'Npcs' => [125, 123]
	var paramIdType = {}; // map { parameter id => parameter type }, ie. 'Npcs' => 'table'

	// first we gather every entry id we will query in the databases
	for (var i = 0, len = quests.length; i < len; i += 1) {
		var quest = quests[i];
		var objectives = quest.objectives;

		for (var j = 0, len2 = objectives.length; j < len2; j += 1) {
			var dbObjective = quest.dbObjectives[objectives[j].objectiveId];

			// loop though all the objective type parameters
			var paramList = objectiveParamsType[dbObjective._type];
			for (var k = 0, len3 = paramList.length; k < len3; k += 1) {
				var param = paramList[k];
				gatherObjectivesData(objectiveRequiredData, dbObjective.parameters, k, param, paramIdType);
			}
		}
	}

	async.each(Object.keys(objectiveRequiredData),
		function (paramId, callback) {
			if (!objectiveRequiredData[paramId].length) {
				return callback();
			}

			// the objectiveRequiredData contains the id list of each data we need.
			// once we retrieve the data we replace this list by the actual map of data.
			fetchObjectiveDataFn[paramIdType[paramId]](objectiveRequiredData, paramId, callback);
		},
		function (error) {
			if (error) {
				return cb(error);
			}

			// we can then assign to each objectives the correct sentence to display
			for (var i = 0, len = quests.length; i < len; i += 1) {
				var quest = quests[i];
				var objectives = quest.objectives;

				for (var j = 0, len2 = objectives.length; j < len2; j += 1) {
					var objective = objectives[j];
					var dbObjective = quest.dbObjectives[objective.objectiveId];

					// the objective parameter array will be changed so we duplicate it.
					var paramsToProcess = dbObjective.parameters.slice(0);

					var paramList = objectiveParamsType[dbObjective._type];
					for (var k = 0, len3 = paramList.length; k < len3; k += 1) {
						var param = paramList[k];
						processObjectiveParamsFn[param.type](paramsToProcess, objectiveRequiredData, k, param);
					}

					// we apply the formatted parameters to text template
					var text = objectiveTypes[dbObjective.typeId].nameId;
					paramsToProcess.unshift(text);
					objective.text = processText.apply(null, paramsToProcess);
				}
			}

			cb();
		}
	);
}


module.exports.updateQuestObjectives = function (quest, cb) {
	initializeQuestsObjective([quest], cb);
};


/**
 * Create a map of the finished quests, refined with the quest static data and their finished count.
 * @param {number[]} questIds - ids of finished quests
 * @param {number[]} finishedCountIds - number of time the quests have been completed. Should match the questIds array.
 * @param {function} cb - callback method containing an error object as first parameter, and the created finished quests
 *                        map as second parameter.
 */
module.exports.createFinishedQuestsMap = function (questIds, finishedCountIds, cb) {
	var questMap = {};

	staticContent.getDataMap('Quests', questIds, function (error, data) {
		if (error) {
			return cb(error);
		}

		for (var i = 0, len = questIds.length; i < len; i += 1) {
			var id = questIds[i];

			questMap[id] = {
				questId: id,
				dbQuest: data[id],
				finishedCount: finishedCountIds[i]
			};
		}

		cb(null, questMap);
	});
};

/**
 * Refines the active quest objects: add all the static content needed for display. the input quests
 * objects are modified.
 * Once the callback is called, the quest array object (parameter quests) will have:
 * {object} quests[*].dbQuest - data from Quests
 * {object} quests[*].dbSteps - the steps data from QuestSteps
 * {object} quests[*].dbObjectives - the objectives data from QuestObjectives
 * {object} quests[*].dbRewards - the rewards data from QuestStepRewards
 *
 * @param {object[]} quests - an array of active quests
 *        {number} quests[*].questId - the quest id
 *        {number} quests[*].stepId - the current step id
 *        {object[]} quests[*].objectives - the array of objective to complete for the current step.
 *        {function} cb
 */
module.exports.initializeActiveQuests = function (quests, cb) {
	var questIds = [];
	var questMap = {}; // using a map to easily access the quests throughout the process.

	// gather all the quest ids;
	for (var i = 0, len = quests.length; i < len; i += 1) {
		var quest = quests[i];
		questMap[quest.questId] = quest;
		questIds.push(quest.questId);
	}

	staticContent.getDataMap('Quests', questIds, function (error, questsData) {
		if (error) {
			return cb(error);
		}

		var stepIds = [];

		// save the quest static content and gather the stepIds
		for (var questId in questsData) {
			var dbQuest = questMap[questId].dbQuest = questsData[questId];
			stepIds = stepIds.concat(dbQuest.stepIds);
		}

		staticContent.getDataMap('QuestSteps', stepIds, function (error, stepsData) {
			if (error) {
				return cb(error);
			}

			var rewardIds = [];
			var objectiveIds = [];

			// save the steps ids and gather the rewards and objectives id.
			for (var questId in questsData) {
				var questData = questMap[questId];
				var stepList = questData.dbQuest.stepIds;
				questData.dbSteps = {};

				var i, len;
				for (i = 0, len = stepList.length; i < len; i += 1) {
					var stepId = stepList[i];
					var stepData = questData.dbSteps[stepId] = stepsData[stepId];
					rewardIds = rewardIds.concat(stepData.rewardsIds);
					objectiveIds = objectiveIds.concat(stepData.objectiveIds);
				}
			}

			var properties = [
				{ ids: objectiveIds, table: 'QuestObjectives' },
				{ ids: rewardIds, table: 'QuestStepRewards' }
			];

			async.each(properties,
				function (property, callback) {
					staticContent.getDataMap(property.table, property.ids, function (error, data) {
						property.data = data;
						callback(error);
					});
				},
				function (error) {
					if (error) {
						return cb(error);
					}

					for (var questId in questsData) {
						var questData = questMap[questId];

						questData.dbObjectives = {};
						questData.dbRewards = {};

						for (var stepId in questData.dbSteps) {
							var dbStep = questData.dbSteps[stepId];

							var i, len, id;
							for (i = 0, len = dbStep.objectiveIds.length; i < len; i += 1) {
								id = dbStep.objectiveIds[i];
								questData.dbObjectives[id] = properties[0].data[id];
								if (questData.dbObjectives[id].mapId === 0) {
									questData.dbObjectives[id].mapId = objectivesMapIdFix[id] || 0;
								}
							}

							for (i = 0, len = dbStep.rewardsIds.length; i < len; i += 1) {
								id = dbStep.rewardsIds[i];
								questData.dbRewards[id] = properties[1].data[id];
							}
						}
					}

					initializeQuestsObjective(quests, function (error) {
						cb(error, questMap);
					});
				}
			);
		});
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/questFactory/index.js
 ** module id = 541
 ** module chunks = 0
 **/