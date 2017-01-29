var inherits   = require('util').inherits;
var ISound     = require('audio-manager').ISound;
var deviceInfo = require('deviceInfo');

var FILE_SIZE_TO_LENGTH_RATIO = 12000; // average kb/sec

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
function isAvailable() {
	return deviceInfo.isAndroidApp && window.cordova.plugins.Yanap;
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
function YanapAudioInstance() {
	if (!isAvailable()) {
		return console.error(new Error('YanapAudioInstance: Yanap plugin is not available'));
	}

	ISound.call(this);

	this.audioMode = null;
	this.media = null;
	this.uri = null;
	this.errorOccured = false;
}
inherits(YanapAudioInstance, ISound);

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
YanapAudioInstance.prototype.setVolume = function (value) {
	ISound.prototype.setVolume.call(this, value);
	if (!this.media) { return; }
	this.media.setVolume(value, value);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
YanapAudioInstance.prototype._load = function () {
	var self = this;

	if (self.errorOccured) {
		return this._finalizeLoad('previouslyFailed');
	}

	// executes if an error occurs (anything, from loading to invalid operation)
	function mediaError(error) {
		// We want to report only the first error of the instance (consecutive errors are meaningless)
		var reportError = !self.errorOccured;

		// If error happened during the loading, we need to finalize
		if (self._loading) {
			self._finalizeLoad(error);
		}

		// Unloading happens only the first time an error occured on an instance
		if (!self.errorOccured) {
			self.unload();
		}

		self.errorOccured = true;

		if (reportError) {
			console.error('SoundYanap: ' + JSON.stringify(error) + ', file: ' + self.uri);
		}
	}

	// executes to indicate status changes
	function mediaStatus(statusCode, additionalInfo) {
		if (statusCode === window.cordova.plugins.Yanap.AUDIO_INSTANCE_STATUS.ERROR) {
			return mediaError(additionalInfo);
		}
		// set used memory if not done yet
		if (self.usedMemory) { return; }
		if (!self.media || !self.media.fileLength) { return; }
		var duration = ~~self.media.fileLength / FILE_SIZE_TO_LENGTH_RATIO;
		if (duration <= 0) { return; }
		self.usedMemory = duration;
		self.audioManager.usedMemory += duration;
	}

	function loadAudio(uri) {
		self.uri = uri;
		self.media = new window.cordova.plugins.Yanap.AudioInstance(self.audioMode, mediaStatus);

		// TODO: remove this line as soon as a build with Yanap >= 0.8.8 and WizAssets > 5.0.0 is deployed
		if (window.wizAssets && !window.wizAssets.initialize) { uri = uri.substr(uri.indexOf('/audio/') + 1); }

		self.media.load(uri);
		self._finalizeLoad(null);
	}

	var getFileUri = self.audioManager.settings.getFileUri;
	var audioPath  = self.audioManager.settings.audioPath;

	if (getFileUri.length > 2) {
		// asynchronous
		getFileUri(audioPath, self.id, function onUri(error, uri) {
			if (error) { return self._finalizeLoad(error); }
			loadAudio(uri);
		});
	} else {
		// synchronous
		try {
			var uri = getFileUri(audioPath, self.id);
			if (!uri) { return self._finalizeLoad('emptyUri'); }
			loadAudio(uri);
		} catch (error) {
			self._finalizeLoad(error);
		}
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
YanapAudioInstance.prototype.unload = function () {
	if (ISound.prototype.unload.call(this)) {
		if (!this.media) { return; }
		this.media.stop();
		this.media.release();
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
YanapAudioInstance.prototype._play = function () {
	if (!this.media) { return; }
	if (this.errorOccured) { return; }
	this.media.setVolume(this.volume, this.volume);
	this.media.play();
	this.playing = true;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
YanapAudioInstance.prototype.stop = function (cb) {
	if (!this.media) { return cb && cb(); }
	this.media.stop();
	return ISound.prototype.stop.call(this, cb);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

function LoopYanap() {
	YanapAudioInstance.call(this);
	this.audioMode = window.cordova.plugins.Yanap.AUDIO_TYPE.LOOP;
}

function MusicYanap() {
	YanapAudioInstance.call(this);
	this.audioMode = window.cordova.plugins.Yanap.AUDIO_TYPE.MUSIC;
}

function SoundYanap() {
	YanapAudioInstance.call(this);
	this.audioMode = window.cordova.plugins.Yanap.AUDIO_TYPE.SOUND;
}

inherits(LoopYanap, YanapAudioInstance);
inherits(MusicYanap, YanapAudioInstance);
inherits(SoundYanap, YanapAudioInstance);

module.exports = {
	LoopYanap: LoopYanap,
	MusicYanap: MusicYanap,
	SoundYanap: SoundYanap,
	isAvailable: isAvailable
};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/audioManager/SoundYanap.js
 ** module id = 95
 ** module chunks = 0
 **/