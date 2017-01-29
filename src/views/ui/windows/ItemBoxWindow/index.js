require('./styles.less');
var inherits = require('util').inherits;
var Window = require('Window');
var ItemBox = require('ItemBox');
var itemManager = require('itemManager');

function ItemBoxWindow() {
	Window.call(this, {
		className:    'ItemBoxWindow',
		title:        '',
		positionInfo: {
			top:    'c',
			left:   'c',
			width:  500,
			height: 380
		}
	});

	var self = this;
	var gui = window.gui;

	this._itemBox = null;
	this._domCreated = false;

	function openWithItemData(itemData, opts) {
		opts = opts || {};
		opts.showDescription = true;
		opts.showTitle = true;
		if (!itemData) {
			return console.error('ItemBoxWindow: openWithItemData have not itemData');
		}
		self.setTitle(itemData.getName());
		self._itemBox.displayItem(itemData, opts);

		self._itemBox.show();
		self.windowBody.delClassNames('spinner');
	}

	function retrieveItemFromDB(GID, cb) {
		itemManager.getItems([GID], function (error) {
			if (error) {
				return cb(error);
			}
			var itemData = itemManager.items[GID];
			if (!itemData) {
				return cb(new Error('itemData not found for GID: ' + GID));
			}
			cb(null, itemData);
		});
	}

	function retrieveItemFromInventory(UID) {
		var inventoryItem = gui.playerData.inventory.objects[UID];
		if (!inventoryItem) {
			return console.error('ItemBoxWindow: inventory have not itemUID', UID);
		}
		return inventoryItem;
	}

	/**
	 * The window can open with three types of data:
	 *   itemData: the itemInstance or item from DB
	 *   UID
	 *   GID
	 *
	 * @param {object} params - Need to have itemData or UID or GID
	 * @param {object} [params.itemData] - itemInstance or item from the database
	 * @param {number} [params.objectUID] - item UID
	 * @param {number} [params.objectGID] - item GID
	 * @param {object} [params.options] - the options will be given to ItemBox component
	 */
	this.on('open', function (params) {
		params = params || {};
		if (!self._domCreated) {
			self._createDom();
		}
		var itemData = params.itemData;
		var objectUID = params.objectUID;
		var objectGID = params.objectGID;

		var options = params.options || {};

		self.setTitle('');

		self._itemBox.hide();
		self.windowBody.addClassNames('spinner');

		if (itemData) {
			openWithItemData(itemData, options);
		} else if (objectUID && window.gui.playerData.inventory.objects[objectUID]) {
			itemData = retrieveItemFromInventory(objectUID);
			openWithItemData(itemData, options);
		} else if (objectGID) {
			retrieveItemFromDB(objectGID, function (err, itemData) {
				if (err) {
					return console.error('ItemBoxWindow: error retrieveItemFromDB', err);
				}
				openWithItemData(itemData, options);
			});
		} else {
			console.error('ItemBoxWindow need itemData or objectUID or objectGID');
		}
	});

	this.on('close', function () {
		self._itemBox.hide();
		self.windowBody.delClassNames('spinner');
	});
}

inherits(ItemBoxWindow, Window);
module.exports = ItemBoxWindow;

ItemBoxWindow.prototype._createDom = function () {
	var windowBody = this.windowBody;

	this._itemBox = windowBody.appendChild(new ItemBox());
	this._itemBox.hide();

	this._domCreated = true;
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/ItemBoxWindow/index.js
 ** module id = 778
 ** module chunks = 0
 **/