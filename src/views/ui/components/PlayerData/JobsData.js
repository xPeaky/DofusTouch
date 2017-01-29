/** @module PlayerData/JobsData */

var EventEmitter = require('events.js').EventEmitter;
var getText = require('getText').getText;
var inherits = require('util').inherits;
var staticContent = require('staticContent');
var itemManager = require('itemManager');
var helper = require('helper');
var playUiSound = require('audioManager').playUiSound;

// Global variables below receive data about jobs and enrich some of it
var jobs;
var skills;
var recipes;

// jobDataIndex is used only in retrieveData to index our global data using its DB name
var jobDataIndex;

function initJobData() {
	jobs = {};
	skills = {};
	recipes = {};
	jobDataIndex = { Jobs: jobs, Skills: skills, Recipes: recipes };
}

// Npc ids of Npcs that will provide job information to player
var JOB_NPC_IDS = [601, 849];
var jobNpcNames = {};


function retrieveData(database, ids, cb) {
	if (!ids.length) {
		return cb();
	}

	staticContent.getDataMap(database, ids, function (error, data) {
		if (error) {
			return cb(error);
		}

		var list = jobDataIndex[database];
		for (var id in data) {
			list[id] = data[id];
		}

		cb();
	});
}

function retrieveSkillsData(ids, cb) {
	retrieveData('Skills', ids, function (error) {
		if (error) {
			return cb(error);
		}

		var recipeInfoRequiredIdList = {};

		for (var i = 0, len = ids.length; i < len; i += 1) {
			var skill = skills[ids[i]];

			if (!skill || !skill.craftableItemIds) {
				continue;
			}

			for (var j = 0, len2 = skill.craftableItemIds.length; j < len2; j += 1) {
				var recipeId = skill.craftableItemIds[j];

				if (!recipes[recipeId]) {
					recipeInfoRequiredIdList[recipeId] = true;
				}
			}
		}

		retrieveData('Recipes', Object.keys(recipeInfoRequiredIdList), function (error) {
			if (error) {
				return cb(error);
			}

			for (var i = 0, len = ids.length; i < len; i += 1) {
				var skill = skills[ids[i]];

				if (!skill || !skill.craftableItemIds) {
					continue;
				}

				skill.recipes = [];
				for (var j = 0, len2 = skill.craftableItemIds.length; j < len2; j += 1) {
					var recipeId = skill.craftableItemIds[j];
					if (recipes[recipeId]) {
						skill.recipes.push(recipes[recipeId]);
					}
				}
			}

			cb();
		});
	});
}

function retrieveJobNpcsData() {
	staticContent.getDataMap('Npcs', JOB_NPC_IDS, function (error, data) {
		if (error) {
			return console.error('Failed to get the name of the job npcs', error);
		}
		for (var id in data) {
			jobNpcNames[id] = data[id].nameId;
		}
	});
}

/** Retrieve all or a single job's data
 *  @param {JobDescription[]} jobDescriptions - array with all jobs or a single job
 *  @param {object{}} outputList - the info we keep on all jobs known
 *  @param {function} cb - called when done
 */
function retrieveJobData(jobDescriptions, outputList, cb) {
	var jobInfoRequiredIdList = {};
	var skillInfoRequiredIdList = {};

	for (var i = 0, len = jobDescriptions.length; i < len; i += 1) {
		var jobDescription = jobDescriptions[i];
		var jobId = jobDescription.jobId;

		var knownJob = outputList[jobId];
		if (!knownJob) {
			knownJob = outputList[jobId] = { id: jobId };
		}
		knownJob.description = jobDescription;

		if (!jobs[jobId]) { // do we have the job information from the Jobs db ?
			jobInfoRequiredIdList[jobId] = true;
		}

		for (var j = 0, len2 = jobDescription.skills.length; j < len2; j += 1) {
			var skillId = jobDescription.skills[j].skillId;

			if (!skills[skillId]) { // do we have the skill information from the Skills db
				skillInfoRequiredIdList[skillId] = true;
			}
		}
	}

	retrieveData('Jobs', Object.keys(jobInfoRequiredIdList), function (error) {
		if (error) {
			return cb(error);
		}

		retrieveSkillsData(Object.keys(skillInfoRequiredIdList), function (error) {
			if (error) {
				return cb(error);
			}

			// refine the job data with their related db info.
			for (var id in outputList) {
				var knownJob = outputList[id];

				knownJob.info = jobs[knownJob.id];

				for (var i = 0, len = knownJob.description.skills.length; i < len; i += 1) {
					var skill = knownJob.description.skills[i];
					skill.info = skills[skill.skillId];
				}
			}
			cb();
		});
	});
}


/**
 * JobsData
 * @constructor
 */
function JobsData() {
	EventEmitter.call(this);

	// const
	this.SKILLID_WRAP_GIFT = 209;
	this.SKILLID_DECRAFT = 181;
	this.ITEMID_MAGIC_FRAGMENT = 8378;
	this.RUNE_SIGNATURE_GID = 7508;
	this.MAX_CRAFT_SLOTS = 8;

	this.list = {};
	this._publicMode = false;
	this._playersMultiCraftSkillById = {};
	this._availableSlots = 0;
	this._onCraftTable = {};
}

inherits(JobsData, EventEmitter);
module.exports = JobsData;


JobsData.prototype.disconnect = function () {
	initJobData();
	this.list = {};
	this._publicMode = false;
	this._playersMultiCraftSkillById = {};
	this._availableSlots = 0;
	this._onCraftTable = {};
};


JobsData.prototype.clearAfterCraft = function () {
	this._onCraftTable = {};
};


JobsData.prototype.initialize = function (gui) {
	var self = this;

	initJobData();
	retrieveJobNpcsData();

	function logToChat(jobInfo, addedOrDeleted) {
		var text;
		if (addedOrDeleted) {
			text = getText('ui.craft.referenceAdd', jobInfo.nameId);
		} else {
			text = getText('ui.craft.referenceRemove', jobInfo.nameId);
		}
		window.gui.chat.logMsg(text);
	}

	function updateJobExperience(jobExperience) {
		var job = self.list[jobExperience.jobId];

		if (!job) {
			job = {};
			self.list[jobExperience.jobId] = job;
		}

		job.experience = jobExperience;
	}

	var fifo = helper.createFifo();

	gui.on('JobDescriptionMessage', function (msg) {
		fifo.push(function (cb) {
			retrieveJobData(msg.jobsDescription, self.list, function (error) {
				if (error) {
					return cb(error);
				}

				// Since jobs are kept in a map (called "list"...) also keep the original order from server
				// (which corresponds to the order in which we learned each job)
				self.jobOriginalOrder = [];
				for (var i = 0; i < msg.jobsDescription.length; i++) {
					self.jobOriginalOrder.push(msg.jobsDescription[i].jobId);
				}

				self.emit('jobListUpdated');
				cb();
			});
		});
	});

	gui.on('JobCrafterDirectorySettingsMessage', function (msg) {
		fifo.push(function (cb) {
			self.craftersSettings = msg.craftersSettings;
			cb();
		});
	});

	gui.on('JobListedUpdateMessage', function (msg) {
		fifo.push(function (cb) {
			// do we already have the job information
			var job = self.list[msg.jobId];
			if (job) {
				logToChat(job.info, msg.addedOrDeleted);
				return cb();
			}

			// we have to go retrieve the job information
			staticContent.getData('Jobs', msg.jobId, function (error, jobData) {
				if (error) {
					return cb(error);
				}

				logToChat(jobData, msg.addedOrDeleted);
				cb();
			});
		});
	});

	gui.on('JobExperienceUpdateMessage', function (msg) {
		fifo.push(function (cb) {
			updateJobExperience(msg.experiencesUpdate);
			var jobId = msg.experiencesUpdate.jobId;
			self.emit('jobExperienceUpdate', self.getJobExperience(jobId));
			cb();
		});
	});

	gui.on('JobExperienceMultiUpdateMessage', function (msg) {
		fifo.push(function (cb) {
			for (var i = 0, len = msg.experiencesUpdate.length; i < len; i += 1) {
				updateJobExperience(msg.experiencesUpdate[i]);
				var jobId = msg.experiencesUpdate[i].jobId;
				self.emit('jobExperienceUpdate', self.getJobExperience(jobId));
			}
			cb();
		});
	});

	gui.on('JobLevelUpMessage', function (msg) {
		fifo.push(function (cb) {
			retrieveJobData([msg.jobsDescription], self.list, function (error) {
				if (error) {
					return cb(error);
				}
				var newLevel = msg.newLevel;
				var job = self.list[msg.jobsDescription.jobId];
				job.experience.jobLevel = newLevel;
				var levelUpMessage = getText('ui.craft.newJobLevel', job.info.nameId, newLevel);
				window.gui.chat.logMsg(levelUpMessage);
				window.gui.openSimplePopup(levelUpMessage, getText('ui.common.informations'));
				playUiSound('LEVEL_UP');

				self.emit('jobLevelUp', job, newLevel);
				cb();
			});
		});
	});

	gui.on('JobUnlearntMessage', function (msg) {
		fifo.push(function (cb) {
			delete self.list[msg.jobId];
			self.jobOriginalOrder.splice(self.jobOriginalOrder.indexOf(msg.jobId), 1);
			self.emit('jobListUpdated');
			cb();
		});
	});

	gui.on('JobAllowMultiCraftRequestMessage', function (msg) {
		fifo.push(function (cb) {
			self._publicMode = msg.enabled;
			// delete my available skills
			delete self._playersMultiCraftSkillById[window.gui.playerData.id];
			self.emit('jobPublicMode', self._publicMode);
			cb();
		});
	});

	gui.on('JobMultiCraftAvailableSkillsMessage', function (msg) {
		fifo.push(function (cb) {
			self._updateMultiCraftAvailableSkills(msg);
			cb();
		});
	});

	// delete all available skills when player change map
	gui.on('CurrentMapMessage', function () {
		fifo.push(function (cb) {
			self._playersMultiCraftSkillById = {};
			cb();
		});
	});
};


/**
 * Is the given GID is actually present on the craft table
 * @param {number} GID
 * @return {boolean}
 * @private
 */
JobsData.prototype._isOnTheTable = function (GID) {
	var onCraftTable = this._onCraftTable;

	if (!GID) {
		return false;
	}

	// a rune signature is always consider in the table
	if (GID === this.RUNE_SIGNATURE_GID) {
		return true;
	}

	// if already have same GID on craft table do not increment
	for (var key in onCraftTable) {
		if (GID === onCraftTable[key].GID) {
			return true;
		}
	}
	return false;
};


/**
 * When player add ingredient we add to a map for future check (check on move, check recipe)
 * @param {object} itemInstance
 * @return {boolean} - If it was already on the craft table
 */
JobsData.prototype.addToCraft = function (itemInstance) {
	var onCraftTable = this._onCraftTable;
	var UID = itemInstance.objectUID;
	var GID = itemInstance.objectGID;
	var qty = itemInstance.quantity;

	var isOnTheTable = this._isOnTheTable(GID);

	if (!onCraftTable[UID]) {
		onCraftTable[UID] = {
			GID:      GID,
			quantity: 0
		};
	}
	onCraftTable[UID].quantity = qty;
	return isOnTheTable;
};


/**
 * Getter for craft table
 * @return {object}
 */
JobsData.prototype.getCraftTable = function () {
	return this._onCraftTable;
};


/**
 * When player remove ingredient we remove from the map for future check (check on move, check recipe)
 * @param {number} UID
 * @return {boolean} - If it still on the craft table
 */
JobsData.prototype.removeToCraft = function (UID) {
	var item = this._onCraftTable[UID];
	var GID = item && item.GID;
	delete this._onCraftTable[UID];
	return this._isOnTheTable(GID);
};


/**
 * Move item between craftTable and inventory
 * @param {number} UID
 * @param {number} GID
 * @param {number} quantity
 * @param {boolean} toCraftTable
 */
JobsData.prototype.moveItemBetweenCrafAndInventory = function (UID, GID, quantity, toCraftTable) {
	var self = this;

	function isAdding() {
		return !self._isOnTheTable(GID);
	}

	function noMoreSlots() {
		if (GID === self.RUNE_SIGNATURE_GID) {
			return false;
		}
		return self._availableSlots <= 0;
	}

	// cannot add to the craft table if no more slots available
	if (isAdding() && noMoreSlots() && toCraftTable) {
		return;
	}

	// cannot add a rune signature to the craft table if there is already one
	if (self._onCraftTable[UID] && GID === this.RUNE_SIGNATURE_GID && toCraftTable) {
		return;
	}

	window.dofus.sendMessage('ExchangeObjectMoveMessage', {
		objectUID: UID,
		quantity:  toCraftTable ? quantity : -quantity
	});
};


/**
 * Setter for the available slots for move check, ignore rune signature slot
 * @param {number} nbSlots
 */
JobsData.prototype.setAvailableSlots = function (nbSlots) {
	if (nbSlots < 0) {
		nbSlots = 0;
	}
	if (nbSlots > this.MAX_CRAFT_SLOTS) {
		nbSlots = this.MAX_CRAFT_SLOTS;
	}
	this._availableSlots = nbSlots;
};


/**
 * Getter for the available slots for move check
 * @return {number}
 */
JobsData.prototype.getAvailableSlots = function () {
	return this._availableSlots;
};


JobsData.prototype.getUsedSlots = function () {
	var onCraftTable = this._onCraftTable || {};
	var GIDMap = {};

	for (var key in onCraftTable) {
		var ingredient = onCraftTable[key];
		GIDMap[ingredient.GID] = true;
	}
	return Object.keys(GIDMap).length;
};


/**
 * Retrieve the skill and recipes
 * @param {number} skillId
 * @param {function} cb
 */
JobsData.prototype.prepareSkillRecipes = function (skillId, cb) {
	// TODO: Should delete after ?
	retrieveSkillsData([skillId], cb);
};

/**
 * Give the recipes for one skill id
 * (for multicraft you should prepareSkillRecipesForMulticraft before because the client won't have the data)
 * @param {number} skillId
 * @return {Array}
 */
JobsData.prototype.getRecipesBySkill = function (skillId) {
	return skills[skillId].recipes;
};

JobsData.prototype.getSkill = function (skillId) {
	return skills[skillId];
};

/**
 * The map to filter the craft inventory
 * @param {number} skillId
 * @param {number} maxSlotCount
 * @returns {object}
 */
JobsData.prototype.getStorageCraftFilterMap = function (skillId, maxSlotCount) {
	var recipes = this._getRecipeByNbIngredient(skillId, 1, maxSlotCount);

	var ingredients = {};

	for (var i = 0, leni = recipes.length; i < leni; i += 1) {
		var ingredientIds = recipes[i].ingredientIds;
		for (var j = 0, lenj = ingredientIds.length; j < lenj; j += 1) {
			var ingredientId = ingredientIds[j];
			ingredients[ingredientId] = true;
		}
	}

	// rune de signature
	ingredients[this.RUNE_SIGNATURE_GID] = true;

	return ingredients;
};

/**
 * Return all the recipes for a specific number of ingredient
 * (based on _getRecipeBySlots)
 * @param {number} skillId
 * @param {number} fromNbIngredient - Range minimum of ingredients
 * @param {number} [toNbIngredient] - Range maximum of ingredients (if not toNbIngredient === fromNbIngredient)
 * @return {Object[]}
 */
JobsData.prototype._getRecipeByNbIngredient = function (skillId, fromNbIngredient, toNbIngredient) {
	toNbIngredient = toNbIngredient || fromNbIngredient;
	var allRecipes = this.getRecipesBySkill(skillId);
	var recipes = [];

	for (var i = 0, len = allRecipes.length; i < len; i += 1) {
		var recipe = allRecipes[i];
		var nbIngredients = recipe.ingredientIds.length;

		if (nbIngredients >= fromNbIngredient && nbIngredients <= toNbIngredient) {
			recipes.push(recipe);
		}
	}
	return recipes;
};

/**
 * Return the craftable recipe ids with the given ingredients on the craft Table
 * (Based on getRecipesWithItems)
 *
 * @param {number} skillId
 * @return {number[]}
 */
JobsData.prototype._getRecipesWithItemsOnCraftTable = function (skillId) {
	var self = this;
	var matchingRecipeIds = [];

	function quantityByGID() {
		var map = {};
		for (var key in self._onCraftTable) {
			var obj = self._onCraftTable[key];
			var GID = obj.GID;
			var qty = obj.quantity;

			if (GID === self.RUNE_SIGNATURE_GID) {
				continue;
			}

			if (!map[GID]) {
				map[GID] = 0;
			}
			map[GID] += qty;
		}
		return map;
	}

	var givenIngredientsInfoByGid = quantityByGID();
	var nbGivenIngredients = Object.keys(givenIngredientsInfoByGid).length;

	var recipesToCheck = this._getRecipeByNbIngredient(skillId, nbGivenIngredients);

	for (var i = 0, len = recipesToCheck.length; i < len; i += 1) {
		var recipeToCheck = recipesToCheck[i];

		var recipePass = true;

		for (var key in givenIngredientsInfoByGid) {
			var gid = parseInt(key, 10);

			var givenIngredientQty = givenIngredientsInfoByGid[gid];

			var canUseGivenIngredient = false;

			for (var k = 0, lenk = recipeToCheck.ingredientIds.length; k < lenk; k += 1) {
				var recipeToCheckIngredientGID = recipeToCheck.ingredientIds[k];
				var recipeToCheckQuantity = recipeToCheck.quantities[k];

				// Check if the given ingredient is in the recipe
				if (gid === recipeToCheckIngredientGID &&
					givenIngredientQty === recipeToCheckQuantity) {
					canUseGivenIngredient = true;

					// if the ingredient is found break and test the next one
					break;
				}
			}

			// the given ingredient can not be used the recipe is not craftable
			if (!canUseGivenIngredient) {
				recipePass = false;
				break;
			}
		}

		if (recipePass) {
			matchingRecipeIds.push(recipeToCheck);
		}
	}

	return matchingRecipeIds;
};


JobsData.prototype.checkRecipe = function (skillId) {
	var isRecipeKnown = false,
		itemToCraft;

	var matchingRecipes = this._getRecipesWithItemsOnCraftTable(skillId);

	if (matchingRecipes.length === 1) {
		itemToCraft = matchingRecipes[0];
		isRecipeKnown = true;
	} else if (skillId === this.SKILLID_DECRAFT) { // Special case: decrafting
		isRecipeKnown = true;
		itemToCraft = {
			resultId: this.ITEMID_MAGIC_FRAGMENT,
			resultLevel: 1,
			ingredientIds: [],
			quantities: []
		}; // magic fragment 8378
	}

	return {
		isRecipeKnown: isRecipeKnown,
		itemToCraft:   itemToCraft
	};
};


JobsData.prototype._updateMultiCraftAvailableSkills = function (msg) {
	var self = this;
	var playerId = msg.playerId;
	var skillIds = msg.skills;
	var skillsData = {};

	if (!msg.enabled) {
		delete this._playersMultiCraftSkillById[playerId];
		return;
	}

	var missingSkillIds = [];

	// get missing skills
	for (var i = 0, len = skillIds.length; i < len; i += 1) {
		var skillId = skillIds[i];
		// do we have the skillData cached yet?
		if (!skills[skillId]) {
			missingSkillIds.push(skillId);
		}
	}

	// retrieve (retrieveData cache into the variable skills)
	retrieveData('Skills', missingSkillIds, function (err) {
		if (err) {
			return console.error('JobData: Cannot get missing skills for ids', missingSkillIds, err);
		}
		for (var i = 0, len = skillIds.length; i < len; i += 1) {
			var skillId = skillIds[i];
			var skillData = skills[skillId];
			if (!skillData) {
				console.warn('JobsData: No data for skillId', skillId);
				continue;
			}
			skillsData[skillId] = skillData;
		}
		self._playersMultiCraftSkillById[playerId] = skillsData;
	});
};


/**
 * (based on getMultiCraftSkills)
 * @param {number} playerId
 * @return {object[]|undefined}
 */
JobsData.prototype.playersMultiCraftSkillById = function (playerId) {
	return this._playersMultiCraftSkillById[playerId];
};


JobsData.prototype.getToolFromJob = function (jobId, cb) {
	var job = jobs[jobId];

	if (!job) {
		return cb(new Error('noJobForThatId ' + jobId));
	}

	var toolGIDs = job.toolIds;

	if (!toolGIDs || toolGIDs.length <= 0) {
		return cb();
	}

	var currentItem = null;
	// from ankama (same in latest version)
	// this is ugly fix to not show the invalid items
	// take the tool with the slowest level (lumberjack case)
	// if the levels are the same take the oldest GID (means the lowest GID)
	// (example: fishing rob)

	itemManager.getItems(toolGIDs, function (err) {
		if (err) {
			return cb(err);
		}


		for (var i = 0, len = toolGIDs.length; i < len; i += 1) {
			var toolGID = toolGIDs[i];
			var item = itemManager.items[toolGID];
			if (!item) {
				continue;
			}

			var name = item.nameId;

			// skip WIP item (from ankama code)
			if (name.indexOf('WIP') !== -1) {
				continue;
			}

			// skip if item.iconUri.fileName === '0.png' (from ankama code)
			if (item.iconId === 0) {
				continue;
			}

			if (!currentItem || // no current -> take this item
				currentItem.level > item.level || // current is higher level -> take this item
				// same level but current's GID is higher -> take this item
				(
				currentItem.level === item.level && currentItem.objectGID > toolGID)) {
				currentItem = item;
				currentItem.objectGID = toolGID;
			}
		}
		return cb(null, currentItem);
	});
};


JobsData.prototype.getMaxSlotsByJobId = function (jobId) {
	var job = this.list[jobId];
	var max = 0;

	// Is this job known?
	if (!job) {
		return 0;
	}
	var jobSkills = job.description.skills;

	for (var i = 0, len = jobSkills.length; i < len; i += 1) {
		var maxSlots = jobSkills[i].maxSlots;
		if (!maxSlots) {
			continue;
		}
		if (maxSlots > max) {
			max = maxSlots;
		}
	}

	return max;
};


/**
 *
 * @param {number} playerId
 * @param {object} interactiveElements
 * @return {object[]}
 */
JobsData.prototype.getUsableSkillsInMap = function (playerId, interactiveElements) {
	var usableSkills = [];

	if (!interactiveElements) {
		return usableSkills;
	}

	var playerSkills = this.playersMultiCraftSkillById(playerId);

	if (!playerSkills) {
		return usableSkills;
	}

	var usableSkillsIds = {};

	for (var interactiveElemId in interactiveElements) {
		var interactiveElement = interactiveElements[interactiveElemId];
		var interactiveElemEnabledSkills = interactiveElement.enabledSkills;
		var interactiveElemDisabledSkills = interactiveElement.disabledSkills;

		var allSkills = interactiveElemEnabledSkills.concat(interactiveElemDisabledSkills);

		for (var i = 0, len = allSkills.length; i < len; i += 1) {
			var skillId = allSkills[i].skillId;
			if (playerSkills[skillId] && !usableSkillsIds[skillId]) {
				usableSkills.push(playerSkills[skillId]);
				usableSkillsIds[skillId] = true;
			}
		}
	}

	return usableSkills;
};

JobsData.prototype.getJobNpcNameById = function (npcId) {
	return jobNpcNames[npcId];
};

/**
 * Returns an object defining the current experience status of a
 * given known job.
 *
 * @param {number|string} jobId
 *
 * @return {object|null} xp
 *                  xp.jobId                - Current job id
 *                  xp.currentLevel         - Current job level
 *                  xp.currentExperience    - Current experiences points count
 *                  xp.levelExperienceFloor - Floor of experience points for this level
 *                  xp.levelExperienceCeil  - Ceil of experience points for this level
 *                  xp.percentage           - Current job percentage
 */
JobsData.prototype.getJobExperience = function (jobId) {
	var job = this.list[jobId];

	// Do we know this job?
	if (!job) {
		return null;
	}

	var jobExp = job.experience || {};

	var xp = {
		jobId: jobId
	};
	xp.currentLevel = jobExp.jobLevel;
	xp.currentExperience = jobExp.jobXP;
	xp.levelExperienceFloor = jobExp.jobXpLevelFloor;
	xp.levelExperienceCeil = jobExp.jobXpNextLevelFloor;

	xp.percentage = 100;
	if (xp.levelExperienceCeil) {
		xp.percentage = Math.floor((xp.currentExperience - xp.levelExperienceFloor) /
			(xp.levelExperienceCeil - xp.levelExperienceFloor) * 100);
	}

	return xp;
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/PlayerData/JobsData.js
 ** module id = 533
 ** module chunks = 0
 **/