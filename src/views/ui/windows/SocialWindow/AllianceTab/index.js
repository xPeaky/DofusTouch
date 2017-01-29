require('./styles.less');
var allianceManager = require('allianceManager');
var inherits = require('util').inherits;
var getText = require('getText').getText;
var SwipingTabs = require('SwipingTabs');
var WuiDom = require('wuidom');
var EmblemLogo = require('EmblemLogo');
var helper = require('helper');
var PrismListenEnum = require('PrismListenEnum');
var tapBehavior = require('tapBehavior');
var windowsManager = require('windowsManager');


var GuildTabs = require('SocialWindow/AllianceTab/GuildsTab');
var ConquestsTab = require('SocialWindow/AllianceTab/ConquestsTab');
var AttacksTab = require('SocialWindow/AllianceTab/AttacksTab');


function AllianceTab() {
	WuiDom.call(this, 'div', { className: 'AllianceTab', name: 'alliance' });

	var self = this;

	this.once('open', function () {
		this._createDom();

		window.gui.playerData.alliance.on('allianceUpdated', function (alliance) {
			self._updateAllianceInformation();

			var tabsMap = self.tabs.tabMap;
			for (var tabId in tabsMap) {
				tabsMap[tabId].content.emit('allianceUpdated', alliance);
			}
		});
	});

	this.on('open', function (params) {
		params = params || {};
		var tabId = params.tabId || 'guilds';
		this.tabs.openTab(tabId);

		this._guilds.emit('allianceUpdateRequested');
		window.dofus.sendMessage('AllianceInsiderInfoRequestMessage');
		window.dofus.sendMessage('PrismsListRegisterMessage', { listen: PrismListenEnum.PRISM_LISTEN_MINE });
	});

	this.on('close', function () {
		this.tabs.close();
	});
}

inherits(AllianceTab, WuiDom);
module.exports = AllianceTab;


AllianceTab.prototype._updateAllianceInformation = function () {
	var alliance = window.gui.playerData.alliance.current;
	this._updateAllianceCreationData(alliance);
	this.emblem.setValue(alliance.allianceEmblem, true);

	var socialWindow = windowsManager.getWindow('social');
	socialWindow.updateWindowTitle('alliance', getText('ui.common.alliance') + ' - ' + alliance.allianceName);

	this.tag.setText('[' + alliance.allianceTag + ']');
	this.members.setText(
		getText('ui.alliance.membersInGuilds', alliance.nbMembers, alliance.guildCount, alliance.guildCount)
	);
};

AllianceTab.prototype._updateAllianceCreationData = function (alliance) {
	var date = helper.getAlmanaxDate(alliance.creationDate * 1000);
	this.creationDate.setText(date.day + ' ' + date.monthName + ' ' + date.year);
};

AllianceTab.prototype._createDom = function () {
	this._buildHeader();
	this._buildTabs();
};

AllianceTab.prototype._buildHeader = function () {
	var header = this.createChild('div', { className: 'description' });

	var titleColumn = header.createChild('div', { className: ['column', 'title'] });
	var contentColumn = header.createChild('div', { className: ['column', 'content'] });
	var emblem = header.createChild('div', { className: ['column', 'emblem'] });
	this.emblem = emblem.appendChild(new EmblemLogo({ width: 70, height: 70 }));

	titleColumn.createChild('div', { text: getText('ui.alliance.tag') + ':' });
	this.tag = contentColumn.createChild('div', { className: 'link' });
	tapBehavior(this.tag);
	this.tag.on('tap', function () {
		allianceManager.openAllianceCard(window.gui.playerData.alliance.current.allianceId);
	});

	titleColumn.createChild('div', { text: getText('ui.common.creationDate') + ':' });
	this.creationDate = contentColumn.createChild('div');

	titleColumn.createChild('div', { text: getText('ui.common.members') + ':' });
	this.members = contentColumn.createChild('div');
};


AllianceTab.prototype._buildTabs = function () {
	var tabs = this.tabs = this.appendChild(new SwipingTabs());

	this._guilds = new GuildTabs();

	tabs.addTab(getText('ui.social.guilds'), this._guilds, 'guilds');
	tabs.addTab(getText('ui.common.conquest'), new ConquestsTab(), 'conquests');
	tabs.addTab(getText('ui.common.attacks'), new AttacksTab(), 'attacks');
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/SocialWindow/AllianceTab/index.js
 ** module id = 856
 ** module chunks = 0
 **/