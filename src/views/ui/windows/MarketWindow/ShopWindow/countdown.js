var getText = require('getText').getText;

var MINUTES_IN_MS = 1000 * 60;
var HOURS_IN_MS = MINUTES_IN_MS * 60;
var DAY_IN_MS = HOURS_IN_MS * 24;

function Countdown(endTimestamp, updateCallback, endCallback) {
	this._endTimestamp = endTimestamp;
	this._updateCallback = updateCallback;
	this._endCallback = endCallback;

	this._endTimeout = null;
	this._updateTimeout = null;

	this._setUpdateTimeout();
	this._setEndTimeout();
}
module.exports = Countdown;

Countdown.prototype.clear = function () {
	clearTimeout(this._updateTimeout);
	clearTimeout(this._endTimeout);

	this._endTimeout = null;
	this._updateTimeout = null;
	this._endTimestamp = null;
	this._updateCallback = null;
	this._endCallback = null;
};

Countdown.prototype._setEndTimeout = function () {
	var self = this;
	var timestamp = Date.now();
	var leftTimestamp = this._endTimestamp - timestamp;
	if (leftTimestamp > DAY_IN_MS) {
		// setTimeout with a too important delay will fire immediatly so
		// if there is more than a day left, we just assume the end callback will never be called
		return;
	}
	if (leftTimestamp > 0) {
		this._endTimeout = setTimeout(function () {
			self._endCallback();
			self.clear();
		}, leftTimestamp);
	} else {
		this._endCallback();
		this.clear();
	}
};

function formatTimeLeft(time) {
	var text;
	if (time.day) {
		text = time.day + ' ' + getText('ui.time.days', time.day);
	} else if (time.hour) {
		text = time.hour + ' ' + getText('ui.time.hours', time.hour);
	} else if (time.minute) {
		text = time.minute + ' ' + getText('ui.time.minutes', time.minute);
	}
	return text;
}

Countdown.prototype._setUpdateTimeout = function () {
	var self = this;

	var timestamp = Date.now();
	var leftTimestamp = this._endTimestamp - timestamp;
	var timeLeftBeforeUpdate;
	if (leftTimestamp <= 0) {
		return;
	}

	// Case when the countdown is updated at the perfect timing
	// eg. 58min should be 57min and 59.9s but we still need to update after 60s (not 59.9s)
	var timingOffset = leftTimestamp % MINUTES_IN_MS === 0 ? 1 : 0;

	var daysLeft = Math.max(0, ~~(leftTimestamp / DAY_IN_MS) - timingOffset);
	var hoursLeft = Math.max(0, ~~(leftTimestamp / HOURS_IN_MS) - timingOffset);
	var minutesLeft = Math.max(0, ~~(leftTimestamp / MINUTES_IN_MS) - timingOffset);
	if (daysLeft) {
		timeLeftBeforeUpdate = (leftTimestamp % DAY_IN_MS) || DAY_IN_MS;
	} else if (hoursLeft) {
		timeLeftBeforeUpdate = (leftTimestamp % HOURS_IN_MS) || HOURS_IN_MS;
	} else if (minutesLeft) {
		timeLeftBeforeUpdate = (leftTimestamp % MINUTES_IN_MS) || MINUTES_IN_MS;
	}

	var timeLeft = {
		day: daysLeft,
		hour: hoursLeft,
		minute: minutesLeft || 1
	};
	var formattedTimeLeft = formatTimeLeft(timeLeft);
	if (!formattedTimeLeft) {
		return self._updateCallback(new Error('Time left could not be formatted, day: ' + timeLeft.day +
			', hour: ' + timeLeft.hour + ', minute: ' + timeLeft.minute));
	}
	self._updateCallback(null, timeLeft, formattedTimeLeft);

	if (!timeLeftBeforeUpdate) {
		return;
	}

	this._updateTimeout = setTimeout(function () {
		self._setUpdateTimeout();
	}, timeLeftBeforeUpdate);
};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/MarketWindow/ShopWindow/countdown.js
 ** module id = 961
 ** module chunks = 0
 **/