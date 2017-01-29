require('./styles.less');
var autotest = require('autotest');
var inherits = require('util').inherits;
var Window = require('Window');
var Button = require('Button').DofusButton;
var InputBox = require('InputBox');
var PreloadCmd = require('AdminConsoleWindow/PreloadCmd');
var ProgressBar = require('ProgressBar');
var getText = require('getText').getText;
var keyboard = require('keyboard');
var beginnerAssistant = require('beginnerAssistant');

var LOG_TRIM_LIMIT = 400;

var preloadCmd = new PreloadCmd();

var ConsoleMsgLevels = [
	'Info',
	'Warn',
	'Error'
];

var DicMsgLevels = [
	'Debug',
	'Debug',
	'Info',
	'Warn',
	'Error',
	'Fatal'
];
var DicMsgWarningOrError = 3;


/** @class */
function AdminConsoleWindow() {
	Window.call(this, {
		className: 'adminConsoleWindow',
		title: 'Admin Console', // NB: flash game shows here the server name & ID, character name & ID
		positionInfo: { left: 'c', top: 'c', width: 800, height: 500 }
	});

	var self = this;


	var history = [];
	var historyPointer = 0;

	function addToHistory(cmd) {
		// if the last command is the same, not add to history and put the pointer on the last one
		if (history[history.length - 1] === cmd || !cmd) {
			historyPointer = history.length;
			return;
		}

		history.push(cmd);
		historyPointer = history.length;
	}

	function previousCmd() {
		if (historyPointer < 1) {
			return;
		}
		historyPointer -= 1;
		var lastCmd = history[historyPointer];
		self.cmdInput.setValue(lastCmd);
	}

	function nextCmd() {
		if (historyPointer > history.length - 1) {
			return;
		}
		historyPointer += 1;
		var cmd = history[historyPointer] || '';
		self.cmdInput.setValue(cmd);
	}


	this.once('open', function () {
		var windowBody = self.windowBody;

		var upDownContainer = windowBody.createChild('div', { className: 'upDownContainer' });

		var nextCmdBtn = upDownContainer.appendChild(new Button('Next cmd', { className: 'upAndDown' }));
		nextCmdBtn.on('tap', nextCmd);

		var previousCmdBtn = upDownContainer.appendChild(new Button('Previous cmd', { className: 'upAndDown' }));
		previousCmdBtn.on('tap', previousCmd);

		//command bar has the input field and the send button
		var form = windowBody.createChild('form', { attr: { action: '#_', method: 'post' } });
		var cmdBar = form.createChild('table', { className: 'cmdInputBar' });
		var td = cmdBar.createChild('td');
		var cmdInput = this.cmdInput = new InputBox({ className: 'cmdInput', attr: { id: 'cmdInput' } });
		td.appendChild(cmdInput);
		td = cmdBar.createChild('td', { className: 'buttonSend' });
		var buttonSend = this._buttonSend = td.appendChild(new Button(getText('ui.social.reportSend')));

		//progressBar is below
		var preloadBox = this._preloadBox = windowBody.createChild('div', { className: 'preloadBox', hidden: true });
		this._preloadPB = preloadBox.appendChild(new ProgressBar({ className: ['preloadPB', 'green'] }));
		this._preloadCount = preloadBox.createChild('div', { className: 'preloadCount' });
		this._preloadPercent = preloadBox.createChild('div', { className: 'preloadPercent' });
		this._preloadEstimate = preloadBox.createChild('div', { className: 'preloadEstimate' });

		//logBox is below
		this.log = windowBody.createChild('div', { className: 'logBox' });

		buttonSend.on('tap', function () {
			var cmd = cmdInput.getValue();
			cmdInput.setValue('');
			self._runCommand(cmd);
			addToHistory(cmd);
		});

		cmdInput.rootElement.addEventListener('keydown', function (event) {
			//38 arrow up
			//40 arrow down
			if (!event) {
				return;
			}
			var code = event.keyCode;
			if (code === 40) {
				event.preventDefault();
				nextCmd();
			} else if (code === 38) {
				event.preventDefault();
				previousCmd();
			}
		});

		//"ENTER" key sends the command too
		form.rootElement.addEventListener('submit', function (event) {
			event.preventDefault();
			buttonSend.emit('tap');
		});
	});

	this.on('focus', function () {
		window.setTimeout(function () {
			self.cmdInput.focus();
		}, 100);
	});

	this.on('close', function () {
		keyboard.hide();
	});

	this.on('opened', function () {
		self.cmdInput.focus();
	});

	/**
	 * @event module:protocol/authorized.client_ConsoleCommandsListMessage
	 */
	window.gui.on('ConsoleCommandsListMessage', function (msg) {
		//NB:
		//- it uses some memory on the client 'just in case' help is requested
		//- not used now: helpInfo.aliases, givelevel, and args
		self.helpInfo = msg;
	});

	/**
	 * @event module:protocol/authorized.client_ConsoleMessage
	 */
	window.gui.on('ConsoleMessage', function (msg) {
		if (!self.log) {
			return console.warn(msg.content);
		}
		self.logMessage(msg.content, ConsoleMsgLevels[msg.type]);
	});

	/**
	 * @event module:protocol/debug.client_DebugInClientMessage
	 * @desc Logs a debug message from game server.
	 * If admin console window has not been opened yet then only the regular JS console will show the message
	 */
	window.gui.on('DebugInClientMessage', function (msg) {
		if (self.log) {
			self.logMessage(msg.message, DicMsgLevels[msg.level]);
		}

		if (msg.level >= DicMsgWarningOrError) {
			console.warn(msg.message);
		} else {
			console.log(msg.message);
		}
	});

	// event from the area preloader
	// one map preloaded
	preloadCmd.on('step', function (params) {
		params = params || {};
		var percent = params.percent;

		// update all the UI (progressBar, count, percent and estimated remaining time)
		self._preloadPB.setValue(percent);
		self._preloadCount.setText(params.count  + '/' + params.nbTotalMaps);
		self._preloadPercent.setText(~~(percent * 100) + '%');
		self._preloadEstimate.setText((params.secondLeft < 0) ? 0 : params.secondLeft + 's');
	});

	preloadCmd.on('error', function (err) {
		self.cmdInput.enable();
		self._buttonSend.enable();
		self._preloadBox.hide();
		console.error(err);
	});

	preloadCmd.on('end', function (params) {
		self.cmdInput.enable();
		self._buttonSend.enable();
		self._preloadBox.hide();
		self.logMessage('Finished preloading of ' + params.area + ' in ' + params.elapsedSecond + 's');
	});
}
inherits(AdminConsoleWindow, Window);
module.exports = AdminConsoleWindow;


/** Adds a message to console log.
* @param {string} txt - the message
* @param {string} level - message level (e.g. 'Info', 'Warn, 'Error') **/
AdminConsoleWindow.prototype.logMessage = function (txt, level) {
	if (this.log.getChildCount() > LOG_TRIM_LIMIT) {
		this.log.clearContent();
	}

	var classNames = 'message' + (level || 'Info');

	var message = this.log.createChild('div', { className: classNames });

	txt = txt.replace(/\n/g, '<br>');
	message.setHtml(txt);
};

/** Runs an admin command.
 * @param {string} cmd - the command. E.g. "monsterlist" or "dropitem 973 9 1" */
AdminConsoleWindow.prototype._runCommand = function (cmd) {
	cmd = cmd.trim();

	this.log.clearContent(); //TODO scroll up instead? (but set a maximum)
	this.logMessage(cmd, 'Command');

	//for the "help" command we do not need to ask the server
	if (cmd === 'help' || cmd === '') {
		return this.logMessage('\n' + this.helpInfo.descriptions.join(''), 'Debug');
	}

	var args = cmd.split(' ');

	// if user is admin
	if (window.gui.playerData.isAdmin()) {
		var message;
		if (args[0] === 'preload') {
			args.shift(); // remove the first arguments
			this.cmdInput.disable();
			this._buttonSend.disable();
			this._preloadBox.show();
			this._preloadPB.setValue(0);

			return preloadCmd.preloadArea(args[0]);
		} else if (args[0] === 'joris') {
			args.shift(); // remove the the first argument
			message = beginnerAssistant.adminCommand(args);
			return this.logMessage(message, 'Debug');
		} else if (args[0] === 'tutorial') {
			args.shift(); // remove the the first argument
			message = window.gui.tutorialManager.adminCommand(args);
			return this.logMessage(message, 'Debug');
		} else if (args[0] === 'autotest' && autotest.run) {
			args.shift();
			return autotest.run(args.join(' '));
		} else if (args[0] === 'gridcolor') {
			args.shift();
			if (args.length !== 4) {
				return this.logMessage('4 arguments required: gridcolor [red] [green] [blue] [alpha]', 'Debug');
			}
			if (args[0] > 1) { return this.logMessage('Red   component has to be in range [0, 1]', 'Debug'); }
			if (args[1] > 1) { return this.logMessage('Green component has to be in range [0, 1]', 'Debug'); }
			if (args[2] > 1) { return this.logMessage('Blue  component has to be in range [0, 1]', 'Debug'); }
			if (args[3] > 1) { return this.logMessage('Alpha has to be in range [0, 1]', 'Debug'); }
			window.isoEngine.background.setGridColor(args);
			return this.logMessage('Grid color changed!', 'Debug');
		}
	}

	window.dofus.sendMessage('AdminCommandMessage', { content: cmd });
};

/** Runs an admin command "quietly". Can be called from outside the window.
 *  Same as _runCommand but no output goes to the console - we won't get a "ConsoleMessage" from server. */
AdminConsoleWindow.prototype.runCommand = function (cmd) {
	window.dofus.sendMessage('AdminQuietCommandMessage', { content: cmd });
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/AdminConsoleWindow/index.js
 ** module id = 643
 ** module chunks = 0
 **/