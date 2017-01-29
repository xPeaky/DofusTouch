var EventEmitter = require('events.js').EventEmitter;
var getText = require('getText').getText;
var inherits = require('util').inherits;
var staticContent = require('staticContent');

// const
var MAX_SERENITY = 10000;
var AVG_SERENITY = 2000;
var LEVEL_MATURE = 5;
var REPRO_COUNTS_STERILE = [-1, 20];
var BENCH_NEED = 7500; // love, stamina


function MountFilters() {
	EventEmitter.call(this);

	var self = this;

	// enum
	var catEnum = this.catEnum = {
		TEXT: 0,
		TYPE: 1, // model
		BREEDING: 2,
		MOOD: 3,
		ABILITY: 4
	};

	// properties
	var categories = this.categories = [
		{ id: 'text', name: getText('ui.common.name') },
		{ id: 'type', name: getText('tablet.mount.type') }, // Type
		{ id: 'breeding', name: getText('tablet.mount.breeding') }, // Breeding
		{ id: 'mood', name: getText('tablet.mount.mood') },
		{ id: 'ability', name: getText('tablet.mount.abilities') }
	];

	this.allTypeIds = [];
	this.filterMap = {};

	this.ready = false;

	// NOTE: bench or flag is input given by UI
	this.filters = [
		{
			id: 'text',
			do: function (filterStr) {
				return this.name.toLowerCase().indexOf(filterStr) > -1;
			},
			category: categories[catEnum.TEXT].id
		},
		{
			id: 'sex',
			name: getText('ui.common.animalFemale'),
			antiName: getText('ui.common.animalMale'),
			do: function (flag) {
				return this.sex === flag;
			},
			category: categories[catEnum.BREEDING].id
		},
		{
			id: 'baby',
			name: getText('tablet.mount.filterNewborn'),
			do: function (flag) {
				var isNewborn = !!this.isNewborn; // could be undefined (means false)
				return isNewborn === flag;
			},
			category: categories[catEnum.BREEDING].id
		},
		{
			id: 'fruitful',
			name: getText('tablet.mount.filterFertile'),
			do: function (flag) {
				var isFertile = this.isFecondationReady;
				var isInfertile = !isFertile &&
					REPRO_COUNTS_STERILE.indexOf(this.reproductionCount) === -1 &&
					this.level >= LEVEL_MATURE;
				// NOTE: possible to be "not fertile" AND "not infertile" at the same time
				return (isFertile && flag) || (isInfertile && !flag);
			},
			category: categories[catEnum.BREEDING].id
		},
		{
			id: 'fertilized',
			name: getText('tablet.mount.filterPregnant'),
			do: function (flag) {
				return (this.fecondationTime > 0) === flag && this.fecondationTime !== undefined;
			},
			category: categories[catEnum.BREEDING].id
		},
		{
			id: 'mountable',
			name: getText('tablet.mount.filterMountable'),
			do: function (flag) {
				return this.isRideable === flag;
			},
			category: categories[catEnum.BREEDING].id
		},
		{
			id: 'sterilized',
			name: getText('tablet.mount.filterSterilized'),
			do: function (flag) {
				return (REPRO_COUNTS_STERILE.indexOf(this.reproductionCount) > -1) === flag;
			},
			category: categories[catEnum.BREEDING].id
		},
		// {
		// 	id: 'nameless',
		// 	name: getText('tablet.mount.filterNamed'),
		// 	antiName: getText('ui.mount.filterNoName'), // Nameless mount
		// 	do: function (flag) {
		// 		return (this.name !== '') === flag;
		// 	},
		// 	category: categories[catEnum.ATTRIBUTE].id
		// },
		// {
		// 	id: 'special',
		// 	name: findText('Special'), // special : not special
		// 	antiName: findText('Normal'),
		// 	do: function (flag) {
		// 		return (this.behaviors && this.behaviors.length > 0) === flag;
		// 	},
		// 	category: categories[catEnum.ATTRIBUTE].id
		// },
		// {
		// 	id: 'trainable',
		// 	name: findText('Trainable'), // trainable : untrainable
		// 	antiName: findText('Untrainable'),
		// 	do: function (flag) {
		// 		return (this.maturityForAdult && this.level < LEVEL_MATURE) === flag;
		// 	},
		// 	category: categories[catEnum.ATTRIBUTE].id
		// },
		{
			id: 'love',
			name: getText('tablet.mount.filterNeedLove'),
			do: function (flag) {
				return (this.love < BENCH_NEED) === flag;
			},
			category: categories[catEnum.MOOD].id
		},
		{
			id: 'stamina',
			name: getText('tablet.mount.filterNeedStamina'),
			do: function (flag) {
				return (this.stamina < BENCH_NEED) === flag;
			},
			category: categories[catEnum.MOOD].id
		},
		{
			id: 'maturity',
			name: getText('tablet.mount.filterNeedMaturity'), // NB: ui.common.maturity -> Maturity
			do: function (flag) {
				return (this.maturity < this.maturityForAdult) === flag;
			},
			category: categories[catEnum.MOOD].id
		},
		{
			id: 'energy',
			name: getText('tablet.mount.filterNeedEnergy'),
			do: function (flag) {
				return (this.energy < this.energyMax) === flag;
			},
			category: categories[catEnum.MOOD].id
		},
		{
			id: 'serenityRange',
			name: getText('ui.common.serenity'),
			min: -MAX_SERENITY,
			max: MAX_SERENITY,
			interval: 500,
			criticalValues: [-MAX_SERENITY, -AVG_SERENITY, 0, AVG_SERENITY, MAX_SERENITY],
			formatValue: function (value) {
				return value && value / 1000 + 'k' || value;
			},
			do: function (benchLow, benchHigh) {
				return (this.serenity >= benchLow) && (this.serenity <= benchHigh);
			},
			category: categories[catEnum.MOOD].id
		},
		/*{
			name: findText('Serenity'), // negative <-> positive
			do: function (mount, benchLow, benchHigh) {
				return this.serenity >= benchLow && this.serenity <= benchHigh;
			},
			category: categories[catEnum.MOOD].id
		},*/
		/*{
			id: 'serenity',
			name: findText('(+) serenity'), // pos serenity : neg serenity
			antiName: findText('(-) serenity'),
			do: function (flag) {
				return (this.serenity >= 0) === flag;
			},
			category: categories[catEnum.MOOD].id
		},*/
		/*{
			id: 'avgSerenity',
			name: findText('Avg serenity'), // avg : not avg
			antiName: findText('Extreme serenity'),
			do: function (flag) {
				return ((this.serenity > -AVG_SERENITY) && (this.serenity < AVG_SERENITY)) === flag;
			},
			category: categories[catEnum.MOOD].id
		},*/

		// TODO: color filter (see Ankama's proposal)

		// {
		// 	id: 'fatigue',
		// 	name: getText('tablet.mount.filterTired'), // NB: getText('ui.common.tire') -> 'Fatigue'
		// 	do: function (flag) {
		// 		return (this.boostLimiter >= this.boostMax) === flag;
		// 	},
		// 	category: categories[catEnum.MOOD].id
		// },
		{
			id: 'fatigue',
			name: getText('ui.common.tire'),
			min: 0,
			max: 100,
			interval: 50,
			criticalValues: [0, 50, 100],
			formatValue: function (value) {
				return value + '%';
			},
			do: function (benchLow, benchHigh) {
				return (this.boostLimiter >= benchLow) && (this.boostLimiter <= benchHigh);
			},
			category: categories[catEnum.MOOD].id
		}
		// {
		// 	id: 'owner',
		// 	name: findText('Owned'), // owner : not owner
		// 	antiName: findText('Others'),
		// 	do: function (flag) {
		// 		return (this.ownerId === window.gui.playerData.id) === flag;
		// 	},
		// 	category: categories[catEnum.ATTRIBUTE].id
		// }
		// ability & type filters added on to this list dynamically
	];

	// init
	this.on('ready', this._buildFilterMap);
	this._setupAbilities(function () {
		self._setupTypes(function () {
			self.ready = true;
			self.emit('ready');
		});
	});
}

inherits(MountFilters, EventEmitter);
module.exports = MountFilters;

// private
MountFilters.prototype._setupAbilities = function (cb) {
	var self = this;

	var behaviorStr = this.categories[this.catEnum.ABILITY].id;

	// filter for all abilities
	function abilityFilterFn(flag, behaviorId) {
		var hasBehavior = false;
		for (var i = 0; i < this.behaviors.length; i += 1) {
			hasBehavior = (behaviorStr + this.behaviors[i]) === behaviorId;
			if (hasBehavior) {
				break;
			}
		}

		return (hasBehavior && flag) || (!hasBehavior && !flag); // has ability : excludes ability
	}

	// push all mount behaviors as "ability" category
	staticContent.getAllDataTable('MountBehaviors', function (error, behaviors) {
		if (error) {
			return console.error(error);
		}

		for (var i = 0; i < behaviors.length; i += 1) {
			var behavior = behaviors[i];
			var abilityFilter = {
				id: behaviorStr + behavior.id,
				name: behavior.nameId,
				do: abilityFilterFn,
				category: behaviorStr
			};

			self.filters.push(abilityFilter);
		}

		self.emit('setupAbilities');

		if (cb) {
			cb();
		}
	});
};

MountFilters.prototype._setupTypes = function (cb) {
	var self = this;

	var modelStr = this.categories[this.catEnum.TYPE].id;

	// filter for all abilities
	function typeFilterFn(modelId) {
		var isModel = (modelStr + this.model) === modelId;
		return isModel; // is type
	}

	// push all mount types as "types" category
	staticContent.getAllDataTable('Mounts', function (error, types) {
		if (error) {
			return console.error(error);
		}

		self.allTypeIds = [];
		for (var i = 0; i < types.length; i += 1) {
			var type = types[i];
			var abilityFilter = {
				id: modelStr + type.id,
				name: type.nameId.replace('Dragoturkey', ''),
				do: typeFilterFn,
				category: modelStr
			};

			self.filters.push(abilityFilter);
			self.allTypeIds.push(type.id);
		}

		self.emit('updateTypes');

		if (cb) {
			cb();
		}
	});
};

MountFilters.prototype._buildFilterMap = function () {
	for (var i = 0; i < this.filters.length; i += 1) {
		var filter = this.filters[i];
		this.filterMap[filter.id] = filter;
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/MountFilterBox/mountFilters.js
 ** module id = 675
 ** module chunks = 0
 **/