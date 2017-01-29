require('./styles.less');
var WuiDom       = require('wuidom');
var Button       = require('Button').DofusButton;
var inherits     = require('util').inherits;
var userPref     = require('UserPreferences');
var audioManager = require('audioManager');

function SoundChannelVolume(preferences, channelId, label) {
	WuiDom.call(this, 'div', { className: 'SoundChannelVolume' });
	var self = this;

	this.channelId   = channelId;
	this.preferences = preferences;

	this.createChild('div', { className: 'label', text: label });
	var volumeButtons = this.createChild('div', { className: 'volumeButtons' });
	var buttons = this.buttons = [];

	function onTap() {
		self.changeVolume(this.volume);
		audioManager.playUiSound('SPEC_BUTTON');
	}

	for (var i = 0; i < 5; i++) {
		var button = volumeButtons.appendChild(new Button('', { className: ['volume', 'volume' + i] }));
		buttons.push(button);
		button.volume = i / 4;
		button.disable();
		button.on('tap', onTap);
	}

	preferences[this.channelId] = preferences[this.channelId] || { volume: 0, muted: true };
	this.setPosition(preferences[this.channelId].volume || 0);
}
inherits(SoundChannelVolume, WuiDom);
module.exports = SoundChannelVolume;

SoundChannelVolume.prototype.setPosition = function (volume) {
	volume = Math.max(0, Math.min(4, ~~(volume * 4)));
	for (var i = 0; i < 5; i++) {
		this.buttons[i].enable();
	}
	this.buttons[volume].disable();
};

SoundChannelVolume.prototype.changeVolume = function (volume) {
	audioManager.setChannelVolume(this.channelId, volume);
	this.setPosition(volume);
	this.preferences[this.channelId].volume = volume;
	this.preferences[this.channelId].muted  = volume === 0;
	userPref.setValue('soundPreferences', this.preferences, null, true);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/SoundChannelVolume/index.js
 ** module id = 949
 ** module chunks = 0
 **/