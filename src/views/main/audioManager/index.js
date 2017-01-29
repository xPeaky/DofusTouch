var GameContextEnum = require('GameContextEnum');
var AudioManager    = require('audio-manager');
var uiSoundEnum     = require('./uiSoundEnum.js');
var constants       = require('constants');
var deviceInfo      = require('deviceInfo');
var SoundCordova    = require('./SoundCordova.js');
var SoundYanap      = require('./SoundYanap.js');

var SOUND_TYPE = [null, 'music', 'ambient', 'fight', 'boss'];

var roleplayMusic = null;
var fightMusic    = null;
var bossMusic     = null;
var ambientLoop   = null;
var uiSoundsReady = false;


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
var audioManager = new AudioManager(['music', 'ambient', 'sfx', 'ui']);
audioManager.settings.maxUsedMemory = constants.MAX_MUSIC_SFX_MEMORY;

if (window.wizAssets) {
	audioManager.settings.getFileUri = function wizAssetsGetUri(audioPath, id, cb) {
		window.wizAssets.downloadFile(audioPath + id + '.mp3', 'audio/' + id + '.mp3',
			function onSuccess(uri) {
				cb(null, uri);
			},
			cb // onFail callback
		);
	};
}

// WebView's WebAudio tends to consume a large amount of memory. That's why we are replacing it
// by a native plugin with a much lower memory footprint to fix crashes on devices such as iPad2
// and iPad Air 2. The sad part being that this plugin is missing some cool features that are available
// with WebAudio (like fadings and panoramics).
// After having validated that the game is more stable with these plugins, we will be able to
// improve this solution by re-implementing missing features (fading in javascript, panoramic in native...).
if (deviceInfo.isCordova) {
	audioManager.settings.getSoundConstructor = function (channelId /*, soundId*/) {
		if (deviceInfo.isIOSApp && SoundCordova.isAvailable()) {
			return SoundCordova;
		} else if (deviceInfo.isAndroidApp && SoundYanap.isAvailable()) {
			if (channelId === 'music' || channelId === 'ambient') {
				return SoundYanap.LoopYanap;
			} else if (channelId === 'sfx' || channelId === 'ui') {
				return SoundYanap.SoundYanap;
			} else if (channelId === undefined) {
				// TODO: audioManager's createSoundGroup should support channelId forwarding
				// + add the parameter in createAnimSoundGroups
				return SoundYanap.SoundYanap;
			} else {
				console.error(new Error('audioManager: unknown channelId `' + channelId + '`'));
			}
		} else {
			return null;
		}
	};
}

var exports = module.exports = audioManager;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Visibility of the webview changed, we check if we have to mute or unmute */
function setupEvents() {
	window.gui.on('appOnBackground', function () {
		audioManager.setMute(true);
	});

	window.gui.on('appBackFromBackground', function () {
		audioManager.setMute(false);
	});
}

exports.initialize = function () {
	audioManager.init();
	setupEvents();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Create all UI sound instance */
function createUiSounds() {
	for (var id in uiSoundEnum) {
		audioManager.createSoundPermanent(uiSoundEnum[id], 'ui');
	}
	uiSoundsReady = true;
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Create one UI sound instance */
exports.createUiSound = function (uiSoundId) {
	audioManager.createSoundPermanent(uiSoundEnum[uiSoundId], 'ui');
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Play a UI sound
 *
 * @param {String} uiSoundId - ui sound id, a string found in uiSoundEnum. e.g. 'OK_BUTTON', 'SCROLL_UP'
 */
exports.playUiSound = function (uiSoundId) {
	if (audioManager.channels.ui.muted) { return; }
	var soundId = uiSoundEnum[uiSoundId];
	if (!soundId) { return console.warn('Incorrect UI sound id: ' + uiSoundId); }
	if (!uiSoundsReady) { createUiSounds(); }
	audioManager.playSound('ui', soundId);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Map changed, we check if ambient or music should change.
 *
 * @param {Object[]} areaSounds
 *        {number}   areaSounds[*].id
 * @param {Object[]} mapSounds
 */
exports.mapChange = function (areaSounds, mapSounds) {
	//jscs:disable requireCamelCaseOrUpperCaseIdentifiers

	var soundList = {
		music:   null,
		ambient: null,
		fight:   null,
		boss:    null
	};

	// map sounds have priority over area sounds
	mapSounds = areaSounds.concat(mapSounds);

	for (var i = 0; i < mapSounds.length; i++) {
		var mapSound  = mapSounds[i];
		var soundType = SOUND_TYPE[mapSound.type_id];
		if (!soundType) { continue; }
		soundList[soundType] = mapSound;
	}

	roleplayMusic = soundList.music   || roleplayMusic;
	ambientLoop   = soundList.ambient || ambientLoop;
	fightMusic    = soundList.fight;
	bossMusic     = soundList.boss;

	// mapChange is called in roleplay or in fight reconnection
	playBackgroundAudio(window.gui.gameContext);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Change game context from roleplay to fight or vice versa
 *
 * @param {number}  gameContextId - context id, Cf. GameContextEnum
 * @param {boolean} [isBoss] - in fight context only: are we fighting a boss ?
 */
exports.changeGameContext = function (gameContextId, isBoss) {
	// music changes during fight
	playBackgroundAudio(gameContextId, isBoss);
};

function playBackgroundAudio(gameContextId, isBoss) {
	// music changes during fight
	if (roleplayMusic && gameContextId === GameContextEnum.ROLE_PLAY) {
		audioManager.playLoopSound('music', roleplayMusic.id, roleplayMusic.volume / 100);
	} else if (gameContextId === GameContextEnum.FIGHT) {
		var music = isBoss && bossMusic ? bossMusic : fightMusic;
		if (music) { audioManager.playLoopSound('music', music.id, music.volume / 100); }
	}

	// ambient sounds are stopped during fight
	if (ambientLoop) {
		if (gameContextId === GameContextEnum.ROLE_PLAY) {
			audioManager.playLoopSound('ambient', ambientLoop.id, ambientLoop.volume / 100);
		} else {
			audioManager.stopLoopSound('ambient');
		}
	}
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Create animataion sound groups.
 *
 * @param {Object}   soundGroupDefs          - definitions of sound groups
 *        {String[]} soundGroupDefs[*].id    - sound ids
 *        {String[]} soundGroupDefs[*].vol   - sound volumes. vol:[0..100]
 * @param {String}  [channelId]              - channel id the sound group will play in
 */
exports.createAnimSoundGroups = function (soundGroupDefs, channelId) {
	var muted = channelId !== undefined ? audioManager.channels[channelId].muted : false;
	for (var soundGroupId in soundGroupDefs) {
		var def = soundGroupDefs[soundGroupId];
		var vol = [];
		for (var i = 0; i < def.vol.length; i++) {
			vol.push(def.vol[i] / 100);
		}
		audioManager.createSoundGroup(soundGroupId, { id: def.id, vol: vol }, muted);
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
exports.setChannelVolume = function (channelId, volume, muted) {
	// for memory reasons, we only 'music' or 'ambient' channel should be active.
	// 'music' has the priority over 'ambient'

	var musicChannel = audioManager.channels.music;

	// unmute ambient if music is disabled
	if (channelId === 'music') {
		audioManager.channels.ambient.setMute(volume !== 0);
	}

	// don't unmute ambient if music channel is enabled
	if (channelId === 'ambient' && !musicChannel.muted && musicChannel.volume > 0) {
		muted = true;
	}

	audioManager.setVolume(channelId, volume, muted);

	// in UI, 'ambient' and 'sfx' channels are grouped under the same id ('sfx')
	if (channelId === 'sfx') { this.setChannelVolume('ambient', volume); }
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
exports.setupChannels = function (soundPrefs) {
	// mute 'ambient' channel by default.
	audioManager.setVolume('ambient', 0, true);

	for (var channelId in soundPrefs) {
		if (channelId === 'ambient') { continue; }
		var params = soundPrefs[channelId];
		this.setChannelVolume(channelId, params.volume, params.muted);
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Return user preference's default object for audio */
exports.getDefaultParams = function () {
	var params = {};
	for (var channelId in audioManager.channels) {
		if (channelId === 'ambient') { continue; }
		// music is disabled by default on iPad2 and iPad mini 1
		var isMuted = (channelId === 'music') && deviceInfo.isIpad2;
		var volume = isMuted ? 0 : 1;
		params[channelId] = { muted: isMuted, volume: volume };
	}
	return params;
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/audioManager/index.js
 ** module id = 84
 ** module chunks = 0
 **/