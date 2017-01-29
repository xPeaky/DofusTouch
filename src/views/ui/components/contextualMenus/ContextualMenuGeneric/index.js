var inherits = require('util').inherits;
var ContextualMenu = require('contextualMenus/ContextualMenu');
var Button = require('Button');


function ContextualMenuGeneric() {
	ContextualMenu.call(this);

	this.once('open', function () {
		this.buttonsContainer = this.entryList.createChild('div');
		this._addCancel();
	});

	this.on('open', function (params, contentReady) {
		this._update(params);
		contentReady();
	});
}

inherits(ContextualMenuGeneric, ContextualMenu);
module.exports = ContextualMenuGeneric;


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

ContextualMenuGeneric.prototype._update = function (params) {
	var self = this;
	params = params || {};

	var actions = params.actions || [];

	// set tooltip title
	this.header.setText(params.title || '');
	this._displayHeader(!!params.title);

	this.buttonsContainer.clearContent();

	function buttonAction() {
		self.close();

		var action = this.action;
		if (action.cb) {
			action.cb();
		}

		var target = window[action.target];
		if (target && target[action.action]) {
			target[action.action].apply(target, action.params);
		}

		self.emit('action', action);
	}

	// add buttons
	for (var i = 0, len = actions.length; i < len; i++) {
		var action = actions[i];

		if (action.hidden) { continue; }

		var button = this.buttonsContainer.appendChild(
			new Button({ className: 'cmButton' }, buttonAction)
		);

		if (action.caption) {
			button.setText(action.caption);
		}

		if (action.wuiDomChild) {
			button.appendChild(action.wuiDomChild);
		}

		if (action.line) {
			button.addClassNames('line');
			continue;
		}

		var classNames = '';

		if (action.isTitle) {
			classNames = 'title';
		}

		if (action.disabled) {
			button.addClassNames(classNames, 'disabled');
			continue;
		}

		if (action.ticked) {
			button.addClassNames(classNames, 'ticked');
		}

		if (action.addClassNames) {
			button.addClassNames(action.addClassNames);
		}

		button.addClassNames(classNames);

		button.action = action;
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/contextualMenus/ContextualMenuGeneric/index.js
 ** module id = 304
 ** module chunks = 0
 **/