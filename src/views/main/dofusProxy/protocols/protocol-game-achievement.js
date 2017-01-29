var connectionManager = require('dofusProxy/connectionManager.js');


// AchievementListMessage
connectionManager.on('AchievementListMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// AchievementDetailsMessage
connectionManager.on('AchievementDetailsMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// AchievementDetailedListMessage
connectionManager.on('AchievementDetailedListMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// AchievementFinishedMessage
connectionManager.on('AchievementFinishedMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// AchievementFinishedInformationMessage

// AchievementRewardSuccessMessage
connectionManager.on('AchievementRewardSuccessMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// AchievementRewardErrorMessage
connectionManager.on('AchievementRewardErrorMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// FriendGuildWarnOnAchievementCompleteStateMessage



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-game-achievement.js
 ** module id = 67
 ** module chunks = 0
 **/