require('./styles.less');
var inherits = require('util').inherits;
var Window = require('Window');
var getText = require('getText').getText;
var Tabs = require('Tabs');
var Table = require('Table');
var staticContent = require('staticContent');

var GUILD_RIGHT_FLAG_LENGTH = 9;

/**
 * @constructor
 * @classdesc
 */
function GuildHouseInfoWindow() {
	// Inherit Window - constructor
	Window.call(this, {
		className: 'guildHouseInfoWindow',
		positionInfo: { top: 'c', left: 'c', width: 450, height: 380 }
	});

	this.rights = [];

	this.rightsText = [
		getText('ui.guildHouse.Right1'),
		getText('ui.guildHouse.Right2'),
		getText('ui.guildHouse.Right4'),
		getText('ui.guildHouse.Right8'),
		getText('ui.guildHouse.Right16'),
		getText('ui.guildHouse.Right32'),
		getText('ui.guildHouse.Right64'),
		getText('ui.guildHouse.Right128'),
		getText('ui.guildHouse.Right256')
	];

	this.setupDom();

	this.on('open', this.open);
}

inherits(GuildHouseInfoWindow, Window);
module.exports = GuildHouseInfoWindow;


GuildHouseInfoWindow.prototype.setupDom = function () {
	this.tabs = this.windowBody.appendChild(new Tabs({ className: 'tabs' }));

	var tableParams = {
		colIds: ['content'],
		minRows: 10
	};

	this.rights = this.windowBody.appendChild(new Table(tableParams));
	this.skills = this.windowBody.appendChild(new Table(tableParams));

	this.tabs.addTab(getText('ui.social.guildHouseRights'), this.rights);
	this.tabs.addTab(getText('ui.common.abilities'), this.skills);

	this.tabs.openTab(0);
};


GuildHouseInfoWindow.prototype.open = function (data) {
	var self = this;
	var i;
	var rightsData = data.guildshareParams;
	var skillsData = data.skillListIds;

	this.windowTitle.setText(data.houseName);
	this.tabs.openTab(0);

	this.rights.clearContent();
	this.skills.clearContent();

	for (i = 0; i < GUILD_RIGHT_FLAG_LENGTH; i++) {
		if ((rightsData >> i) & 1) {
			this.rights.addRow({ content: this.rightsText[i] });
		}
	}

	staticContent.getData('Skills', skillsData, function (error, results) {
		if (error) {
			console.error('Failed to retrieve skills data', error);
		}

		for (i = 0; i < results.length; i++) {
			self.skills.addRow([results[i].nameId]);
		}
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/SocialWindow/GuildWindow/GuildHouseInfoWindow/index.js
 ** module id = 766
 ** module chunks = 0
 **/