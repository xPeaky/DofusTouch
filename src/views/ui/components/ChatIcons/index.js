require('./styles.less');
var addTooltip = require('TooltipBox').addTooltip;
var getText = require('getText').getText;
var inherits = require('util').inherits;
var WuiDom = require('wuidom');
var tapBehavior = require('tapBehavior');
var assetPreloading = require('assetPreloading');
var getElementPositionAround = require('positionHelper').getElementPositionAround;
var keyboard = require('keyboard');

var MoodResultEnum = require('MoodResultEnum');

function ChatIcons() {
	var self = this;
	WuiDom.call(this, 'div', { className: 'ChatIcons' });

	this.openPanel = null;

	var buttons = this.createChild('div', { className: 'buttons' });
	this.smileysButton = buttons.createChild('div', { className: 'smileysButton', tooltip: getText('ui.chat.smilies') });
	this.attitudesButton = buttons.createChild('div', {
		className: 'attitudesButton', tooltip: getText('ui.common.emotes') });

	addTooltip(this.smileysButton, getText('ui.chat.smilies'));
	addTooltip(this.attitudesButton, getText('ui.common.emotes'));

	var panels = this.createChild('div');
	this.smileysPanel = panels.createChild('div', { className: 'smileysPanel' });
	this.attitudesPanel = panels.createChild('div', { className: 'attitudesPanel' });
	this.smileysPanel.hide();
	this.attitudesPanel.hide();

	this.smileysButton.on('tap', function () {
		keyboard.hide();
		if (self.openPanel === 'smileys') {
			self.closePanels();
		} else {
			self.openSmileys();
			self.emit('activated');
		}
	});
	this.attitudesButton.on('tap', function () {
		keyboard.hide();
		if (self.openPanel === 'attitudes') {
			self.closePanels();
		} else {
			self.openAttitudes();
			self.emit('activated');
		}
	});

	keyboard.on('show', function () {
		if (self.openPanel === 'smileys' || self.openPanel === 'attitudes') {
			self.closePanels();
		}
	});

	this.once('open', this.loadIcons);

	this.attitudeList = {}; // list to keep track of the created WuiDom instances;

	this.currentMood = null;
	this.previousMood = -1;

	this.setMessageHandlers();
}

inherits(ChatIcons, WuiDom);
module.exports = ChatIcons;

ChatIcons.prototype.setMessageHandlers = function () {
	var self = this;
	var gui = window.gui;

	gui.on('MoodSmileyResultMessage', function (msg) {
		var resultCode = msg.resultCode;
		if (resultCode === MoodResultEnum.MOOD_ERROR_UNKNOWN) {
			self.setCurrentMood(self.previousMood);
			return gui.openSimplePopup(getText('ui.smiley.errorMood'));
		} else if (resultCode === MoodResultEnum.MOOD_ERROR_FLOOD) {
			self.setCurrentMood(self.previousMood);
			return gui.openSimplePopup(getText('ui.smiley.errorFloodMood'));
		}
		self.setCurrentMood(msg.smileyId);
		self.previousMood = msg.smileyId;
	});

	gui.on('disconnect', function () {
		self.setCurrentMood(-1);
		self.previousMood = -1;
	});
};

ChatIcons.prototype.bindToPlayerEmoteData = function () {
	var self = this;

	var emoteData = window.gui.playerData.emoteData;
	emoteData.on('emoteAdded', function (emote) {
		assetPreloading.preloadImage('gfx/emotes/' + emote.id + '.png', function (url) {
			self.addAttitudeIcon(emote, url);
		});
	});

	emoteData.on('emoteRemoved', function (emoteId) {
		self.removeAttitudeIcon(emoteId);
	});

	emoteData.on('emoteListUpdated', function (emoteList) {
		self.loadEmotes(emoteList);
	});
};

ChatIcons.prototype.loadIcons = function () {
	var self = this;

	// emotes
	this.loadEmotes(window.gui.playerData.emoteData.list);

	// smileys
	this.smileysPanel.addClassNames('spinner');

	var smileysList = window.gui.databases.Smileys;
	var smileyIds = Object.keys(smileysList);
	var images = [];
	for (var i = 0; i < smileyIds.length; i++) {
		images.push('gfx/smilies/' + smileysList[smileyIds[i]].gfxId + '.png');
	}

	assetPreloading.preloadImages(images, function (urls) {
		for (var i = 0; i < urls.length; i++) {
			self.addSmileyIcon(smileysList[smileyIds[i]], urls[i]);
		}
		self.smileysPanel.delClassNames('spinner');
	});

	this.bindToPlayerEmoteData();
};

ChatIcons.prototype.loadEmotes = function (emoteList) {
	var self = this;
	this.attitudesPanel.clearContent();
	this.attitudeList = {};

	this.attitudesPanel.addClassNames('spinner');

	var emoteIds = Object.keys(emoteList);
	emoteIds = emoteIds.map(function (id) {
		return parseInt(id, 10);
	});
	emoteIds = emoteIds.sort(function (a, b) {
		return a - b;
	});

	var images = [];
	for (var i = 0; i < emoteIds.length; i++) {
		images.push('gfx/emotes/' + emoteIds[i] + '.png');
	}
	assetPreloading.preloadImages(images, function (urls) {
		for (var i = 0; i < urls.length; i++) {
			self.addAttitudeIcon(emoteList[emoteIds[i]], urls[i]);
		}
		self.attitudesPanel.delClassNames('spinner');
	});
};

ChatIcons.prototype.addAttitudeIcon = function (data, url) {
	var self = this;
	var icon = this.attitudesPanel.createChild('div', { className: ['chatIcon', 'attitudeIcon'] });
	icon.id = data.id;
	icon.setStyle('backgroundImage', url);
	this.attitudeList[data.id] = icon;

	function attitudeTapped() {
		window.dofus.sendMessage('EmotePlayRequestMessage', {
			emoteId: this.id
		});
		self.closePanels();
	}

	tapBehavior(icon);
	icon.on('tap', attitudeTapped);
};

ChatIcons.prototype.removeAttitudeIcon = function (id) {
	var icon = this.attitudeList[id];
	if (!icon) {
		return;
	}

	icon.destroy();
	delete this.attitudeList[id];
};

ChatIcons.prototype.setCurrentMood = function (id) {
	var currentMood = this.smileysPanel.getChild(id);
	if (this.currentMood !== currentMood) {
		if (this.currentMood) {
			this.currentMood.delClassNames('mood');
		}
		if (currentMood) {
			currentMood.addClassNames('mood');
		}
		this.currentMood = currentMood;
	}
};

ChatIcons.prototype.addSmileyIcon = function (data, url) {
	if (!data.forPlayers) { return; }
	var self = this;
	var icon = new WuiDom('div', { name: data.id, className: ['chatIcon', 'smileyIcon'] });
	icon.id = data.id;
	icon.setStyle('backgroundImage', url);
	tapBehavior(icon);
	icon.on('tap', smileyTapped);
	icon.on('longtap', smileyLongTapped);
	this.smileysPanel.appendChild(icon);

	function smileyTapped() {
		// `this` is icon
		window.dofus.sendMessage('ChatSmileyRequestMessage', {
			smileyId: this.id
		});
		self.closePanels();
	}

	function smileyLongTapped() {
		// `this` is icon
		var smileyId = self.currentMood === this ? -1 : this.id;
		self.setCurrentMood(smileyId);
		window.dofus.sendMessage('MoodSmileyRequestMessage', { smileyId: smileyId });
	}
};

ChatIcons.prototype.openSmileys = function () {
	this.emit('open');
	this.attitudesPanel.hide();
	this.smileysPanel.show();
	this.openPanel = 'smileys';
};

ChatIcons.prototype.openAttitudes = function () {
	this.emit('open');
	this.smileysPanel.hide();
	this.attitudesPanel.show();
	this.openPanel = 'attitudes';
};

ChatIcons.prototype.closePanels = function () {
	this.emit('closing');
	this.smileysPanel.hide();
	this.attitudesPanel.hide();
	this.openPanel = null;
};

ChatIcons.prototype.setPanelsStyle = function (style, value) {
	this.smileysPanel.setStyle(style, value);
	this.attitudesPanel.setStyle(style, value);
};

//This doesn't work when one of the parents is position absolute
ChatIcons.prototype.positionPanel = function () {
	function setpos(panel, button) {
		var position = getElementPositionAround(panel, button);
		panel.setStyles({
			left: position.x + 'px',
			top: position.y + 'px'
		});
	}

	setpos(this.smileysPanel, this.smileysButton);
	setpos(this.attitudesPanel, this.attitudesButton);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/ChatIcons/index.js
 ** module id = 443
 ** module chunks = 0
 **/