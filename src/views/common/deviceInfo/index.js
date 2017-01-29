var UAParser = require('ua-parser-js');

var ua = window.navigator.userAgent;
var uaParser = new UAParser(ua);
var os = uaParser.getOS();
var hasModelInfo = window.device !== undefined && typeof window.device.model === 'string';

// TODO: align all those equals to satisfy OCD
exports.osName = os.name;
exports.isIOS = os.name === 'iOS';
exports.isAndroid = os.name === 'Android';
exports.isDevice = exports.isIOS || exports.isAndroid;
exports.isPhoneGap = exports.isCordova = !!(window.cordova || window.PhoneGap || window.phonegap);
exports.isIpad2 = hasModelInfo && window.device.model.substr(0, 6) === 'iPad2,';
exports.os = os.name.toLowerCase();
exports.isIOSApp = window.device && window.device.platform && window.device.platform === 'iOS';
exports.isAndroidApp = window.device && window.device.platform && window.device.platform === 'Android';


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/common/deviceInfo/index.js
 ** module id = 7
 ** module chunks = 0
 **/