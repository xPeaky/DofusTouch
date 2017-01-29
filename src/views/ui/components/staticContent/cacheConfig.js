module.exports.cacheDatabaseSuffix = 'DataCache';

var cacheCompletion = 'isCacheComplete';
module.exports.cacheCompletion = cacheCompletion;

module.exports.typeNames = [
	'AbuseReasons',
	'AchievementCategories',
	'AchievementObjectives',
	'AchievementRewards',
	'Achievements',
	'ActionDescriptions',
	'AlignmentBalance',
	'AlignmentEffect',
	'AlignmentGift',
	'AlignmentOrder',
	'AlignmentRank',
	'AlignmentRankJntGift',
	'AlignmentSides',
	'AlignmentTitles',
	'AlmanaxCalendars',
	'Appearances',
	'Areas',
	'BidHouseCategories',
	'Breeds',
	'CensoredContents',
	'CensoredWords',
	'Challenge',
	'ChatChannels',
	'CompanionCharacteristics',
	'Companions',
	'CompanionSpells',
	'CreatureBonesOverrides',
	'CreatureBonesTypes',
	'Documents',
	'Dungeons',
	'Effects',
	'EmblemBackgrounds',
	'EmblemSymbolCategories',
	'EmblemSymbols',
	'Emoticons',
	'ExternalNotifications',
	'Heads',
	'HintCategory',
	'Hints',
	'Houses',
	'Incarnation',
	'IncarnationLevels',
	'InfoMessages',
	'Interactives',
	'Items',
	'ItemSets',
	'ItemTypes',
	'Jobs',
	'LegendaryTreasureHunts',
	'LivingObjectSkinJntMood',
	'MapCoordinates',
	'MapPositions',
	'MapReferences',
	'MapScrollActions',
	'MonsterMiniBoss',
	'MonsterRaces',
	'Monsters',
	'MonsterSuperRaces',
	'Months',
	'MountBehaviors',
	'MountBones',
	'Mounts',
	'Notifications',
	'NpcActions',
	'NpcMessages',
	'Npcs',
	'OptionalFeatures',
	'Ornaments',
	'Pack',
	'Pets',
	'Phoenixes',
	'PointOfInterest',
	'PointOfInterestCategory',
	'PresetIcons',
	'QuestCategory',
	'QuestObjectives',
	'QuestObjectiveTypes',
	'Quests',
	'QuestStepRewards',
	'QuestSteps',
	'RankNames',
	'Recipes',
	'RideFood',
	'ServerCommunities',
	'ServerGameTypes',
	'ServerPopulations',
	'Servers',
	'SkillNames',
	'Skills',
	'SkinMappings',
	'SkinPositions',
	'Smileys',
	'SoundBones',
	'SoundUi',
	'SoundUiHook',
	'SpeakingItemsText',
	'SpeakingItemsTriggers',
	'SpellBombs',
	'SpellLevels',
	'SpellPairs',
	'Spells',
	'SpellStates',
	'SpellTypes',
	'StealthBones',
	'SubAreas',
	'SubAreaIdPerCoordinate',
	'SubAreasWorldMapData',
	'SuperAreas',
	'TaxCollectorFirstnames',
	'TaxCollectorNames',
	'Tips',
	'TitleCategories',
	'Titles',
	'TypeActions',
	'Url',
	'Waypoints',
	'WorldMaps'
];

// This "memory caching" was disabled in Oct 2015. We especially needed it when disk/database caching was not
// yet implemented. Now the need for it is disuptable:
// - time/CPU cost of retrieving data from disk/database cache seems not big enough compared to the
//   RAM used by this caching.
// - if the retrieving time was too long, then we would still have an issue each time the app restarts.
// - in places where we need a quick and centralized place to keep static data, creating a "module" would make
//   more sense than this generic memory cache (and would be easier to adapt for special use; e.g. the item module)
// - see also the "databaseLoaded" module for small tables we want to always keep in memory.

//RideFood, CensoredContents don't have a field which guarantees uniqueness
var keyForType = {
	AbuseReasons: '_abuseReasonId',
	AlignmentTitles: 'sideId',
	CreatureBonesOverrides: 'creatureBoneId',
	Houses: 'typeId',
	InfoMessages: 'messageId',
	LivingObjectSkinJntMood: 'skinId',
	MapCoordinates: 'compressedCoords',
	Phoenixes: 'mapId',
	Recipes: 'resultId',
	SpeakingItemsText: 'textId',
	SpeakingItemsTriggers: 'triggersId'
};

module.exports.getKey = function (type) {
	return keyForType[type] || 'id';
};

var typeWithStringId = {};
typeWithStringId[cacheCompletion] = true;

module.exports.hasStringId = function (type) {
	return typeWithStringId[type] || false;
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/staticContent/cacheConfig.js
 ** module id = 37
 ** module chunks = 0
 **/