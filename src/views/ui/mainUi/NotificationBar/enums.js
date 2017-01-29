//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

// NotificationTypeEnum
// com.ankamagames.dofus.types.enums

var notificationType = {
	TUTORIAL: 0,
	ERROR: 1,
	INVITATION: 2,
	PRIORITY_INVITATION: 3,
	INFORMATION: 4
};

exports.notificationType = notificationType;

exports.notificationPriority = [
	notificationType.ERROR,
	notificationType.PRIORITY_INVITATION,
	notificationType.INVITATION,
	notificationType.INFORMATION,
	notificationType.TUTORIAL
];

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

// Image information based on notification type
// Note: Flash client uses one image, but we uses the images in assets/gfx/notifications
// by combining the color image and icon image

var notificationImageInfo = {};

notificationImageInfo[notificationType.TUTORIAL]            = { icon: 11, color: 'green' };
notificationImageInfo[notificationType.ERROR]               = { icon: 11, color: 'red' };
notificationImageInfo[notificationType.INVITATION]          = { icon: 12, color: 'blue' };
notificationImageInfo[notificationType.PRIORITY_INVITATION] = { icon: 10, color: 'blue' };
notificationImageInfo[notificationType.INFORMATION]         = { icon: 27, color: 'yellow' };

exports.notificationImageInfo = notificationImageInfo;


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/mainUi/NotificationBar/enums.js
 ** module id = 503
 ** module chunks = 0
 **/