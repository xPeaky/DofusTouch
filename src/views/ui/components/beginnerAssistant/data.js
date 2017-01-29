// Until which level is the beginner assistant required on Incarnam
exports.characterLevelLimit = 49;

// Lists of exits to highlight on Incarnam (suns, doors, stairs...)
exports.exits = {
	81527299: [
		{ type: 'sun',         target: 'tile',        targetId: 424,    delta: { x: 0, y: 0 } },
		{ type: 'sun',         target: 'tile',        targetId: 438,    delta: { x: 0, y: 0 } },
		{ type: 'interactive', target: 'interactive', targetId: 463588, delta: { x: 0, y: 0 } },
		{ type: 'interactive', target: 'interactive', targetId: 463589, delta: { x: 0, y: 0 } }
	],
	80219654: [
		{ type: 'sun', target: 'tile', targetId: 148, delta: { x: 0, y: 0 } }
	],
	81529347: [
		{ type: 'sun', target: 'tile', targetId: 341, delta: { x: 0, y: 0 } }
	],
	81527301: [
		{ type: 'sun', target: 'tile', targetId: 316, delta: { x: 0, y: 0 } }
	],
	81529349: [
		{ type: 'sun', target: 'tile', targetId: 344, delta: { x: 0, y: 0 } }
	],
	81528323: [
		{ type: 'sun', target: 'tile', targetId: 311, delta: { x: 0, y: 0 } }
	],
	81528325: [
		{ type: 'sun', target: 'tile', targetId: 316, delta: { x: 0, y: 0 } }
	],
	81529345: [
		{ type: 'sun', target: 'tile', targetId: 358, delta: { x: 0, y: 0 } },
		{ type: 'interactive', target: 'interactive', targetId: 463599, delta: { x: 0, y: 0 } }
	],
	81527297: [
		{ type: 'sun', target: 'tile', targetId: 427, delta: { x: 0, y: 0 } },
		{ type: 'interactive', target: 'interactive', targetId: 463597, delta: { x: 0, y: 0 } },
		{ type: 'interactive', target: 'interactive', targetId: 472493, delta: { x: 0, y: 0 } }
	],
	80218116: [
		{ type: 'interactive', target: 'interactive', targetId: 463596, delta: { x: 0, y: 0 } },
		{ type: 'interactive', target: 'interactive', targetId: 463601, delta: { x: 0, y: 0 } }
	],
	81528321: [
		{ type: 'interactive', target: 'interactive', targetId: 463586, delta: { x: 0, y: 0 } }
	],
	80218626: [
		{ type: 'interactive', target: 'interactive', targetId: 463600, delta: { x: 0, y: 0 } }
	],
	80216578: [
		{ type: 'interactive', target: 'interactive', targetId: 463602, delta: { x: 0, y: 0 } }
	],
	80740865: [
		{ type: 'sun', target: 'tile', targetId: 321, delta: { x: 0, y: 0 } },
		{ type: 'interactive', target: 'interactive', targetId: 463651, delta: { x: 0, y: 0 } }
	],
	80741889: [
		{ type: 'sun', target: 'tile', targetId: 459, delta: { x: 0, y: 0 } }
	]
};

// Hints to press the user to start some specific quests
exports.questsHints = {
	717: {
		questId: 717,
		question: 'tablet.joris.questQuestion717',
		answer: 'tablet.joris.questAnswer717',
		coordinate: { x: -5, y: -1 },
		priority: 10
	},
	780: {
		questId: 780,
		question: 'tablet.joris.questQuestion717',
		answer: 'tablet.joris.questAnswer717',
		coordinate: { x: -5, y: -1 },
		requirements: [717],
		priority: 10
	},
	777: {
		questId: 777,
		question: 'tablet.joris.questQuestion717',
		answer: 'tablet.joris.questAnswer717',
		coordinate: { x: -5, y: -1 },
		requirements: [780],
		priority: 10
	},
	783: {
		questId: 783,
		question: 'tablet.joris.questQuestion783',
		answer: 'tablet.joris.questAnswer783',
		coordinate: { x: 0, y: 3 },
		requirements: [777],
		priority: 9
	},
	181: {
		questId: 181,
		question: 'tablet.joris.questQuestion181',
		answer: 'tablet.joris.questAnswer181',
		coordinate: { x: 0, y: 3 },
		requirements: [777],
		priority: 8
	},
	784: {
		questId: 784,
		question: 'tablet.joris.questQuestion784',
		answer: 'tablet.joris.questAnswer784',
		coordinate: { x: 4, y: 3 },
		requirements: [777],
		priority: 7
	}
};

// To let the assistant show the phoenix
exports.phoenixPosition = { x: 6, y: 6 };

// To detect the first non-tutorial quest (and unlock the quest UI)
exports.tutorialQuests = {
	489: true, // quest "Start As You Mean to Go On" / "bien debuter"
	492: true  // quest "Defeat the Monster" / "tuer le monstre"
};

// When this number is reached the assistant will talk about pending rewards
exports.rewardsPendingHintLimit = 5;

// To remind beginners to equip the beginner hat
exports.beginnerHatGID = 10801;

// Incarnam
exports.INCARNAM_WORLD_MAP = 2;

// List of maps where the hint about tactical mode will not trigger
exports.noTacticalModeMaps = [
	80216064, 80216065, 80216067, 80216071, 80216576, 80216077, 80216833,
	80217088, 80217089, 80217091, 80217345, 80217603, 80217604, 80218112,
	80218113, 80218115, 80218624, 80218627, 80219136, 80219137, 80219138,
	80219139, 80219141, 80219649, 80219650, 80220160, 80220161, 80220162,
	80220673, 80220674, 80347649, 80347651, 80216068, 81270787, 81269763,
	81268739, 81266688
];

// On which achievement the hint about achievements should be triggered
exports.achievementsHintId = 118;

// Data about Incarnam dungeon for the `Incarnam dungeon key` hint
exports.incarnamDungeon = {
	keyId: 8545,
	playerLevelThreshold: 15,
	firstMapId: 80742913,
	coord: { x: 7, y: 5 }
};

// On which looted equipments the `new equipment hint` should trigger
exports.newEquipmentHintsId = [2478, 2475, 2476, 2473, 2477, 2474];

// When fighting these creatures the `creature mode hint` should trigger
exports.creatureModeHintCreaturesId = [1001, 984, 983, 981];

// Number of other players the player should have met before triggering the `join a guild hint`
exports.numPlayersMetForGuildHint = 2;
exports.minLevelForGuildHint = 12;

// Beginner guilds data
exports.noobGuildData = {
	// dev/test/france
	900: {
		guildId: 85,
		guildName: 'YopLaGuilde',
		leaders: [
			{ id: 216, name: 'PandiPanda' },
			{ id: 1828, name: 'Anframbin' },
			{ id: 230, name: 'Rowenn' }
		]
	},
	// lan/local
	300: [
		{
			guildId: 27,
			guildName: 'Go Gobball',
			leaders: [
				{ id: 29, name: 'Verdichex' }
			]
		}, {
			guildId: 42,
			guildName: 'LoupsJauneDevant',
			leaders: [
				{ id: 1126, name: 'Marie-Adelle' }
			]
		}
	],
	// prod/closedBeta
	301: {
		guildId: 3,
		guildName: 'Au Bazar de Papycha',
		leaders: [
			{ id: 8, name: 'Cait' },
			{ id: 3847, name: 'Hera' },
			{ id: 4649, name: 'Tenebros' },
			{ id: 1705, name: 'Acide-Sulfurique' }
		]
	},
	// Canada Grandapan
	401: {
		noGuildData: true
	},
	// Canada Pandore
	402: {
		noGuildData: true
	},
	// Canada Brutas (spanish)
	407: {
		noGuildData: true
	},
	// France Oshimo (french)
	403: {
		guildId: 1,
		guildName: 'Au Bazar de Papycha',
		leaders: [
			{ id: 212, name: 'Cait' },
			{ id: 83, name: 'Hera' },
			{ id: 169105, name: 'Ceridwen' },
			{ id: 24203, name: 'Hachirota' },
			{ id: 9463, name: 'Ravasz' }
		]
	},
	// France Terra-cogita (french)
	404: {
		guildId: 314,
		guildName: 'Sapientia Malum',
		leaders: [
			{ id: 53394, name: 'Horasi' },
			{ id: 5340, name: 'Glowing-Glue' },
			{ id: 7020, name: 'Golden-Shaman' }
		]
	},
	// France Herdegrize (french)
	405: {
		noGuildData: true
	},
	// France Dodge (international)
	406: {
		noGuildData: true
	},
	// France Frakacia (spanish)
	408: {
		noGuildData: true
	},
	// France Fallanster (french)
	409: {
		noGuildData: true
	},
	// France Ralgen (french)
	410: {
		noGuildData: true
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/beginnerAssistant/data.js
 ** module id = 625
 ** module chunks = 0
 **/