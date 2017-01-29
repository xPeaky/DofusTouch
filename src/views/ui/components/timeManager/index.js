var getText = require('getText').getText;

exports.time = {
	serverTimeLag: 0,
	serverUtcTimeLag: 0,
	timezoneOffset: 0,
	dofusTimeYearLag: -1370
};

function leadWithZero(num) {
	return ('0' + num).slice(-2);
}

exports.leadWithZero = leadWithZero;

exports.initialize = function (gui) {
	gui.on('BasicTimeMessage', function (msg) {
		var now = Date.now();
		var time = exports.time;
		time.serverTimeLag = (msg.timestamp + msg.timezoneOffset * 60) * 1000 - now;
		time.serverUtcTimeLag = msg.timestamp * 1000 - now;
		time.timezoneOffset = msg.timezoneOffset * 60 * 1000;
	});
};

/**
 * @param {number} timestamp - timestamp in sec
 * @constructor
 */
function DofusDate(timestamp) {
	this.timestamp = timestamp;
}
exports.DofusDate = DofusDate;

/**
 * @param {boolean} useDofusYear - if true the dofus years will be used
 * @return {DofusDate}
 */
DofusDate.prototype.getLocalDate = function (useDofusYear) {
	var date = new Date(this.timestamp * 1000);

	this.dofusDate = useDofusYear;
	this.date = date;
	this.year = date.getFullYear() + (useDofusYear ? exports.time.dofusTimeYearLag : 0);
	this.month = date.getMonth();
	this.day = date.getDate();
	this.hour = date.getHours();
	this.minute = date.getMinutes();
	return this;
};

/**
 * @param {boolean} useDofusYear - if true the dofus years will be used
 * @return {DofusDate}
 */
DofusDate.prototype.getServerDate = function (useDofusYear) {
	var date = new Date(this.timestamp * 1000 + exports.time.timezoneOffset);

	this.dofusDate = useDofusYear;
	this.date = date;
	this.year = date.getUTCFullYear() + (useDofusYear ? exports.time.dofusTimeYearLag : 0);
	this.month = date.getUTCMonth();
	this.day = date.getUTCDate();
	this.hour = date.getUTCHours();
	this.minute = date.getUTCMinutes();
	return this;
};

/**
 * @param {boolean} useDofusYear - if true the dofus years will be used
 * @return {object}
 */
DofusDate.prototype.toString = function (useDofusYear) {
	if (!this.date) {
		return {};
	}

	var dofusDate = !this.dofusDate && useDofusYear;

	var year = this.year + (dofusDate ? exports.time.dofusTimeYearLag : 0);
	var day = leadWithZero(this.day);
	var month = leadWithZero(this.month + 1);
	var hour = leadWithZero(this.hour);
	var minute = leadWithZero(this.minute);

	return {
		date: getText('ui.time.dateNumbers', day, month, year),
		time: hour + ':' + minute,
		year: year,
		month: month,
		monthName: window.gui.databases.Months[this.month].nameId,
		day: day,
		hour: hour,
		minute: minute
	};
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/timeManager/index.js
 ** module id = 210
 ** module chunks = 0
 **/