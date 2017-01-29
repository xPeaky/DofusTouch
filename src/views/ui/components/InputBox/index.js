require('./styles.less');
var inherits = require('util').inherits;
var WuiDom = require('wuidom');
var keyboard = require('keyboard');
var deviceInfo = require('deviceInfo');

/**
 * @param {Object} options
 * @constructor
 */
function InputBox(options, onEnter) {
	options = options || {};

	var attributes = {
		type: 'text',
		spellcheck: 'false',
		autocapitalize: 'off',
		autocorrect: 'off',
		autocomplete: 'off'
	};

	for (var attr in options.attr) {
		attributes[attr] = options.attr[attr];
	}

	options.attr = attributes;

	WuiDom.call(this, 'input', options);
	this.addClassNames('InputBox', attributes.type);

	this.allowDomEvents();

	this.on('dom.input', function () {
		this.emit('change', this.rootElement.value);
	});

	this.on('dom.touchend', function () {
		if (deviceInfo.isIOS) {
			if (document.activeElement !== this.rootElement) {
				this.focus();
			}
		} else {
			// FIX ME: this fixes DOT-1750 but creates DOT-1703
			this.focus();
		}
	});

	this.on('dom.keypress', function (e) {
		if (e.which === 13) {
			if (onEnter) {
				onEnter(this);
			}
			this.emit('validate');
		}
	});
}

inherits(InputBox, WuiDom);
module.exports = InputBox;


InputBox.prototype.setValue = function (value, shouldEmit) {
	this.rootElement.value = value;
	if (shouldEmit) { this.emit('change', value); }
};

InputBox.prototype.setPlaceholder = function (value) {
	this.rootElement.placeholder = value;
};

InputBox.prototype.getValue = function () {
	return this.rootElement.value;
};

InputBox.prototype.setReadonly = function (readonly) {
	if (readonly === false) {
		this.rootElement.removeAttribute('readonly');
	} else {
		this.rootElement.setAttribute('readonly', 'readonly');
	}
};

InputBox.prototype.blur = function () {
	this.rootElement.blur();
	keyboard.hide();
};

InputBox.prototype.focus = function () {
	this.rootElement.focus();
};

InputBox.prototype.disable = function () {
	this.rootElement.disabled = true;
};

InputBox.prototype.enable = function () {
	this.rootElement.disabled = false;
};

InputBox.prototype.setEnable = function (isEnabled) {
	this.rootElement.disabled = !isEnabled;
};

InputBox.prototype.setCaretPosition = function (index) {
	this.rootElement.setSelectionRange(index, index);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/InputBox/index.js
 ** module id = 390
 ** module chunks = 0
 **/