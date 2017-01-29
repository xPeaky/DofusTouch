require('./styles.less');
var assetPreloading = require('assetPreloading');
var Button = require('Button');
var effectInstanceFactory = require('effectInstanceFactory');
var exchangeHandleEnum = require('ExchangeHandleMountEnum');
var GaugeIcon = require('./GaugeIcon');
var getText = require('getText').getText;
var inherits = require('util').inherits;
var MinMaxSelector = require('MinMaxSelector');
var MountLocationEnum = require('MountLocationEnum');
var MountType = require('./MountType');
var ProgressBar = require('ProgressBar');
var SerenityGauge = require('./SerenityGauge');
var StatusIcon = require('./StatusIcon');
var SwipingTabs = require('SwipingTabs');
var TooltipBox = require('TooltipBox');
var windowsManager = require('windowsManager');
var WuiDom = require('wuidom');

var ENERGY_GAUGE_SIZE = 33; // px; energy gauge is smaller than others

var TAB_BREEDING = 0, TAB_STATS = 1;
var NB_MAX_ABILITIES = 2; // dragoturkeys cannot have more than 2 "special abilities"


/**
 * @class MountDetails
 * @desc  Mount details
 * @this WuiDom
 * @extends {WuiDom}
 */
function MountDetails() {
	WuiDom.call(this, 'div', { className: 'MountDetails' });

	// properties
	this.mountData = {};
	this.boostMap = { // boost type id: { boost property: update method }
		1: { property: 'energy', update: this._setEnergy },
		2: { property: 'serenity', update: this._setSerenity },
		3: { property: 'stamina', update: this._setStamina },
		4: { property: 'love', update: this._setLove },
		5: { property: 'maturity', update: this._setMaturity },
		6: { property: 'boostLimiter', update: this._setTiredness }
	};

	this._givenXP = 0;
	this._name = '';

	this.shouldResetTab = true;

	this.hasDomAndListeners = false;

	this.on('destroy', function () {
		if (!this.hasDomAndListeners) { return; }
		this._setEventListeners(false);
		this.hasDomAndListeners = false;
	});
}
inherits(MountDetails, WuiDom);
module.exports = MountDetails;


// Used by other windows, for example BreedingWindow allows drag and drop on the illustration
MountDetails.prototype.getIllustrationElement = function () {
	if (!this.hasDomAndListeners) { this._setupDomAndListeners(); }
	return this._mountIllus;
};

function genericTooltipHandler() {
	// "this" is the WuiDom
	return this.tooltipText;
}

MountDetails.prototype._createProgressBar = function (parent, className, label, color) {
	var colon = getText('ui.common.colon');
	var progressBarDiv = parent.createChild('div', { className: className });
	progressBarDiv.createChild('div', { className: 'label', text: label + colon });
	return progressBarDiv.appendChild(new ProgressBar({
		className: ['mountBar', color],
		tooltip: label
	}));
};

MountDetails.prototype._getActionOnMount = function (action) {
	var mountLocation = this.mountData.mountLocation;
	if (!mountLocation) { return null; }
	return exchangeHandleEnum[this.mountData.mountLocation][action];
};

MountDetails.prototype._exchangeAction = function (action) {
	var exchangeAction = this._getActionOnMount(action);
	if (!exchangeAction) { return console.error(new Error('Invalid action ' + action)); }

	var self = this;
	window.dofus.sendMessage('ExchangeHandleMountStableMessage', {
		actionType: exchangeAction,
		rideId: self.mountData.id
	});
};

/**
 * Set sex icon of the mount
 * @param {string} sex - false is 'male' and true is 'female'
 * @private
 */
MountDetails.prototype._setSex = function (sex) {
	if (sex) {
		this._sexIcon.replaceClassNames(['male'], ['female']);
	} else {
		this._sexIcon.replaceClassNames(['female'], ['male']);
	}
};

MountDetails.prototype._setupDomAndListeners = function () {
	this.mustResize = true;

	this._createMinMaxBox();
	this._createMainInformation();
	this._createPanels();
	this._createButtons();

	this._setEventListeners(true);

	this.hasDomAndListeners = true;
};

MountDetails.prototype._createMainInformation = function () {
	var self = this;

	var mainContainer = this.createChild('div', { className: 'mainContainer' });
	var mainInfosTop = mainContainer.createChild('div', { className: 'mainInfosTop' });
	var leftColumn = mainInfosTop.createChild('div', { className: 'leftColumn' });

	this._mountIllus = leftColumn.createChild('div', { className: 'mountIllus' });
	this._sexIcon = this._mountIllus.createChild('div', { className: 'sexIcon' });
	TooltipBox.addTooltip(this._mountIllus, genericTooltipHandler);

	var rightColumn = mainInfosTop.createChild('div', { className: 'rightColumn' });

	this._mountName = rightColumn.createChild('div', { className: 'mountName' });

	this._renameButton = rightColumn.appendChild(
		new Button({ className: ['simpleButton', 'tinyBtn', 'renameBtn'],
			tooltip: getText('ui.mount.renameTooltip') }, function () {
				windowsManager.open('mountRename', {
					name: self.mountData.name,
					mountId: self.mountData.id,
					inputBox: self._mountName
				});
			}));

	var typeAndLevel = rightColumn.createChild('div', { className: 'typeAndLevel' });
	this._mountType = typeAndLevel.appendChild(new MountType());
	this._level = typeAndLevel.createChild('div', { className: 'level' });

	var mainInfosBottom = mainContainer.createChild('div', { className: 'mainInfosBottom' });

	var abilityDiv = this.abilityDiv = mainInfosBottom.createChild('div', { className: 'abilityDiv' });
	this.abilities = [];
	for (var i = 0; i < NB_MAX_ABILITIES; i++) {
		var ability = this.abilities[i] = abilityDiv.createChild('div', { className: 'ability' });
		TooltipBox.addTooltip(ability, genericTooltipHandler);
	}

	var statusIcons = mainInfosBottom.createChild('div', { className: 'statusIcons' });
	this.fertileIcon = statusIcons.appendChild(
		new StatusIcon('fertile', { tooltip: '' })); // tooltip is dynamic

	this.domesticIcon = statusIcons.appendChild(
		new StatusIcon('domestic', { tooltip: getText('tablet.mount.domestic') }));

	this.mountableIcon = statusIcons.appendChild(
		new StatusIcon('mountable', { tooltip: getText('ui.common.mountable') }));

	this._rideButtonDiv = statusIcons.createChild('div', { className: 'rideBtnDiv' });
	this._rideButton = this._rideButtonDiv.appendChild(
		new Button({ className: ['greenButton', 'rideButton'], addIcon: true,
			tooltip: getText('ui.mount.rideTooltip') }, function () {
				window.dofus.sendMessage('MountToggleRidingRequestMessage');
			}));
};

MountDetails.prototype._createPanels = function () {
	var tabs = this._tabs = this.appendChild(new SwipingTabs({ className: 'tabs' }));
	tabs.addTab(getText('tablet.mount.breeding'), this._createBreedingPanel());
	tabs.addTab(getText('ui.common.short.caracteristic'), this._createStatPanel());
};

MountDetails.prototype._createBreedingPanel = function () {
	var panelFrame = new WuiDom('div', { className: 'panel' });
	var panel = panelFrame.createChild('div', { className: 'breedingPanel' });
	var colon = getText('ui.common.colon');

	this._tirednessValue = this._createProgressBar(panel, ['progressBar2col', 'tired'],
		getText('ui.common.tire'), 'orange');

	var iconGaugeBar = panel.createChild('div', { className: 'iconGaugeBar' });
	this._staminaGauge = iconGaugeBar.appendChild(new GaugeIcon('stamina', getText('ui.common.stamina')));
	this._maturityGauge = iconGaugeBar.appendChild(new GaugeIcon('maturity', getText('ui.common.maturity')));
	this._loveGauge = iconGaugeBar.appendChild(new GaugeIcon('love', getText('ui.common.love')));

	this._serenityGauge = panel.appendChild(new SerenityGauge());

	var fertilityDiv = this._fertilityDiv = panel.createChild('div', { className: ['textInfo', 'mating'] });
	fertilityDiv.createChild('div', { className: 'label', text: getText('ui.common.reproductions') + colon });
	this._fertilityValue = fertilityDiv.createChild('div', { className: 'value' });

	this._fecondationState = panel.createChild('div', { className: 'fecondationState' });

	return panelFrame;
};

MountDetails.prototype._createStatPanel = function () {
	var panelFrame = new WuiDom('div', { className: 'panel' });
	var panel = panelFrame.createChild('div', { className: 'statPanel' });

	this._energyGauge = panel.appendChild(
		new GaugeIcon('energy', getText('ui.common.energy'), { size: ENERGY_GAUGE_SIZE }));

	this._experienceValue = this._createProgressBar(panel, ['progressBar2col', 'xp'],
		getText('ui.common.experiment'), 'blue');

	this._createGivenXp(panel);

	panel.createChild('div', { className: 'effectLabel', text: getText('ui.effects') });
	this._effectsContent = panel.createChild('div', { className: 'effectsContent' });

	return panelFrame;
};

MountDetails.prototype._createGivenXp = function (parent) {
	var self = this;

	var givenXpDiv = this._givenXpDiv = parent.createChild('div', { className: 'givenXp' });

	var label = getText('ui.common.giveXP') + getText('ui.common.colon');
	givenXpDiv.createChild('div', { className: 'label', text: label });

	var valueAndButton = givenXpDiv.createChild('div', { className: 'valueAndButton' });
	this._xpValue = valueAndButton.createChild('div', { className: 'value' });
	valueAndButton.appendChild(
		new Button({ className: ['simpleButton', 'tinyBtn', 'xpButton'],
			tooltip: getText('ui.mount.xpPercentTooltip') }, function () {
			self.minMaxSelector.open({ min: 0, max: 90, defaultValue: self._givenXP });
		}));
};

MountDetails.prototype._feedMount = function () {
	var feedWindow = windowsManager.getWindow('feed');
	if (!feedWindow.possessFeedItemForMount()) {
		return window.gui.openSimplePopup(getText('ui.item.errorNoFoodMount'));
	}

	var location = this.mountData.mountLocation === 'shed' ?
		MountLocationEnum.LOCATION_STABLED :
		MountLocationEnum.LOCATION_EQUIPED;

	windowsManager.open('feed', { mode: 'mount', mountUid: this.mountData.id, mountLocation: location });
};

MountDetails.prototype._neuterMount = function () {
	var self = this;
	window.gui.openConfirmPopup({
		title: getText('ui.popup.warning'),
		message: getText('ui.mount.doUCastrateYourMount'),
		cb: function (result) {
			if (!result) { return; }
			if (self.inBreeding) {
				self._exchangeAction('sterilize');
			} else {
				window.dofus.sendMessage('MountSterilizeRequestMessage');
			}
		}
	});
};

MountDetails.prototype._releaseMount = function () {
	var self = this;
	window.gui.openConfirmPopup({
		title: getText('ui.popup.warning'),
		message: getText('ui.mount.doUKillYourMount'),
		cb: function (result) {
			if (!result) { return; }
			if (self.inBreeding) {
				self._exchangeAction('free');
			} else {
				window.dofus.sendMessage('MountReleaseRequestMessage');
			}
		}
	});
};

MountDetails.prototype._createButtons = function () {
	var self = this;
	var buttons = this.createChild('div', { className: 'buttons' });

	this._feedButton = buttons.appendChild(
		new Button({ className: ['simpleButton', 'mountButton', 'feedButton'],
			tooltip: getText('ui.mount.feed') }, this._feedMount.bind(this)));
	this._feedButton.disable();

	this._inventoryButton = buttons.appendChild(
		new Button({ className: ['simpleButton', 'mountButton', 'inventoryButton'],
			tooltip: getText('ui.mount.inventoryAccess') }, function () {
			window.dofus.sendMessage('ExchangeRequestOnMountStockMessage');
		}));

	this._genealogyButton = buttons.appendChild(
		new Button({ className: ['simpleButton', 'mountButton', 'genealogyButton'],
			tooltip: getText('ui.mount.ancestorTooltip') }, function () {
			windowsManager.open('familyTree', self.mountData);
		}));

	this._cutButton = buttons.appendChild(
		new Button({ className: ['simpleButton', 'mountButton', 'cutButton'],
			tooltip: getText('ui.mount.castrateTooltip') }, this._neuterMount.bind(this)));

	this._releaseButton = buttons.appendChild(
		new Button({ className: ['simpleButton', 'mountButton', 'releaseButton'],
			tooltip: getText('ui.mount.killTooltip') }, this._releaseMount.bind(this)));
};

MountDetails.prototype._createMinMaxBox = function () {
	//TODO unless we move this window out, it cannot appear well in Breeding window
	var minMaxSelector = this.minMaxSelector = this.appendChild(new MinMaxSelector());
	minMaxSelector.setStyles({ left: '-12px', top: '249px' });

	var self = this;
	minMaxSelector.on('confirm', function (result) {
		if (result === self._givenXP) { return; } // ignore if unchanged value

		window.dofus.sendMessage('MountSetXpRatioRequestMessage', { xpRatio: result });
	});
};

MountDetails.prototype._processMountRenamed = function (msg) {
	if (msg.mountId !== this.mountData.id) { return; }
	this._setName(msg.name);
	this.emit('renameMount', this._name);
};

MountDetails.prototype._processMountSterilized = function (msg) {
	if (msg.mountId !== this.mountData.id) { return; }
	this.mountData.reproductionCount = -1;
	this._setFertilityState();
};

MountDetails.prototype._processMountRiding = function (isRiding) {
	var playerData = window.gui.playerData;
	if (playerData.equippedMount.id !== this.mountData.id) { return; }
	this._setRideButton(isRiding);
};

MountDetails.prototype._processMountReleased = function (msg) {
	if (msg.mountId !== this.mountData.id) { return; }
	this.emit('freeMount', msg.mountId);
};

MountDetails.prototype._processUpdateMountBoost = function (msg) {
	if (msg.rideId !== this.mountData.id) { return; }
	this._updateBoost(msg.boostToUpdateList);
};

MountDetails.prototype._setEventListeners = function (shouldListen) {
	var playerData = window.gui.playerData;
	var connectionManager = window.dofus.connectionManager;

	if (shouldListen) {
		if (!this.mountRenamedHandler) {
			this.mountRenamedHandler = this._processMountRenamed.bind(this);
			this.mountSterilizedHandler = this._processMountSterilized.bind(this);
			this.mountReleasedHandler = this._processMountReleased.bind(this);
			this.updateMountBoostHandler = this._processUpdateMountBoost.bind(this);
			this.setRatioHandler = this._setXpRatio.bind(this);
			this.mountRidingHandler = this._processMountRiding.bind(this);
		}

		connectionManager.on('MountRenamedMessage', this.mountRenamedHandler);
		connectionManager.on('MountSterilizedMessage', this.mountSterilizedHandler);
		connectionManager.on('MountReleasedMessage', this.mountReleasedHandler);
		connectionManager.on('UpdateMountBoostMessage', this.updateMountBoostHandler);
		playerData.on('setMountRatio', this.setRatioHandler);
		playerData.on('mountRiding', this.mountRidingHandler);
	} else {
		connectionManager.removeListener('MountRenamedMessage', this.mountRenamedHandler);
		connectionManager.removeListener('MountSterilizedMessage', this.mountSterilizedHandler);
		connectionManager.removeListener('MountReleasedMessage', this.mountReleasedHandler);
		connectionManager.removeListener('UpdateMountBoostMessage', this.updateMountBoostHandler);
		playerData.removeListener('setMountRatio', this.setRatioHandler);
		playerData.removeListener('mountRiding', this.mountRidingHandler);
	}
};

/**
 * Live update stats (usually from paddock)
 * @private
 */
MountDetails.prototype._updateBoost = function (boosts) {
	var mountData = this.mountData;

	// update boosts of this mount & corresponding ui
	for (var i = 0; i < boosts.length; i += 1) {
		var boost = boosts[i];
		var boostProp = this.boostMap[boost.type].property;
		mountData[boostProp] = boost.value;
		this.boostMap[boost.type].update.call(this, boost.value);
	}
};

/**
 * Set the behavior of the mount. The behavior like:
 *   Hardy: Gains 2x stamina
 *   Tireless: Has 2x max energy
 *   Wise: Gains 2x exp per battle
 *   Loadbearer: Has 2x pods
 *   ...
 * @param {Array} behaviors - List of the behaviors' id
 * @private
 */
MountDetails.prototype._setSpecificBehaviors = function (behaviors) {
	this.abilityDiv.toggleClassName('withoutAbilities', behaviors.length === 0);
	if (!behaviors.length) { return; }

	var allBehaviors = window.gui.databases.MountBehaviors;
	for (var i = 0; i < this.abilities.length; i++) {
		var ability = this.abilities[i];
		var id = behaviors[i]; // NB: behavior ID is never 0 in database
		if (id) {
			ability.setText(allBehaviors[id].nameId);
			ability.tooltipText = allBehaviors[id].descriptionId;
		}
		ability.toggleDisplay(!!id);
	}
};

/**
 * Update the mount's name
 * @param {String=} name - The name (By default use getText 'noName')
 */
MountDetails.prototype._setName = function (name) {
	this._name = this.mountData.name = name;

	// name AND mountData.name may be empty; only this._name takes a human-readable default value
	if (!this._name) { this._name = getText('ui.common.noName'); }

	this._mountName.setText(this._name);

	// Tooltip on mount's image uses name too
	var sex = this.mountData.sex ? getText('ui.common.animalFemale') : getText('ui.common.animalMale');
	this._mountIllus.tooltipText = this._name + ' (' + sex + ')';
};

/**
 * Get the mount's name
 */
MountDetails.prototype.getName = function () {
	return this._name;
};

MountDetails.prototype._setXpRatio = function (ratio) {
	this._givenXP = ratio;
	this._xpValue.setText(ratio + '%');
};

/**
 * Manage the ride button
 * @param {boolean} isRiding - Give the information if the player is riding or not
 */
MountDetails.prototype._setRideButton = function (isRiding) {
	this._rideButton.toggleClassName('isRiding', !!isRiding);
};

/**
 * Set the progress bar of Love
 * @param {number} love - Love value that come from mountData or updateBoost
 */
MountDetails.prototype._setLove = function (love) {
	this._loveGauge.setValue(love, this.mountData.loveMax);
};

/**
 * Set the progress bar of Tiredness
 * @param {number} boostLimiter - Tiredness value that come from mountData or updateBoost
 */
MountDetails.prototype._setTiredness = function (boostLimiter) {
	this._tirednessValue.setValue(boostLimiter, this.mountData.boostMax);
};

/**
 * Set the progress bar of Energy
 * @param {number} energy - Energy value that come from mountData or updateBoost
 */
MountDetails.prototype._setEnergy = function (energy) {
	this._energyGauge.setValue(energy, this.mountData.energyMax);
};

/**
 * Set the progress bar of Stamina
 * @param {number} stamina - Stamina value that come from mountData or updateBoost
 */
MountDetails.prototype._setStamina = function (stamina) {
	this._staminaGauge.setValue(stamina, this.mountData.staminaMax);
};

/**
 * Set the progress bar of Maturity
 * @param {number} maturity - Maturity value that come from mountData or updateBoost
 */
MountDetails.prototype._setMaturity = function (maturity) {
	this._maturityGauge.setValue(maturity, this.mountData.maturityForAdult);
};

/**
 * Set the progress bar of Serenity
 * @param {number} serenity - Serenity value that come from mountData or updateBoost
 */
MountDetails.prototype._setSerenity = function (serenity) {
	this._serenityGauge.setValue(serenity);
};

MountDetails.getFertilityState = function (mountData) {
	var count = mountData.reproductionCount, max = mountData.reproductionCountMax;
	var canReproduce = count >= 0 && count < max;
	var isNeutered = count < 0;
	var state = {
		canReproduce: canReproduce,
		isNeutered: isNeutered,
		isFecondationReady: mountData.isFecondationReady,
		fecondationTime: mountData.fecondationTime
	};
	if (canReproduce) {
		state.reproCount = count;
		state.reproMax = max;
	}
	if (mountData.isNewborn) { state.isNewborn = true; }
	return state;
};

MountDetails.prototype._setFertilityState = function () {
	var fertilityState = MountDetails.getFertilityState(this.mountData);
	var canReproduce = !!fertilityState.canReproduce;

	if (canReproduce) {
		this._fertilityValue.setText(fertilityState.reproCount + '/' + fertilityState.reproMax);
	}
	this._fertilityDiv.toggleDisplay(canReproduce);

	// You can neuter it (with button) only if it is not yet sterile
	this._cutButton.setEnable(canReproduce && !!this._getActionOnMount('sterilize'));

	this.fertileIcon.setFertileIcon(fertilityState, /*showDisabled=*/true);
};

MountDetails.prototype._setFecondationState = function () {
	var isFecondationReady = this.mountData.isFecondationReady; //it can mate right now
	var fecondationTime = this.mountData.fecondationTime; //hours since female pregnant (=> !isFecondationReady)

	var isPregnant = !isFecondationReady && fecondationTime > -1;
	this._fecondationState.toggleDisplay(isPregnant);
	if (isPregnant) {
		this._fecondationState.setText(getText('ui.mount.pregnantSince', fecondationTime));
	}
};

MountDetails.prototype._setExperience = function (expValue, levelStart, expMax) {
	if (expMax === -1) { expMax = expValue; }
	var percent = (expValue - levelStart) / (expMax - levelStart);

	this._experienceValue.setValue(expValue, expMax, percent);
};

MountDetails.prototype._resize = function () {
	if (!this.isVisible() || !this.rootElement.clientWidth) {
		return this.once('show', this._resize.bind(this));
	}

	this.mustResize = false;
	this._serenityGauge.resize();
};

/**
 * The main function, set all the screen with the information from the MountSetMessage
 * @param {Object} mountData - Standard structure of mount's data from the server + mountLocation
 * @param {Object} [options]
 * @param {string} [options.context] - e.g. 'equipped', 'breeding'
 */
MountDetails.prototype.setMount = function (mountData, options) {
	var self = this;
	var playerData = window.gui.playerData;
	mountData = mountData || {};
	options = options || {};

	var inBreeding = this.inBreeding = options.context === 'breeding';

	if (!this.hasDomAndListeners) {
		this._setupDomAndListeners();
	}
	if (this.shouldResetTab) {
		this.shouldResetTab = false;
		this._tabs.openTab(inBreeding ? TAB_BREEDING : TAB_STATS);
	}
	if (this.mustResize) {
		this._resize();
	}

	this.mountData = mountData;

	// functionality and display based on where is the mount
	var mountLocation = mountData.mountLocation;
	if (!mountLocation) { // NB: crashing would be worse than going on but this is a real bug; stack is useless
		console.error('Mount', mountData.id, 'does not have a location.');
	}

	// XP given to equipped mount is not linked to a mount; we hide it outside equipped mount tab
	this._givenXpDiv.toggleDisplay(mountLocation === 'equip');
	this._setXpRatio(mountData.xpRatio);

	this.domesticIcon.setEnabled(!mountData.isWild);

	// Ride button OR mountable icon
	var isRideButtonShown = options.context === 'equipped';
	this._rideButtonDiv.toggleDisplay(isRideButtonShown);
	this.mountableIcon.toggleDisplay(!isRideButtonShown);
	if (isRideButtonShown) {
		this._rideButton.setEnable(mountData.isRideable);
		this._setRideButton(playerData.isRiding);
	} else {
		this.mountableIcon.setEnabled(mountData.isRideable);
	}

	this._setName(mountData.name);

	this._setSpecificBehaviors(mountData.behaviors);

	// Action buttons

	this._releaseButton.setEnable(!!this._getActionOnMount('free'));
	this._renameButton.setEnable(mountData.mountLocation === 'equip' || mountData.mountLocation === 'shed');

	this._feedButton.setEnable(mountData.maturity === mountData.maturityForAdult &&
		(this.mountData.mountLocation === 'shed' || this.mountData.mountLocation === 'equip') &&
		window.foreground.tapOptions.mode !== 'fight');

	this._inventoryButton.setEnable(mountData.maxPods > 0 &&
		mountData.mountLocation === 'equip' && !inBreeding);

	this._level.setText(getText('ui.common.short.level') + ' ' + mountData.level);
	this._setExperience(mountData.experience, mountData.experienceForLevel, mountData.experienceForNextLevel);
	this._setFecondationState();
	this._setFertilityState();
	this._setSex(mountData.sex);
	this._setEnergy(mountData.energy);
	this._setLove(mountData.love);
	this._setTiredness(mountData.boostLimiter);
	this._setStamina(mountData.stamina);
	this._setMaturity(mountData.maturity);
	this._setSerenity(mountData.serenity);

	// Other updates below are async

	this._mountType.setModel(mountData.model);

	assetPreloading.preloadImage('gfx/mounts/' + mountData.model + '.png', function (url) {
		self._mountIllus.setStyle('backgroundImage', url);
	});

	effectInstanceFactory.createEffectInstances(mountData.effectList, function (err, effectsOut) {
		var effectStr = '<ul>';
		var none = '<li>' + getText('ui.common.lowerNone', /*male*/0) + '</li>';
		if (err) {
			effectStr += none + '</ul>';
			self._effectsContent.setHtml(none);
			return console.error(err);
		}
		if (effectsOut.length <= 0) {
			effectStr += none + '</ul>';
			return self._effectsContent.setHtml(none);
		}

		for (var i = 0, len = effectsOut.length; i < len; i += 1) {
			var effect = effectsOut[i];
			effectStr += '<li>' + effect.description + '</li>';
		}
		effectStr += '</ul>';
		self._effectsContent.setHtml(effectStr);
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/MountDetails/index.js
 ** module id = 659
 ** module chunks = 0
 **/