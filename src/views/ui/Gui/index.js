require('./styles.less');
var async = require('async');
var inherits = require('util').inherits;
var EventEmitter = require('events.js').EventEmitter;
var WuiDom = require('wuidom');

var GameContextEnum = require('GameContextEnum');

var hoverBehavior = require('hoverBehavior');
var tapBehavior = require('tapBehavior');
var timeManager = require('timeManager');
var contextualMenus = require('contextualMenus');

//COMPONENTS
var autotest = require('autotest');
var deviceInfo = require('deviceInfo');
var dimensionsHelper = require('dimensionsHelper');
var allianceManager = require('allianceManager');
var BoxArranger = require('BoxArranger');
var ChallengeIndicator = require('ChallengeIndicator');
var characterSelection = require('characterSelection');
var Chat = require('Chat');
var ChatButton = require('ChatButton');
var craftingManager = require('CraftingManager');
var TextNotification = require('TextNotification');
var databaseLoader = require('databaseLoader');
var dragManager = require('dragManager');
var FightManager = require('fightManager');
var ShopFloatingToolbar = require('ShopFloatingToolbar');
var socialEntityManager = require('socialEntityManager');
var gameOptions = require('gameOptions');
var gt = require('getText');
var getText = gt.getText;
var GPS = require('GPS');
var guildManager = require('guildManager');
var helper = require('helper');
var HouseMenuButton = require('HouseMenuButton');
var itemManager = require('itemManager');
var inactivityMonitor = require('inactivityMonitor');
var spellFactory = require('SpellFactory');
var KohBox = require('KohBox');
var login = require('login');
var MapCoordinateDisplay = require('MapCoordinateDisplay');
var MenuBar = require('MenuBar');
var MainControls = require('MainControls');
var NotificationBar = require('NotificationBar');
var NpcDialogHandler = require('NpcDialogHandler');
var NpcDialogUi = require('NpcDialogUi');
var NumberInputPad = require('NumberInputPad');
var Party = require('Party');
var picker = require('ColorPicker');
var PlayerData = require('PlayerData');
var moneyConverter = require('moneyConverter');
var ProgressGauge = require('ProgressGauge');
var RewardsIndicator = require('RewardsIndicator');
var PingEmoteSystem = require('PingEmoteSystem');
var Gifts = require('Gifts');
var ServersData = require('ServersData');
var ShortcutBar = require('ShortcutBar');
var SpeechBubble = require('SpeechBubble');
var Timeline = require('Timeline');
var DropDown = require('DropDown');
var Compass = require('Compass');
var HintArrow = require('HintArrow');
var TooltipBox = require('TooltipBox');
var userPref = require('UserPreferences');
var TutorialManager = require('tutorialManager');
var tutorialTipsManager = require('tutorialTipsManager');
var RoleplayBuffs = require('RoleplayBuffs');
var windowsManager = require('windowsManager');
var keyboard = require('keyboard');
var beginnerAssistant = require('beginnerAssistant');
var textInfoMsgHandler = require('textInfoMsgHandler');
var UiLocker = require('UiLocker');
var shopHelper = require('shopHelper');

var attachWindows = require('./attachWindows.js');

//SCREENS
var ConnectionSplashScreen = require('ConnectionSplashScreen');
var LoginScreen = require('LoginScreen');
var SplashScreen = require('SplashScreen');
var NicknameWindow = require('NicknameWindow');
var RegisterWindow = require('RegisterWindow');

//WINDOWS that are directly used in this file (otherwise see file attachWindows.js)
var ConnectionQueueWindow = require('ConnectionQueueWindow');
var PopupWindow = require('PopupWindow');
var ConfirmWindow = require('ConfirmWindow');

var body = new WuiDom(document.getElementById('dofusBody'));
tapBehavior.initialize(body);

if (deviceInfo.isIOS && !deviceInfo.isPhoneGap) {
	// Remove the bouncing effect on Mobile Safari
	require('./noBounce.js');
}

//██████████████████████
//██▀▄▄▄░███████████▄███
//█░██████▄░██▄░██▄▄░███
//█░███▄░▄█░███░████░███
//██▄▀▀▀▄██▄▀▀▄░▀█▀▀░▀▀█
//██████████████████████

/** @class */
function Gui() {
	EventEmitter.call(this);
	this.windowsContainer = null;
	this.gameContext = GameContextEnum.ROLE_PLAY;
	this.playerData = new PlayerData();
	this.serversData = new ServersData();
	this.boxArranger = new BoxArranger();
	this.isConnected = false;

	this.wBody = body;
	body.allowDomEvents();
	var self = this;

	this.on('CharacterSelectedSuccessMessage', this.onConnect);
	this.on('IdentificationSuccessMessage', this.onIdentificationSuccess);
	this.on('IdentificationSuccessWithLoginTokenMessage', this.onIdentificationSuccess);
	this.on('ServersListMessage', this.onServerListReceived);
	this.on('CurrentMapMessage', this.onCurrentMapMessage);
	this.on('GameContextCreateMessage', this.gameContextCreate);

	inactivityMonitor.initialize(this);

	if (deviceInfo.isIOSApp) {
		document.addEventListener('pause', function () {
			self.emit('appOnBackground');
		}, false);

		document.addEventListener('resume', function () {
			window.setTimeout(function () {
				self.emit('appBackFromBackground');
			}, 1000);
		}, false);
	} else {
		// visibilitychange event is not working on iOS
		document.addEventListener('visibilitychange', function (event) {
			if (event.target.hidden) {
				self.emit('appOnBackground');
			} else {
				window.setTimeout(function () {
					self.emit('appBackFromBackground');
				}, 1000);
			}
		}, false);
	}
}

inherits(Gui, EventEmitter);
module.exports = Gui;


/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @method transmitMessage
 * @desc   Transmit a message emitted by websocket on Gui object
 *         Generic way to pass a message from protocol.
 *         To handle the message, define a window.gui.on('XxxMessage', function (msg) {...})
 *
 * @param  {Object} msg - message to transmit
 */
Gui.prototype.transmitMessage = function (msg) {
	this.emit(msg._messageType, msg);
};

Gui.prototype.transmitFightSequenceMessage = function (msg) {
	this.fightManager.processFightSequenceMessage(msg);
};


//█████████████████████████████████████████████████████████████████████████████████████████████████
//███▄█████████████▄████▀███████▄████████████▄░█████▄███████████████████▀███████▄██████████████████
//█▄▄░███▄░▀▄▄▀██▄▄░███▄░▄▄▄██▄▄░███▀▄▄▄▄▀████░███▄▄░███▀▄▄▄▄░█▀▄▄▄▄▀██▄░▄▄▄██▄▄░███▀▄▄▄▄▀█▄░▀▄▄▀██
//███░████░███░████░████░███████░███▀▄▄▄▄░████░█████░████▄▄▄▄▀█▀▄▄▄▄░███░███████░███░████░██░███░██
//█▀▀░▀▀█▀░▀█▀░▀█▀▀░▀▀██▄▀▀▀▄█▀▀░▀▀█▄▀▀▀▄░▀█▀▀░▀▀█▀▀░▀▀█░▀▀▀▀▄█▄▀▀▀▄░▀██▄▀▀▀▄█▀▀░▀▀█▄▀▀▀▀▄█▀░▀█▀░▀█
//█████████████████████████████████████████████████████████████████████████████████████████████████

/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @method initialize
 * @desc   Initializes UI dependencies, for example the getText component,
 *         then calls initUserInterface() to initialize the UI.
 *
 * @param  {Object} config - config received from server
 */
Gui.prototype.initialize = function (config) {
	if (!this.loginScreen) {
		this._createUiForLogin();
	}

	if (!config) {
		return;
	}

	console.debug('Gui.initialize:', config);

	//
};

/** Init done when login is successful */
Gui.prototype.initializeAfterLogin = function (cb) {
	if (this.initialized) {
		return cb();
	}

	// Everything below is done ONLY FOR FIRST LOGIN

	this.fightManager = new FightManager();
	this.tutorialManager = new TutorialManager();
	this.playerData.initialize(this);
	this.serversData.initialize(this);
	this.fightManager.initialize(this);
	this.tutorialManager.initialize(this);
	this.boxArranger.initialize();
	this.GPS = new GPS();
	this.pingSystem = new PingEmoteSystem();
	this.gifts = new Gifts();
	this.npcDialogHandler = new NpcDialogHandler();
	this.uiLocker = new UiLocker();

	guildManager.initialize(this);
	allianceManager.initialize(this);
	timeManager.initialize(this);
	socialEntityManager.initialize(this);
	tutorialTipsManager.initialize(this);
	hoverBehavior.initialize(body);
	craftingManager.initialize(this);
	characterSelection.initialize(this);
	beginnerAssistant.initialize();
	moneyConverter.initialize();
	textInfoMsgHandler.initialize();
	shopHelper.initialize(this);

	var self = this;
	async.series([
		databaseLoader.load,
		spellFactory.initialize,
		itemManager.initialize
	], function andThen(err) {
		if (err) { return cb(err); }
		self._initUserInterface();
		self._initAutoResize();
		self.initialized = true;
		self.emit('initialized');
		cb();
	});
};

/** Called when we receive the server list. If GUI is not completely initialized, we wait here
 *  in case any of the code downstream needs to display UI.
 *  Possible improvement: move this "is GUI ready" test to windowManager.open method? */
Gui.prototype.onServerListReceived = function (msg) {
	if (this.initialized) {
		this.serversData.onServerList(msg);
	} else {
		this.once('initialized', function () {
			this.serversData.onServerList(msg);
		});
	}
};

/** @private
 *  @desc Initialize login screen and "basic" UI elements that need to be ready from login time. */
Gui.prototype._createUiForLogin = function () {
	windowsManager.initialize(this);

	body.setStyles({
		width: dimensionsHelper.dimensions.screenWidth + 'px',
		height: dimensionsHelper.dimensions.screenHeight + 'px'
	});

	this.loginScreen = body.appendChild(new LoginScreen());
	this.splashScreen = body.appendChild(new SplashScreen());
	this.connectionSplashScreen = body.appendChild(new ConnectionSplashScreen());

	this.windowsContainer = new WuiDom('div', { className: 'windowsContainer' });
	body.appendChild(this.windowsContainer);

	windowsManager.addWindow('connectionQueue', new ConnectionQueueWindow(), { fixed: true });
	windowsManager.addWindow('popup', new PopupWindow());
	windowsManager.addWindow('confirm', new ConfirmWindow());
	windowsManager.addWindow('nickname', new NicknameWindow(), { fixed: true });
	windowsManager.addWindow('register', new RegisterWindow(), { fixed: true });

	this.dropDown = body.appendChild(new DropDown());
};


Gui.prototype._addWindows = function () {
	attachWindows();
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * @method  _initUserInterface
 * @private
 * @desc    Construct the interface for the renderer
 */
Gui.prototype._initUserInterface = function () {
	this.gameGuiContainer = new WuiDom('div', { className: 'gameGuiContainer', hidden: true });

	body.appendChild(this.gameGuiContainer);

	this.sidebarBackground = this.gameGuiContainer.createChild('div', { className: 'blackStripe' });
	this.mapBorder1 = this.gameGuiContainer.createChild('div', { className: 'mapBorder' });
	this.mapBorder2 = this.gameGuiContainer.createChild('div', { className: ['mapBorder', 'flipped'] });
	this.screenLeftover = this.gameGuiContainer.createChild('div', { className: 'blackStripe' });

	// foreground & tooltip
	this.gameGuiContainer.appendChild(window.foreground);
	contextualMenus.initialize(this.gameGuiContainer, body);

	this.tooltipBox = body.appendChild(TooltipBox.initialiseTooltipBehavior(body));

	this.numberInputPad = this.gameGuiContainer.appendChild(new NumberInputPad());

	this._addWindows();

	this.chat = this.gameGuiContainer.appendChild(new Chat());
	this.gameGuiContainer.appendChild(new ChatButton());

	this.mainControls = this.gameGuiContainer.appendChild(new MainControls());

	this.shortcutBar = this.gameGuiContainer.appendChild(new ShortcutBar());

	this.menuBar = this.gameGuiContainer.appendChild(new MenuBar());

	this.textNotification = this.gameGuiContainer.appendChild(new TextNotification());

	this.roleplayBuffs = this.gameGuiContainer.appendChild(new RoleplayBuffs(this.playerData.inventory));

	// fight timeline
	this.timeline = this.gameGuiContainer.appendChild(new Timeline());

	this.progressGauge = this.shortcutBar.appendChild(new ProgressGauge());

	this.compass = this.gameGuiContainer.appendChild(new Compass());

	this.hintArrow = this.gameGuiContainer.appendChild(new HintArrow());

	this.kohBox = this.windowsContainer.appendChild(new KohBox());

	this.party = this.gameGuiContainer.appendChild(new Party());

	this.challengeIndicator = this.gameGuiContainer.appendChild(new ChallengeIndicator());

	this.rewardsIndicator = this.gameGuiContainer.appendChild(new RewardsIndicator());

	this.npcDialogUi = this.gameGuiContainer.appendChild(new NpcDialogUi());

	this.notificationBar = this.gameGuiContainer.appendChild(new NotificationBar());

	this.mapCoordinates = this.gameGuiContainer.appendChild(new MapCoordinateDisplay());

	this.houseMenuButton = this.gameGuiContainer.appendChild(new HouseMenuButton());

	this.shopFloatingToolbar = this.gameGuiContainer.appendChild(new ShopFloatingToolbar());

	dragManager.init(this.gameGuiContainer);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Create game context
 *
 * @param {Object} msg         - 'GameContextCreateMessage' server message
 * @param {Number} msg.context - game context id
 */
Gui.prototype.gameContextCreate = function (msg) {
	var contextId = msg.context;
	this.gameContext = contextId;
	window.foreground.changeGameContext(contextId);
	if (contextId !== GameContextEnum.ROLE_PLAY) {
		window.foreground.hideBorderArrow();
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** function called when client receive a map change message */
Gui.prototype.onCurrentMapMessage = function () {
	// hide map change arrow
	window.foreground.hideBorderArrow();
};


//█████████████████████████████████████████████████
//██▀████████████████████▄░███░▄▄░▄▄░███▄██████████
//█▄░▄▄▄██▀▄▄▄▄▀█▀▄▄▄▄▀███░██████░████▄▄░███▄░▀▄▄▀█
//██░█████░████░█░████░███░██████░██████░████░███░█
//██▄▀▀▀▄█▄▀▀▀▀▄█▄▀▀▀▀▄█▀▀░▀▀███▀░▀███▀▀░▀▀██░▀▀▀▄█
//██████████████████████████████████████████▀░▀████

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Open map context menu.
 *
 * @param {String}  menuId        - the id of the menu to open
 * @param {Object}  params        - contains information for the menu display (title, buttons, actions to
 *                                  perform if user select an entry)
 * @param {Object}  coordinates
 *        {Number}  coordinates.x - x coordinate where to display the menu (screen or canvas: see isCanvasCoordinate)
 *        {Number}  coordinates.y - y coordinate where to display the menu (screen or canvas: see isCanvasCoordinate)
 *        {Boolean} coordinates.isCanvasCoordinate - optional (default value: false)
 *                                                   if the coordinate is canvas based (else screen based)
 */
Gui.prototype.openContextualMenu = function (menuId, params, coordinates) {
	coordinates = coordinates || {};
	var x = coordinates.x;
	var y = coordinates.y;
	if (coordinates.isCanvasCoordinate) {
		var screenCoordinate = window.foreground.convertCanvasToScreenCoordinate(x, y);
		x = screenCoordinate.x;
		y = screenCoordinate.y;
	}
	contextualMenus.openAt(menuId, x, y, params);
};

Gui.prototype.openContextualMenuAround = function (menuId, wuiDom, params) {
	contextualMenus.openAround(menuId, wuiDom, params);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Close map tooltip
 */
Gui.prototype.closeContextualMenu = function (params) {
	contextualMenus.close(params);
};

Gui.prototype.showHintArrow = function (x, y) {
	this.hintArrow.showArrow(x, y);
};

Gui.prototype.hideHintArrow = function () {
	this.hintArrow.hideArrow();
};

Gui.prototype.newSpeechBubble = function (options) {
	return new SpeechBubble(options);
};


//████████████████████████████████████████████████████████████████████████████
//█████▄ ████▄███████████████████████████████████████████████████████▀████████
//█▀▄▄▄▀ ██▄▄ ███▀▄▄▄▄ █▀▄▄▄▀ █▀▄▄▄▄▀█▄ ▀▄▄▀██▄ ▀▄▄▀██▀▄▄▄▄▀█▀▄▄▄▀ █▄ ▄▄▄█████
//█ ████ ████ ████▄▄▄▄▀█ ██████ ████ ██ ███ ███ ███ ██ ▄▄▄▄▄█ ███████ ████████
//█▄▀▀▀▄ ▀█▀▀ ▀▀█ ▀▀▀▀▄█▄▀▀▀▀▄█▄▀▀▀▀▄█▀ ▀█▀ ▀█▀ ▀█▀ ▀█▄▀▀▀▀▀█▄▀▀▀▀▄██▄▀▀▀▄████
//████████████████████████████████████████████████████████████████████████████

/** Function called when we are disconnected from remote server (for any reason)
 *  @param {string} reason */
Gui.prototype.disconnect = function (reason) {
	this.isConnected = false;
	//for unexpected disconnections we show a popup
	if ((reason === 'SOCKET_LOST' || reason === 'ASSET_MISSING') && !this.expectedDisconnectionReason) {
		console.warn('[Gui] disconnected:', reason);
		this.openSimplePopup(getText('ui.popup.connectionFailed.text'));
	}
	this._shutDownUI();
	this.emit('disconnect', reason);
};

/** Called when we expect to be disconnected (for now only 1 known reason = switch to merchant mode) */
Gui.prototype.connectionGonnaBeClosed = function (reason) {
	this.expectedDisconnectionReason = reason;
	var self = this;
	window.setTimeout(function () {
		self.expectedDisconnectionReason = null; //disconnection did not come so we should not "expect it" anymore
	}, 60000);
	//60 sec; at most a very minor glitch if delay reveals too short or too long - Flash client does not handle this at
	// all
};

Gui.prototype._shutDownUI = function () {
	//hide everything fast by showing login screen
	login.backToLogin();

	//now close & clean everything (so it looks good when we connect again)
	userPref.close();
	windowsManager.closeAll();

	if (this.gameGuiContainer) { this.gameGuiContainer.hide(); }
	if (this.houseMenuButton) { this.houseMenuButton.hide(); }
	if (this.tooltipBox) { this.tooltipBox.close(); }
	if (this.kohBox) { this.kohBox.hide(); }
};

/** Called when we have logged in but are not yet connected to game server */
Gui.prototype.onIdentificationSuccess = function () {
	this.loginScreen.hide();
	this.splashScreen.show();
};

/** Called when are connected to game server */
Gui.prototype.onConnect = function () {
	// we show in-game UI
	//first thing to do is tell anyone who needs to know that we can clear previous state:
	this.isConnected = true;
	gameOptions.initialize(this);
	this.gameGuiContainer.show();
	this._resizeUi();
	window.gui.emit('connected', this.fightManager.isInReconnection);
};


//█████████████████████████████████████
//█████████████████████████████████████
//█▄░▀▄▄▀█▀▄▄▄▄▀█▄░▀▄▄▀█▄░██▄░██▄░▀▄▄▀█
//██░███░█░████░██░███░██░███░███░███░█
//██░▀▀▀▄█▄▀▀▀▀▄██░▀▀▀▄██▄▀▀▄░▀██░▀▀▀▄█
//█▀░▀███████████▀░▀████████████▀░▀████

/** Opens a simple text popup. See also openSimplePopup.
 *    @param {object} data - data.title is the title, data.message is the message's text
 *    @param {String} data.title - title
 *    @param {String} data.message - the message's text
 **/
Gui.prototype.openPopup = function (data) {
	windowsManager.getWindow('popup').addContent(data);
	windowsManager.open('popup');
};

/** Opens a simple text popup.
 *    @param {string} msg - message's text
 *    @param {string} [title] - window's title (default is "Error") */
Gui.prototype.openSimplePopup = function (msg, title) {
	this.openPopup({
		title: title || getText('ui.common.error'),
		message: msg
	});
};

Gui.prototype.openConfirmPopup = function (data, params) {
	windowsManager.getWindow('confirm').update(data);
	windowsManager.open('confirm', params);
};

Gui.prototype.openCancelPopup = function (data) {
	windowsManager.getWindow('cancel').update(data);
	windowsManager.open('cancel');
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * Reorganizes the UI elements on the screen
 */
Gui.prototype._resizeUi = function (inFightMode) {
	if (inFightMode === undefined) { inFightMode = window.gui.playerData.isFighting; }

	if (deviceInfo.isDevice) {
		body.replaceClassNames(['no-touch'], ['touch']);
	} else {
		body.replaceClassNames(['touch'], ['no-touch']);
	}

	dimensionsHelper.updateScreen();
	var dimensions = dimensionsHelper.dimensions;

	body.setStyles({
		width: dimensions.screenWidth + 'px',
		height: dimensions.screenHeight + 'px'
	});

	var screenRatio = dimensions.screenWidth / dimensions.screenHeight;
	if (screenRatio <= 1.5) {
		this.ipadRatio = true;
		body.replaceClassNames(['largeRatio'], ['ipadRatio']);
		dimensionsHelper.resizeNarrowScreen(inFightMode);

		// sidebarBackground is at bottom of screen, behind the side bar
		this.sidebarBackground.setStyles({
			left: 0,
			top: dimensions.mapBottom - 1 + 'px',
			width: dimensions.screenWidth + 'px',
			height: dimensions.screenHeight - dimensions.mapBottom + 1 + 'px'
		});
		// mapBorder1 is on the left of the screen
		this.mapBorder1.addClassNames('vertical');
		this.mapBorder1.setStyles({
			left: 0,
			top: 0,
			width: dimensions.mapLeft + 'px',
			height: dimensions.mapHeight + 'px'
		});
		// mapBorder2 is on the right of the screen
		this.mapBorder2.addClassNames('vertical');
		this.mapBorder2.setStyles({
			left: dimensions.mapRight + 'px',
			top: 0,
			width: dimensions.screenWidth - dimensions.mapRight + 'px',
			height: dimensions.mapHeight + 'px'
		});
		// screenLeftover is on the top of the screen (only needed for VERY weird screen size - browser usually)
		this.screenLeftover.setStyles({
			left: 0,
			top: 0,
			width: dimensions.screenWidth + 'px',
			height: dimensions.mapTop + 'px'
		});
	} else {
		this.ipadRatio = false;
		body.replaceClassNames(['ipadRatio'], ['largeRatio']);
		dimensionsHelper.resizeWideScreen(inFightMode);

		// sidebarBackground is on the right of screen, behind the side bar
		this.sidebarBackground.setStyles({
			left: dimensions.mapRight + 'px',
			top: 0,
			width: dimensions.screenWidth - dimensions.mapRight + 'px',
			height: dimensions.screenHeight + 'px'
		});
		// mapBorder1 is at top of screen
		this.mapBorder1.delClassNames('vertical');
		this.mapBorder1.setStyles({
			left: dimensions.mapLeft + 'px',
			top: 0,
			width: dimensions.mapWidth + 'px',
			height: dimensions.mapTop + 'px'
		});
		// mapBorder2 is at bottom of screen
		this.mapBorder2.delClassNames('vertical');
		this.mapBorder2.setStyles({
			left: dimensions.mapLeft + 'px',
			top: dimensions.mapBottom - 1 + 'px',
			width: dimensions.mapWidth + 'px',
			height: dimensions.screenHeight - dimensions.mapBottom + 1 + 'px'
		});
		// screenLeftover is on the left of the screen (only needed for VERY weird screen size - browser usually)
		this.screenLeftover.setStyles({
			left: 0,
			top: 0,
			width: dimensions.mapLeft + 'px',
			height: dimensions.screenHeight + 'px'
		});
	}
	window.isoEngine.updateDimensions(dimensions);
	this.emit('resize', dimensions);
};

/**
 * Initializes the auto-resize system
 */
Gui.prototype._initAutoResize = function () {
	// do the 1st resize
	keyboard.hide();
	this._resizeUi();

	var resizeTimer;
	var self = this;
	function resizeAfterDelay() {
		clearTimeout(resizeTimer);
		resizeTimer = setTimeout(function () {
			self._resizeUi();
		}, 250);
	}

	if (!deviceInfo.isDevice) {
		window.addEventListener('scroll', resizeAfterDelay);
		window.addEventListener('resize', resizeAfterDelay);
	}

	this.fightManager.on('fightEnterPreparation', function () {
		self._resizeUi();
	});
	this.fightManager.on('fightEnterBattle', function (status) {
		if (status === 'PREPARATION_SKIPPED') { self._resizeUi(); }
	});
	this.fightManager.on('fightEnd', function () {
		self._resizeUi();
	});

	gameOptions.on('menubarSize', this.resizeToolbar.bind(this, false));
	gameOptions.on('menubarSizeInFight', this.resizeToolbar.bind(this, true));
	gameOptions.on('toolbarThicknessInFight', this.resizeToolbar.bind(this, true));
};

/** Adjust fight/RP toolbar size, only if currently displayed */
Gui.prototype.resizeToolbar = function (isFightToolbar) {
	var inFightMode = window.gui.playerData.isFighting;
	if (isFightToolbar !== inFightMode) { return; }
	this._resizeUi(inFightMode);
};

Gui.prototype.showFightingToolbar = function (inFight) {
	this._resizeUi(inFight);
};

Gui.prototype.getBuildVersion = function () {
	var config = window.Config;
	if (!config) {
		return;
	}
	var appInfo = window.appInfo;
	var clientVersion = '';
	if (appInfo && appInfo.version) {
		clientVersion = 'Client v' + appInfo.version + ' / Server ';
	}
	return clientVersion + 'v' + config.buildVersion;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

//



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/Gui/index.js
 ** module id = 293
 ** module chunks = 0
 **/