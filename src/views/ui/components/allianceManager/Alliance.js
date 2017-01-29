var guildManager = require('guildManager');
var getText = require('getText').getText;
var Emblem = guildManager.Emblem;
var EventEmitter = require('events.js').EventEmitter;
var inherits = require('util').inherits;

function Alliance(info) {
	EventEmitter.call(this);

	this.enabled = false;
	this.allianceId = 0;
	this.allianceTag = '';
	this.allianceName = '';
	this.creationDate = 0;
	this.allianceEmblem = new Emblem();

	this.nbMembers = 0;
	this.prisms = [];

	this.guilds = [];
	this.guildCount = 0;

	this.setInfo(info);
}
inherits(Alliance, EventEmitter);

function updateProperty(property, data) {
	if (data.hasOwnProperty(property) && data[property] !== undefined && this.hasOwnProperty(property)) {
		this[property] = data[property];
	}
}

function retrieveGuildsInfo(info) {
	var memberCount = 0;

	var allianceGuilds = info.guilds.map(function (guildInfo) {
		var guild = guildManager.createGuild(guildInfo);
		guild.allianceId = info.allianceId;
		guild.allianceName = info.allianceName;

		memberCount += guild.nbMembers;
		return guild;
	});

	// first guild is leader
	allianceGuilds[0].allianceLeader = true;

	return { memberCount: memberCount, guilds: allianceGuilds };
}

Alliance.prototype.setInfo = function (info) {
	for (var property in info) {
		updateProperty.call(this, property, info);
	}

	if (info.guilds) {
		var guildsInfo = retrieveGuildsInfo(info);
		this.nbMembers = guildsInfo.memberCount;
		this.guilds = guildsInfo.guilds;
		this.guildCount = this.guilds.length;
	}

	var prisms = info.prisms;
	if (prisms) {
		this.prisms = {};
		for (var i = 0, len = prisms.length; i < len; i += 1) {
			var prism = prisms[i];
			this.prisms[prism.subAreaId] = prism;
		}
	}

	if (this.allianceName === '#NONAME#') {
		this.allianceName = getText('ui.guild.noName');  // yup, same as guild
	}

	if (this.allianceTag === '#TAG#') {
		this.allianceTag = getText('ui.alliance.noTag');
	}

	this.allianceEmblem.isAlliance = true; // for the EmblemLogo
};

module.exports = Alliance;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/allianceManager/Alliance.js
 ** module id = 423
 ** module chunks = 0
 **/