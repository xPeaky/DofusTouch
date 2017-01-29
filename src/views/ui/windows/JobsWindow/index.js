require('./styles.less');
var inherits = require('util').inherits;
var WuiDom = require('wuidom');
var staticContent = require('staticContent');
var ProgressBar = require('ProgressBar');
var Button = require('Button').DofusButton;
var List = require('List');
var getText = require('getText').getText;
var itemManager = require('itemManager');
var Slot = require('Slot');
var ItemSlot = require('ItemSlot');
var windowsManager = require('windowsManager');
var RecipeList = require('RecipeList');
var assetPreloading = require('assetPreloading');
var addTooltip = require('TooltipBox').addTooltip;

var NUM_JOBS = 3;
var NUM_SPECIALIZATIONS = 3;

// we can cache the 2 variables below inter-characters and inter-sessions
var jobsImage = {};

function JobsWindow() {
	WuiDom.call(this, 'div', {
		className: 'jobsWindow',
		name: 'jobs'
	});

	var self = this;

	this.jobButtons = [];
	this.jobSelectButtons = [];
	this.jobSelectSpecialButtons = [];
	this._expBarTooltip = new WuiDom('div');
	this.mustRefreshJobs = true;
	this.numRefreshTasks = 0;

	// Start listening now; we are not doing much in the events unless the window is displayed, anyway.
	this._setupEvents();

	this.on('open', function (params) {
		if (!self.jobListElement) {
			self._createDom();
		}

		var jobId = params ? params.jobId : null;

		if (self.mustRefreshJobs) {
			return self._refreshJobs(jobId);
		}
		if (jobId) {
			self.selectJob(jobId);
		}
	});

	this.on('close', function () {
		self.mustRefreshJobs = true;
		if (windowsManager.getWindow('jobOptions').openState) {
			windowsManager.close('jobOptions');
		}
		self.recipeList.reset();
	});
}
inherits(JobsWindow, WuiDom);
module.exports = JobsWindow;


JobsWindow.prototype._reset = function () {
	this.mustRefreshJobs = true; // we force an update on next "open"
	this.numRefreshTasks = 0;
};

JobsWindow.prototype._refreshJobs = function (jobId) {
	this.mustRefreshJobs = false;

	var jobsData = window.gui.playerData.jobs;
	this.jobMap = jobsData.list;
	// if no job found, leave the window empty (should not happen; just in case...)
	var jobIds = Object.keys(this.jobMap);
	if (!jobIds.length) { return; }

	this._updateJobButtons(jobsData.jobOriginalOrder);
	var self = this;
	this._getJobImages(function () { self._updateJobIcons(); });

	// if no job ID given, get 1st known job
	jobId = jobId || jobsData.jobOriginalOrder[0];
	this.selectJob(jobId, /*forceRefresh=*/true);
};

JobsWindow.prototype._getJobImages = function (cb) {
	var images = [];
	var idList = [];

	var jobs = this.jobMap;
	for (var jobId in jobs) {
		var job = jobs[jobId];

		if (job.info.iconId !== -1 && !jobsImage[jobId]) {
			images.push('gfx/jobs/' + job.info.iconId + '.png');
			idList.push(jobId);
		}
	}

	if (!images.length) { return cb(); }

	assetPreloading.preloadImages(images, function (urls) {
		for (var i = 0; i < urls.length; i++) {
			jobsImage[idList[i]] = urls[i];
		}
		return cb();
	});
};

JobsWindow.prototype._createDom = function () {
	var self = this;

	// set the layout
	var col1 = this.createChild('div', { className: 'col1' });

	this.jobListElement = col1.createChild('div', { className: 'jobsList' });

	for (var i = 0; i < NUM_JOBS; i++) {
		this._createJobIcon(i);
	}

	var specialisation = this.jobListElement.createChild('div', { className: 'specialisation' });
	specialisation.createChild('div', { className: 'text', text: getText('ui.common.specializations') });

	for (; i < NUM_JOBS + NUM_SPECIALIZATIONS; i++) {
		this._createJobIcon(i, specialisation);
	}

	this.jobExpBlock = col1.createChild('div', { className: 'jobExpBlock' });
	this.jobWrapper = this.jobExpBlock.createChild('div', { className: 'jobWrapper' });
	this.jobName = this.jobWrapper.createChild('div', { className: 'jobName' });
	this.jobLevel = this.jobWrapper.createChild('div', { className: 'jobLevel' });
	this._jobExpBar = this.jobExpBlock.appendChild(new ProgressBar({ className: 'jobExpBar' }));
	addTooltip(this._jobExpBar, this._expBarTooltip);

	this.skillsBlock = col1.createChild('div', { className: 'skillsBlock' });
	this.skillsTitle = this.skillsBlock.createChild('div', {
		className: 'skillsTitle',
		text: getText('ui.common.abilities')
	});

	var optionsButton = col1.appendChild(new Button(getText('ui.craft.jobOptions')));
	optionsButton.on('tap', function () {
		windowsManager.open('jobOptions', { jobId: self.selectedJobId });
	});

	this.skillsList = this.skillsBlock.appendChild(
		new List({ className: 'skillsList', cannotActivate: true })
	);

	this.recipeList = this.appendChild(new RecipeList());
};


JobsWindow.prototype._createJobIcon = function (index, parent) {
	var self = this;

	var container = parent || this.jobListElement;

	var jobBtn = container.createChild('div', { className: 'job' });
	jobBtn.itemSlot = jobBtn.appendChild(new Slot({ name: 'jobIcon' }));

	this.jobButtons.push(jobBtn);
	if (parent) {
		this.jobSelectSpecialButtons.push(jobBtn);
	} else {
		this.jobSelectButtons.push(jobBtn);
		jobBtn.createChild('div', { className: 'level', name: 'level' });
	}

	jobBtn.itemSlot.on('tap', function () {
		if (!jobBtn.jobId) { return; }
		self.selectJob(jobBtn.jobId);
	});
};

function updateJobLevel(jobBtn, level) {
	var levelElement = jobBtn.getChild('level');
	if (!levelElement) { return; }
	level = level ? (getText('ui.common.short.level') + ' ' + level) : '';
	levelElement.setText(level);
}

function updateJobIcon(jobBtn) {
	var image = jobBtn.jobId ? jobsImage[jobBtn.jobId] : null;
	jobBtn.getChild('jobIcon').setImage(image);
}

function updateJobButton(jobBtn, job) {
	var jobId, level;
	if (job === null) {
		jobId = null;
		level = null;
	} else {
		jobId = job.id;
		level = job.experience ? job.experience.jobLevel : 1;
	}
	jobBtn.jobId = jobId;
	updateJobIcon(jobBtn); // if we don't have the icon yet, this is OK too
	updateJobLevel(jobBtn, level);
}

JobsWindow.prototype._updateJobButtons = function (jobOriginalOrder) {
	// Clear all buttons first (since in case we "forgot" a job we will have less jobs than before)
	for (var i = 0; i < this.jobButtons.length; i++) {
		updateJobButton(this.jobButtons[i], null);
	}

	// Insert jobs in their original order into our 2 lists of buttons (normal & special)
	var normalJobCount = 0;
	var specialJobCount = 0;
	for (i = 0; i < jobOriginalOrder.length; i++) {
		var job = this.jobMap[jobOriginalOrder[i]];
		var jobBtn = job.info.specializationOfId ?
			this.jobSelectSpecialButtons[specialJobCount++] : this.jobSelectButtons[normalJobCount++];
		updateJobButton(jobBtn, job);
	}
};

/** Called when we got the icons */
JobsWindow.prototype._updateJobIcons = function () {
	for (var i = 0; i < this.jobButtons.length; i++) {
		updateJobIcon(this.jobButtons[i]);
	}
};

/**
 * @return {WuiDom|null} if we did not refresh our job list yet (button is not yet created)
 */
JobsWindow.prototype._getJobButton = function (jobId) {
	var buttons = this.jobButtons;
	for (var i = 0; i < buttons.length; i++) {
		if (buttons[i].jobId === jobId) {
			return buttons[i];
		}
	}
	console.error('_getJobButton: invalid Job ID: ' + jobId);
	return null;
};

JobsWindow.prototype._setupEvents = function () {
	var self = this;
	var jobsData = window.gui.playerData.jobs;

	window.gui.on('disconnect', function () {
		self._reset();
	});

	jobsData.on('jobListUpdated', function () {
		// Make sure the icon in menu bar and tab on grimoire are enabled
		var haveJob = Object.keys(jobsData.list).length !== 0;
		if (!haveJob) { return; }

		// Only refresh all jobs if window is displayed; otherwise it will happen when it opens.
		self.mustRefreshJobs = true;
		if (self.isVisible()) { self._refreshJobs(); }
	});

	jobsData.on('jobLevelUp', function (job, newLevel) {
		// Only update level in button if complete refresh is not planned for later
		if (self.mustRefreshJobs) { return; }

		var jobBtn = self._getJobButton(job.id);
		if (!jobBtn) { return; } // defensive: should not happen

		updateJobLevel(jobBtn, newLevel);
		if (self.isVisible() && job.id === self.selectedJobId) { return self._refreshJobs(job.id); }
	});

	jobsData.on('jobExperienceUpdate', function (jobExperience) {
		// Only refresh UI if this job is currently displayed (otherwise it will refresh when displayed)
		if (!self.isVisible() || jobExperience.jobId !== self.selectedJobId) { return; }
		self._updateJobInfo(jobExperience);
	});
};

/**
 *
 * @param {object} exp
 * @param {number|string} exp.jobId         - Current job id
 * @param {number} exp.currentLevel         - Current job level
 * @param {number} exp.currentExperience    - Current experiences points count
 * @param {number} exp.levelExperienceFloor - Floor of experience points for this level
 * @param {number} exp.levelExperienceCeil  - Ceil of experience points for this level
 * @param {number} exp.percentage           - Current job percentage
 * @private
 */
JobsWindow.prototype._updateJobInfo = function (exp) {
	var expBarTooltipText = '';
	if (exp.currentLevel !== 100) {
		expBarTooltipText = exp.percentage + '% (' + exp.currentExperience + ' / ' +
			exp.levelExperienceCeil + ')';
	} else {
		expBarTooltipText = exp.percentage + '% (' + exp.currentExperience + ')';
	}

	this._expBarTooltip.setText(expBarTooltipText);
	this._jobExpBar.setValue(exp.percentage / 100);
	this.jobName.setText(this.jobMap[exp.jobId].info.nameId);
	this.jobLevel.setText(getText('ui.common.level') + ' ' + exp.currentLevel);
};

/** Selects another job button
 *  @param {number} jobId - new selected job's ID
 *  @return {boolean} - true if current selected button changed */
JobsWindow.prototype._selectJobButton = function (jobId) {
	var jobBtn = this._getJobButton(jobId);
	if (!jobBtn) { return false; } // defensive: should not happen
	//deselected previous one and select current job button
	if (this.currentJobBtn) {
		if (this.currentJobBtn.jobId === jobId) { return false; } //already selected
		this.currentJobBtn.itemSlot.select(false);
	}
	jobBtn.itemSlot.select();
	this.currentJobBtn = jobBtn;
	return true;
};

JobsWindow.prototype.selectJob = function (jobId, forceRefresh) {
	if (!this._selectJobButton(jobId) && !forceRefresh) { return; }
	var self = this;
	// Schedule the refresh (allows the display of feedback on button; delay can be very small)
	window.setTimeout(function () { self._refreshCurrentJob(jobId); }, 50);
};

// Returns false when there is no point in updating the UI (since another job must be displayed)
JobsWindow.prototype._afterRefreshTask = function () {
	this.numRefreshTasks--;
	// if other refresh tasks are still running
	if (this.numRefreshTasks > 0) {
		return !this.lastJobIdRequested;
	}
	// all refresh tasks are done; if no other request was made we can update UI
	if (!this.lastJobIdRequested) { return true; }

	// another request was made, run it now
	var jobId = this.lastJobIdRequested;
	this.lastJobIdRequested = null;
	this._refreshCurrentJob(jobId);
	return false;
};

JobsWindow.prototype._refreshCurrentJob = function (jobId) {
	// we delay this refresh if already busy refreshing...
	if (this.numRefreshTasks) {
		this.lastJobIdRequested = jobId;
		return;
	}
	this.selectedJobId = jobId;
	var jobsModule = window.gui.playerData.jobs;

	var NB_CASES_DEFAULT = 2;
	var recipesData = [];
	var job = this.jobMap[jobId];
	var skills = job.description.skills;

	this._updateJobInfo(jobsModule.getJobExperience(jobId));
	this.skillsList.empty();

	var ingredients = [];
	var ingredientsIds = [];

	var interactives = [];
	var interactiveIds = [];
	var skillSlots = [];

	for (var i = 0; i < skills.length; i++) {
		var skill = skills[i];
		var skillId = skill.skillId;
		var skillInfo = skill.info;

		if (!skillInfo) {
			continue;
		}

		var skillElement = new WuiDom('div', { className: 'label' });
		this.skillsList.addItem(skillId, skillElement);

		var skillSlot = skillElement.appendChild(new ItemSlot());
		skillSlot.addClassNames('skillIcon');
		skillSlots.push(skillSlot);

		var skillLeft = skillElement.createChild('div', { className: 'skillLeft' });
		skillLeft.createChild('div', { className: 'skillName', text: skillInfo.nameId });
		interactives.push(skillLeft.createChild('div', { className: 'skillDetail' }));
		interactiveIds.push(skillInfo.interactiveId);

		var skillRight = skillElement.createChild('div', { className: 'skillRight' });
		var skillStats = skillRight.createChild('div', { className: 'skillStats' });

		if (skill._type === 'SkillActionDescriptionCollect') {
			skillStats.setText(getText('ui.jobs.collectSkillInfos', skill.time / 10, skill.min, skill.max));

			ingredientsIds.push(skillInfo.gatheredRessourceItem);
			var itemSlot = skillRight.appendChild(new ItemSlot({ descriptionOptions: { effects: false } }));
			ingredients.push(itemSlot);
		}

		if (skill._type === 'SkillActionDescriptionCraft') {
			var slotPercentInfo = getText('ui.jobs.slotPercents', skill.maxSlots, skill.probability);
			skillStats.setText(slotPercentInfo);
			recipesData = recipesData.concat(skillInfo.recipes);
			skillStats.addClassNames('bottom');
		}
	}

	this.numRefreshTasks += 4; // update this number if you add an asynch task below
	var self = this;

	window.gui.playerData.jobs.getToolFromJob(jobId, function (err, tool) {
		if (err) {
			self._afterRefreshTask();
			return console.error('JobsWindow: Failed to get tools image for jobId', jobId, err);
		}
		if (!self._afterRefreshTask()) { return; }
		for (var i = 0, len = skillSlots.length; i < len; i += 1) {
			var skillSlot = skillSlots[i];
			skillSlot.setItem(tool);
		}
	});

	itemManager.getItems(ingredientsIds, function (error, result) {
		if (error) {
			self._afterRefreshTask();
			return console.error('JobsWindow: Failed to get ingredients', error);
		}
		if (!self._afterRefreshTask()) { return; }
		for (var i = 0; i < result.length; i++) {
			var item = result[i];
			ingredients[i].setItem(item);
		}
	});

	staticContent.getDataMap('Interactives', interactiveIds, function (error, interactiveData) {
		if (error) {
			self._afterRefreshTask();
			return console.error('JobsWindow: Failed to get interactive data', error);
		}
		if (!self._afterRefreshTask()) { return; }
		for (var i = 0; i < interactiveIds.length; i++) {
			var id = interactiveIds[i];
			var interactive = interactiveData[id];
			if (!interactive) {
				console.error(new Error('JobsWindow: no interactive for id ' + id));
				continue;
			}
			interactives[i].setText(interactive.nameId);
		}
	});

	// retrieve data for craftable items
	this.recipeList.reset();
	var nbCases = window.gui.playerData.jobs.getMaxSlotsByJobId(jobId) || NB_CASES_DEFAULT;
	this.recipeList.addRecipes(recipesData, { nbCase: nbCases }, function () {
		self._afterRefreshTask();
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/JobsWindow/index.js
 ** module id = 752
 ** module chunks = 0
 **/