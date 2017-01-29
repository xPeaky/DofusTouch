require('./styles.less');
var inherits = require('util').inherits;
var getText = require('getText').getText;
var async = require('async');
var WuiDom = require('wuidom');
var Table = require('Table');
var SpellDescription = require('SpellDescription');
var SpellFactory = require('SpellFactory');
var Button = require('Button');
var addTooltip = require('TooltipBox').addTooltip;
var assetPreloading = require('assetPreloading');


var GUILD_BOOST_CHARAC_TYPE_ENUM = {
	taxCollectorPods: 0,
	taxCollectorProspecting: 1,
	taxCollectorWisdom: 2,
	maxTaxCollectorsCount: 3
};

// This object contains the cost for each upgradable perceptor characteristics.
// This has been hard-coded in the original game.
var PERCEPTOR_COSTS_INFO = {
	taxCollectorLifePoints: null,
	taxCollectorDamagesBonuses: null,
	taxCollectorProspecting: { cost: 1,  quantity: 1,  max: 500 },
	taxCollectorWisdom:      { cost: 1,  quantity: 1,  max: 400 },
	taxCollectorPods:        { cost: 1,  quantity: 20, max: 5000 },
	maxTaxCollectorsCount:   { cost: 10, quantity: 1,  max: 50 }
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * This class is the designed to be the view displayed by the `Customisation` tab in the Guild Window.
 *            This class contains the following information:
 *            - information about the perceptor characteristics
 *            - a list of spells and an associated level for each
 * @augments WuiDom
 *
 * @param {Object} [wuiDomOptions] - The options you may wanna  pass to the `WuiDom` constructor.
 */
function GuildCustomisationWindow(wuiDomOptions) {
	// Inherit WuiDom: constructor
	WuiDom.call(this, 'div', wuiDomOptions);

	this.addClassNames('GuildCustomisationWindow');

	this._buildDomElements();
	this._listenGameServerEvents();
}

inherits(GuildCustomisationWindow, WuiDom);
module.exports = GuildCustomisationWindow;


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * @desc This function requests the game server for a spell update, whose ID is stored in `this.spellId`.
 */
function spellUpdater() {
	window.dofus.sendMessage('GuildSpellUpgradeRequestMessage', {
		spellId: this.spellId
	});
}


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * @desc If the user has enough point for a Spell upgrade and if the concerned spell hasn't reached yet its maximum
 *       level, then this function is gonna create and return an upgrade button. If the previous conditions are not
 *       true, an empty string is gonna be returned.
 *       Also, the button is created and the `tap` event handler is defined on it so that the upgrade is requested to
 *       the server when the event fires.
 *
 * @param  {Object} spell             - The spell object.
 * @param  {Number} contributionPoint - The number of contribution point currently available.
 *
 * @return {WuiDom|String} The created upgrade button. An empty will be returned if there is no need to create a button.
 */
function createSpellUpgradeButton(spell, contributionPoint) {
	var upgradeButton = '';

	// We add an upgrade button only if
	// - the user has enough point for performing an upgrade
	// - the spell is not yet at its maximum level
	var upgradeCost = spell.getUpgradeCost();

	if (contributionPoint >= upgradeCost && spell.level < spell.getMaxLevel()) {
		// Button creation
		upgradeButton = new Button({ className: 'UpgradeButton' }, spellUpdater);
		upgradeButton.spellId = spell.id;
	}

	return upgradeButton;
}


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * @desc This function updates a given Spell table with a set of given data. It basically clear the table, retrieve all
 *       the necessary resources (assets, urls, objects) and build the corresponding DOM object.
 *       A callback can be passed (it will be called at the end of the process) but is not necessary.
 *       Please note that both `spellIds` and `spellLevels` **must** match each other.
 *
 * @param  {Number[]}            spellIds           - The IDs of the concerned Spells.
 * @param  {Number[]}            spellLevels        - Spell level indexes for the property `spellLevels` of a Spell
 *                                                    object.
 * @param  {Table}               spellsTable        - The Spells table to update.
 * @param  {Number}              contributionPoint - The number of points that can be used in order to upgrade the
 *                                                    spells.
 */
function updateSpellsTable(spellIds, spellLevels, spellsTable, contributionPoint) {
	// Ensure the table is empty
	spellsTable.clearContent();

	// With the Spell IDs, we can retrieve the corresponding assets and the corresponding objects in parallel.

	// Load the concerned spell assets, and return the corresponding URLs
	function getSpellAssetUrls(cb) {
		var images = [];
		for (var i = 0, len = spellIds.length; i < len; i++) {
			images.push('gfx/spells/sort_' + spellIds[i] + '.png');
		}
		assetPreloading.preloadImages(images, function (urls) {
			cb(null, urls);
		});
	}

	// Retrieve information about spell objects
	function getSpells(cb) {
		SpellFactory.createSpells(spellIds, cb);
	}

	// This function is designed to be called once `async.parallel` is done.
	// It expects `results` to be an object containing the following properties:
	// - `spells`, which contains the results of the `getSpells` function above.
	// - `spellUrls`, which contains the results of the `getSpellAssetsUrls` function above.
	function onceAllIsLoaded(error, results) {
		if (error) {
			return console.warn(error);
		}

		var spellImages = {};
		var realSpellLevels = {};
		for (var i = 0; i < spellIds.length; i++) {
			var id = spellIds[i];
			// transform the spell images array into a map spellID => url
			spellImages[id] = results.spellUrls[i];

			// set the spells levels (like in Flash client we have no level 0 so we show data of level 1 instead)
			var lvl = spellLevels[i] ? spellLevels[i] : 1;
			realSpellLevels[id] = spellLevels[i]; //but we need to remember the real level to display it in table
			results.spells[id].setLevel(lvl);
		}

		for (var spellId in results.spells) {
			var spell = results.spells[spellId];

			// Build on the fly the div displaying the loaded asset
			var spellIconWuiDom = new WuiDom('div', { className: 'spellIcon' });
			spellIconWuiDom.setStyle('backgroundImage', spellImages[spellId]);

			// Finally add the whole row to the table
			spellsTable.addRow([
				spellIconWuiDom,
				spell.getName(),
				realSpellLevels[spellId],
				createSpellUpgradeButton(spell, contributionPoint)
			]);

			addTooltip(spellIconWuiDom, new SpellDescription({ spell: spell }));
		}
	}

	// Run the process
	async.parallel({
		spells: getSpells,
		spellUrls: getSpellAssetUrls
	}, onceAllIsLoaded);
}


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * @desc This function create a button designed to be an upgrad button for the perceptor characteristics
 *       `characteristicKeyName`. This button will be attached three event handlers:
 *       - `tap` event: send the expected request to the game server
 *       Please note that the standard DOM events are enabled on this button.
 *
 * @param  {String} characteristicKeyName - The name of the perceptor characteristics as it appears in
 *                                          `GUILD_BOOST_CHARAC_TYPE_ENUM`.
 *
 * @return {WuiDom} The created button.
 */
function createPerceptorCharacteristicUpgradeButton(characteristicKeyName) {
	var upgradeButton = new Button({ className: 'UpgradeButton', name: 'button' }, function () {
		window.dofus.sendMessage('GuildCharacsUpgradeRequestMessage', {
			charaTypeTarget: GUILD_BOOST_CHARAC_TYPE_ENUM[upgradeButton.id]
		});
	});

	upgradeButton.id = characteristicKeyName;

	return upgradeButton;
}


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * @private
 * @desc Define the handlers for the game server events.
 *       The events currently listened are the following:
 *       - `GuildInfosUpgradeMessage`
 */
GuildCustomisationWindow.prototype._listenGameServerEvents = function () {
	var self = this;

	// GuildInfosUpgradeMessage event
	window.gui.on('GuildInfosUpgradeMessage', function (msg) {
		// self.upgradedInfo = msg;
		self._updateUI(msg);
	});
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * @private
 * @desc Build all the DOM elements this class needs.
 *
 * @todo There is a character supposed to be displayed on the top left panel, but the asset needs to be found.
 */
GuildCustomisationWindow.prototype._buildDomElements = function () {
	// The two main side panels
	var leftPanel = this.createChild('div', {
		className: ['sidePanel', 'leftPanel'],
		name: 'leftPanel'
	});

	this.spellsTable = new Table({
		colIds: ['icon', 'name', 'level', 'upgrade'],
		headerContent: [
			'',
			getText('ui.common.name'),
			getText('ui.common.level')
		],
		className: ['sidePanel', 'rightPanel']
	});

	this.appendChild(this.spellsTable);

	// --- LEFT PANEL ---
	var characterImage = leftPanel.createChild('div', { className: 'characterImage' });
	var image = characterImage.createChild('div', { className: 'image' });

	assetPreloading.preloadImage('gfx/illusUi/SocialGuildePersonnalisation_tx_IlluPerco.png', function (imageUrl) {
		image.setStyle('backgroundImage', imageUrl);
	});

	// Perceptor characteristics
	var perceptorCharacteristicsTable = new Table({
		colIds: ['label', 'value', 'upgrade'],
		headerContent: [
			getText('ui.social.guildTaxCharacteristics')
		]
	});

	perceptorCharacteristicsTable.addRow([getText('ui.common.lifePoints'), '0', '']);
	perceptorCharacteristicsTable.addRow([getText('ui.social.damagesBonus'), '0', '']);

	perceptorCharacteristicsTable.addRow([getText('ui.social.discernment'), '0',
		createPerceptorCharacteristicUpgradeButton('taxCollectorProspecting')]);
	perceptorCharacteristicsTable.addRow([getText('ui.stats.wisdom'), '0',
		createPerceptorCharacteristicUpgradeButton('taxCollectorWisdom')]);
	perceptorCharacteristicsTable.addRow([getText('ui.common.weight'), '0',
		createPerceptorCharacteristicUpgradeButton('taxCollectorPods')]);
	perceptorCharacteristicsTable.addRow([getText('ui.social.taxCollectorCount'), '0',
		createPerceptorCharacteristicUpgradeButton('maxTaxCollectorsCount')]);

	perceptorCharacteristicsTable.addClassNames('perceptorCharacteristicsTable');

	leftPanel.appendChild(perceptorCharacteristicsTable);

	this.perceptorCharacteristicsTable = perceptorCharacteristicsTable;
	// Point left to distribute
	var pointsToDistributePanel = leftPanel.createChild('div', {
		className: 'pointsToDistributePanel',
		name: 'pointsToDistributePanel'
	});
	pointsToDistributePanel.createChild('div', {
		className: 'pointsToDistributeLabel',
		name: 'pointsToDistributeLabel',
		text: getText('ui.social.guildBonusPoints')
	});
	this.pointsToDistributeValue = pointsToDistributePanel.createChild('div', {
		className: 'pointsToDistributeValue',
		name: 'pointsToDistributeValue',
		text: '0'
	});
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Update the UI regarding the data currently stored by this class.
 *  This method accepts some new data passed as argument, though this is optional.
 *
 * @private
 *
 * @param {Object} data   - The possible new data to update the UI with.
 */
GuildCustomisationWindow.prototype._updateUI = function (data) {
	var boostPoints = data.boostPoints;
	var table = this.perceptorCharacteristicsTable;

	var count = 0;
	for (var characteristicKeyName in PERCEPTOR_COSTS_INFO) {
		var i = count++;
		table.updateRow(i, { value: data[characteristicKeyName] });

		// First condition: the characteristics has to be upgradable
		if (!PERCEPTOR_COSTS_INFO[characteristicKeyName]) {
			continue;
		}

		// Second condition: there must be enough contribution point regarding this characteristics cost
		var enoughPoints = boostPoints >= PERCEPTOR_COSTS_INFO[characteristicKeyName].cost;
		// Third condition: the max for this characteristics has not been reached yet
		var isMaxUpgrade = data[characteristicKeyName] < PERCEPTOR_COSTS_INFO[characteristicKeyName].max;

		var button = table.getCol(i, 'upgrade').getChild('button');

		if (enoughPoints && isMaxUpgrade) {
			button.show();
			continue;
		}

		button.hide();
	}

	// Points left to distribute
	this.pointsToDistributeValue.setText(data.boostPoints);

	// Spells
	updateSpellsTable(
		data.spellId,
		data.spellLevel,
		this.spellsTable,
		data.boostPoints
	);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/SocialWindow/GuildWindow/GuildCustomisationWindow/index.js
 ** module id = 876
 ** module chunks = 0
 **/