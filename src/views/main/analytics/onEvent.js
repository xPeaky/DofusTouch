//jscs:disable requireCamelCaseOrUpperCaseIdentifiers
var analytics = require('./main.js');
var CharacterCreationResultEnum = require('CharacterCreationResultEnum');

var newPlayer = false;
var previousLevel = 0;
var accountId = 0;
var accountSessionId = 0;
var nickname = 0;
var connectionManager = window.dofus.connectionManager;

window.gui.on('disconnect', function () {
	analytics.unregister();
});

connectionManager.on('NicknameAcceptedMessage', function () {
	// Event will be sent only for guest account
	analytics.log('F_T_U_E.Step0000_Chose_Nickname');
});

function logIdentMessage(msg) {
	newPlayer = false;
	accountId = msg.accountId;
	// Instead of the login (not use) the login server give the account_session_uid from haapi to start the kpi session
	accountSessionId = msg.login;
	nickname = msg.nickname;

	analytics.log('Session_Info.Login', {
		account_session_id: accountSessionId
	});
}

// DETECT NEW PLAYER
connectionManager.on('ServersListMessage', function (msg) {
	var charactersCount = 0;
	var servers = msg.servers || [];
	for (var i = 0, len = servers.length; i < len; i += 1) {
		var server = servers[i];
		charactersCount += server.charactersCount;
	}
	newPlayer = !charactersCount;
});

connectionManager.on('IdentificationSuccessMessage', logIdentMessage);
connectionManager.on('IdentificationSuccessWithLoginTokenMessage', logIdentMessage);

// SERVER SELECTION
connectionManager.on('SelectedServerDataMessage', function (msg) {
	analytics.log('Session_Info.Choose_Server', {
		account_session_id: accountSessionId
	});

	// game server selection

	if (newPlayer) {
		analytics.log('F_T_U_E.Step0100_Chose_Server', { server_id: msg.serverId });
	}
});

// FIRST CHARACTER
connectionManager.on('CharacterCreationResultMessage', function (msg) {
	if (newPlayer && msg.result === CharacterCreationResultEnum.OK) {
		analytics.log('F_T_U_E.Step0200_Create_First_Character');
	}
});

window.gui.playerData.on('characterSelectedSuccess', function () {
	previousLevel = window.gui.playerData.characterBaseInformations.level;

	// on characterSelectedSuccess the kpi session need to start
	window.dofus.send('kpiStartSession', {
		accountSessionId: window.gui.playerData.identification.accountSessionUid,
		isSubscriber: window.gui.playerData.isSubscriber()
	});

	analytics.log('Session_Info.Choose_Character');
});

connectionManager.on('kpiStartSessionMessage', function (msg) {
	analytics.register(accountId, msg.sessionId, {
		login: window.gui.playerData.loginName,
		nickname: nickname
	});
});

connectionManager.on('kpiStartSessionErrorMessage', function () {
	console.error('kpiStartSessionErrorMessage');
	analytics.register(accountId, null, {
		login: window.gui.playerData.loginName,
		nickname: nickname
	});
});

// LEVEL UP

connectionManager.on('CharacterLevelUpMessage', function (msg) {
	analytics.log('User_Life_Cycle.Level_Up', { old_level: previousLevel }, { withEquipment: true });
	previousLevel = msg.newLevel;
});

// ACHIEVEMENT
connectionManager.on('AchievementFinishedMessage', function (msg) {
	analytics.log('User_Life_Cycle.Achievement_Achieved', { achievement_id: msg.id });
});

connectionManager.on('AchievementRewardSuccessMessage', function (msg) {
	analytics.log('User_Life_Cycle.Achievement_Get_Reward', { achievement_id: msg.achievementId });
});

// QUEST
connectionManager.on('QuestStartedMessage', function (msg) {
	analytics.log('User_Life_Cycle.Quest_Start', { quest_id: msg.questId });
});

connectionManager.on('QuestValidatedMessage', function (msg) {
	analytics.log('User_Life_Cycle.Quest_End', { quest_id: msg.questId });
});

connectionManager.on('QuestObjectiveValidatedMessage', function (msg) {
	var questData = window.gui.playerData.quests.all[msg.questId] || {};
	var stepId = questData.stepId || 0;
	analytics.log('User_Life_Cycle.Quest_Step_Objective_Success', {
		quest_id: msg.questId,
		objective_id: msg.objectiveId,
		step_id: stepId
	});
});

connectionManager.on('QuestStepValidatedMessage', function (msg) {
	analytics.log('User_Life_Cycle.Quest_Step_Success', {
		quest_id: msg.questId,
		step_id: msg.stepId
	});
});

// DUNGEON

connectionManager.on('DungeonEnteredMessage', function (msg) {
	analytics.log('User_Life_Cycle.Donjon_Start', { dungeon_id: msg.dungeonId });
});

// JOB

connectionManager.on('JobLevelUpMessage', function (msg) {
	analytics.log('User_Life_Cycle.Profession_Level_Up', {
		job_id: msg.jobsDescription.jobId,
		new_level: msg.newLevel
	});
});

// Life

connectionManager.on('GameRolePlayPlayerLifeStatusMessage', function (msg) {
	if (msg.state > 0) {
		analytics.log('User_Life_Cycle.Death');
	}
});

// Party

connectionManager.on('PartyJoinMessage', function (msg) {
	analytics.log('social.fight_group_join', {
		group_id: msg.partyId
	});
});
// you are alone in your party
connectionManager.on('PartyDeletedMessage', function (msg) {
	analytics.log('social.fight_group_quit', {
		group_id: msg.partyId
	});
});
// you leave the party by our self
connectionManager.on('PartyLeaveMessage', function (msg) {
	analytics.log('social.fight_group_quit', {
		group_id: msg.partyId
	});
});
// somebody kick you from the party
connectionManager.on('PartyKickedByMessage', function (msg) {
	analytics.log('social.fight_group_quit', {
		group_id: msg.partyId
	});
});

// GUILD

var guildId = null;
// GuildMembershipMessage give us the guildId for the session
connectionManager.on('GuildMembershipMessage', function (msg) {
	guildId = msg.guildInfo.guildId;
});

// create my guild or join an existing guild
connectionManager.on('GuildJoinedMessage', function (msg) {
	guildId = msg.guildInfo.guildId;
	analytics.log('social.guild_join', {
		guild_id: guildId
	});
});

// leave the guild, or being kicked by the guild
connectionManager.on('GuildLeftMessage', function () {
	analytics.log('social.guild_quit', {
		guild_id: guildId
	});
});



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/analytics/onEvent.js
 ** module id = 177
 ** module chunks = 0
 **/