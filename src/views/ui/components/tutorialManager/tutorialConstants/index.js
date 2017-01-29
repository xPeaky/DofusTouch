exports.QUEST_TUTORIAL_ID = 489;
exports.QUEST_TUTORIAL_FIRST_SUB_AREA_ID = 536;

exports.TUTORIAL_MAP_ID_FIRST = 81002496;
exports.TUTORIAL_MAP_ID_SECOND_BEFORE_FIGHT = 81003520;
exports.TUTORIAL_MAP_ID_SECOND_AFTER_FIGHT = 81003522;
exports.TUTORIAL_MAP_ID_THIRD_BEFORE_FIGHT = 81004544;
exports.TUTORIAL_MAP_ID_THIRD_AFTER_FIGHT = 81004546;

exports.MAX_CHARACTER_LEVEL_FOR_TUTORIAL = 49;

exports.QUEST_TUTORIAL_REWARDS = [
	[10785, 1],
	[10794, 1],
	[10797, 1],
	[10798, 1],
	[10799, 1],
	[10784, 1],
	[10800, 1],
	[10801, 1],
	[10792, 1],
	[10793, 2],
	[10795, 1],
	[10796, 1]
];

exports.FIRST_EQUIP_ITEMS = [10785];
exports.SECOND_EQUIP_ITEMS = [
	10784, 10794, 10797, 10798, 10799, 10800
];

exports.TUTORIAL_STEP_TALK_NPC_ID = 1222;
exports.TUTORIAL_FIRST_MONSTER_ID = 2785;
exports.TUTORIAL_BOSS_MONSTER_ID = 2781;

exports.TUTORIAL_STEP_ROLEPLAY_MOVE_CELL_ID = 272;
exports.TUTORIAL_STEP_CHANGE_MAP_ARROW_CELL_ID = 503;

exports.FIGHT_LOCATION_TARGET_CELLS = [232, 216, 229, 270, 313, 328, 316, 274];

exports.FIGHT_MOVE_TARGET_CELLS = {
	232: 259,
	216: 259,
	229: 258,
	270: 286,
	313: 286,
	328: 287,
	316: 287,
	274: 287
};

// Step 1: Move a player
exports.TUTORIAL_STEP_ROLEPLAY_MOVE = 1;

// Step 2: Talk to a NPC
exports.TUTORIAL_STEP_TALK = 2;

exports.TUTORIAL_SUB_STEP_TALK_SHOW_NPC = 1;
exports.TUTORIAL_SUB_STEP_TALK_SHOW_RESPONSE = 2;

// Step 3: Equip an item
exports.TUTORIAL_STEP_EQUIP_ITEM = 3;

exports.TUTORIAL_SUB_STEP_EQUIP_ITEM_SHOW_ITEM_MENU_ICON  = 1;
exports.TUTORIAL_SUB_STEP_EQUIP_ITEM_SHOW_TAB  = 2;
exports.TUTORIAL_SUB_STEP_EQUIP_ITEM_SHOW_EQUIPMENT = 3;

// Step 4: Change to another map
exports.TUTORIAL_STEP_CHANGE_MAP = 4;

// Step 5: Start a fight
exports.TUTORIAL_STEP_STARTING_A_FIGHT = 5;

// Step 6: Select starting fight location
exports.TUTORIAL_STEP_FIGHT_LOCATION = 6;

// Step 7: Move in fight
exports.TUTORIAL_STEP_FIGHT_MOVE = 7;

exports.TUTORIAL_SUB_STEP_FIGHT_MOVE_START_FIGHT = 1;

// Step 8: Cast a spell in fight
exports.TUTORIAL_STEP_FIGHT_CAST_SPELL = 8;

// Step 9: Skip a turn in fight
exports.TUTORIAL_STEP_FIGHT_SKIP_TURN = 9;

// Step 10: Win the first fight
exports.TUTORIAL_STEP_FIGHT_WIN = 10;

// Step 11: Start a new quest
// Have same sub steps as Step 2
exports.TUTORIAL_STEP_START_QUEST = 11;

// Step 12: Equip all the items
// Have same sub steps as Step 3
exports.TUTORIAL_STEP_EQUIP_ALL_ITEMS = 12;

// Step 13: Go to next map and find the boss
exports.TUTORIAL_STEP_FIND_BOSS = 13;

// Step 14: Kill the boss
exports.TUTORIAL_STEP_KILL_BOSS = 14;

// Step 15: talk to the tutorial npc and finish the tutorial
// Have same sub steps as Step 2
exports.TUTORIAL_STEP_SUCCESS_QUEST = 15;


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/tutorialManager/tutorialConstants/index.js
 ** module id = 595
 ** module chunks = 0
 **/