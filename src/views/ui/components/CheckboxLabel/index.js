require('./styles.less');
var inherits = require('util').inherits;
var WuiDom = require('wuidom');
var tapBehavior = require('tapBehavior');
var playUiSound = require('audioManager').playUiSound;

function CheckboxLabel(label, defaultValue) {
	var self = this;
	WuiDom.call(this, 'div', { className: 'CheckboxLabel', text: label });

	if (defaultValue) {
		this._active = true;
		this.addClassNames('on');
	} else {
		this._active = false;
	}

	tapBehavior(this);
	this.on('tap', function () {
		if (this._active) {
			this.deactivate();
			playUiSound('CHECKBOX_UNCHECKED');
		} else {
			this.activate();
			playUiSound('CHECKBOX_CHECKED');
		}
	});

	this.on('enable', function (enable) {
		self.toggleClassName('disabled', !enable);
	});
}

inherits(CheckboxLabel, WuiDom);
module.exports = CheckboxLabel;


CheckboxLabel.prototype.activate = function (isSilent) {
	this._active = true;
	this.addClassNames('on');

	// do not emit events if isSilent is true
	if (isSilent) {
		return;
	}

	this.emit('activate');
	this.emit('change', true);
};


CheckboxLabel.prototype.deactivate = function (isSilent) {
	this._active = false;
	this.delClassNames('on');

	// do not emit events if isSilent is true
	if (isSilent) {
		return;
	}

	this.emit('deactivate');
	this.emit('change', false);
};


CheckboxLabel.prototype.toggleActivation = function (shouldActivate, isSilent) {
	if (shouldActivate === undefined) {
		shouldActivate = !this._active;
	}

	if (shouldActivate) {
		this.activate(isSilent);
	} else {
		this.deactivate(isSilent);
	}
};


CheckboxLabel.prototype.isActivate = function () {
	return this._active;
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/CheckboxLabel/index.js
 ** module id = 446
 ** module chunks = 0
 **/