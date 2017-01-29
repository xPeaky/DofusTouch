require('./styles.less');
var inherits = require('util').inherits;
var Window = require('Window');
var tapBehavior = require('tapBehavior');
var Button = require('Button').DofusButton;
var getText = require('getText').getText;
var windowsManager = require('windowsManager');


function PadLockWindow() {
	Window.call(this, {
		className: 'padLockWindow',
		title: getText('ui.common.typeCode'),
		positionInfo: { left: 'c', top: 'c', width: 400, height: 360 }
	});

	var self = this;
	this.padlockInfo = {
		codeSize: 8
	};

	this.once('open', function () {
		var keypadKeyCount = 9;
		var i;
		var keypads = {};

		self.currentCodeDigit = 0;

		self.codeDigitContainer = [];
		self.codeDigit = [];

		var codeContainer = self.windowBody.createChild('div', { className: 'codeContainer' });

		for (i = 0; i < self.padlockInfo.codeSize; i++) {
			self.codeDigitContainer.push(codeContainer.createChild('div', { className: 'codeDigitContainer' }));
			self.codeDigit.push(self.codeDigitContainer[i].createChild('div', { className: 'codeDigit' }));
		}

		var container = self.windowBody.createChild('div', { className: 'container' });

		var leftPanel = container.createChild('div', { className: 'leftPanel' });
		var messageText = getText('ui.common.unlockInfos');
		leftPanel.createChild('div', { className: 'text', text: messageText });

		self.resetButton = leftPanel.createChild('div', { className: 'resetButton' });
		self.resetButton.createChild('div', { className: 'resetButtonIcon' });
		self.resetButton.createChild('div', { className: 'resetButtonText', text: getText('ui.common.resetCode') });

		tapBehavior(self.resetButton);

		var keypadContainer = container.createChild('div', { className: 'keypadContainer' });

		function enterCode() {
			self.enterCode(this.id);
		}

		for (i = keypadKeyCount; i >= 0; i--) {
			keypads[i] = keypadContainer.appendChild(new Button(i, { className: ['keypad', 'num' + i] }));

			keypads[i].id = i;
			keypads[i].on('tap', enterCode);
		}

		var confirmPanel = this.windowBody.createChild('div', { className: 'confirmPanel' });
		self.confirmButton = confirmPanel.appendChild(
			new Button(getText('ui.common.validation'), { className: 'confirmButton' }));

		self.setupButtonEvents();
	});

	this.on('open', function (params) {
		params = params || {};
		self.fromInside = params.fromInside;
		self.resetCode();
	});

	self.setupListeners();
}

inherits(PadLockWindow, Window);
module.exports = PadLockWindow;

PadLockWindow.prototype.setupButtonEvents = function () {
	var self = this;

	this.confirmButton.on('tap', function () {
		var enteredCode = '';

		for (var i = 0; i < self.padlockInfo.codeSize; i++) {
			enteredCode += isNaN(parseInt(self.codeDigit[i].getText(), 10)) ? '_' : self.codeDigit[i].getText();
		}

		var code = { code: enteredCode };

		if (self.fromInside) {
			window.dofus.sendMessage('HouseLockFromInsideRequestMessage', code);
			windowsManager.close(self.id);
			return;
		}

		if (self.padlockInfo.changeOrUse) {
			window.dofus.sendMessage('LockableChangeCodeMessage', code);
			return;
		}

		window.dofus.sendMessage('LockableUseCodeMessage', code);
	});

	this.resetButton.on('tap', function () {
		self.resetCode();
	});

	this.resetButton.on('tapstart', function () {
		this.addClassNames('pressed');
	});

	this.resetButton.on('tapend', function () {
		this.delClassNames('pressed');
	});
};


PadLockWindow.prototype.setupListeners = function () {
	var self = this;
	var resultText = {
		0: getText('ui.house.codeChanged'),
		1: getText('ui.error.badCode')
	};

	window.gui.on('LockableShowCodeDialogMessage', function (msg) {
		self.padlockInfo = msg;
		windowsManager.openDialog(self.id, { fromInside: false });
	});

	window.gui.on('LockableCodeResultMessage', function (msg) {
		window.gui.openPopup({
			title: getText('ui.common.code'),
			message: resultText[msg.result]
		});
	});
};

PadLockWindow.prototype.enterCode = function (id) {
	var currentCodeDigit = this.currentCodeDigit % this.padlockInfo.codeSize;

	this.codeDigit[currentCodeDigit].setText(id);
	this.codeDigit[currentCodeDigit].show();

	this.currentCodeDigit++;

	this.highlightDigit();
};

PadLockWindow.prototype.resetCode = function () {
	for (var i = 0; i < this.codeDigit.length; i++) {
		this.codeDigit[i].setText('');
		this.codeDigit[i].hide();
	}

	this.currentCodeDigit = 0;
	this.highlightDigit();
};

PadLockWindow.prototype.highlightDigit = function () {
	var currentDigit = this.currentCodeDigit % this.padlockInfo.codeSize;

	for (var i = 0; i < this.codeDigitContainer.length; i++) {
		if (i === currentDigit) {
			this.codeDigitContainer[i].addClassNames('highlight');
		} else {
			this.codeDigitContainer[i].delClassNames('highlight');
		}
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/PadlockWindow/index.js
 ** module id = 788
 ** module chunks = 0
 **/