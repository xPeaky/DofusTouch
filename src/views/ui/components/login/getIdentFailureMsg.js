var IdentificationFailureReasonEnum = require('IdentificationFailureReasonEnum');
var getText = require('getText').getText;

function versionAsText(v) {
	return 'v' + [v.major, v.minor, v.release].join('.');
}

module.exports = function (msg) {
	if (msg.reason !== IdentificationFailureReasonEnum.WRONG_CREDENTIALS &&
		msg.reason !== IdentificationFailureReasonEnum.BANNED &&
		msg.reason !== IdentificationFailureReasonEnum.IN_MAINTENANCE &&
		msg.reason !== IdentificationFailureReasonEnum.BAD_IPRANGE) { //TODO: remove that after canada
		console.error('Identification failed:', msg);
	}

	switch (msg.reason) {
	case IdentificationFailureReasonEnum.BAD_VERSION:
		if (msg.requiredVersion) {
			return getText('ui.popup.accessDenied.badVersion',
				versionAsText(msg.currentVersion), versionAsText(msg.requiredVersion));
		}
		return getText('ui.popup.accessDenied.badVersion');
	case IdentificationFailureReasonEnum.WRONG_CREDENTIALS:
		return getText('ui.popup.accessDenied.wrongCredentials');
	case IdentificationFailureReasonEnum.BANNED:
		if (msg.banEndDate) {
			return getText('ui.popup.accessDenied.bannedWithDuration', new Date(msg.banEndDate));
		}
		return getText('ui.popup.accessDenied.banned');
	case IdentificationFailureReasonEnum.KICKED:
		// Text need more parameters but server doesn't give them
		return getText('ui.popup.accessDenied.kicked');
	case IdentificationFailureReasonEnum.IN_MAINTENANCE:
		return getText('ui.popup.accessDenied.inMaintenance');
	case IdentificationFailureReasonEnum.TOO_MANY_ON_IP:
		return getText('ui.popup.accessDenied.toomanyonip');
	case IdentificationFailureReasonEnum.TIME_OUT:
		return getText('ui.popup.accessDenied.timeout');
	case IdentificationFailureReasonEnum.BAD_IPRANGE:
		return getText('ui.popup.accessDenied.badIpRange');
	case IdentificationFailureReasonEnum.CREDENTIALS_RESET:
		return getText('ui.popup.accessDenied.credentialsReset');
	case IdentificationFailureReasonEnum.EMAIL_UNVALIDATED:
		return getText('ui.popup.accessDenied.unvalidatedEmail');
	case IdentificationFailureReasonEnum.SERVICE_UNAVAILABLE:
		return getText('ui.popup.accessDenied.serviceUnavailable');
	default:
		return getText('ui.popup.accessDenied.unknown');
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/login/getIdentFailureMsg.js
 ** module id = 52
 ** module chunks = 0
 **/