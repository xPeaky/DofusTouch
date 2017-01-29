var getText = require('getText').getText;
var windowsManager = require('windowsManager');
var WuiDom = require('wuidom');

// Npcs for asking jobs information, logic based on flash client,
// one specific npc in Incarnam and one specific npc in normal map
var JOB_NPC_ID_INCARNAM = 849;
var JOB_NPC_ID = 601;
var JOB_NPC_COORDINATE_INCARNAM = [4, 3];
var JOB_NPC_COORDINATE = [1, -20];

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// Methods for getting message text

function createJobNames(names) {
	var nameList = '<ul>';
	for (var i = 0; i < names.length; i += 1) {
		var name = names[i];
		nameList += '<li>' + name + '</li>';
	}
	return nameList + '</ul>';
}

function getJobNotKnownText(messageParams) {
	var isInIncarnam = window.gui.playerData.position.isInIncarnam();
	var npcId = isInIncarnam ? JOB_NPC_ID_INCARNAM : JOB_NPC_ID;
	var npcCoordinate = isInIncarnam ? JOB_NPC_COORDINATE_INCARNAM : JOB_NPC_COORDINATE;
	var npcName = window.gui.playerData.jobs.getJobNpcNameById(npcId);

	var text = getText('ui.skill.jobNotKnown', createJobNames(messageParams.jobNameList)) + '\n';
	text += getText('ui.npc.learnJobs', npcName, npcCoordinate[0], npcCoordinate[1]);
	return text;
}

function getLevelLowText(messageParams) {
	var jobNameList = messageParams.jobNameList;
	var jobLevelList = messageParams.jobLevelList;
	var levelMinList = messageParams.levelMinList;
	var tempText, requirementText = '<ul>';

	for (var i = 0; i < jobNameList.length; i += 1) {
		tempText = getText('ui.skill.levelLowJob', jobNameList[i], levelMinList[i], jobLevelList[i]);
		requirementText += '<li>' + tempText + '</li>';
	}
	requirementText += '</ul>';

	return getText('ui.skill.levelLow', requirementText);
}

function getToolNeededText(messageParams) {
	var nameText = getText('ui.common.colon') + createJobNames(messageParams.jobNameList);
	return getText('ui.skill.toolNeeded', nameText);
}

var messageContentMap = {
	jobNotKnown: getJobNotKnownText,
	levelLow: getLevelLowText,
	toolNeeded: getToolNeededText
};

function getMessageContent(messageParamsMap) {
	var messages = [];
	for (var id in messageParamsMap) {
		var messageParams = messageParamsMap[id];
		var message = messageContentMap[messageParams.type](messageParams);
		messages.push(message);
	}
	return messages.join('\n');
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// Methods for determining message type

function getMessageType(knownJob, skill) {
	if (!knownJob) {
		return 'jobNotKnown';
	}
	if (knownJob.experience.jobLevel < skill._levelMin) {
		return 'levelLow';
	}
	var weapon = window.gui.playerData.inventory.getCurrentWeapon() || {};
	if (!weapon.item || knownJob.info.toolIds.indexOf(weapon.item.id) === -1) {
		return 'toolNeeded';
	}
}

function getMessageParams(knownJob, skill) {
	var messageParams = {
		type: '',
		jobNameList: [],
		jobLevelList: [],
		levelMinList: []
	};
	messageParams.type = getMessageType(knownJob, skill);

	// assigning the parameters to the specific message type
	if (messageParams.type) {
		messageParams.jobNameList.push(skill._parentJobName);

		if (messageParams.type === 'levelLow') {
			messageParams.jobLevelList.push(knownJob.experience.jobLevel);
			messageParams.levelMinList.push(skill._levelMin);
		}
	}

	return messageParams;
}

function determineMessage(skills) {
	var knownJobs = window.gui.playerData.jobs.list;
	var messageParamsMap = {};
	var addedJobList = [];

	for (var i = 0; i < skills.length; i += 1) {
		var skill = skills[i];
		var parentJobId = skill._parentJobId;
		var newMessageParams = getMessageParams(knownJobs[parentJobId], skill);
		var type = newMessageParams.type;

		// skip if it is not a defined type or the job is previously added
		if (!type || addedJobList.indexOf(parentJobId) !== -1) {
			continue;
		}

		if (!messageParamsMap[type]) {
			messageParamsMap[type] = newMessageParams;
		} else {
			// combine the parameters if we have the same type
			var messageParams = messageParamsMap[type];
			messageParams.jobNameList = messageParams.jobNameList.concat(newMessageParams.jobNameList);
			messageParams.jobLevelList = messageParams.jobLevelList.concat(newMessageParams.jobLevelList);
			messageParams.levelMinList = messageParams.levelMinList.concat(newMessageParams.levelMinList);
		}

		addedJobList.push(parentJobId);
	}

	return messageParamsMap;
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// This function is used for displaying notification while clicking interactive element on the map
// spcecifically for job for example chopping a tree or reaping a wheat. The notification is shown
// if the player cannot do the job action, notifying them the requirements of doing the job

exports.displayNotification = function (elementId, disabledSkills) {
	var notificationBar = window.gui.notificationBar;
	var notificationId = 'jobNotification' + elementId;

	// remove notification if it is already displayed
	if (notificationBar.isNotificationOpen(notificationId)) {
		notificationBar.removeNotification(notificationId);
		setTimeout(function () {
			exports.displayNotification(elementId, disabledSkills);
		}, 0); // call displayNotification again after notification is removed
		return;
	}

	// filter out skills with parentJobId 1 (Base skill)
	var filteredSkills = disabledSkills.filter(function (skill) {
		return skill._parentJobId && skill._parentJobId !== 1;
	});

	var messageParamsMap = determineMessage(filteredSkills);
	var messageParamsLength = Object.keys(messageParamsMap).length;

	if (messageParamsLength === 0) {
		return;
	}

	// we have three type of messages which are 'jobNotKnown', 'levelLow', 'toolNeeded', it can
	// only be one of any of them in messageParamsMap. Based on the game logic, if there are more than
	// one message type, 'jobNotKnown' is always not displayed
	if (messageParamsLength > 1 && messageParamsMap.jobNotKnown) {
		delete messageParamsMap.jobNotKnown;
	}

	var text = getMessageContent(messageParamsMap);

	var textElm = new WuiDom('div');
	textElm.setHtml(text);

	var desc = {
		type: notificationBar.notificationType.INFORMATION,
		title: getText('ui.skill.disabled'),
		wuidom: textElm,
		iconId: 27, //hammer
		iconColor: 'yellow',
		timer: 30000
	};

	if (!messageParamsMap.jobNotKnown) {
		return notificationBar.newNotification(notificationId, desc);
	}

	// add location button if is jobNotKnown
	var isInIncarnam = window.gui.playerData.position.isInIncarnam();
	var npcCoordinate = isInIncarnam ? JOB_NPC_COORDINATE_INCARNAM : JOB_NPC_COORDINATE;
	var x = npcCoordinate[0];
	var y = npcCoordinate[1];

	desc.buttons = [
		{
			label: getText('ui.npc.location'),
			action: function locateNpc() {
				window.gui.emit('CompassUpdateMessage', {
					type: -1,
					worldX: x,
					worldY: y
				});
				windowsManager.open('worldMap', { x: x, y: y });
			}
		}
	];
	notificationBar.newNotification(notificationId, desc);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/contextualMenus/ContextualMenuInteractive/jobNotification.js
 ** module id = 308
 ** module chunks = 0
 **/