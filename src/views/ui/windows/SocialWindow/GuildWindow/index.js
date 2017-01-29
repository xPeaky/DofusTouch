require('./styles.less');
var inherits = require('util').inherits;
var getText = require('getText').getText;
var SwipingTabs = require('SwipingTabs');
var WuiDom = require('wuidom');
var addTooltip = require('TooltipBox').addTooltip;
var GuildMembersWindow = require('SocialWindow/GuildWindow/GuildMembersWindow');
var GuildHousesWindow = require('SocialWindow/GuildWindow/GuildHousesWindow');
var GuildCustomisationWindow = require('SocialWindow/GuildWindow/GuildCustomisationWindow');
var GuildPaddocksWindow = require('SocialWindow/GuildWindow/GuildPaddocksWindow');
var GuildPerceptorsWindow = require('SocialWindow/GuildWindow/GuildPerceptorsWindow');
var ProgressBar = require('ProgressBar');
var EmblemLogo = require('EmblemLogo');
var GuildInformationsTypeEnum = require('GuildInformationsTypeEnum');
var helper = require('helper');
var windowsManager = require('windowsManager');


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** @class */
function GuildWindow() {
	WuiDom.call(this, 'div', { className: 'GuildWindow', name: 'guild' });

	var self = this;
	this.openedTabId = null;

	this.once('open', function () {
		self._setupDom();
		self._setupEvents();
	});

	this.on('open', function (params) {
		params = params || {};
		window.dofus.sendMessage('GuildGetInformationsMessage', { infoType: GuildInformationsTypeEnum.INFO_GENERAL });
		this.openedTabId = params.tabId || 'members';
		self.tabs.openTab(this.openedTabId, null, { forceOpen: true });
	});

	this.on('close', function () {
		this._resetTabs();
	});
}

inherits(GuildWindow, WuiDom);
module.exports = GuildWindow;


GuildWindow.prototype._buildGuildGeneralInfoArea = function () {
	// Main container
	var mainContainer = this.createChild('div', { className: 'guildGeneralInfo' });

	var titleColumn = mainContainer.createChild('div', { className: ['column', 'title'] });
	var contentColumn = mainContainer.createChild('div', { className: ['column', 'content'] });
	var emblem = mainContainer.createChild('div', { className: ['column', 'emblem'] });
	this.emblem = emblem.appendChild(new EmblemLogo({ width: 70, height: 70 }));

	this.level = titleColumn.createChild('div');
	titleColumn.createChild('div', { className: 'member', text: getText('ui.common.members') + ':' });
	titleColumn.createChild('div', { text: getText('ui.common.creationDate') + ':' });

	this.levelBar = contentColumn.appendChild(new ProgressBar({ className: 'yellow' }));
	addTooltip(this.levelBar, function () {
		var currentGuild = window.gui.playerData.guild.current;
		var experienceText = helper.intToString(currentGuild.experience || 0);
		var expNextLevelFloorText = helper.intToString(currentGuild.expNextLevelFloor || 0);
		return new WuiDom('div', { text: experienceText + ' / ' + expNextLevelFloorText });
	});

	this.membersValue = contentColumn.createChild('div', { className: 'memberValue' });
	// TODO: add date tooltip
	this.creationDateValue = contentColumn.createChild('div');
};


GuildWindow.prototype._setupDom = function () {
	this._buildGuildGeneralInfoArea();

	this.tabs = this.appendChild(new SwipingTabs());

	var members = new GuildMembersWindow({ className: 'panel' });
	var customisation = new GuildCustomisationWindow({ className: 'panel' });
	var perceptors = new GuildPerceptorsWindow();
	var paddocks = new GuildPaddocksWindow({ className: 'panel' });
	var houses = new GuildHousesWindow();

	members.id = GuildInformationsTypeEnum.INFO_MEMBERS;
	customisation.id = GuildInformationsTypeEnum.INFO_BOOSTS;
	perceptors.id = GuildInformationsTypeEnum.INFO_TAX_COLLECTOR_GUILD_ONLY;
	paddocks.id = GuildInformationsTypeEnum.INFO_PADDOCKS;
	houses.id = GuildInformationsTypeEnum.INFO_HOUSES;

	this.tabs.addTab(getText('ui.common.members'), members, 'members');
	this.tabs.addTab(getText('ui.social.guildBoosts'), customisation, 'customisation');
	this.tabs.addTab(getText('ui.social.guildTaxCollectors'), perceptors, 'perceptors');
	this.tabs.addTab(getText('ui.common.mountPark'), paddocks, 'paddocks');
	this.tabs.addTab(getText('ui.common.housesWord'), houses, 'houses');

	function getTabInfo() {
		window.dofus.sendMessage('GuildGetInformationsMessage', { infoType: this.id });
	}

	members.on('open', getTabInfo);
	customisation.on('open', getTabInfo);
	paddocks.on('open', getTabInfo);
	houses.on('open', getTabInfo);
};


GuildWindow.prototype._setupEvents = function () {
	var self = this;
	var guild = window.gui.playerData.guild;

	guild.on('guildMemberCountUpdate', function () {
		if (!self.isVisible()) {
			return;
		}

		self.membersValue.setText(guild.current.nbConnectedMembers + ' / ' + guild.current.nbMembers);
	});

	guild.on('GuildGeneralInformationUpdate', function () {
		if (!self.isVisible()) {
			return;
		}

		self._updateEmblemLogoAndWindowTitle();
		self._updateTabNotification();
	});
};


GuildWindow.prototype._resetTabs = function () {
	if (this.openedTabId !== null) {
		this.openedTabId = null;
		this.tabs.close();
	}
	this._updateTabNotification(true);
};


GuildWindow.prototype._updateTabNotification = function (forceHide) {
	var currentGuild = window.gui.playerData.guild.current;
	var tabDisplay = forceHide ? false : !!currentGuild.abandonnedPaddock;
	this.tabs.toggleTabNotification('paddocks',  tabDisplay);
};


GuildWindow.prototype._updateGuildCreationData = function () {
	var date = helper.getAlmanaxDate(window.gui.playerData.guild.current.creationDate * 1000);
	this.creationDateValue.setText(date.day + ' ' + date.monthName + ' ' + date.year);
};


GuildWindow.prototype._updateEmblemLogoAndWindowTitle = function () {
	var currentGuild = window.gui.playerData.guild.current;
	var emblem = currentGuild.guildEmblem;

	var socialWindow = windowsManager.getWindow('social');
	socialWindow.updateWindowTitle('guild', getText('ui.common.guild') + ' - ' + currentGuild.guildName);

	this.level.setText(getText('ui.common.rank', currentGuild.level));
	this.levelBar.setValue(currentGuild.experiencePercentage);
	this.membersValue.setText(currentGuild.nbConnectedMembers + ' / ' + currentGuild.nbMembers);

	this._updateGuildCreationData();
	this.emblem.setValue(emblem, true);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/SocialWindow/GuildWindow/index.js
 ** module id = 870
 ** module chunks = 0
 **/