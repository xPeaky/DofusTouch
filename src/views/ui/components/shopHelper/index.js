var adjust            = require('adjust');
var async             = require('async');
var BigNumber         = require('bignumber.js');
var CurrencyCodesEnum = require('CurrencyCodesEnum');
var deviceInfo        = require('deviceInfo');
var getText           = require('getText').getText;
var helper            = require('helper');
var moneyConverter    = require('moneyConverter');
var windowsManager    = require('windowsManager');

var isPreparing;
var products;
var callbacks;
var storeInfos;

BigNumber.config({ ROUNDING_MODE: BigNumber.ROUND_HALF_EVEN, ERRORS: true });

var connectionManager = window.dofus.connectionManager;
connectionManager.on('setShopDetailsSuccess', requestSetShopDetailsSuccess);
connectionManager.on('setShopDetailsError', requestSetShopDetailsError);
connectionManager.on('shopIAPListSuccess', requestIAPKeysSuccess);
connectionManager.on('shopIAPListError', requestIAPKeysError);
connectionManager.on('shopMobileValidateOrderError', onShopMobileValidateOrderError);
connectionManager.on('shopMobileValidateOrderSuccess', onShopMobileValidateOrderSuccess);
connectionManager.on('shopBuyError', onShopBuyError);
connectionManager.on('shopBuySuccess', onShopBuySuccess);
connectionManager.on('shopBuyIAPError', onShopBuyIAPError);
connectionManager.on('shopBuyIAPSuccess', onShopBuyIAPSuccess);
connectionManager.on('shopMobileValidatePendingOrderError', onShopMobileValidatePendingOrderError);
connectionManager.on('shopMobileValidatePendingOrderSuccess', onShopMobileValidatePendingOrderSuccess);

function initialize(gui) {
	gui.on('connected', function () {
		reset();
	});
}

function reset() {
	isPreparing = false;
	products = {};
	callbacks = [];
	storeInfos = null;
}

function getStoreInfos(callback) {
	if (isPreparing) {
		// Pending requests will be executed when preparation is done
		return callbacks.push(callback);
	}

	if (storeInfos) {
		async.setImmediate(function () {
			callback(null, storeInfos);
		});
	} else {
		callbacks.push(callback);
		prepare();
	}
}

function invokeAllCallbacks(error, data) {
	for (var i = 0; i < callbacks.length; i++) {
		callbacks[i](error, data);
	}
	callbacks = [];
}

function prepare() {
	isPreparing = true;
	if (!window.wizPurchase) {
		// Allow some platforms (e.g. browser) to open the Shop even if we don't have any IAP
		return setShopDetails({});
	}
	window.dofus.send('shopIAPListRequest');
}

/**
 * @event shopContent#shopIAPListError
 */
function requestIAPKeysError() {
	endPrepare(new Error('Request IAP keys failed'));
}

/**
 * @event shopContent#shopIAPListSuccess
 *
 * @param {object} msg         - shopIAPListSuccess message
 * @param {array}  msg.iapList - list of the IAP with their key and type
 */
function requestIAPKeysSuccess(msg) {
	var iapList = msg.iapList;

	if (!iapList.length) {
		return setShopDetails({});
	}

	var productsKeys = [];
	for (var i = 0; i < iapList.length; i++) {
		productsKeys.push(iapList[i].key);
	}

	getProductsDetails(productsKeys);
}

function parsePrice(price) {
	var parsedPrice;
	try {
		var bigPrice = new BigNumber(price);
		// Price is initially in micro-units and has to be multiplied by 10^-6 to convert it to its correct unit value
		parsedPrice = bigPrice.times('0.000001').toNumber();
	} catch (err) {
		console.error(new Error('Could not parse price ' + price));
		return NaN;
	}
	if (parsedPrice === Infinity || parsedPrice === -Infinity) {
		return NaN;
	}
	return parsedPrice;
}

function getProductsDetails(productsKeys) {
	if (!window.wizPurchase) {
		return endPrepare(new Error('Purchases are not available on this platform'));
	}

	if (!productsKeys.length) {
		return setShopDetails({});
	}

	window.wizPurchase.getProductDetails(productsKeys, function (productsRequest) {
		var storeProducts = productsRequest.products;
		for (var key in storeProducts) {
			var product = storeProducts[key];
			var parsedPrice = parsePrice(product.priceMicros);
			if (isNaN(parsedPrice)) {
				continue;
			}
			product._parsedPrice = parsedPrice;
			products[key] = product;
		}
		var shopDetails = {
			platform: deviceInfo.osName,
			currency: productsRequest.currency,
			country: productsRequest.country
		};
		setShopDetails(shopDetails);
	}, function (error) {
		return endPrepare(new Error('wizPurchase.getProductDetails failed with keys: ' + productsKeys + ' and error: ' +
			error));
	});
}

function setShopDetails(shopDetails) {
	shopDetails = shopDetails || {};
	window.dofus.send('setShopDetailsRequest', shopDetails);
}

/**
 * @event shopContent#setShopDetailsError
 */
function requestSetShopDetailsError(/*msg*/) {
	endPrepare(new Error('Request to set shop details failed'));
}

/**
 * @event shopContent#setShopDetailsSuccess
 */
function requestSetShopDetailsSuccess(msg) {
	endPrepare(null, msg.shopDetails);
}

function endPrepare(error, shopDetails) {
	isPreparing = false;

	if (error) {
		return invokeAllCallbacks(error);
	}

	storeInfos = shopDetails;
	invokeAllCallbacks(null, shopDetails);
}

function enrichWithSoftPrice(article) {
	// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
	// IAP don't have a soft price
	if (article.key) {
		return;
	}
	// Article is enriched with its soft price
	article._softPrice = moneyConverter.computeSoftPrice(article.price);
	if (article.original_price) {
		article._softOriginalPrice = moneyConverter.computeSoftPrice(article.original_price);
	}
	// jscs:enable requireCamelCaseOrUpperCaseIdentifiers
}

function validateArticles(articles) {
	// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
	var validArticles = [];
	for (var i = 0; i < articles.length; i++) {
		var article = articles[i];
		if (article.key) {
			var product = products[article.key];
			if (!product) {
				// We do not display article from the app store if they don't exist on the app store
				continue;
			}
			article.product = product;
		} else if (article.currency !== CurrencyCodesEnum.GOULTINE) {
			// We do not display non-IAP article in a currency different than goultine
			continue;
		} else {
			// Soft price enrichment is only done for non-IAP article with their currency as goultine
			enrichWithSoftPrice(article);
		}
		if (article.price && article.original_price) {
			var promoRate = Math.floor(100 - article.price * 100 / article.original_price);
			article._promoRate = promoRate ? ('- ' + promoRate + '%') : '';
		}
		var itemsId = [];
		var references = article.references;
		for (var j = 0; j < references.length; j++) {
			var virtualGifts = references[j].reference_virtualgift;
			if (!virtualGifts) { continue; }
			for (var k = 0; k < virtualGifts.length; k++) {
				itemsId.push(virtualGifts[k].id);
			}
		}
		article.itemsId = itemsId;
		validArticles.push(article);
	}
	return validArticles;
	// jscs:enable requireCamelCaseOrUpperCaseIdentifiers
}

function openNotEnoughKamasPopup(article) {
	var formattedPrice = getText('tablet.price.hard', helper.kamasToString(article.price, ''));
	window.gui.openConfirmPopup({
		title: getText('ui.popup.warning'),
		message: getText('tablet.shop.notEnoughKamas', article.name, formattedPrice),
		cb: function (hasConfirmed) {
			if (!hasConfirmed) {
				return;
			}
			purchaseArticleOnAnkama(article, CurrencyCodesEnum.GOULTINE);
		}
	});
}

function openNotEnoughHardCurrencyPopup(hardCurrencyAmountMissing) {
	var buyHardCurrencyConfirm = windowsManager.getWindow('buyHardCurrencyConfirm');
	buyHardCurrencyConfirm.confirmBuy(hardCurrencyAmountMissing);
}

function purchaseArticleOnStore(article) {
	if (!article) {
		return console.error(new Error('Trying to buy a non-existent article'));
	}

	// Before buying an IAP, it's necessary to check if there's no pending purchases to avoid multi-IAPs
	getPendingPurchases(function (error, purchases) {
		if (error) {
			console.error(error);
			return window.gui.openSimplePopup(getText('tablet.shop.couldNotBuy'));
		}
		if (purchases.length) {
			return windowsManager.getWindow('purchasesPending').validatePendingPurchases(purchases);
		}

		windowsManager.getWindow('shopConfirm').confirmBuy({ article: article }, function (hasConfirmed) {
			if (!hasConfirmed) {
				return;
			}
			if (!storeInfos) {
				console.error(new Error('Purchase could not be done, store infos are no longer available'));
				endPurchaseProcess();
				return window.gui.openSimplePopup(getText('tablet.shop.couldNotBuy'));
			}
			var data = {
				currency: storeInfos.currency,
				iapKey: article.key,
				purchase: JSON.stringify([{
					quantity: 1,
					id: article.id,
					amount: article.product._parsedPrice
				}])
			};
			//TODO: Not an actual error, logged for Haapi/Shop
			console.error('[Haapi info] ShopWindow sending shopBuyIAPRequest with data: ' + JSON.stringify(data));
			window.dofus.send('shopBuyIAPRequest', data);
		});
	});
}

function purchaseArticleOnAnkama(article, currency) {
	if (!article) {
		return console.error(new Error('Trying to buy a non-existent article'));
	}

	// First check if the user can actually buy it
	var inventory = window.gui.playerData.inventory;
	var goultinesAmount = inventory.goultines;
	var kamasAmount = inventory.kamas;

	var isSoft = currency === CurrencyCodesEnum.KAMA;
	if (isSoft && article._softPrice > kamasAmount) {
		return openNotEnoughKamasPopup(article);
	} else if (!isSoft && article.price > goultinesAmount) {
		var hardCurrencyAmountMissing = article.price - goultinesAmount;
		return openNotEnoughHardCurrencyPopup(hardCurrencyAmountMissing);
	}
	windowsManager.getWindow('shopConfirm').confirmBuy({ article: article, isSoft: isSoft }, function (hasConfirmed) {
		if (!hasConfirmed) {
			return;
		}
		window.dofus.send('shopBuyRequest', {
			currency: currency,
			amountHard: article.price,
			amountSoft: article._softPrice,
			purchase: JSON.stringify([{
				quantity: 1,
				id: article.id
			}])
		});
	});
}

// Purchase process

function buildReceipt(purchase) {
	// On Android, Haapi expects the full purchase data and its signature
	var receipt;
	if (purchase.platform === 'android') {
		receipt = JSON.stringify({
			json: purchase.json,
			developerPayload: purchase.developerPayload,
			signature: purchase.signature
		});
	} else {
		receipt = purchase.receipt;
	}
	return receipt;
}

function finishIAP(key, orderId, cb) {
	cb = cb || function (error) { if (error) { console.error(error); } };
	if (!window.wizPurchase) {
		return cb(new Error('Purchase should not have been possible on this platform, for key: ' + key +
			' and order id: ' + orderId), key);
	}
	// Ask to update the hard currency amount in case the IAP was to buy hard currency
	window.dofus.send('moneyGoultinesAmountRequest');
	// Every purchases are consumables in Dofus Touch
	window.wizPurchase.finishPurchase(key, true, function () {
		return cb(null, key);
	}, function (error) {
		return cb(new Error('Finish purchase failed for key ' + key + ' and order id ' + orderId + ' with error: ' +
			error), key);
	});
}

/**
 * @event shopHelper#shopMobileValidateOrderError
 * @param {object} msg         - shopMobileValidateOrderError message
 * @param {string} msg.iapKey  - IAP key of the validated order
 * @param {string} msg.orderId - Order id on Haapi
 * @param {string} msg.reason  - Reason why validation failed
 */
function onShopMobileValidateOrderError(msg) {
	if (msg.reason === 'RECEIPT_ALREADY_VALIDATED') {
		// Finish the order anyway in this case
		finishIAP(msg.iapKey, msg.orderId, function () {
			endPurchaseProcess();
		});
	} else {
		endPurchaseProcess();
		window.gui.openSimplePopup(getText('tablet.shop.validateIAPFail'));
	}
}

/**
 * @event shopHelper#shopMobileValidateOrderSuccess
 *
 * @param {object} msg           - shopMobileValidateOrderSuccess message
 * @param {string} msg.iapKey    - IAP key of the validated order
 * @param {object} msg.buyResult - Haapi BuyResult data model
 */
function onShopMobileValidateOrderSuccess(msg) {
	// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
	window.gui.openSimplePopup(getText('tablet.shop.validateIAPSuccess'), getText('ui.common.informations'));
	finishIAP(msg.iapKey, msg.buyResult.order_id, function () {
		endPurchaseProcess();
	});
	// jscs:enable requireCamelCaseOrUpperCaseIdentifiers
}

/**
 * @event shopHelper#shopBuyError
 */
function onShopBuyError(/*msg*/) {
	endPurchaseProcess();
	window.gui.openSimplePopup(getText('tablet.shop.buyFail'));
}

/**
 * @event shopHelper#shopBuySuccess
 *
 * @param {object} msg           - shopBuySuccess message
 * @param {string} msg.currency  - currency acronym
 * @param {object} msg.buyResult - Haapi BuyResult data model
 */
function onShopBuySuccess(msg) {
	endPurchaseProcess();
	window.gui.openSimplePopup(getText('tablet.shop.buySuccess'), getText('ui.common.informations'));

	if (msg.currency === CurrencyCodesEnum.GOULTINE) {
		window.dofus.send('moneyGoultinesAmountRequest');
	}
}

function validateIAP(orderId, purchase) {
	var receipt = buildReceipt(purchase);
	var productId = purchase.productId;
	//TODO: Not an actual error, logged for Haapi/Shop
	if (purchase.platform === 'android') {
		console.error('[Haapi info] ShopWindow sending shopMobileValidateOrderRequest with data: ' +
			JSON.stringify({ orderId: orderId, receipt: receipt, iapKey: productId }));
	} else {
		console.error('[Haapi info] ShopWindow sending shopMobileValidateOrderRequest with data: ' +
			JSON.stringify({ orderId: orderId, iapKey: productId }));
	}
	window.dofus.send('shopMobileValidateOrderRequest', { orderId: orderId, receipt: receipt, iapKey: productId });
}

/**
 * @event shopHelper#shopBuyIAPError
 */
function onShopBuyIAPError(/*msg*/) {
	endPurchaseProcess();
	window.gui.openSimplePopup(getText('tablet.shop.buyFail'));
}

/**
 * @event shopHelper#shopBuyIAPSuccess
 *
 * @param {object} msg           - shopBuyIAPSuccess message
 * @param {string} msg.iapKey    - IAP key of the bought article
 * @param {object} msg.buyResult - Haapi BuyResult data model
 */
function onShopBuyIAPSuccess(msg) {
	//jscs:disable requireCamelCaseOrUpperCaseIdentifiers
	if (!window.wizPurchase) {
		return console.error(new Error('Purchase should not have been possible on this platform, for key: ' +
			msg.iapKey + ' and order id: ' + msg.buyResult.order_id));
	}
	var key = msg.iapKey;
	var orderId = msg.buyResult.order_id;
	window.wizPurchase.makePurchase(key, function (purchase) {
		var product = products[key];
		if (!storeInfos) {
			console.error(new Error('Could not send event to Adjust, store infos are no longer available'));
		} else if (!product) {
			console.error(new Error('Could not send event to Adjust, no product found for key: ' + key));
		} else {
			adjust.trackIAPBought(product._parsedPrice, storeInfos.currency, orderId);
		}
		validateIAP(orderId, purchase);
	}, function (error) {
		if (error === window.WizPurchaseError.ALREADY_OWNED) {
			// An IAP was not delivered correctly, user state has to be restored
			return restorePurchases();
		}
		endPurchaseProcess();
		window.gui.openSimplePopup(getText('tablet.shop.validateIAPFail'));
	});
}

function endPurchaseProcess() {
	windowsManager.close('shopConfirm');
}

/**
 * @event shopHelper#shopMobileValidatePendingOrderError
 * @param {object} msg         - shopMobileValidatePendingOrderError message
 * @param {string} msg.iapKey  - IAP key of the validated order
 * @param {string} msg.reason  - Reason why validation failed
 */
function onShopMobileValidatePendingOrderError(msg) {
	if (msg.reason === 'RECEIPT_ALREADY_VALIDATED') {
		// Finish silently the order anyway in this case
		finishIAP(msg.iapKey, null, function (error, key) {
			windowsManager.getWindow('purchasesPending').validateNextPendingPurchases(error, key);
		});
	} else {
		windowsManager.getWindow('purchasesPending').validateNextPendingPurchases(
			new Error('Validate pending order failed for productId: ' + msg.iapKey + ' with reason: ' + msg.reason),
			msg.iapKey
		);
	}
}

/**
 * @event shopHelper#shopMobileValidatePendingOrderSuccess
 *
 * @param {object} msg           - shopMobileValidatePendingOrderSuccess message
 * @param {string} msg.iapKey    - IAP key of the validated order
 * @param {object} msg.buyResult - Haapi BuyResult data model
 */
function onShopMobileValidatePendingOrderSuccess(msg) {
	// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
	finishIAP(msg.iapKey, msg.buyResult.order_id, function (error, key) {
		windowsManager.getWindow('purchasesPending').validateNextPendingPurchases(error, key);
	});
	// jscs:enable requireCamelCaseOrUpperCaseIdentifiers
}

function validatePendingIAP(purchase) {
	var receipt = buildReceipt(purchase);
	var productId = purchase.productId;
	//TODO: Not an actual error, logged for Haapi/Shop
	if (purchase.platform === 'android') {
		console.error('[Haapi info] ShopWindow sending shopMobileValidatePendingOrderRequest with data: ' +
			JSON.stringify({ receipt: receipt, iapKey: productId }));
	} else {
		console.error('[Haapi info] ShopWindow sending shopMobileValidatePendingOrderRequest with data: ' +
			JSON.stringify({ iapKey: productId }));
	}
	window.dofus.send('shopMobileValidatePendingOrderRequest', { receipt: receipt, iapKey: productId });
}

function restorePurchases() {
	if (!window.wizPurchase) {
		return console.error(new Error('Restoring purchases should not have been possible on this platform'));
	}
	window.wizPurchase.restoreAllPurchases(function (purchases) {
		purchases = purchases || [];

		endPurchaseProcess();
		windowsManager.getWindow('purchasesPending').validatePendingPurchases(purchases);
	}, function (error) {
		console.error(new Error('Restore all purchases failed with error: ' + error));

		endPurchaseProcess();
		window.gui.openSimplePopup(getText('tablet.shop.restoreFailed'));
	});
}

function getPendingPurchases(callback) {
	if (!window.wizPurchase) {
		return callback(new Error('Check pending purchases should not have been possible on this platform'));
	}
	window.wizPurchase.getPendingPurchases(function (purchases) {
		purchases = purchases || [];
		return callback(null, purchases);
	}, function (error) {
		return callback(new Error('Get pending purchases failed with error: ' + error));
	});
}

function checkPendingPurchases() {
	getPendingPurchases(function (error, purchases) {
		if (error) {
			return console.error(new Error('Check pending purchases failed with error: ' + error));
		}
		if (purchases.length) {
			windowsManager.getWindow('purchasesPending').validatePendingPurchases(purchases);
		}
	});
}

exports.initialize = initialize;
exports.getStoreInfos = getStoreInfos;
exports.enrichWithSoftPrice = enrichWithSoftPrice;
exports.validateArticles = validateArticles;
exports.purchaseArticleOnStore = purchaseArticleOnStore;
exports.purchaseArticleOnAnkama = purchaseArticleOnAnkama;
exports.openNotEnoughHardCurrencyPopup = openNotEnoughHardCurrencyPopup;
exports.validatePendingIAP = validatePendingIAP;
exports.checkPendingPurchases = checkPendingPurchases;


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/shopHelper/index.js
 ** module id = 631
 ** module chunks = 0
 **/