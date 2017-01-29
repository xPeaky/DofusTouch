require('./styles.less');
var inherits = require('util').inherits;
var Window = require('Window');
var getText = require('getText').getText;

var entityManager = require('socialEntityManager');
var AllianceTab = require('SocialWindow/AllianceTab');
var ClientUITypeEnum = require('ClientUITypeEnum');
var FriendsWindow = require('SocialWindow/FriendsWindow');
var GameContextEnum = require('GameContextEnum');
var GuildWindow = require('SocialWindow/GuildWindow');
var SpouseWindow = require('SocialWindow/SpouseWindow');
var FellowPagesWindow = require('SocialWindow/FellowPagesWindow');
var windowsManager = require('windowsManager');
var WindowSideTabs = require('WindowSideTabs');


/**
 * @class SocialWindow
 */
function SocialWindow() {
	Window.call(this, {
		className: 'SocialWindow',
		positionInfo: { top: 40, left: 80, right: 40, bottom: 40 }
	});

	var self = this;
	this.closedWithGuildFightLeaveRequest = false;

	var tabsOrders = ['friends', 'guild', 'alliance', 'spouse', 'directory'];

	var tabsDefinitions = this.tabsDefinitions = {
		friends: { target: new FriendsWindow() },
		guild: { target: new GuildWindow() },
		alliance: { target: new AllianceTab() },
		spouse: { target: new SpouseWindow() },
		directory: { target: new FellowPagesWindow() }
	};

	var windowBody = this.windowBody;
	this.tabs = windowBody.appendChild(new WindowSideTabs());

	function setTitle() {
		self.setTitle(self.tabsDefinitions[this.tabId].title);
	}

	for (var i = 0; i < tabsOrders.length; i += 1) {
		var tabId = tabsOrders[i];
		var tabDef = tabsDefinitions[tabId];
		var target = windowBody.appendChild(tabDef.target);
		target.tabId = tabId;
		this.tabs.addTab('', target, tabId);
		target.on('open', setTitle);
	}

	this._initTabs();

	this.on('open', function (params) {
		this.tabs.openTab(params.tabId, params.tabParams, { delayOpenedEvent: true, forceOpen: true });
	});

	this.on('opened', function () {
		this.tabs.emitOnCurrentTab('opened');
	});

	this.on('close', function () {
		var playerId = window.gui.playerData.id;
		var fightId;

		fightId = entityManager.isPlayerDefending(entityManager.entityType.taxCollector, playerId);
		if (fightId) {
			entityManager.playerAutoKick(entityManager.entityType.taxCollector, fightId);
		}

		fightId = entityManager.isPlayerDefending(entityManager.entityType.prism, playerId);
		if (fightId) {
			entityManager.playerAutoKick(entityManager.entityType.prism, fightId);
		}

		this._resetTabs();
	});

	this._setupEvents();
}


inherits(SocialWindow, Window);
module.exports = SocialWindow;


SocialWindow.prototype._initTabs = function () {
	var tabsDefinitions = this.tabsDefinitions;
	tabsDefinitions.friends.title = getText('ui.common.friends');
	tabsDefinitions.guild.title = getText('ui.common.guild');
	tabsDefinitions.alliance.title = getText('ui.common.alliance');
	tabsDefinitions.spouse.title = getText('ui.common.spouse');
	tabsDefinitions.directory.title = getText('ui.common.directory');

	for (var tabId in tabsDefinitions) {
		var available = window.gui.uiLocker.isTabAvailable('social', tabId);
		this.tabs.toggleTabAvailability(tabId, available);
	}
};

SocialWindow.prototype._setupEvents = function () {
	var self = this;
	var tabs = this.tabs;
	var gui = window.gui;

	window.gui.uiLocker.on('updated', function (options) {
		if (options.windowId !== 'social' || !options.tabId) { return; }
		if (!self.tabsDefinitions[options.tabId]) {
			return console.error(new Error('Unknown tab id `' + options.tabId + '` in social window.'));
		}
		self.tabs.toggleTabAvailability(options.tabId, !options.locked);
	});

	gui.on('GameContextCreateMessage', function (msg) {
		// close social window when we change to fight context
		if (msg.context === GameContextEnum.FIGHT) {
			windowsManager.close(self.id);
		}
	});

	gui.on('ClientUIOpened', function (msg) {
		if (!gui.playerData.guild.hasGuild()) {
			return;
		}

		var tabId, subTabId, type = msg.type;

		if (type === ClientUITypeEnum.CLIENT_UI_TELEPORT_GUILD_PADDOCK) {
			tabId = 'guild';
			subTabId = 'paddocks';
		} else if (type === ClientUITypeEnum.CLIENT_UI_TELEPORT_GUILD_HOUSE) {
			tabId = 'guild';
			subTabId = 'houses';
		}

		if (!tabId) {
			return;
		}

		if (self.openState) {
			tabs.openTab(tabId, { tabId: subTabId });
			windowsManager.focusWindow(self.id);
		} else {
			windowsManager.open(self.id, { tabId: tabId, tabParams: { tabId: subTabId } });
		}
	});

	gui.on('disconnect', function () {
		self._resetTabs();
		self._initTabs();
	});
};

SocialWindow.prototype.updateWindowTitle = function (tabId, newTitle) {
	var tabDef = this.tabsDefinitions[tabId];

	if (!tabDef) {
		return;
	}

	tabDef.title = newTitle;

	var currentTabId = this.tabs.getCurrentTabId();
	if (currentTabId === tabId) {
		this.setTitle(newTitle);
	}
};

SocialWindow.prototype.getOpenedTabId = function () {
	return this.tabs.getCurrentTabId();
};

SocialWindow.prototype._resetTabs = function () {
	this.tabs.close();
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/SocialWindow/index.js
 ** module id = 854
 ** module chunks = 0
 **/