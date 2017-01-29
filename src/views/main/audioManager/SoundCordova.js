var inherits   = require('util').inherits;
var ISound     = require('audio-manager').ISound;
var deviceInfo = require('deviceInfo');

var init = false;

var isIos80xError3Reported = false;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
function SoundCordova() {
	if (!SoundCordova.isAvailable()) {
		return console.error(new Error('SoundCordova: cordova media plugin is not available'));
	}
	ISound.call(this);

	this.media = null;
	this.uri = null;
	this.errorOccured = false;

	if (!init) {
		window.Media.shouldReleaseOnMemoryWarning(false);
		init = true;
	}
}

inherits(SoundCordova, ISound);
module.exports = SoundCordova;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
SoundCordova.isAvailable = function () {
	return deviceInfo.isCordova && window.Media;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
SoundCordova.prototype.setVolume = function (value) {
	ISound.prototype.setVolume.call(this, value);
	if (!this.media) { return; }
	this.media.setVolume(value);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
SoundCordova.prototype._load = function () {
	var self = this;

	if (self.errorOccured) {
		return this._finalizeLoad('previouslyFailed');
	}

	// executes after a Media object has completed the current play, record, or stop action
	function mediaSuccess() {
		// TODO: if no loop or on android, update this.playing to false. here or on status change?
		/*if (deviceInfo.isAndroidApp) {
			// TODO: we need to trigger the loop manually on android. here or on status change?
		}*/
	}

	// executes if an error occurs (anything, from loading to invalid operation)
	function mediaError(error) {
		// We want to report only the first error of the instance (consecutive errors are meaningless)
		var reportError = !self.errorOccured;

		// We throw the error MEDIA_ERR_DECODE on iOS 8.0.x only one time per game session, cf:
		// - https://issues.apache.org/jira/browse/CB-7517
		// - https://groups.google.com/forum/?hl=en?hl%3Den#!topic/phonegap/Zb7NQsr6wCQ
		var isIos80x = deviceInfo.isIOSApp && window.navigator.userAgent.indexOf('iPad; CPU OS 8_0') !== -1;
		if (error.code === 3 && isIos80x) {
			if (isIos80xError3Reported) {
				reportError = false;
			}
			isIos80xError3Reported = true;
		}

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
			console.error('SoundCordova: ' + JSON.stringify(error) + ', file: ' + self.uri);
		}
	}

	// executes to indicate status changes
	function mediaStatus(/*status*/) {
		if (self.usedMemory) { return; }
		var duration = Number(self.media.getDuration());
		if (!duration || duration < 0) { return; }
		self.usedMemory = duration;
		self.audioManager.usedMemory += duration;
	}

	function loadAudio(uri) {
		self.uri = uri;
		self.media = new window.Media(uri, mediaSuccess, mediaError, mediaStatus);
		if (self._loading && !self.errorOccured) {
			self._finalizeLoad(null); // Cordova Audio plugin does not send an error immediatly
		}
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
SoundCordova.prototype.unload = function () {
	if (ISound.prototype.unload.call(this)) {
		if (!this.media) { return; }
		this.media.stop();
		this.media.release();
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
SoundCordova.prototype._play = function () {
	if (!this.media) { return; }
	if (this.errorOccured) { return; }
	this.media.setVolume(this.volume);
	if (this.loop && this.playing) { return; }
	this.media.seekTo(0);
	this.media.play({
		numberOfLoops: this.loop ? 0 : 1,  // iOS only
		playAudioWhenScreenIsLocked: false // iOS only
	});
	this.playing = true;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
SoundCordova.prototype.stop = function (cb) {
	if (!this.media) { return cb && cb(); }
	this.media.stop();
	return ISound.prototype.stop.call(this, cb);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/audioManager/SoundCordova.js
 ** module id = 94
 ** module chunks = 0
 **/