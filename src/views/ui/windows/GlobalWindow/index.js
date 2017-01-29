require('./styles.less');
var inherits = require('util').inherits;
var login = require('login');
var Window = require('Window');
var windowsManager = require('windowsManager');
var Button = require('Button').DofusButton;
var getText = require('getText').getText;
var Selector = require('Selector');
var characterSelection = require('characterSelection');

function GlobalWindow() {
	Window.call(this, {
		className: 'globalWindow',
		title: getText('ui.common.mainMenu'),
		positionInfo: { left: 'c', top: 'c', width: 300, height: 235 }
	});

	this.once('open', function () {
		this._createContent();
	});

	this.on('open', function () {
		this._buildVersion.setText(window.gui.getBuildVersion());
		this.buttonChangeCharacter.setEnable(!window.gui.playerData.isFighting);
		var charList = characterSelection.getCharacterList();
		this.setupSelectorOptions(charList);
		this.multiCharacterSelector.setEnable(!window.gui.playerData.isFighting && charList.length >= 2);
	});
}
inherits(GlobalWindow, Window);
module.exports = GlobalWindow;

GlobalWindow.prototype._createContent = function () {
	this.buttonOptions = this.windowBody.appendChild(new Button(getText('ui.common.options')));
	this.buttonOptions.on('tap', function () {
		windowsManager.close('global');
		windowsManager.open('options');
	});

	this.container = this.windowBody.createChild('div', { className: 'container' });
	var self = this;
	this.multiCharacterSelector = this.container.appendChild(new Selector({ className: 'multiCharacterSelector' }));
	this.multiCharacterSelector.on('change', function (value) {
		self._lastMultiCharacterSelection = value;
		login.reconnectByCharId(value);
		windowsManager.close('global');
	});

	this.buttonChangeCharacter = this.container.appendChild(
			new Button(getText('ui.common.changeCharacter'), { className: 'changeCharacterButton' }));

	this.buttonChangeCharacter.on('tap', function () {
		window.gui.openConfirmPopup({
			title: getText('ui.common.confirm'),
			message: getText('ui.common.confirmChangeCharacter'),
			cb: function (confirmed) {
				if (!confirmed) { return; }
				windowsManager.close('global');
				login.goBackToSelectionOf('character');
			}
		});
	});

	this.buttonDisconnect = this.windowBody.appendChild(new Button(getText('ui.common.disconnect')));
	this.buttonDisconnect.on('tap', function () {
		window.gui.openConfirmPopup({
			title: getText('ui.common.confirm'),
			message: getText('ui.common.confirmDisconnect'),
			cb: function (confirmed) {
				if (!confirmed) { return; }
				windowsManager.close('global');
				window.dofus.disconnect();
			}
		});
	});

	this.buttonReturnToGame = this.windowBody.appendChild(new Button(getText('ui.common.returnToGame')));
	this.buttonReturnToGame.on('tap', function () {
		windowsManager.close('global');
	});

	this._buildVersion = this.windowBody.createChild('div', { className: 'buildVersion' });
};

GlobalWindow.prototype.setupSelectorOptions = function (characters) {
	var breeds = window.gui.databases.Breeds;
	this.multiCharacterSelector.clearContent();
	for (var i = 0; i < characters.length; i++) {
		var character = characters[i];
		var name = character.name + ' (' + breeds[character.breed].shortNameId + ' ' + character.level + ')';
		this.multiCharacterSelector.addOption(name, character.id);
	}
	if (this._lastMultiCharacterSelection) {
		var dontEmitChangeEvent = true;
		this.multiCharacterSelector.select(this._lastMultiCharacterSelection, dontEmitChangeEvent);
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/GlobalWindow/index.js
 ** module id = 729
 ** module chunks = 0
 **/