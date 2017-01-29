require('./styles.less');
var addTooltip = require('TooltipBox').addTooltip;
var Button = require('Button');
var dimensions = require('dimensionsHelper').dimensions;
var getText = require('getText').getText;
var findText = require('getText').findText;
var inherits = require('util').inherits;
var MenuDrawer = require('MenuDrawer');
var PlayerPoints = require('MainControls/PlayerPoints');
var userPref = require('UserPreferences');
var windowsManager = require('windowsManager');
var FightTypeEnum = require('FightTypeEnum');
var FightOptionsEnum = require('FightOptionsEnum');

function MainControls() {
	MenuDrawer.call(this, { autoClose: true });
	this.addClassNames('MainControls');

	this._createDom();

	var self = this;

	this._fightCount = 0;
	this.fightLocked = false;
	this.fightHelpOn = false;

	var gui = window.gui;
	gui.on('connected', function () {
		self._setPreferences();
		self._setLayout('roleplay', true);

		self._creatureModeButton.delClassNames('on');
	});

	gui.on('disconnect', function () {
		self._fightCount = 0;
		self.fightLocked = false;
	});

	var fightManager = gui.fightManager;
	fightManager.on('fightEnterPreparation', function () {
		self._setLayout('battlePreparation');
	});

	fightManager.on('fightEnterBattle', function () {
		self._setLayout('battle');
	});

	fightManager.on('fightEnd', function () {
		self._setLayout('roleplay');

		self._creatureModeButton.delClassNames('on');
	});
}
inherits(MainControls, MenuDrawer);
module.exports = MainControls;

MainControls.prototype._resize = function () {
	var direction;
	if (window.gui.ipadRatio) {
		this.setStyles({
			bottom: 0,
			top: '',
			right: '',
			left: dimensions.posMainControlBar + 'px',
			width: dimensions.mainControlBarSize + 'px',
			height: dimensions.bottomBarHeight + 'px'
		});
		direction = 'top';
	} else {
		this.setStyles({
			bottom: '',
			top: dimensions.posMainControlBar + 'px',
			right: 0,
			left: '',
			width: dimensions.sideBarWidth + 'px',
			height: dimensions.mainControlBarSize + 'px'
		});
		direction = 'left';
	}
	this.setOpeningSide(direction);
};

MainControls.prototype._createDom = function () {
	var self = this;
	var buttonBox = this.buttonBox = this.content.createChild('div', { className: 'buttonBox' });

	/**
	 * @param {object}  [opts] - (optional)
	 * @param {array}  [opts.className] - (optional) add className
	 * @param {boolean} [opts.disable] - (optional) disable the button at the creation
	 * @param {string|WuiDom|function=} opts.tooltip - Add tooltip by default
	 *
	 * @param {function} action - function executed on tap
	 * @return {WuiDom}
	 */
	function addButtonIntoButtonBox(opts, action) {
		if (typeof opts === 'function') {
			action = opts;
		}
		opts = opts || {};

		var classNames = opts.className || [];
		classNames.push('controlsButton');

		return buttonBox.appendChild(new Button({
			disable: !!opts.disable,
			tooltip: opts.tooltip,
			className: classNames,
			scaleOnPress: true
		}, action));
	}

	this.playerPoints = buttonBox.appendChild(new PlayerPoints());

	// fightListBtn should show just in roleplay (add className 'roleplayButton')
	this._fightListBtn = addButtonIntoButtonBox({
		className: ['showFightsButton', 'roleplayButton'],
		disable: true
	}, function () {
		windowsManager.open('fightList');
	});

	addTooltip(this._fightListBtn, function () {
		return getText('ui.fightsOnMap', self._fightCount);
	});

	window.gui.playerData.position.on('mapChanged', function (msg) {
		var fights = msg.fights || [];
		self._fightCount = fights.length;
		self._updateFightListButton();
	});

	window.gui.on('MapFightCountMessage', function (msg) {
		self._fightCount = msg.fightCount || 0;
		self._updateFightListButton();
	});

	// tacticalModeBtn should show in the battle prepa and battle (add 'battleButton' and 'battlePreparationButton')
	this._tacticalModeBtn = addButtonIntoButtonBox({
		className: ['tacticalModeButton', 'battleButton', 'battlePreparationButton'],
		tooltip: getText('ui.fight.option.tacticMod')
	}, function () {
		var tacticModeEngaged = window.foreground.toggleTacticMode();
		self._tacticalModeBtn.toggleClassName('on', tacticModeEngaged);
		userPref.setValue('tacticModeEngaged', tacticModeEngaged);
	});

	// consoleButton should always show no classNames needed
	this._consoleButton = addButtonIntoButtonBox({
		className: ['consoleButton', 'alwaysShowButton']
	}, function () {
		windowsManager.switch('adminConsole');
	});

	// mapInfoButton should show just in roleplay (add className 'roleplayButton')
	this._mapInfoButton = addButtonIntoButtonBox({
		className: ['mapInfoButton', 'roleplayButton'],
		tooltip: getText('ui.option.mapInfo')
	}, function () {
		var showMapCoordinates = window.gui.mapCoordinates.toggleDisplay();
		self._mapInfoButton.toggleClassName('on', showMapCoordinates);
		userPref.setValue('showMapCoordinates', showMapCoordinates);
	});

	// fightLockButton should show just in the battle preparation (add className 'battlePreparationButton')
	this._fightLockButton = addButtonIntoButtonBox({
		className: ['fightLockButton', 'battlePreparationButton'],
		tooltip: getText('ui.fight.option.blockJoiner')
	}, function () {
		self.fightLocked = !self.fightLocked;
		self._fightLockButton.toggleClassName('on', self.fightLocked);
		window.dofus.sendMessage('GameFightOptionToggleMessage', {
			option: FightOptionsEnum.FIGHT_OPTION_SET_CLOSED
		});
	});

	// helpButton should show just in the battle preparation (add className 'battlePreparationButton')
	this._helpButton = addButtonIntoButtonBox({
		className: ['helpButton', 'battlePreparationButton'],
		tooltip: getText('ui.fight.option.help')
	}, function () {
		self.fightHelpOn = !self.fightHelpOn;
		self._helpButton.toggleClassName('on', self.fightHelpOn);
		window.dofus.sendMessage('GameFightOptionToggleMessage', {
			option: FightOptionsEnum.FIGHT_OPTION_ASK_FOR_HELP
		});
	});

	/* To implement
	addButtonIntoButtonBox({
		className: ['playerNameButton', 'roleplayButton'],
		disable: true,
		tooltip: getText('ui.shortcuts.displayNames')
	}, function () {
		//TODO: to implement
	});

	addButtonIntoButtonBox({
		className: ['monsterInfoButton', 'roleplayButton'],
		disable: true
		//TODO: need tooltips
	}, function () {
		//TODO: to implement
	});
	*/

	// leaveButton should show in the battle prepa and battle (add className 'battleButton' and 'battlePreparationButton')
	this._leaveButton = addButtonIntoButtonBox({
		className: ['leaveButton', 'battleButton', 'battlePreparationButton'],
		tooltip: getText('ui.common.quit')
	}, function () {
		var gui = window.gui;
		var connectionManager = window.dofus.connectionManager;
		if (gui.playerData.isSpectator) {
			return connectionManager.sendMessage('GameContextQuitMessage');
		}

		var giveUpText;
		var isHeroicServer = gui.serversData.settings.serverGameType === 1;
		if (isHeroicServer && gui.fightManager.fightType !== FightTypeEnum.FIGHT_TYPE_CHALLENGE) {
			giveUpText = getText('ui.popup.hardcoreGiveup');
		} else {
			giveUpText = getText('ui.popup.giveup');
		}
		if (gui.fightManager.fightType === FightTypeEnum.FIGHT_TYPE_PVP_ARENA) {
			giveUpText += '\n' + getText('ui.party.arenaLeaveWarning');
		}

		gui.openConfirmPopup({
			title: getText('ui.popup.warning'),
			message: giveUpText,
			cb: function (result) {
				if (result) {
					connectionManager.sendMessage('GameContextQuitMessage');
				}
			}
		});
	});

	/* To implement
	addButtonIntoButtonBox({
		className: ['pointCellButton', 'battleButton', 'battlePreparationButton'],
		disable: true,
		tooltip: getText('ui.fight.option.flagHelp')
	}, function () {
		//TODO: to implement
	});
	*/

	// creatureModeButton should show in the battle prepa and battle (add 'battleButton' and 'battlePreparationButton')
	this._creatureModeButton = addButtonIntoButtonBox({
		className: ['creatureModeButton', 'battleButton', 'battlePreparationButton'],
		tooltip: getText('ui.fight.option.invisible')
	}, function () {
		var actorManager = window.isoEngine.actorManager;
		var shouldActivate = !actorManager.isCreatureModeOn;
		self._creatureModeButton.toggleClassName('on', shouldActivate);

		actorManager.setCreatureMode(shouldActivate);
	});

	// transparentModeButton should always show no classNames needed
	this._transparentModeButton = addButtonIntoButtonBox({
		className: ['transparentModeButton', 'alwaysShowButton'],
		tooltip: getText('ui.option.transparentOverlayMode')
	}, function () {
		var actorManager = window.isoEngine.actorManager;
		var shouldActivate = !actorManager.isTransparentModeOn;
		self._transparentModeButton.toggleClassName('on', shouldActivate);
		userPref.setValue('transparentMode', shouldActivate);

		actorManager.setTransparentMode(shouldActivate);
	});

	/* To implement
	addButtonIntoButtonBox({
		className: ['blockPlayersButton', 'battleButton', 'battlePreparationButton'],
		disable: true,
		tooltip: getText('ui.fight.option.blockJoiner')
	}, function () {
		//TODO: to implement
	});
	*/

	// interactiveBlink should show just in roleplay (add className 'roleplayButton')
	this._interactiveBlink = addButtonIntoButtonBox({
		className: ['interactiveBlinkBtn', 'roleplayButton'],
		tooltip: findText('Toggle interactive halo')
	}, function () {
		var blink = !window.isoEngine.interactiveBlink;
		window.isoEngine.setInteractiveBlink(blink);
		if (blink) {
			window.isoEngine.highlightInteractivesWithDifferentType();
		}
		self._interactiveBlink.toggleClassName('on', blink);
		userPref.setValue('interactiveBlink', blink);
	});

	addButtonIntoButtonBox({
		className: ['globalMenu', 'alwaysShowButton'],
		tooltip: getText('ui.common.mainMenu')
	}, function () {
		windowsManager.switch('global');
	});
};

// Cycle is: Roleplay -> Preparation -> Battle -> Roleplay
// ...except for reconnection in fight: Roleplay -> Battle(preparation skipped)
MainControls.prototype._setLayout = function (layoutName, noRefresh) {
	switch (layoutName) {
	case 'roleplay':
		this.replaceClassNames(['battlePreparation', 'battle'], ['roleplay']);
		this.playerPoints.actionAndMovement.hide();
		break;
	case 'battlePreparation':
		this.replaceClassNames(['roleplay', 'battle'], ['battlePreparation']);
		this.fightHelpOn = false;
		this._helpButton.delClassNames('on');
		// buttons positions:
		// 0: heart
		// 1: showFightButton (display: none)
		// 2: leaveButton
		// 3: tacticalButton
		// 4: adminConsoleButton
		if (this.buttonBox.getChildren()[2] !== this._leaveButton) {
			this._leaveButton.insertBefore(this._tacticalModeBtn);
		}
		break;
	case 'battle':
		// buttons positions:
		// 0: heart
		// 1: showFightButton (display: none)
		// 2: tacticalButton
		// 3: leaveButton
		// 4: adminConsoleButton
		this.replaceClassNames(['roleplay', 'battlePreparation'], ['battle']);
		if (this.buttonBox.getChildren()[3] !== this._leaveButton) {
			this._leaveButton.insertBefore(this._consoleButton);
		}
		if (!window.gui.playerData.isSpectator) {
			this.playerPoints.actionAndMovement.show();
		}
	}
	this._consoleButton.toggleDisplay(window.gui.playerData.isModeratorOrMore());

	if (!noRefresh) {
		this._resize();
		this.refresh();
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Retrieve user preferences and update UI accordingly */
MainControls.prototype._setPreferences = function () {
	var showMapCoordinates = userPref.getValue('showMapCoordinates', false);
	this._mapInfoButton.toggleClassName('on', showMapCoordinates);
	window.gui.mapCoordinates.toggleDisplay(showMapCoordinates);

	var tacticModeEngaged = userPref.getValue('tacticModeEngaged', false);
	this._tacticalModeBtn.toggleClassName('on', tacticModeEngaged);
	window.foreground.isTacticMode = tacticModeEngaged;

	var interactiveBlink = userPref.getValue('interactiveBlink', true);
	this._interactiveBlink.toggleClassName('on', interactiveBlink);
	window.isoEngine.setInteractiveBlink(interactiveBlink);

	var transparentMode = userPref.getValue('transparentMode', false);
	this._transparentModeButton.toggleClassName('on', transparentMode);
	window.isoEngine.actorManager.setTransparentMode(transparentMode);
};

MainControls.prototype._updateFightListButton = function () {
	var hasFight = this._fightCount > 0;
	this._fightListBtn.setEnable(hasFight);
	this._fightListBtn.toggleClassName('on', hasFight);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/mainUi/MainControls/index.js
 ** module id = 494
 ** module chunks = 0
 **/