/** @module itemManager */

var async = require('async');
var enums = require('./enums.js');
var helpers = require('./helpers.js');
var Item = require('./Item.js');
var ItemInstance = require('./ItemInstance.js');
var staticContent = require('staticContent');
var assetPreloading = require('assetPreloading');
var EventEmitter = require('events.js').EventEmitter;
var GameContextEnum = require('GameContextEnum');

exports.Item = Item;
exports.ItemInstance = ItemInstance;

var items = exports.items = {};
var itemTypes = null;

var loadingItems = {};

var backupDbItemId = 666; // used when an item instance references a item that doesn't exist in the database



var averagePriceCache = {}; //average prices of all the items (that have been sold & bought at least once)

var AVERAGE_PRICE_REFRESH_FREQ = 60; // minutes; how long do we cache an average price

function PriceRecord(price, timestamp) {
	this.price = price;
	this.timestamp = timestamp;
}


var expectedAveragePriceGid = -1;
var expectedAveragePriceCb = null;


// Returns -1 if average price is not available
function getAveragePrice(gid) {
	var priceRecord = averagePriceCache[gid];
	if (!priceRecord) { return -1; }

	return priceRecord.price;
}
exports.getAveragePrice = getAveragePrice;

function isAveragePriceFresh(gid) {
	var priceRecord = averagePriceCache[gid];
	if (!priceRecord) { return false; }

	return Date.now() - priceRecord.timestamp < AVERAGE_PRICE_REFRESH_FREQ * 60000;
}

/**
 * Gets the latest average price for an item.
 * CAUTION: should only be called while the BidHouse is open; if called otherwise, no big issue but
 *   the server will just ignore our message and current price will remain unchanged.
 * @param {number} gid - generic item ID
 * @param {function} cb - called as cb(price) if server has an average price; not called otherwise
 */
exports.getFreshAveragePrice = function (gid, cb) {
	var currentPrice = getAveragePrice(gid);
	if (isAveragePriceFresh(gid)) {
		return cb(currentPrice);
	}
	expectedAveragePriceGid = gid;
	expectedAveragePriceCb = cb;
	window.dofus.sendMessage('ExchangeBidHousePriceMessage', { genId: gid });
	// If average price is known, we will receive ExchangeBidPriceMessage (see handler below)

	// Update timestamp to avoid asking each time for unavailable prices
	averagePriceCache[gid] = new PriceRecord(currentPrice, Date.now());
};

// Stores an average price received from server
function storeAveragePrice(gid, price) {
	averagePriceCache[gid] = new PriceRecord(price, Date.now());

	if (items[gid]) {
		items[gid].averagePrice = price;
	}
}

// Handler for ExchangeBidPriceMessage (1 average price update)
function exchangeBidPriceHandler(msg) {
	storeAveragePrice(msg.genericId, msg.averagePrice);

	if (msg.genericId === expectedAveragePriceGid) {
		expectedAveragePriceCb(msg.averagePrice);
	}
}


function getItems(ids, cb) {
	var newItemIds = [];
	var images = [];
	var dbItems = [];
	var loadingItemList = [];

	for (var i = 0, len = ids.length; i < len; i++) {
		var id = ids[i];
		if (!items[id]) {
			if (loadingItems[id]) {
				loadingItemList.push(loadingItems[id]);
			} else {
				newItemIds.push(id);
				var item = loadingItems[id] = new EventEmitter();
				item.loaded = false;
			}
		}
	}

	function constructResult() {
		var result = [];
		for (var i = 0, len = ids.length; i < len; i++) {
			var item = items[ids[i]];
			if (item) {
				result.push(item);
			}
		}
		return result;
	}

	function getItemData(callback) {
		staticContent.getDataMap('Items', newItemIds, function (error, itemDataMap) {
			if (error) {
				return callback(error);
			}

			for (var i = 0, len = newItemIds.length; i < len; i++) {
				var id = newItemIds[i];
				var item = itemDataMap[id];
				if (!item) {
					// this is clearly an error case (item with this ID not found in DB)
					var loadingItem = loadingItems[id];
					delete loadingItems[id];
					// some people can already waiting for that item
					loadingItem.emit('loaded');
					continue; //items[id] stays null (see getItemImage below)
				}

				var formattedItem = new Item(item);
				formattedItem.type = itemTypes[formattedItem.typeId];
				formattedItem.averagePrice = getAveragePrice(formattedItem.id);

				dbItems.push(formattedItem);

				images.push('gfx/items/' + item.iconId + '.png');
			}
			return callback();
		});
	}

	function getItemImage(callback) {
		assetPreloading.preloadImages(images, function setItemImage(urls) {
			for (var i = 0, len = urls.length; i < len; i++) {
				var item = dbItems[i];
				items[item.id] = item;
				item.image = urls[i];
				var loadingItem = loadingItems[item.id];
				delete loadingItems[item.id];
				loadingItem.loaded = true;
				loadingItem.emit('loaded');
			}
			return callback();
		});
	}

	function waitForLoadingItems(waitCb) {
		if (!loadingItemList.length) {
			return waitCb();
		}

		async.each(loadingItemList, function (loadingItem, callback) {
			if (loadingItem.loaded) {
				callback();
			} else {
				loadingItem.once('loaded', callback);
			}
		}, waitCb);
	}

	function loadingNewItems(newItemsCallback) {
		if (!newItemIds.length) {
			return newItemsCallback();
		}

		async.series([
			getItemData,
			getItemImage
		], function (error) {
			if (error) {
				return newItemsCallback(error);
			}

			Item.initializeList(dbItems, newItemsCallback);
		});
	}

	if (!loadingItemList.length && !newItemIds.length) {
		return cb(null, constructResult());
	}

	async.parallel([
		loadingNewItems,
		waitForLoadingItems
	], function (error) {
		if (error) {
			return cb(error);
		}
		return cb(null, constructResult());
	});
}
exports.getItems = getItems;

/** Must be called before using the itemManager services */
exports.initialize = function (cb) {
	var connectionManager = window.dofus.connectionManager;
	itemTypes = window.gui.databases.ItemTypes;

	// add the item category
	for (var id in itemTypes) {
		var type = itemTypes[id];
		type.category = helpers.getCategory(type.superTypeId);
		type.possiblePositions = helpers.getTypePositions(type.superTypeId);
	}

	getItems([backupDbItemId], cb);

	var onGameContextCreateMessage = function () {
		if (window.gui.gameContext !== GameContextEnum.ROLE_PLAY) { return; }
		window.gui.removeListener('GameContextCreateMessage', onGameContextCreateMessage);
		window.dofus.sendMessage('ObjectAveragePricesGetMessage');
	};
	window.gui.on('GameContextCreateMessage', onGameContextCreateMessage);

	window.gui.on('ObjectAveragePricesMessage', function (msg) {
		for (var i = 0, len = msg.ids.length; i < len; i += 1) {
			storeAveragePrice(msg.ids[i], msg.avgPrices[i]);
		}
	});

	/**
	 * @event module:protocol/inventoryExchanges.client_ExchangeBidPriceMessage
	 *
	 * @param {object} msg - msg
	 * @param {number} msg.genericId - item Id
	 * @param {number} msg.averagePrice
	 */
	connectionManager.on('ExchangeBidPriceMessage', exchangeBidPriceHandler);
};

exports.getItemTypeMap = function () {
	if (!itemTypes) { //TODO: terminate the app
		console.error(new Error('Fatal error: item types not loaded'));
		return;
	}
	return itemTypes;
};


function createItemInstances(rawItemInstances, cb) {
	if (!Array.isArray(rawItemInstances)) {
		rawItemInstances = [rawItemInstances];
	}

	var i, len;
	var itemIds = {};
	var instanceList = [];

	for (i = 0, len = rawItemInstances.length; i < len; i += 1) {
		var rawItemInstance = rawItemInstances[i];
		itemIds[rawItemInstance.objectGID] = true;
		instanceList.push(new ItemInstance(rawItemInstance));
	}

	getItems(Object.keys(itemIds), function (error) {
		if (error) {
			console.warn(error);
			return cb(error);
		}

		var instanceMap = {};

		for (i = 0, len = instanceList.length; i < len; i += 1) {
			var itemInstance = instanceList[i];
			itemInstance.setItem(items[itemInstance.objectGID] || items[backupDbItemId]);
			instanceMap[itemInstance.objectUID] = itemInstance;
		}

		ItemInstance.initializeList(instanceList, function (error) {
			cb(error, { map: instanceMap, array: instanceList });
		});
	});

	return instanceList;
}
exports.createItemInstances = createItemInstances;


// helpers
exports.getCategoryName = helpers.getCategoryName;
exports.isEquippable = helpers.isEquippable;
exports.isEquipped = helpers.isEquipped;
exports.unlinkedItemsFilter = helpers.unlinkedItemsFilter;


// enums
exports.positions = enums.positions;
exports.categories = enums.categories;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/itemManager/index.js
 ** module id = 322
 ** module chunks = 0
 **/