/**
 * There are 2 main ways UI elements can be locked:
 *   - The automated/regular way: some buttons are not available if your character does not meet certain conditions,
 *     as the spouse interface being not available if you are not married. All these generic/simple enough logic should
 *     be hosted here, in this file: it's the condition method assigned to each feature (evaluateCurrent).
 *   - Specific/custom/tricky way: sometimes we want to disable a button very locally or temporary, as in the tutorial,
 *     they are unlocked one by one totally controlled by the tutorial logic, or another example, we want to block the
 *     mount feature when the breed window is opened because they are sharing some elements. In this case we can use
 *     the following methods: .lockFeature(), .unlockFeature(), .lockAllFeatures(), .unlockAllFeatures() by providing
 *     a reason ('tutorial' for instance). If you lock a feature this way, it will remains locked until you unlock it
 *     with the same reason parameter.
 * Everytime a feature's lock status change for any reason (from its regular behaviour or custom), an `updated` event
 *  is emitted, with the featureId, the news lock status and some additional information. UI elements related to a
 *  feature should listen this to know if an element is available or not (buttons, contextual menus, windows, tabs...).
 */

var inherits = require('util').inherits;
var EventEmitter = require('events.js').EventEmitter;

// ---------------------------
// -------- Constants --------
// ---------------------------

var LOCKED = true;
var AVAILABLE = false;

function returnAvailable() {
	return AVAILABLE;
}

// ---------------------------
// -------- Variables --------
// ---------------------------

var gui;

// ---------------------------
// ---------- Data -----------
// ---------------------------

var lockableFeatures = {
	carac: {
		windowId: 'characteristics', menuButtonId: 'Carac', evaluateCurrent: returnAvailable
	},
	spells: {
		windowId: 'grimoire', tabId: 'spells', menuButtonId: 'Spell', evaluateCurrent: returnAvailable
	},
	inventory: {
		windowId: 'equipment', menuButtonId: 'Bag', evaluateCurrent: returnAvailable
	},
	bidHouse: {
		windowId: 'bidHouseShop', menuButtonId: 'BidHouse', evaluateCurrent: returnAvailable
	},
	worldMap: {
		windowId: 'worldMap', menuButtonId: 'Map', evaluateCurrent: returnAvailable
	},
	friends: {
		windowId: 'social', tabId: 'friends', menuButtonId: 'Friend', evaluateCurrent: returnAvailable
	},
	quests: {
		windowId: 'grimoire', tabId: 'quests', menuButtonId: 'Book', evaluateCurrent: returnAvailable
	},
	guild: {
		windowId: 'social', tabId: 'guild', menuButtonId: 'Guild', evaluateCurrent: function () {
			return gui.playerData.guild.hasGuild() ? AVAILABLE : LOCKED;
		}
	},
	koliseum: {
		windowId: 'arena', menuButtonId: 'Conquest', evaluateCurrent: returnAvailable
	},
	market: {
		windowId: 'market', tabId: 'shop', menuButtonId: 'Goultine', evaluateCurrent: returnAvailable
	},
	job: {
		windowId: 'grimoire', tabId: 'jobs', menuButtonId: 'Job', evaluateCurrent: function () {
			return (gui.playerData.jobs && Object.keys(gui.playerData.jobs.list).length > 0) ? AVAILABLE : LOCKED;
		}
	},
	alliance: {
		windowId: 'social', tabId: 'alliance', menuButtonId: 'Alliance', evaluateCurrent: function () {
			return gui.playerData.alliance.hasAlliance() ? AVAILABLE : LOCKED;
		}
	},
	mount: {
		windowId: 'mount', menuButtonId: 'Mount', evaluateCurrent: function () {
			return gui.playerData.equippedMount ? AVAILABLE : LOCKED;
		}
	},
	directory: {
		windowId: 'social', tabId: 'directory', menuButtonId: 'Directory', evaluateCurrent: returnAvailable
	},
	alignment: {
		windowId: 'grimoire', tabId: 'alignment', menuButtonId: 'Alignment', evaluateCurrent: returnAvailable
	},
	bestiary: {
		windowId: 'grimoire', tabId: 'bestiary', menuButtonId: 'Bestiary', evaluateCurrent: returnAvailable
	},
	ornaments: {
		windowId: 'grimoire', tabId: 'ornaments', menuButtonId: 'Title', evaluateCurrent: returnAvailable
	},
	achievements: {
		windowId: 'grimoire', tabId: 'achievements', menuButtonId: 'Achievement', evaluateCurrent: returnAvailable
	},
	almanax: {
		windowId: 'grimoire', tabId: 'almanax', menuButtonId: 'Almanax', evaluateCurrent: returnAvailable
	},
	spouse: {
		windowId: 'social', tabId: 'spouse', menuButtonId: 'Spouse', evaluateCurrent: function () {
			return gui.playerData.socialData.spouse ? AVAILABLE : LOCKED;
		}
	},
	myShop: {
		windowId: 'tradeStorage', menuButtonId: 'Shop', evaluateCurrent: returnAvailable
	}
};

// ---------------------------
// ------- Constructor -------
// ---------------------------

function UiLocker() {
	gui = window.gui;
	EventEmitter.call(this);
	this.lockStatus = {};
	for (var featureId in lockableFeatures) {
		this.lockStatus[featureId] = {
			base: null,
			customLockedReasons: null
		};
	}
	this._setupEvents();
	this.updateAll();
}

inherits(UiLocker, EventEmitter);
module.exports = UiLocker;

// ---------------------------
// --------- Methods ---------
// ---------------------------

/**
 * Recheck all basic rules and update feature's basic lock flag
 */
UiLocker.prototype.updateAll = function () {
	for (var featureId in lockableFeatures) {
		this.updateFeatureId(featureId);
	}
};

/**
 * Recheck a specific feature's basic rule and update its basic lock flag
 * @param {string} featureId - any string contained in `lockableFeatures`
 */
UiLocker.prototype.updateFeatureId = function (featureId) {
	var featureData = lockableFeatures[featureId];
	var currentStatus = this.lockStatus[featureId].base;
	var newStatus = featureData.evaluateCurrent();
	if (newStatus !== currentStatus) {
		this._setStatus(featureId, newStatus);
	}
};

/**
 * To determine from outside if a feature is locked or not
 * @param {string} featureId - any string contained in `lockableFeatures`
 */
UiLocker.prototype.isFeatureLocked = function (featureId) {
	if (this.lockStatus[featureId] === undefined) {
		console.error(new Error('UiLocker.isFeatureLocked: featureId `' + featureId + '` unknown'));
		return true;
	}
	return !!(this.lockStatus[featureId].base === LOCKED || this.lockStatus[featureId].customLockedReasons);
};

/**
 * To determine from outside if a feature is available or not
 * @param {string} featureId - any string contained in `lockableFeatures`
 */
UiLocker.prototype.isFeatureAvailable = function (featureId) {
	return !this.isFeatureLocked(featureId);
};

/**
 * Helper to determine from outside if a button fron the menu bar is locked
 * @param {string} menuButtonId - any string (usually contained in MenuBar's iconDefinitions)
 */
UiLocker.prototype.isMenuButtonAvailable = function (menuButtonId) {
	for (var featureId in lockableFeatures) {
		var featureData = lockableFeatures[featureId];
		if (featureData.menuButtonId === menuButtonId) {
			return this.isFeatureAvailable(featureId);
		}
	}
	console.error(new Error('UiLocker.isMenuButtonAvailable: no feature is matching the menuButtonId ' + menuButtonId));
	return false;
};

/**
 * Helper to determine from outside if a specific tab of a specific window is locked
 * @param {string} windowId - a window id
 * @param {string} tabId - tab id contained in the previous window
 */
UiLocker.prototype.isTabAvailable = function (windowId, tabId) {
	for (var featureId in lockableFeatures) {
		var featureData = lockableFeatures[featureId];
		if (featureData.windowId === windowId && featureData.tabId === tabId) {
			return this.isFeatureAvailable(featureId);
		}
	}
	console.error(new Error('UiLocker.isTabAvailable: no feature matching window ' + windowId + ' w/ tabId ' + tabId));
	return false;
};

/**
 * Internal use only: to change the lock status of a feature.
 *   if it's from a basic rule, no reasonKey is provided
 *   if it's for a custom reason then a reasonKey is provided
 * @private
 * @param {string} featureId - any string contained in `lockableFeatures`
 * @param {boolean} shouldLock - if it should be locked or unlocked
 * @param {string} [reasonKey] - used to add/remove a custom lock identified by this key
 */
UiLocker.prototype._setStatus = function (featureId, shouldLock, reasonKey) {
	var featureData = lockableFeatures[featureId];
	if (!featureData) {
		return console.error(new Error('UiLocker._setStatus: featureId ' + featureId + ' unknown'));
	}
	var previousStatus = this.isFeatureLocked(featureId);
	var lockStatus = this.lockStatus[featureId];
	var previousBaseStatus = lockStatus.base;
	if (!reasonKey) {
		lockStatus.base = shouldLock;
	} else {
		var indexOfReason = -1;
		if (lockStatus.customLockedReasons) {
			indexOfReason = lockStatus.customLockedReasons.indexOf(reasonKey);
		}
		if (shouldLock) {
			if (indexOfReason === -1) {
				if (!lockStatus.customLockedReasons) {
					lockStatus.customLockedReasons = [];
				}
				lockStatus.customLockedReasons.push(reasonKey);
			}
		} else {
			if (indexOfReason !== -1) {
				lockStatus.customLockedReasons.splice(indexOfReason, 1);
				if (lockStatus.customLockedReasons.length === 0) {
					lockStatus.customLockedReasons = null;
				}
			}
			lockStatus.base = featureData.evaluateCurrent();
		}
	}
	var newStatus = this.isFeatureLocked(featureId);
	var newBaseStatus = lockStatus.base;
	if (newStatus !== previousStatus || newBaseStatus !== previousBaseStatus) {
		this.emit('updated', {
			featureId: featureId,
			locked: newStatus,
			baseLocked: newBaseStatus,
			menuButtonId: featureData.menuButtonId,
			windowId: featureData.windowId,
			tabId: featureData.tabId
		});
	}
};

/**
 * Internal use only: setup event listeners
 */
UiLocker.prototype._setupEvents = function () {
	var self = this;

	gui.playerData.jobs.on('jobListUpdated', function () {
		self.updateFeatureId('job');
	});

	gui.playerData.alliance.on('allianceUpdated', function () {
		self.updateFeatureId('alliance');
	});

	gui.playerData.alliance.on('allianceJoined', function () {
		self.updateFeatureId('alliance');
	});

	gui.playerData.alliance.on('allianceLeft', function () {
		self.updateFeatureId('alliance');
	});

	gui.playerData.guild.on('GuildGeneralInformationUpdate', function () {
		self.updateFeatureId('guild');
	});

	gui.playerData.guild.on('guildLeft', function () {
		self.updateFeatureId('guild');
	});

	gui.playerData.on('setMount', function () {
		self.updateFeatureId('mount');
	});

	gui.playerData.on('unsetMount', function () {
		self.updateFeatureId('mount');
	});

	gui.playerData.socialData.on('spouseUpdate', function () {
		self.updateFeatureId('spouse');
	});

	gui.playerData.socialData.on('spouseLeft', function () {
		self.updateFeatureId('spouse');
	});
};

/**
 * Lock a specific feature for a specific reason
 * @param {string} featureId - any string contained in `lockableFeatures`
 * @param {string} reasonKey - lock identifier
 */
UiLocker.prototype.lockFeature = function (featureId, reasonKey) {
	if (!reasonKey) {
		return console.error(new Error('UiLocker.lockFeature: a reasonKey is required to lock a feature'));
	}
	this._setStatus(featureId, true, reasonKey);
};

/**
 * Unlock a specific feature that has been locked for a specific reason
 * @param {string} featureId - any string contained in `lockableFeatures`
 * @param {string} reasonKey - lock identifier
 */
UiLocker.prototype.unlockFeature = function (featureId, reasonKey) {
	if (!reasonKey) {
		return console.error(new Error('UiLocker.unlockFeature: a reasonKey is required to unlock a feature'));
	}
	this._setStatus(featureId, false, reasonKey);
};

/**
 * Lock all the features for a specific reason
 * @param {string} reasonKey - lock identifier
 */
UiLocker.prototype.lockAllFeatures = function (reasonKey) {
	if (!reasonKey) {
		return console.error(new Error('UiLocker.lockAllFeatures: a reasonKey is required to lock features'));
	}
	for (var featureId in this.lockStatus) {
		this.lockFeature(featureId, reasonKey);
	}
};

/**
 * Unlock all the features that have been locked for a specific reason
 * @param {string} reasonKey - lock identifier
 */
UiLocker.prototype.unlockAllFeatures = function (reasonKey) {
	if (!reasonKey) {
		return console.error(new Error('UiLocker.unlockAllFeatures: a reasonKey is required to unlock features'));
	}
	for (var featureId in this.lockStatus) {
		this.unlockFeature(featureId, reasonKey);
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/UiLocker/index.js
 ** module id = 630
 ** module chunks = 0
 **/