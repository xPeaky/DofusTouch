var inherits = require('util').inherits;
var ContextualMenu = require('contextualMenus/ContextualMenu');
var getText = require('getText').getText;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** @class */
function ContextualMenuPaddockObject() {
	ContextualMenu.call(this);
	var self = this;
	this.data = null;

	this.on('open', function (data, contentReady) {
		this.data = data;
		this.header.setText(data.paddockObjectName);
		contentReady();
	});

	this.once('open', function () {
		this._addEntry(getText('ui.common.remove'), function () {
			window.dofus.sendMessage('PaddockRemoveItemRequestMessage', { cellId: self.data.cellId });
		});
		this._addCancel();
	});
}

inherits(ContextualMenuPaddockObject, ContextualMenu);
module.exports = ContextualMenuPaddockObject;


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/contextualMenus/ContextualMenuPaddockObject/index.js
 ** module id = 432
 ** module chunks = 0
 **/