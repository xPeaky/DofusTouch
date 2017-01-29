require('./styles.less');
var DofusDate = require('timeManager').DofusDate;
var EmblemLogo = require('EmblemLogo');
var guildManager = require('guildManager');
var getText = require('getText').getText;
var inherits = require('util').inherits;
var Table = require('Table');
var Window = require('Window');
var WuiDom = require('wuidom');
var windowsManager = require('windowsManager');
var tapBehavior = require('tapBehavior');

function AllianceCardWindow() {
	Window.call(this, {
		className: 'AllianceCardWindow',
		positionInfo: { top: 'c', left: 'c', width: 400, height: 380 }
	});

	this.once('open', function () {
		this._createDom();
	});

	this.on('open', function (allianceFact) {
		this._setAlliance(allianceFact);
	});
}
inherits(AllianceCardWindow, Window);

AllianceCardWindow.prototype._createDom = function () {
	var description = this.windowBody.createChild('div', { className: 'description' });

	this.emblem = description.appendChild(new EmblemLogo({ width: 70, height: 70 }));

	var labelBox = description.createChild('div', { className: 'labelBox' });
	labelBox.createChild('div', {
		className: 'label',
		text: getText('ui.alliance.tag') + getText('ui.common.colon')
	});
	labelBox.createChild('div', {
		className: 'label',
		text: getText('ui.social.guilds') + getText('ui.common.colon')
	});
	labelBox.createChild('div', {
		className: 'label',
		text: getText('ui.common.members') + getText('ui.common.colon')
	});
	labelBox.createChild('div', {
		className: 'label',
		text: getText('ui.common.creationDate') + getText('ui.common.colon')
	});

	var valueBox = description.createChild('div', { className: 'valueBox' });
	this.tag = valueBox.createChild('div', { className: 'value' });
	this.guilds = valueBox.createChild('div', { className: 'value' });
	this.members = valueBox.createChild('div', { className: 'value' });
	this.creationDate = valueBox.createChild('div', { className: 'value' });

	this.prisms = this.windowBody.createChild('div', { className: 'prisms' });

	this.guildList = this.windowBody.appendChild(new Table({
		colCount: 3,
		headerContent: [
			'',
			getText('ui.common.name'),
			getText('ui.common.level')
		]
	}));
};

AllianceCardWindow.prototype.display = function (allianceFact) {
	if (this.openState) {
		this._setAlliance(allianceFact);
		windowsManager.focusWindow('allianceCard');
	} else {
		windowsManager.open('allianceCard', allianceFact);
	}
};

function createGuildRow(guild) {
	var emblem = new EmblemLogo({ width: 25, height: 25 });
	emblem.setValue(guild.guildEmblem, true);

	var guildName = new WuiDom('div', { text: guild.guildName });
	tapBehavior(guildName);
	guildName.on('tap', function () {
		guildManager.openGuildCard(guild.guildId);
	});

	return [
		emblem,
		guildName,
		guild.guildLevel
	];
}

AllianceCardWindow.prototype._setAlliance = function (allianceFact) {
	var alliance = allianceFact.infos;
	var guilds = allianceFact.guilds;

	this.setTitle(getText('ui.common.alliance') + ' - ' + alliance.allianceName);

	this.emblem.setValue(alliance.allianceEmblem, true);

	this.tag.setText('[' + alliance.allianceTag + ']');
	this.guilds.setText(guilds.length);

	var date = new DofusDate(alliance.creationDate).getServerDate().toString(true);
	this.creationDate.setText(date.day + ' ' + date.monthName + ' ' + date.year);

	this.prisms.setText(getText('ui.prism.nbPrisms', allianceFact.controlledSubareaIds.length));


	this.guildList.clearContent();
	var nbMembers = 0;

	for (var i = 0, len = guilds.length; i < len; i += 1) {
		var guild = guilds[i];
		nbMembers += guild.nbMembers;
		this.guildList.addRow(createGuildRow(guild));
	}

	this.members.setText(nbMembers);
};

module.exports = AllianceCardWindow;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/AllianceCardWindow/index.js
 ** module id = 762
 ** module chunks = 0
 **/