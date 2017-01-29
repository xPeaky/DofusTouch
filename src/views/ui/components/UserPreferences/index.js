
var PREF_NAME = 'dofus.1';
var DEFAULT_SAVE_DELAY = 180; //in seconds
var ALL_USERS_KEY = 'all'; //prefix for global "all users" keys


/** @class */
function UserPreferences() {
	this._hasListeners = false;
	this.autosave = null;
	this.nextSaveTime = 0;
	this.accountName = null;
	this.prefs = {};
	this._load();
}

/** Call "close" if your app is terminating now. This will make sure latest data changes are saved. */
UserPreferences.prototype.close = function () {
	this.setAccount(null);
};

/**
 * @summary Add the listeners
 * (cannot be call directly on the constructor because gui is not yet initialize)
 * With the variable `this._hasListeners` the listeners will be added just ONCE
 * @private
 */
UserPreferences.prototype._setupListeners = function () {
	if (this._hasListeners) {
		return;
	}
	var self = this;

	// We want to save the userPref when the app goes on background.
	window.gui.on('appOnBackground', function () {
		// self.accountName === null means the player is disconnect (we already saved on close())
		// also self.autosave being falsy means that there is nothing to save
		// in that case no needs to save when the app goes on background
		if (self.accountName !== null && self.autosave) {
			self._save();
		}
	});

	this._hasListeners = true;
};

/** Sets the "scope" of stored values with the current account name
 *  @param {string|null} accountName - the account name or null to "exit" previous account scope */
UserPreferences.prototype.setAccount = function (accountName) {
	if (this.autosave) {
		this._save();
	}
	this.accountName = accountName;
	// setup the listener here because gui is not available before
	this._setupListeners();
};

/** @private */
UserPreferences.prototype._load = function () {
	try {
		var content = window.localStorage.getItem(PREF_NAME);
		if (content) {
			this.prefs = JSON.parse(content);
		}
	} catch (err) {
		console.warn('Failed to load user preferences: ' + err);
	}
};

/** Schedules the next autosave
 *  @private
 *  @param {int} [saveAfter] - maximum delay before next autosave (in second); NB: could be saved earlier */
UserPreferences.prototype._scheduleNextSave = function (saveAfter) {
	var self = this;
	if (!saveAfter) {
		//NB: we refuse "0" as delay, sign of someone ignoring the API doc
		saveAfter = DEFAULT_SAVE_DELAY;
	}
	var nextSaveTime = Date.now() + saveAfter * 1000;

	//if already scheduled and for a time coming before the current request, we are fine just doing nothing
	if (this.autosave && this.nextSaveTime <= nextSaveTime) {
		return;
	}

	//we need to schedule (or reschedule) the next save
	if (this.autosave) {
		window.clearTimeout(this.autosave);
	}
	this.nextSaveTime = nextSaveTime;
	this.autosave = window.setTimeout(function () {
		self.autosave = null;
		self._save();
	}, saveAfter * 1000);
};

/** Saves all modified values right now.
 *  @private */
UserPreferences.prototype._save = function () {
	try {
		if (this.autosave) {
			//cancel the current scheduling since we have been called "by force"
			window.clearTimeout(this.autosave);
			this.autosave = null;
		}
		window.localStorage.setItem(PREF_NAME, JSON.stringify(this.prefs));
	} catch (err) {
		console.warn('Failed to save user preferences: ' + err);
	}
};

/** Gets a value from user preferences
 *  @param {string} key - key name
 *  @param {any} defValue - value to be returned as default if no previous value was set
 *  @param {boolean} [global] - pass true to read a global (all accounts) value; false is default
 *  @return {any} the value (any type) */
UserPreferences.prototype.getValue = function (key, defValue, global) {
	key = (this.accountName && !global ? this.accountName : ALL_USERS_KEY) + '#' + key;
	var value = this.prefs[key];
	if (value === undefined) {
		return defValue;
	}
	return value;
};

/** Sets a value into user preferences
 *  @param {string} key - key name
 *  @param {any} value - value to be set, any type
 *  @param {int} [saveAfter] - maximum delay before next autosave (in second); NB: could be saved earlier
 *  @param {boolean} [global] - pass true to write a global (all accounts) value; false is default */
UserPreferences.prototype.setValue = function (key, value, saveAfter, global) {
	key = (this.accountName && !global ? this.accountName : ALL_USERS_KEY) + '#' + key;
	this.prefs[key] = value;

	this._scheduleNextSave(saveAfter);
};

/** Removes a value from user preferences
 *  @param {string} key - key name
 *  @param {int} [saveAfter] - maximum delay before next autosave (in second); NB: could be saved earlier
 *  @param {boolean} [global] - pass true to delete a global (all accounts) value; false is default */
UserPreferences.prototype.delValue = function (key, saveAfter, global) {
	key = (this.accountName && !global ? this.accountName : ALL_USERS_KEY) + '#' + key;
	delete this.prefs[key];

	this._scheduleNextSave(saveAfter);
};

var prefs = new UserPreferences();
module.exports = prefs;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/UserPreferences/index.js
 ** module id = 30
 ** module chunks = 0
 **/