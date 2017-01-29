var Adjust = window.Adjust;
var AdjustConfig = window.AdjustConfig;
var AdjustEvent = window.AdjustEvent;

var initialize, trackIAPBought, trackTutorialCompleted;

function voidFunction() {}

var isInitialized = false;

function trackEvent(id, options) {
	if (!isInitialized) {
		return;
	}
	var adjustEvent = new AdjustEvent(id);
	if (options) {
		var revenue = options.revenue;
		if (revenue) {
			adjustEvent.setRevenue(revenue.price, revenue.currency);
		}
		var transactionId = options.transactionId;
		if (transactionId) {
			// Warning: if transactionId is not a String, Adjust SDK crashes along the app
			transactionId = (typeof transactionId === 'string') ? transactionId : transactionId.toString();
			adjustEvent.setTransactionId(transactionId);
		}
	}
	Adjust.trackEvent(adjustEvent);
}

if (Adjust) {
	initialize = function (config) {
		if (!config) {
			return;
		}
		var environment = AdjustConfig[config.environment] || AdjustConfig.EnvironmentSandbox;
		var adjustConfig = new AdjustConfig(config.appToken, environment);
		adjustConfig.setLogLevel(AdjustConfig.LogLevelVerbose);
		Adjust.create(adjustConfig);
		isInitialized = true;
	};

	trackIAPBought = function (price, currency, transactionId) {
		trackEvent('m38gxs', { revenue: { price: price, currency: currency }, transactionId: transactionId });
	};

	trackTutorialCompleted = function () {
		trackEvent('806tbe');
	};
}

exports.initialize             = initialize             || voidFunction;
exports.trackIAPBought         = trackIAPBought         || voidFunction;
exports.trackTutorialCompleted = trackTutorialCompleted || voidFunction;


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/adjust/index.js
 ** module id = 180
 ** module chunks = 0
 **/