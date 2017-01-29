var EventEmitter = require('events.js').EventEmitter;

var softToHardRate = null;
var hardToSoftRate = null;

var exports = module.exports = new EventEmitter();

var UPDATE_FREQUENCY = 5 * 60000 - 10000; // a bit more often than advised frequency
var interval = null;


function requestRate() {
	window.dofus.connectionManager.send('bakSoftToHardCurrentRateRequest');
	window.dofus.connectionManager.send('bakHardToSoftCurrentRateRequest');
}

function setupListeners() {
	var connectionManager = window.dofus.connectionManager;
	var gui = window.gui;

	gui.on('connected', function () {
		// first request for current rate
		requestRate();

		// we will ask for an update regularly
		interval = window.setInterval(requestRate, UPDATE_FREQUENCY);
	});

	gui.on('disconnect', function () {
		interval = window.clearInterval(interval);
	});

	gui.on('appOnBackground', function () {
		interval = window.clearInterval(interval);
	});

	// if the client manage to reconnect the session after disconnection or wake up the app from background
	connectionManager.on('sessionReconnected', function () {
		if (!interval) { // if it is a wake up from background the interval is null
			requestRate();
			interval = window.setInterval(requestRate, UPDATE_FREQUENCY);
		}
	});

	connectionManager.on('bakSoftToHardCurrentRateSuccess', function (msg) {
		if (softToHardRate !== null && softToHardRate === msg.rate) {
			return;
		}
		softToHardRate = msg.rate;
		exports.emit('computedSoftPricesChange');
	});

	connectionManager.on('bakHardToSoftCurrentRateSuccess', function (msg) {
		if (hardToSoftRate !== null && hardToSoftRate === msg.rate) {
			return;
		}
		hardToSoftRate = msg.rate;
		exports.emit('computedHardPricesChange');
	});

	connectionManager.on('bakSoftToHardCurrentRateError', function (/*msg*/) {
		softToHardRate = null;
		exports.emit('canNotComputeSoftPrices');
	});

	connectionManager.on('bakHardToSoftCurrentRateError', function (/*msg*/) {
		hardToSoftRate = null;
		exports.emit('canNotComputeHardPrices');
	});
}

exports.initialize = function () {
	setupListeners();
};

exports.isRateAvailable = function () {
	return softToHardRate !== null && hardToSoftRate !== null;
};

// Here we want to know how much hard are needed to obtain a certain value of soft
exports.computeHardPrice = function (softPrice) {
	if (!hardToSoftRate && hardToSoftRate !== 0) {
		return null;
	}
	return Math.ceil(softPrice / hardToSoftRate);
};

// Here we want to know how much soft are needed to obtain a certain value of hard
exports.computeSoftPrice = function (hardPrice) {
	if (!softToHardRate && softToHardRate !== 0) {
		return null;
	}
	return Math.ceil(hardPrice * softToHardRate);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/moneyConverter/index.js
 ** module id = 546
 ** module chunks = 0
 **/