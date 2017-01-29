require('./styles.less');
var Button = require('Button');
var channelsEnum = require('ChatActivableChannelsEnum');
var ChatIcons = require('ChatIcons');
var CheckboxLabel = require('CheckboxLabel');
var deviceInfo = require('deviceInfo');
var dimensions = require('dimensionsHelper').dimensions;
var DofusButton = Button.DofusButton;
var FightEventEnum = require('FightEventEnum');
var getElementPositionAround = require('positionHelper').getElementPositionAround;
var getText = require('getText').getText;
var HistoryBuffer = require('./HistoryBuffer');
var hyperlink = require('hyperlink');
var inherits = require('util').inherits;
var InputBox = require('InputBox');
var keyboard = require('keyboard');
var protocolConstants = require('protocolConstants');
var Scroller = require('Scroller');
var StatusIndicator = require('./StatusIndicator');
var tapBehavior = require('tapBehavior');
var tooltip = require('TooltipBox');
var tweener = require('tweener');
var userPref = require('UserPreferences');
var CloseButton = require('CloseButton');
var WuiDom = require('wuidom');
var specialCmd = require('./specialCmd.js');
var basicWhoIsMessageHandler = require('./basicWhoIsMessageHandler.js');
var resizeBehavior = require('resizeBehavior');
var gameOptions = require('gameOptions');

// "Shortcuts" on special channels
var GLOBAL_CHANNEL = channelsEnum.CHANNEL_GLOBAL;
var PRIVATE_CHANNEL = channelsEnum.PSEUDO_CHANNEL_PRIVATE;
var RED_CHANNEL = 666; // messages from our client code AND important messages from server; cannot be filtered

var GENERAL_PRESET = 0, FIGHT_PRESET = 1, PRIVATE_PRESET = 2, COMMERCE_PRESET = 3;

// List of channels we show in outgoing channel menu (in same order as below, taken from Flash)
var OUTGOING_CHANNELS = [
	channelsEnum.CHANNEL_GLOBAL,              //0
	channelsEnum.CHANNEL_TEAM,                //1
	channelsEnum.CHANNEL_GUILD,               //2
	channelsEnum.CHANNEL_ALLIANCE,            //3
	channelsEnum.CHANNEL_PARTY,               //4
	channelsEnum.CHANNEL_NOOB,                //7
	channelsEnum.CHANNEL_ADMIN,               //8
	// channelsEnum.CHANNEL_ADS,              //12 RECEIVE-ONLY
	channelsEnum.PSEUDO_CHANNEL_PRIVATE,      //9
	channelsEnum.CHANNEL_ARENA,               //13
	// channelsEnum.PSEUDO_CHANNEL_INFO       //10 RECEIVE-ONLY
	// channelsEnum.PSEUDO_CHANNEL_FIGHT_LOG  //11 RECEIVE-ONLY + client generated
	channelsEnum.CHANNEL_SALES,               //5
	channelsEnum.CHANNEL_SEEK                 //6
];

// Client channels are unknown from the server (i.e. not using EnabledChannelsMessage)
var clientChannelMap = {};
clientChannelMap[channelsEnum.PSEUDO_CHANNEL_FIGHT_LOG] = true;

var DISPLAY_MODES = {
	ROLEPLAY: 'roleplay',
	FIGHT: 'fight'
};

var cmdRegExp = /^\/([A-Za-z]+)/;

var chatCommands = {
	s: GLOBAL_CHANNEL,
	w: PRIVATE_CHANNEL,
	t: channelsEnum.CHANNEL_TEAM,
	g: channelsEnum.CHANNEL_GUILD,
	a: channelsEnum.CHANNEL_ALLIANCE,
	p: channelsEnum.CHANNEL_PARTY,
	i: channelsEnum.CHANNEL_NOOB,
	q: channelsEnum.CHANNEL_ADMIN,
	k: channelsEnum.CHANNEL_ARENA,
	b: channelsEnum.CHANNEL_SALES,
	r: channelsEnum.CHANNEL_SEEK
};

var userPrefPresetEntry = 'chatIncomingPreset_';

/**
 * Constant below is per channel so you have to multiply by 10-12 to get the possible maximum.
 * From test in Oct2015, 500 messages of around 30 char including a player link take 2MB of RAM in Chrome.
 * Flash default is 40 messages per channel; we could allow player to set this in options or set a different
 * maximum per channel (each HistoryBuffer can have a different size).
 * Example:
 *   gui.chat._initialize();
 *   for (var i=0; i<500; i++) gui.chat.logMsg('{player,Verdichex,29}:,test test test '+i, i%10);
 */
var MAX_KEPT_MSG_PER_CHANNEL = 50;


/** @class */
function Chat() {
	WuiDom.call(this, 'div', { className: 'chat' });

	this.displayMode = DISPLAY_MODES.ROLEPLAY;
	this.keyboardHeight = dimensions.screenHeight * 0.6;
	this.previousInput = '';
	this.linksToReplace = [];

	this.enabledChannels = null;
	this.disallowedChannelMap = null;

	// Presets & channels
	this.presets = null;
	this.channelMap = window.gui.databases.ChatChannels;
	this.numPresetsListeningToChannel = null;
	this.outgoingChannel = GLOBAL_CHANNEL;
	this.outgoingChannelMenu = null;
	this.previousPrivateReceiver = '';

	this.historyBuffers = {};
	this.historyBuffers[RED_CHANNEL] = new HistoryBuffer(MAX_KEPT_MSG_PER_CHANNEL);
	for (var channelId in this.channelMap) {
		this.historyBuffers[~~channelId] = new HistoryBuffer(MAX_KEPT_MSG_PER_CHANNEL);
	}

	this.initializeElements();
	this.setMessageHandlers();
}
inherits(Chat, WuiDom);
module.exports = Chat;


/** Called during connection */
Chat.prototype._initialize = function (enabledChannels, disallowedChannels) {
	this.setDisplayMode(DISPLAY_MODES.ROLEPLAY);
	this.statusIndicator.initialize();

	this.previousInput = '';
	this.previousPrivateReceiver = '';
	this._selectOutgoingChannel(GLOBAL_CHANNEL, /*isReset=*/true);

	this.enabledChannels = enabledChannels;
	this._initOutgoingChannelMenu();

	this.disallowedChannelMap = {};
	for (var n = 0; n < disallowedChannels.length; n++) {
		this.disallowedChannelMap[disallowedChannels[n]] = true;
	}

	this._loadPresetConfig();
	this._setActivePreset(GENERAL_PRESET);
	this._clearChatHistory();
};

/**
 * Initialise or clears the chat history - DOM and buffers, etc.
 * TODO: we can leave the chat history if account is same, especially for full reco. TBD. Line below would work:
 *       if (userPref.accountName !== this.previousAccountName) {...}
 */
Chat.prototype._clearChatHistory = function () {
	// Clear DOM
	this._logChat.clearContent();

	// Clear all history buffers
	for (var channelId in this.historyBuffers) {
		this.historyBuffers[~~channelId].clear();
	}
};

/** Private use */
Chat.prototype.initializeElements = function () {
	var self = this;

	this.savedWidth = null;
	this.savedHeight = null;

	this.logWrapper = this.createChild('div', { className: 'logWrapper' });

	this.fightControls = this.logWrapper.createChild('div', { className: 'fightControls' });
	this.timelineBox = this.fightControls.createChild('div', { className: 'timelineBox' });
	var fightButtons = this.fightControls.createChild('div', { className: 'fightButtons' });
	var yourTurnButton = new DofusButton('', { className: 'yourTurnButton', hidden: true }, function () {
		self.deactivate();
	});
	var yourTurnText = this.createChild('div', { className: 'yourTurnText' });
	yourTurnText.setText(getText('tablet.chat.yourTurnButton'));
	yourTurnButton.appendChild(yourTurnText);
	this.yourTurnButton = fightButtons.appendChild(yourTurnButton);

	this.logScroller = this.logWrapper.appendChild(new Scroller({ className: 'log' }, { showHintArrows: true }));
	this._logChat = this.logScroller.content;
	this._logChat.addClassNames('showChannel666');

	// "Form" part of the chat (bottom line)

	var formChat = this.logWrapper.createChild('div', { className: 'formChat' });

	// Button for channel selection
	this._createChannelSelector(formChat);

	// Text input box; max length is the one of a private message like: "/w username text"
	this.inputChat = formChat.appendChild(new InputBox({ className: 'inputChat',
		attr: { maxlength: 4 + protocolConstants.MAX_NICK_LEN + protocolConstants.USER_MAX_CHAT_LEN } }));

	this.inputChat.on('validate', function () {
		self.submit();
	});

	this.statusIndicator = new StatusIndicator(formChat);

	// Emoticons & smileys buttons
	var chatIcons = new ChatIcons();
	formChat.appendChild(chatIcons);
	chatIcons.on('activated', function () {
		chatIcons.positionPanel();
	});

	this.logWrapper.appendChild(new CloseButton({ className: ['simpleButton', 'chatCloseButton'] }, function () {
		self.deactivate();
	}));

	resizeBehavior(this.logWrapper, { minWidth: 450, minHeight: 275 });
	this.logWrapper.on('resize', function () {
		self._refreshScroller();
	});
};

Chat.prototype._createChannelSelector = function (formChat) {
	var self = this;

	function selectChannel() {
		self._selectOutgoingChannel(this.id);
		self.inputChat.focus();
	}

	var actions = this.outgoingChannelMenu = [];
	for (var n = 0; n < OUTGOING_CHANNELS.length; n++) {
		var channel = this.channelMap[OUTGOING_CHANNELS[n]];
		actions.push({
			id: channel.id,
			caption: channel.nameId + ' (' + channel.shortcut + ')',
			cb: selectChannel,
			ticked: channel.id === this.outgoingChannel
		});
	}
	this.outgoingChannelButtonBg = formChat.createChild('div', { className: 'buttonBackground' });
	formChat.createChild('div', { className: 'outgoingChannelButton' });
	var touchZone = formChat.createChild('div', { className: 'buttonTouchZone' });
	tooltip.addTooltip(touchZone, getText('ui.option.chat'));

	touchZone.on('tap', function () { // NB: tap behavior is added by addTooltip above
		var boundingRect = this.rootElement.getBoundingClientRect();
		window.gui.openContextualMenu('generic', {
				title: getText('ui.option.currentChannel'),
				actions: self.outgoingChannelMenu
			}, {
				x: boundingRect.left + boundingRect.width,
				y: boundingRect.top
			}
		);
	});
};

function removePrefix(inputBox, prefix) {
	var str = inputBox.getValue();
	var curPrefix = str.substr(0, prefix.length);

	if (curPrefix !== prefix) { return; }
	inputBox.setValue(str.substr(prefix.length));
}
function addPrefix(inputBox, prefix) {
	var str = inputBox.getValue();
	if (str.substr(0, prefix.length) === prefix) { return; }
	inputBox.setValue(prefix + str);
}

Chat.prototype._showNotification = function (msg) {
	tooltip.showNotification(msg, this.outgoingChannelButtonBg);
};

Chat.prototype._initOutgoingChannelMenu = function () {
	var actions = this.outgoingChannelMenu;
	for (var n = 0; n < actions.length; n++) {
		var action = actions[n];
		action.hidden = this.enabledChannels.indexOf(action.id) < 0;
		action.ticked = action.id === this.outgoingChannel;
	}
};

Chat.prototype._getOutgoingChannelMenuOption = function (channelId) {
	var menu = this.outgoingChannelMenu;
	for (var n = 0; n < menu.length; n++) {
		if (menu[n].id === channelId) { return menu[n]; }
	}
};

Chat.prototype._selectOutgoingChannel = function (newChannel, isReset) {
	var oldChannel = this.outgoingChannel;
	if (newChannel === oldChannel && !isReset) { return; }

	// If needed, modify text in input box
	if (isReset && newChannel !== PRIVATE_CHANNEL) { // we can switch to private msg with a text already typed
		this.inputChat.setValue('');
	}
	if (oldChannel === PRIVATE_CHANNEL) {
		removePrefix(this.inputChat, this.previousPrivateReceiver + ' ');
	}
	if (newChannel === PRIVATE_CHANNEL && this.previousPrivateReceiver) {
		addPrefix(this.inputChat, this.previousPrivateReceiver + ' ');
	}

	// Update hints about current channel: color of text box and color of button
	this.inputChat.setClassNames(['inputChat', 'inputBox', 'channel' + newChannel]);
	this.outgoingChannelButtonBg.setClassNames(['buttonBackground', 'outgoingChannel' + newChannel]);

	// Display more help/reminder to make sure player understands
	if (newChannel === PRIVATE_CHANNEL) {
		if (this.previousPrivateReceiver) {
			this._showNotification(getText('tablet.chat.enteringPrivateChannel', this.previousPrivateReceiver));
		} else {
			this._showNotification(getText('tablet.chat.privateReceiverHelp'));
		}
	}
	// Update the "tick" in the menu
	this._getOutgoingChannelMenuOption(oldChannel).ticked = false;
	this._getOutgoingChannelMenuOption(newChannel).ticked = true;

	// Keep new selected channel ID
	this.outgoingChannel = newChannel;
};

Chat.prototype._setChannelEnabled = function (channelId, enable) {
	// Channels we stop listening to should not appear in our outgoing list (why talk there if we don't listen?)
	var option = this._getOutgoingChannelMenuOption(channelId); // option is undefined if channel is "receive only"
	if (option) { option.hidden = !enable; }

	var channelName = this.channelMap[channelId].nameId;
	var channels = this.enabledChannels;
	var pos = channels.indexOf(channelId);
	if (pos !== -1) {
		this._showNotification(getText('tablet.chat.disablingChannel', channelName));
		if (enable) { return console.warn('Chat channel already enabled'); }
		channels.splice(pos, 1);
	} else {
		this._showNotification(getText('tablet.chat.enablingChannel', channelName));
		if (!enable) { return console.warn('Chat channel already disabled'); }
		channels.push(channelId);
	}
};

Chat.prototype._updateChannelListenerCount = function (channelId, delta) {
	var previousCount = this.numPresetsListeningToChannel[channelId];
	var newCount = Math.max(previousCount + delta, 0);
	this.numPresetsListeningToChannel[channelId] = newCount;

	// For client channels, server does not need to know; we are done
	if (clientChannelMap[channelId]) { return; }

	// Tell the server if we started or stopped listening.
	// (response will come as a ChannelEnablingChangeMessage)
	if (previousCount === 0 && newCount > 0) { // so we start listening now
		window.dofus.sendMessage('ChannelEnablingMessage', { channel: channelId, enable: true });
	} else if (previousCount > 0 && newCount === 0) { // so we reached 0 now, we must stop listening
		window.dofus.sendMessage('ChannelEnablingMessage', { channel: channelId, enable: false });
	}
};

Chat.prototype._toggleChannel = function (presetId, channelId, enable) {
	this._setChannelInPreset(presetId, channelId, enable);
	this._updateChannelListenerCount(channelId, enable ? +1 : -1);
};

/** Called with this = button tapped - a channel checkbox */
function toggleChannelButton(enable) {
	var chat = this.chat;
	chat._toggleChannel(chat.activePreset, ~~this.id, enable);
}

/** Called with this = button tapped - a preset button */
function presetButtonTapped() {
	var chat = this.chat;
	var presetId = this.presetId;
	if (presetId === chat.activePreset) {
		chat._togglePresetChannels(presetId);
	} else {
		chat._setActivePreset(presetId);
	}
}

Chat.prototype._addPreset = function (presetCfg) {
	var presetButton = this.presetButtons.createChild('div', { className: 'presetButton' });
	presetButton.createChild('div', { className: ['presetIcon', presetCfg.className] });
	presetButton.chat = this;
	presetButton.presetId = this.presets.length;
	tapBehavior(presetButton);
	presetButton.on('tap', presetButtonTapped);

	var channels = [], channelId;
	for (var i = 0; i < presetCfg.channels.length; i++) {
		channelId = presetCfg.channels[i];
		channels.push(channelId);
	}

	var preset = {
		element: presetButton,
		channels: channels,
		channelsList: this.channelsLists.createChild('div', { className: 'channelsList' })
	};
	this.presets.push(preset);

	for (var id in this.channelMap) {
		channelId = ~~id;
		var channelButton = preset.channelsList.appendChild(new CheckboxLabel(this.channelMap[channelId].nameId));
		channelButton.id = channelId;
		channelButton.chat = this;
		channelButton.addClassNames('channel' + channelButton.id);
		channelButton.on('change', toggleChannelButton);
	}
};

Chat.prototype._createPresets = function (presetCfg) {
	this.presets = [];
	this.activePreset = null;
	this.presetButtons = this.logWrapper.createChild('div', { className: 'presetButtons' });
	this.channelsLists = this.logWrapper.createChild('div', { className: 'channelsLists' });

	for (var i = 0; i < presetCfg.length; i++) {
		this._addPreset(presetCfg[i]);
	}
};

Chat.prototype._setChannelInPreset = function (presetId, channelId, enable) {
	var channels = this.presets[presetId].channels;

	// Remove OR add the channel ID (this.id) in the channel list
	var modified = false;
	var pos = channels.indexOf(channelId);
	if (pos !== -1 && !enable) {
		channels.splice(pos, 1);
		modified = true;
	} else if (pos === -1 && enable) {
		channels.push(channelId);
		modified = true;
	}
	if (!modified) { return; }

	// Apply the new filter to displayed messages
	if (presetId === this.activePreset) { this._updateLogFilter(); }
	// Save new value in user preferences
	userPref.setValue(userPrefPresetEntry + presetId, channels);
};

/**
 * NB: we resynch the channels we are listening to: "server is always right".
 * This happens if server settings have changed "outside", e.g. on another tablet etc.
 * - If server says we are not listening to a channel, we ignore any "tick" saved in previous presets.
 * - If server says we are listening to a channel but we have no "tick" in preset, we add one in 1st preset.
 */
Chat.prototype._updatePresets = function (presetCfg) {
	// Prepare for counting how many presets are listening to each channel.
	// We keep one counter per channel; if counter is 0 we stop listening
	var listenerCount = this.numPresetsListeningToChannel = {};
	for (var id in this.channelMap) {
		listenerCount[~~id] = 0;
	}

	var channelId, channelButtons;
	for (var presetId = presetCfg.length - 1; presetId >= 0; presetId--) {
		var preset = this.presets[presetId];
		channelButtons = preset.channelsList.getChildren();
		var buttonIndex = 0;
		for (id in this.channelMap) {
			channelId = ~~id;
			var isEnabledOnServer = this.enabledChannels.indexOf(channelId) >= 0;
			var isTickedInPreset = preset.channels.indexOf(channelId) >= 0;
			var channelButton = channelButtons[buttonIndex];
			buttonIndex++;

			if (this.disallowedChannelMap[channelId]) {
				channelButton.hide();
				continue;
			}

			if (!clientChannelMap[channelId]) {
				if (isEnabledOnServer && !isTickedInPreset && presetId === 0 && !listenerCount[channelId]) {
					this._setChannelInPreset(presetId, channelId, true);
					isTickedInPreset = true;
				}
				if (!isEnabledOnServer && isTickedInPreset) {
					this._setChannelInPreset(presetId, channelId, false);
					isTickedInPreset = false;
				}
			}

			if (isTickedInPreset) {
				channelButton.activate(/*isSilent=*/true);
				listenerCount[channelId]++;
			} else {
				channelButton.deactivate(/*isSilent=*/true);
			}
		}
	}
};

Chat.prototype._loadPresetConfig = function () {
	var presetCfg = [];
	// main preset of channels (general)
	presetCfg.push({
		className: 'preset1', // NB: style class names start at 1 but preset numbers start at 0
		channels: userPref.getValue(userPrefPresetEntry + GENERAL_PRESET, [
			channelsEnum.CHANNEL_GLOBAL,
			channelsEnum.CHANNEL_TEAM,
			channelsEnum.CHANNEL_GUILD,
			channelsEnum.CHANNEL_ALLIANCE,
			channelsEnum.CHANNEL_PARTY,
			channelsEnum.CHANNEL_NOOB,
			channelsEnum.PSEUDO_CHANNEL_PRIVATE,
			channelsEnum.PSEUDO_CHANNEL_INFO,
			channelsEnum.PSEUDO_CHANNEL_FIGHT_LOG,
			channelsEnum.CHANNEL_ADS,
			channelsEnum.CHANNEL_ARENA
		])
	});
	// second preset of channels (fight)
	presetCfg.push({
		className: 'preset2',
		channels: userPref.getValue(userPrefPresetEntry + FIGHT_PRESET,
			[channelsEnum.PSEUDO_CHANNEL_FIGHT_LOG]
		)
	});
	// third preset of channels (private)
	presetCfg.push({
		className: 'preset3',
		channels: userPref.getValue(userPrefPresetEntry + PRIVATE_PRESET,
			[channelsEnum.PSEUDO_CHANNEL_PRIVATE]
		)
	});
	// fourth preset of channels (commerce)
	presetCfg.push({
		className: 'preset4',
		channels: userPref.getValue(userPrefPresetEntry + COMMERCE_PRESET, [
			channelsEnum.CHANNEL_GUILD,
			channelsEnum.CHANNEL_SALES,
			channelsEnum.CHANNEL_SEEK
		])
	});

	if (!this.presets) {
		this._createPresets(presetCfg);
	}
	this._updatePresets(presetCfg);
};

// Returns false if this was not a message for a bubble
Chat.prototype._showMsgAsBubble = function (msg) {
	if (msg.channel === PRIVATE_CHANNEL) { return false; }

	if (window.gui.playerData.isFighting && !gameOptions.showSpeechBubbleInFight) {
		return;
	}

	var actor = window.actorManager.getActor(msg.senderId);
	if (!actor) { return false; } // not someone on current map => no bubble

	window.gui.newSpeechBubble({
		actor: actor,
		msg: msg.content,
		channel: msg.channel
	});
	return true;
};

/**
 * Create message wuiDom to append to the chat and the text notification
 * @param {message} msg - as received from proxy
 * @param {bool} isCopy - true for "copy" messages sent back from server
 * @return {WuiDom}
 * @private
 */
Chat.prototype._createMessageContent = function (msg, isCopy) {
	var message = new WuiDom('div', { className: 'message' });
	message.addClassNames('channel' + msg.channel);

	// For all channels but "global" & "private", start with channel name, e.g. "(Guilde) "
	if (msg.channel !== GLOBAL_CHANNEL && msg.channel !== PRIVATE_CHANNEL) {
		message.createChild('span', { text: '(' + this.channelMap[msg.channel].nameId + ') ' });
	}

	// For private channel, add "from" or "to" before player link
	if (msg.channel === PRIVATE_CHANNEL) {
		var fromOrTo = isCopy ? getText('ui.chat.to') : getText('ui.chat.from');
		message.createChild('span', { text: fromOrTo + ' ' });
	}

	// Hyperlink to player (who has been saying the message)
	var playerLink = hyperlink.process('{player,' +
		(isCopy ? msg.receiverName : msg.senderName) + ',' +
		(isCopy ? msg.receiverId : msg.senderId) + '}: ');
	message.appendChild(playerLink);

	//message text
	message.appendChild(hyperlink.process(msg.content));

	return message;
};

Chat.prototype._createMessageContentFromText = function (text, channel) {
	var message = new WuiDom('div', { className: 'message' });
	message.addClassNames('channel' + channel);

	message.appendChild(hyperlink.process(text));

	return message;
};

Chat.prototype._addMsgToChat = function (contentForChat, channel) {
	var msg = this._logChat.appendChild(contentForChat);
	var oldestMsg = this.historyBuffers[channel].push(msg);
	if (oldestMsg) { this._logChat.removeChild(oldestMsg); }

	this._refreshScroller(/*addedNewContent=*/true);
};

/**
 * Adds a message from server to chat log.
 * @param {message} msg - as received from proxy
 * @param {bool} isCopy - true for "copy" messages sent back from server
 * @private
 */
Chat.prototype._logNewMessage = function (msg, isCopy) {
	msg.content = this._getUriDecodedString(msg.content);

	// We always log a received message in the chat; it might be hidden in current preset, though
	var contentForChat = this._createMessageContent(msg, isCopy);
	this._addMsgToChat(contentForChat, msg.channel);

	// For bubbles and notifications, we make sure the current preset has them enabled
	if (this.isChannelEnabledInPreset(msg.channel)) {
		if (!this._showMsgAsBubble(msg)) {
			var contentForNotif = this._createMessageContent(msg, isCopy);
			window.gui.textNotification.add(contentForNotif, { channel: msg.channel });
		}
	}
};

/**
 * Adds a server message to chat log. Private use. See logMsg or logError for public similar tasks.
 * @param {string} text - as received from proxy
 * @param {object} [options]
 * @private
 */
Chat.prototype._logServerText = function (text, options) {
	options = options || {};
	var channel = options.channel !== undefined ? options.channel : channelsEnum.PSEUDO_CHANNEL_INFO;

	// NB: we need 2 "contents" (because they will be in 2 different places in the DOM)
	var contentForChat =  this._createMessageContentFromText(text, channel);
	var contentForNotif = this._createMessageContentFromText(text, channel);

	this._addMsgToChat(contentForChat, channel);

	window.gui.textNotification.add(contentForNotif, { channel: channel });
};

/**
 * Logs a text produced by our client = NOT received from server.
 * @param {string} text - Usually built using getText
 * @param {number} [channel] - See enum ChatActivableChannelsEnum; default is channelsEnum.PSEUDO_CHANNEL_INFO
 */
Chat.prototype.logMsg = function (text, channel) {
	if (channel === undefined) { channel = channelsEnum.PSEUDO_CHANNEL_INFO; }

	if (!this.isChannelEnabledInPreset(channel)) {
		// If not in current preset we simply log it in chat history (e.g. fight logs pass thru here)
		var contentForChat = this._createMessageContentFromText(text, channel);
		return this._addMsgToChat(contentForChat, channel);
	}
	this._logServerText(text, { channel: channel });
};

Chat.prototype.logError = function (text) {
	this._logServerText(text, { channel: RED_CHANNEL });
};

Chat.prototype.insertLink = function (type, data) {
	var text, link;
	switch (type) {
	case 'recipe':
		text = '[' + getText('ui.common.recipes', 1) + getText('ui.common.colon') + data.getName() + ']';
		link = '{recipe,' + data.getProperty('id') + '}';
		break;
	//TODO case 'item': ...
	default: return console.error(new Error('Invalid link type: ' + type));
	}
	this.inputChat.setValue(this.inputChat.getValue() + ' ' + text + ' ');
	this.linksToReplace.push([text, link]);
};

Chat.prototype._refreshScroller = function (addedNewContent) {
	// If chat was at bottom *BEFORE* the new message came in, we scroll down to continue showing the bottom.
	// (i.e. if player was looking at past messages in the chat, we don't touch the scrolling!)
	var wasScrollAtBottom = !this.logScroller.canScrollDown();
	this.logScroller.refresh();

	// When we refresh because of new content, we notify the player
	if (addedNewContent && !wasScrollAtBottom) {
		return this.logScroller.notify();
	}
	// In all other cases we scroll to bottom
	this.logScroller.goToBottom();
};

Chat.prototype._togglePresetChannels = function (presetId) {
	this.channelsLists.toggleDisplay();
	if (!this.channelsLists.isVisible()) {
		// Update scroller only when closing the menu (no need to do it for each checkbox change)
		return this._refreshScroller();
	}

	// Position channel list next to its button
	var preset = this.presets[presetId];
	var position = getElementPositionAround(preset.channelsList, preset.element);
	preset.channelsList.setStyles({
		left: position.x + 'px',
		top: position.y + 'px'
	});
};

Chat.prototype._setActivePreset = function (presetId) {
	this.activePreset = presetId;
	this.channelsLists.hide();

	for (var i = 0; i < this.presets.length; i++) {
		var preset = this.presets[i];
		preset.element.toggleClassName('on', i === presetId);
		preset.channelsList.toggleDisplay(i === presetId);
	}
	// Update filter and scroller
	this._updateLogFilter();
	this._refreshScroller();
};

Chat.prototype.isChannelEnabledInPreset = function (channelId) {
	var channels = this.presets[this.activePreset].channels;
	return channels.indexOf(channelId) !== -1;
};

Chat.prototype._updateLogFilter = function () {
	var channels = this.presets[this.activePreset].channels;
	var nbChannels = Object.keys(channelsEnum).length;
	for (var i = 0; i <= nbChannels; i++) {
		this._logChat.toggleClassName('showChannel' + i, channels.indexOf(i) !== -1);
	}
};

/** Sets the protocol message handlers. Private use. */
Chat.prototype.setMessageHandlers = function () {
	var self = this;
	var gui = window.gui;
	var connectionManager = window.dofus.connectionManager;

	connectionManager.on('EnabledChannelsMessage', function (msg) {
		self._initialize(msg.channels, msg.disallowed);
	});

	connectionManager.on('ChannelEnablingChangeMessage', function (msg) {
		self._setChannelEnabled(msg.channel, msg.enable);
	});

	/** @event module:protocol/chat.client_ChatServerWithObjectMessage */
	connectionManager.on('ChatServerWithObjectMessage', function (msg) {
		self._logNewMessage(msg, false);
	});

	/** @event module:protocol/chat.client_ChatServerCopyWithObjectMessage */
	connectionManager.on('ChatServerCopyWithObjectMessage', function (msg) {
		self._logNewMessage(msg, true);
	});

	/** @event module:protocol/chat.client_ChatServerMessage */
	connectionManager.on('ChatServerMessage', function (msg) {
		self._logNewMessage(msg, false);
	});

	/** @event module:protocol/roleplay.client_EntityTalkMessage */
	connectionManager.on('EntityTalkMessage', function (msg) {
		var actor = window.actorManager.getActorFromNpcId(msg.entityId);
		window.gui.newSpeechBubble({
			actor: actor,
			msg: msg.text
		});
	});

	/** @event module:protocol/chat.client_ChatAdminServerMessage */
	connectionManager.on('ChatAdminServerMessage', function (msg) {
		self._logServerText(msg.content, { channel: channelsEnum.CHANNEL_ADMIN }); //TEST ME
	});

	/** @event module:protocol/chat.client_ChatServerCopyMessage */
	connectionManager.on('ChatServerCopyMessage', function (msg) {
		self._logNewMessage(msg, true);
	});

	/** @event module:protocol/chat.client_ChatErrorMessage */
	connectionManager.on('ChatErrorMessage', function (msg) {
		self._showNotification(msg.reason);
		self._setInput(self.previousInput, /*wasError=*/true);
	});

	connectionManager.on('BasicWhoIsMessage', function (msg) {
		if (!msg.verbose) {
			return;
		}
		self._logServerText(basicWhoIsMessageHandler(msg));
	});

	connectionManager.on('BasicWhoIsNoMatchMessage', function (msg) {
		self._logServerText(getText('ui.common.playerNotFound', msg.search));
	});

	/**
	 * @event module:protocol/characterStats.client_CharacterExperienceGainMessage
	 * @desc  experience gain
	 *
	 * @param {object} msg                       - msg
	 * @param {number} msg.experienceCharacter   - XP gain for character
	 * @param {number} msg.experienceMount       - XP gain for mount
	 * @param {number} msg.experienceGuild       - XP gain for character's guild
	 * @param {number} msg.experienceIncarnation - XP gain for character's incarnation
	 */
	connectionManager.on('CharacterExperienceGainMessage', function (msg) {
		if (msg.experienceCharacter) {
			self.logMsg(getText('ui.stats.xpgain.mine', msg.experienceCharacter));
		}
		if (msg.experienceGuild) {
			self.logMsg(getText('ui.stats.xpgain.guild', msg.experienceGuild));
		}
		if (msg.experienceIncarnation) {
			self.logMsg(getText('ui.stats.xpgain.incarnation', msg.experienceIncarnation));
		}
		if (msg.experienceMount) {
			self.logMsg(getText('ui.stats.xpgain.mount', msg.experienceMount));
		}
	});

	function turnStart(msg) {
		var isUserTurn = gui.playerData.characters.canControlCharacterId(msg.id);
		self.yourTurnButton.toggleDisplay(isUserTurn);
	}
	function turnEnd() {
		self.yourTurnButton.hide();
	}

	gui.fightManager.on('fightEnterPreparation', function () {
		self.deactivate(); // for the case we started a fight while the chat is open, hide it
	});

	gui.fightManager.on('fightStart', function () {
		self.yourTurnButton.hide();
		self.setDisplayMode(DISPLAY_MODES.FIGHT);
	});

	gui.fightManager.on(FightEventEnum.FIGHT_END, function () {
		turnEnd();
		self.setDisplayMode(DISPLAY_MODES.ROLEPLAY);
	});

	gui.on('GameFightTurnStartMessage', turnStart);
	gui.on('GameFightTurnResumeMessage', turnStart);
	gui.on('GameFightTurnStartSlaveMessage', turnStart);
	gui.on('GameFightTurnEndMessage', turnEnd);

	gui.on('resize', function () {
		self._resize();
	});

	gui.on('disconnect', function () {
		self.deactivate();
	});

	keyboard.on('show', function (keyboardHeight) {
		self.keyboardHeight = keyboardHeight;
		self.setDimensions();
	});

	keyboard.on('hide', function () {
		// In fight closing the keyboard hides the chat; in Roleplay we leave the chat open
		// (e.g. for emoticons & smileys)
		if (gui.playerData.isFighting) {
			self.deactivate();
		}
	});
};

Chat.prototype.setDisplayMode = function (displayMode) {
	if (this.displayMode === displayMode) {
		return;
	}
	if (!this.active) {
		this.displayMode = displayMode;
		return;
	}
	this.removeDisplayMode();
	this.displayMode = displayMode;
	this.addDisplayMode();
	this.setDimensions();
};

Chat.prototype.removeDisplayMode = function () {
	switch (this.displayMode) {
		case DISPLAY_MODES.FIGHT:
			window.gui.timeline.restoreFighterList();
			this.delClassNames('fightMode');
			break;
		default:
			break;
	}
};

Chat.prototype.addDisplayMode = function () {
	if (this.displayMode === DISPLAY_MODES.FIGHT) {
		this.addClassNames('fightMode');
		window.gui.timeline.appendFighterListTo(this.timelineBox);
	}
};

Chat.prototype.setDimensions = function () {
	switch (this.displayMode) {
		case DISPLAY_MODES.FIGHT:
			this.logWrapper.windowWidth = dimensions.screenWidth;
			// Keyboard's height is in physical pixel
			var physicalHeightAvailable = dimensions.physicalScreenHeight - this.keyboardHeight;
			this.logWrapper.windowHeight = physicalHeightAvailable * dimensions.physicalToViewportRatio;
			this.logWrapper.resizeHandle.hide();
			break;
		default:
			this.logWrapper.windowWidth = this.savedWidth || Math.round(dimensions.mapWidth * 0.45);
			this.logWrapper.windowHeight = this.savedHeight || Math.round(dimensions.mapHeight * 0.45);
			this.logWrapper.resizeHandle.show();
			break;
	}
	this.logWrapper.setStyles({
		width: this.logWrapper.windowWidth + 'px',
		height: this.logWrapper.windowHeight + 'px'
	});
	this._refreshScroller();
};

/** Sends a chat message (channel or private)
 *  @param {string} text
 *  @param {int} channel - a channel number
 *  @param {string} [receiver] - if given, this is a private message (channel is ignored) */
Chat.prototype.sendChatMessage = function (text, channel, receiver) {
	if (receiver) {
		window.dofus.sendMessage('ChatClientPrivateMessage', {
			content: this._getUriEncodedString(text),
			receiver: receiver
		});
	} else {
		window.dofus.sendMessage('ChatClientMultiMessage', {
			content: this._getUriEncodedString(text),
			channel: channel
		});
	}
};

Chat.prototype._getUriEncodedString = function (str) {
	var returnString = '';
	for (var i = 0; i < str.length; i++) {
		var currentCharCode = str.charCodeAt(i);
		if (currentCharCode > 0xFF) {
			var converted = escape(str[i]);
			returnString += converted;
		} else {
			returnString += str[i];
		}
	}
	return returnString;
};

Chat.prototype._getUriDecodedString = function (str) {
	return unescape(str);
};

/** Called when player submits a new chat command. Private use. */
Chat.prototype.submit = function () {
	this.logScroller.goToBottom();
	var inputText = this.inputChat.getValue().trim();
	var channel = this.outgoingChannel; // unless a command is given we use the current outgoing channel
	var msgReceiver = null;

	var cmd = cmdRegExp.exec(inputText);
	if (cmd) {
		cmd = cmd[1].toLowerCase();

		var args = inputText.split(' ').slice(1); // remove the first element and return a copy
		var isSpecial = specialCmd(cmd, args);
		if (isSpecial) {
			this._setInput('');
			return;
		}

		channel = chatCommands[cmd];
		if (channel === undefined) {
			//TODO add emoticon here e.g. "/sit"
			return this._showNotification(getText('ui.console.notfound', inputText.substr(1).split(' ')[0]));
		}
		inputText = inputText.substr(cmd.length + 2); // remove the command and space (e.g. "/w ")
	}
	if (channel === PRIVATE_CHANNEL) {
		var spacePos = inputText.indexOf(' ');
		msgReceiver = inputText.substr(0, spacePos);
		inputText = inputText.substr(spacePos); // NB: substr(-1) would give us the last character; all good
		if (!msgReceiver || !inputText ||
			msgReceiver.length < protocolConstants.MIN_NICK_LEN || msgReceiver.length > protocolConstants.MAX_NICK_LEN) {
			return this._showNotification(getText('tablet.chat.privateReceiverHelp'));
		}
		this.previousPrivateReceiver = msgReceiver;
	}
	//strip blanks and don't send empty message
	inputText = inputText.trim();
	if (!inputText) { return; }
	var extraLen = inputText.length - protocolConstants.USER_MAX_CHAT_LEN;
	if (extraLen > 0) { return this._showNotification(getText('tablet.chat.messageTooLong', extraLen)); }

	// Keep last message sent (before link replacements)
	this.previousInput = inputText;

	for (var i = 0; i < this.linksToReplace.length; i++) {
		var link = this.linksToReplace[i];
		inputText = inputText.replace(link[0], link[1]);
	}
	this.previousLinks = this.linksToReplace;
	this.linksToReplace = [];

	this.sendChatMessage(inputText, channel, msgReceiver);
	this._setInput('');
};

/**
 * Clears / reinitialises the input box before player can type his next message.
 * NB: this is NOT called when we can detect an invalid message before sending it, in order to
 *     let player edit previous message. We can reconsider this behavior when we give "Prev/Next message" buttons
 */
Chat.prototype._setInput = function (text, wasError) {
	if (this.outgoingChannel === PRIVATE_CHANNEL && this.previousPrivateReceiver) {
		this.inputChat.setValue(this.previousPrivateReceiver + ' ' + text);
		// For error, moving caret after receiver name so player can fix typo (on tablets, moving caret is a pain)
		if (wasError) {
			this.inputChat.setCaretPosition(this.previousPrivateReceiver.length);
		}
	} else {
		this.inputChat.setValue(text);
	}
	if (wasError) {
		this.linksToReplace = this.previousLinks;
	}
};

/**
 * Called to open a private chat with someone (e.g. by hyperlinks etc.)
 * @param {str} msgReceiver - name of character OR account name (if isAccountName is true)
 * @param {boolean} isAccountName - pass true if msgReceiver contains the account name instead of character's name
 */
Chat.prototype.startPrivateMessage = function (msgReceiver, isAccountName) {
	if (isAccountName) {
		// add '*' to send chat directly to an accountName
		msgReceiver = '*' + msgReceiver;
	}

	if (this.outgoingChannel === PRIVATE_CHANNEL && msgReceiver !== this.previousPrivateReceiver) {
		removePrefix(this.inputChat, this.previousPrivateReceiver + ' ');
	}

	this.previousPrivateReceiver = msgReceiver;
	this._selectOutgoingChannel(PRIVATE_CHANNEL, /*isReset=*/true);

	this.activate();
};

Chat.prototype.activate = function () {
	var self = this;
	keyboard.disableScroll(true);
	this.addClassNames('open');
	this.active = true;
	if (!deviceInfo.isPhoneGap) {
		this.setDimensions();
	}

	this.addDisplayMode();
	this._refreshScroller();

	if (window.gui.textNotification) {
		window.gui.textNotification.hide();
	}
	// opening animation
	tweener.tween(this,
		{ webkitTransform: 'translate3d(0, 0, 0)' },
		{ time: 200, delay: 0, easing: 'ease-out' },
		function () {
			self.inputChat.focus();
		}
	);

	keyboard.setAutomaticHide(false);
};

Chat.prototype.deactivate = function () {
	if (!this.active) { return; }
	this.active = false;
	this.inputChat.blur();
	keyboard.disableScroll(false);

	this.savedWidth = this.logWrapper.windowWidth;
	this.savedHeight = this.logWrapper.windowHeight;

	var self = this;
	tweener.tween(this,
		{ webkitTransform: 'translate3d(0, -' + this.logWrapper.windowHeight + 'px, 0)' },
		{ time: 200, delay: 0, easing: 'ease-out' },
		function () {
			self.removeDisplayMode();
			self.delClassNames('open');
		}
	);
	if (window.gui.textNotification) {
		window.gui.textNotification.show();
	}
	if (this.channelsLists) {
		this.channelsLists.hide();
	}

	keyboard.setAutomaticHide(true);
};

Chat.prototype._resize = function () {
	var isFirstResize = !this.logWrapper.windowHeight;
	this.setDimensions();
	// deactivate the chat (NB: we needed to wait until we knew the screen size)
	if (isFirstResize) { this.deactivate(); }
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/mainUi/Chat/index.js
 ** module id = 441
 ** module chunks = 0
 **/