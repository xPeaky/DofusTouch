var getText = require('getText').getText;

module.exports = function (error) {
	// we do not want to log wrong login/password and the ankama authentificator
	if (error.reason !== 'FAILED' && error.reason !== 'OTPTIMEFAILED') {
		console.error('Haapi identification failed:', error);
	}

	switch (error.reason) {
	case 'NOTOKEN':
		return getText('ui.popup.accessDenied.notoken');
	case 'BAN':
		return getText('ui.popup.accessDenied.banned');
	case 'BLACKLIST':
		return getText('tablet.ui.popup.accessDenied.blacklist');
	case 'LOCKED':
		return getText('tablet.ui.popup.accessDenied.locked');
	case 'DELETED':
		return getText('tablet.ui.popup.accessDenied.deleted');
	// case 'RESETANKAMA':
	//	return getText('ui.popup.accessDenied.credentialsReset');
	case 'OTPTIMEFAILED':
		return getText('tablet.ui.popup.accessDenied.otptimefailed');
	// case 'SECURITYCARD':
	//	return getText('');
	case 'BRUTEFORCE':
		return getText('tablet.ui.popup.accessDenied.bruteForceDetected');
	case 'FAILED':
		return getText('ui.popup.accessDenied.wrongCredentials');
	// case 'PARTNER':
	//	return getText('');
	case 'MAILNOVALID':
		return getText('ui.popup.accessDenied.unvalidatedEmail');
	case 'BETACLOSED':
		return getText('tablet.ui.popup.accessDenied.betaClosed');
	// case 'NOACCOUNT':
	//	return getText('');
	default:
		return getText('ui.popup.accessDenied.unknown');
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/login/getHaapiFailureMsg.js
 ** module id = 54
 ** module chunks = 0
 **/