var staticContent = require('staticContent');

var databases = [
	'AlignmentGift',
	'AlignmentRankJntGift',
	'AlignmentSides',
	'AlmanaxCalendars',
	'Areas',
	'BidHouseCategories',
	'Breeds',
	'ChatChannels',
	'IncarnationLevels', // NB: this is big and we use only a part of it; we could save some memory...
	'ItemTypes',
	'Months',
	'MountBehaviors',
	'OptionalFeatures',
	'QuestObjectiveTypes',
	'RankNames',
	'Smileys',
	'SpellStates',
	'SpellTypes',
	'SuperAreas',
	'TypeActions',
	'WorldMaps'
];

function load(cb) {
	staticContent.getAllDataMap(databases, function (error, res) {
		if (error) {
			return cb(error);
		}

		window.gui.databases = res;
		cb();
	});
}

module.exports.load = load;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/databaseLoader/index.js
 ** module id = 466
 ** module chunks = 0
 **/