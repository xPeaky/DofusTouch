require('./styles.less');
var inherits = require('util').inherits;
var Window = require('Window');
var getText = require('getText').getText;
var WindowSideTabs = require('WindowSideTabs');

var AlignmentWindow = require('AlignmentWindow');
var AlmanaxWindow = require('AlmanaxWindow');
var AchievementsWindow = require('AchievementsWindow');
var BestiaryWindow = require('BestiaryWindow');
var OrnamentsWindow = require('OrnamentsWindow');
var QuestsWindow = require('QuestsWindow');
var SpellsWindow = require('SpellsWindow');
var JobsWindow = require('JobsWindow');

/**
 * @class GrimoireWindow
 */
function GrimoireWindow() {
	Window.call(this, {
		className: 'GrimoireWindow',
		positionInfo: {
			top: 'c', left: 'c+20px', width: '90%', height: '97%',
			maxWidth: 905, maxHeight: 620, mustAvoidToolbar: true
		}
	});

	var self = this;

	var tabsOrders = ['spells', 'quests', 'alignment', 'jobs', 'almanax', 'achievements', 'ornaments', 'bestiary'];

	var tabsDefinitions = this.tabsDefinitions = {
		spells: { target: new SpellsWindow() },
		quests: { target: new QuestsWindow() },
		alignment: { target: new AlignmentWindow() },
		jobs: { target: new JobsWindow() },
		almanax: { target: new AlmanaxWindow() },
		achievements: { target: new AchievementsWindow() },
		ornaments: { target: new OrnamentsWindow() },
		bestiary: { target: new BestiaryWindow() }
	};

	var windowBody = this.windowBody;
	this.tabs = windowBody.appendChild(new WindowSideTabs());

	function setTitle() {
		self.setTitle(self.tabsDefinitions[this.tabId].title);
	}

	for (var i = 0; i < tabsOrders.length; i += 1) {
		var tabId = tabsOrders[i];
		var tabDef = tabsDefinitions[tabId];
		var tab = windowBody.appendChild(tabDef.target);
		tab.tabId = tabId;
		this.tabs.addTab('', tab, tabId);
		tab.on('open', setTitle);
	}

	this._initTabs();

	this.on('open', function (params) {
		this.tabs.openTab(params.tabId, params.tabParams, { delayOpenedEvent: true, forceOpen: true });
	});

	this.on('opened', function () {
		this.tabs.emitOnCurrentTab('opened');
	});

	this.on('focus', function () {
		this.tabs.emitOnCurrentTab('focus');
	});

	this.on('close', function () {
		this._resetTabs();
	});

	window.gui.uiLocker.on('updated', function (options) {
		if (options.windowId !== 'grimoire' || !options.tabId) { return; }
		if (!tabsDefinitions[options.tabId]) {
			return console.error(new Error('Unknown tab id `' + options.tabId + '` in grimoire window.'));
		}
		self.tabs.toggleTabAvailability(options.tabId, !options.locked);
	});

	window.gui.on('disconnect', function () {
		self._resetTabs();
		self._initTabs();
	});
}

inherits(GrimoireWindow, Window);
module.exports = GrimoireWindow;

GrimoireWindow.prototype._initTabs = function () {
	var tabsDefinitions = this.tabsDefinitions;
	tabsDefinitions.spells.title = getText('ui.grimoire.mySpell');
	tabsDefinitions.quests.title = getText('ui.common.quests');
	tabsDefinitions.alignment.title = getText('ui.common.alignment');
	tabsDefinitions.jobs.title = getText('ui.common.myJobs');
	tabsDefinitions.almanax.title = getText('ui.almanax.almanax');
	tabsDefinitions.achievements.title = getText('ui.achievement.achievement');
	tabsDefinitions.ornaments.title = getText('ui.common.titles');
	tabsDefinitions.bestiary.title = getText('ui.common.bestiary');

	for (var tabId in tabsDefinitions) {
		var available = window.gui.uiLocker.isTabAvailable('grimoire', tabId);
		this.tabs.toggleTabAvailability(tabId, available);
	}
};

GrimoireWindow.prototype.getOpenedTabId = function () {
	return this.tabs.getCurrentTabId();
};

GrimoireWindow.prototype._resetTabs = function () {
	this.tabs.close();
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/GrimoireWindow/index.js
 ** module id = 731
 ** module chunks = 0
 **/