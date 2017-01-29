var inherits = require('util').inherits;
var ContextualMenu = require('contextualMenus/ContextualMenu');
var getText = require('getText').getText;

function ContextualMenuSpell() {
	ContextualMenu.call(this);

	var slot, onClose, action;
	var entries = {};

	function remove() {
		if (slot) {
			slot.unset();
		}
		action = 'remove';
	}

	this.once('open', function () {
		// menu
		entries.remove = this._addEntry(getText('ui.common.remove'), remove);
		this._addCancel();
	});

	this.on('open', function (params, contentReady) {
		// params
		params = params || {};

		slot = params.slot;
		onClose = params.onClose;

		this.header.setText(params.spell.getName());

		action = '';

		// menu
		entries.remove.toggleDisplay(!!params.canRemove);

		contentReady();
	});

	this.on('close', function () {
		if (onClose) {
			onClose(action);
		}
	});
}

inherits(ContextualMenuSpell, ContextualMenu);
module.exports = ContextualMenuSpell;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/contextualMenus/ContextualMenuSpell/index.js
 ** module id = 425
 ** module chunks = 0
 **/