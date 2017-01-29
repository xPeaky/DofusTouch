var inherits = require('util').inherits;
var ContextualMenu = require('contextualMenus/ContextualMenu');
var getText = require('getText').getText;

function ContextualMenuPreset() {
	ContextualMenu.call(this, { noHeader: true });

	var slot, presetId, onClose, action;
	var entries = {};

	function remove() {
		if (slot) {
			slot.unset();
			slot.delClassNames('unavailable');
		}
		action = 'remove';
	}

	function equipSet() {
		window.dofus.sendMessage('InventoryPresetUseMessage', { presetId: presetId });
		action = 'equip';
	}

	this.once('open', function () {
		// menu
		entries.equipSet = this._addEntry(getText('ui.common.equip'), equipSet);
		entries.remove = this._addEntry(getText('ui.common.remove'), remove);
		this._addCancel();
	});

	this.on('open', function (params, contentReady) {
		// params
		params = params || {};

		slot = params.slot;
		onClose = params.onClose;
		presetId = params.presetId;

		action = '';

		// menu
		entries.remove.toggleDisplay(!!params.canRemove);
		entries.equipSet.toggleDisplay(!!params.hasOwnProperty('presetId'));

		contentReady();
	});

	this.on('close', function () {
		if (onClose) {
			onClose(action);
		}
	});
}

inherits(ContextualMenuPreset, ContextualMenu);
module.exports = ContextualMenuPreset;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/contextualMenus/ContextualMenuPreset/index.js
 ** module id = 420
 ** module chunks = 0
 **/