var inherits = require('util').inherits;
var ContextualMenu = require('contextualMenus/ContextualMenu');
var getText = require('getText').getText;
var protocolConstants = require('protocolConstants');

function ContextualMenuStorage() {
	ContextualMenu.call(this, { noHeader: true });

	var toInventory;
	var storageViewer;
	var sendMessage = window.dofus.sendMessage;

	function transferAll() {
		if (toInventory) {
			sendMessage('ExchangeObjectTransfertAllToInvMessage', {});
		} else {
			sendMessage('ExchangeObjectTransfertAllFromInvMessage', {});
		}
	}

	function transferVisible() {
		var ids = storageViewer.getDisplayedItemsUIDs();
		if (!ids || ids.length < protocolConstants.MIN_OBJ_COUNT_BY_XFERT) {
			return;
		}
		if (ids.length > protocolConstants.MAX_OBJ_COUNT_BY_XFERT) {
			ids = ids.splice(0, protocolConstants.MAX_OBJ_COUNT_BY_XFERT);
			window.gui.chat.logMsg(getText('ui.exchange.partialTransfert'));
		}
		if (toInventory) {
			sendMessage('ExchangeObjectTransfertListToInvMessage', { ids: ids });
		} else {
			sendMessage('ExchangeObjectTransfertListFromInvMessage', { ids: ids });
		}
	}

	function transferExisting() {
		if (toInventory) {
			sendMessage('ExchangeObjectTransfertExistingToInvMessage', {});
		} else {
			sendMessage('ExchangeObjectTransfertExistingFromInvMessage', {});
		}
	}

	this.once('open', function () {
		this._addEntry(getText('ui.storage.getAll'), transferAll);
		this._addEntry(getText('ui.storage.getVisible'), transferVisible);
		this._addEntry(getText('ui.storage.getExisting'), transferExisting);
		this._addCancel();
	});

	this.on('open', function (params, contentReady) {
		toInventory = params.toInventory;
		storageViewer = params.viewer;
		contentReady();
	});
}

inherits(ContextualMenuStorage, ContextualMenu);
module.exports = ContextualMenuStorage;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/contextualMenus/ContextualMenuStorage/index.js
 ** module id = 424
 ** module chunks = 0
 **/