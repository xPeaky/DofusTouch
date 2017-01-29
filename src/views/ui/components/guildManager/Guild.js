var Emblem = require('./Emblem.js');
var EventEmitter = require('events.js').EventEmitter;
var getText = require('getText').getText;
var inherits = require('util').inherits;
var helper = require('helper');

function Guild(info) {
	EventEmitter.call(this);

	this.guildId = 0;
	this.guildName = '';
	this.guildEmblem = new Emblem();
	this.guildLevel = 0;

	this.creationDate = 0;

	this.leaderId = 0;
	this.leaderName = '';

	this.nbMembers = 0;
	this.nbConnectedMembers = 0;
	this.nbTaxCollectors = 0;
	this.averageMemberLevel = 0;

	this.lastActivity = 0;
	this.enabled = false;

	this.allianceId = 0;
	this.allianceName = '';
	this.allianceLeader = false;

	// 0 (0%) -> 1 (100%)
	this.experiencePercentage = 0;

	this.members = [];

	this.update(info);
}

inherits(Guild, EventEmitter);


function updateProperty(guild, property, data) {
	if (data.hasOwnProperty(property) && data[property] !== undefined && guild.hasOwnProperty(property)) {
		guild[property] = data[property];
	}
}


Guild.prototype.update = function (info) {
	for (var property in info) {
		updateProperty(this, property, info);
	}

	if (this.guildName === '#NONAME#') {
		this.guildName = getText('ui.guild.noName');
	}

	if (this.allianceName === '#NONAME#') {
		this.allianceName = getText('ui.guild.noName');
	}
};


Guild.prototype.getHoursSinceLastConnection = function () {
	if (!this.lastActivity) {
		return 0;
	}

	var nowDate = new Date();
	return Math.floor((nowDate.time - this.lastActivity * 1000) / 3600000);
};


Guild.prototype.getMembersByRank = function () {
	var RankNames = window.gui.databases.RankNames;
	var members = this.members;

	var rankMembers = [];

	for (var memberId in members) {
		var member = members[memberId];
		member.rankOrder = RankNames[member.rank].order;
		rankMembers.push(member);
	}

	helper.sortObjectInArray(rankMembers, 'rankOrder');
	return rankMembers;
};


module.exports = Guild;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/guildManager/Guild.js
 ** module id = 339
 ** module chunks = 0
 **/