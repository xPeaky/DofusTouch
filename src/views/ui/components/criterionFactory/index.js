var GroupCriterion = require('./GroupCriterion.js');

// criterions
var AccountRightsItemCriterion = require('./AccountRightsItemCriterion.js');
var AchievementItemCriterion = require('./AchievementItemCriterion.js');
var AlignmentItemCriterion = require('./AlignmentItemCriterion.js');
var AlignmentLevelItemCriterion = require('./AlignmentLevelItemCriterion.js');
var AllianceAvAItemCriterion = require('./AllianceAvAItemCriterion.js');
var AllianceItemCriterion = require('./AllianceItemCriterion.js');
var AllianceRightsItemCriterion = require('./AllianceRightsItemCriterion.js');
var AreaItemCriterion = require('./AreaItemCriterion.js');
var BonesItemCriterion = require('./BonesItemCriterion.js');
var BreedItemCriterion = require('./BreedItemCriterion.js');
var CommunityItemCriterion = require('./CommunityItemCriterion.js');
var DayItemCriterion = require('./DayItemCriterion.js');
var EmoteItemCriterion = require('./EmoteItemCriterion.js');
var FriendListItemCriterion = require('./FriendListItemCriterion.js');
var GiftItemCriterion = require('./GiftItemCriterion.js');
var GuildItemCriterion = require('./GuildItemCriterion.js');
var GuildLevelItemCriterion = require('./GuildLevelItemCriterion.js');
var GuildRightsItemCriterion = require('./GuildRightsItemCriterion.js');
var JobItemCriterion = require('./JobItemCriterion.js');
var KamaItemCriterion = require('./KamaItemCriterion.js');
var LevelItemCriterion = require('./LevelItemCriterion.js');
var MapCharactersItemCriterion = require('./MapCharactersItemCriterion.js');
var MarriedItemCriterion = require('./MarriedItemCriterion.js');
var MaxRankCriterion = require('./MaxRankCriterion.js');
var MonthItemCriterion = require('./MonthItemCriterion.js');
var NameItemCriterion = require('./NameItemCriterion.js');
var ObjectItemCriterion = require('./ObjectItemCriterion.js');
var PlayerCharacteristicCriterion = require('./PlayerCharacteristicCriterion.js');
var PVPRankItemCriterion = require('./PVPRankItemCriterion.js');
var QuestItemCriterion = require('./QuestItemCriterion.js');
var RankCriterion = require('./RankCriterion.js');
var RestrictedAreaItemCriterion = require('./RestrictedAreaItemCriterion.js');
var RideItemCriterion = require('./RideItemCriterion.js');
var ServerItemCriterion = require('./ServerItemCriterion.js');
var SexItemCriterion = require('./SexItemCriterion.js');
var SoulStoneItemCriterion = require('./SoulStoneItemCriterion.js');
var SpecializationItemCriterion = require('./SpecializationItemCriterion.js');
var SpellItemCriterion = require('./SpellItemCriterion.js');
var StaticCriterionItemCriterion = require('./StaticCriterionItemCriterion.js');
var SubareaItemCriterion = require('./SubareaItemCriterion.js');
var SubscribeItemCriterion = require('./SubscribeItemCriterion.js');
var UnusableItem = require('./UnusableItem.js');
var WeightItemCriterion = require('./WeightItemCriterion.js');

var Criterions = {
	// PLAYER CHARACTERISTICS
	Ca: PlayerCharacteristicCriterion,
	CA: PlayerCharacteristicCriterion,
	Cc: PlayerCharacteristicCriterion,
	CC: PlayerCharacteristicCriterion,
	Ce: PlayerCharacteristicCriterion,
	CE: PlayerCharacteristicCriterion,
	CD: PlayerCharacteristicCriterion,
	CH: PlayerCharacteristicCriterion,
	Ci: PlayerCharacteristicCriterion,
	CI: PlayerCharacteristicCriterion,
	CL: PlayerCharacteristicCriterion,
	CM: PlayerCharacteristicCriterion,
	CP: PlayerCharacteristicCriterion,
	Cs: PlayerCharacteristicCriterion,
	CS: PlayerCharacteristicCriterion,
	Cv: PlayerCharacteristicCriterion,
	CV: PlayerCharacteristicCriterion,
	Cw: PlayerCharacteristicCriterion,
	CW: PlayerCharacteristicCriterion,
	Ct: PlayerCharacteristicCriterion,
	CT: PlayerCharacteristicCriterion,

	OA: AchievementItemCriterion,
	PX: AccountRightsItemCriterion,
	Ps: AlignmentItemCriterion,
	Pa: AlignmentLevelItemCriterion,
	Oz: AllianceAvAItemCriterion,
	Ow: AllianceItemCriterion,
	Ox: AllianceRightsItemCriterion,
	Po: AreaItemCriterion,
	PU: BonesItemCriterion,
	PG: BreedItemCriterion,
	Sy: CommunityItemCriterion,
	Sd: DayItemCriterion,
	PE: EmoteItemCriterion,
	Pb: FriendListItemCriterion,
	Pg: GiftItemCriterion,
	Pw: GuildItemCriterion,
	Py: GuildLevelItemCriterion,
	Px: GuildRightsItemCriterion,
	PJ: JobItemCriterion,
	Pj: JobItemCriterion,
	PK: KamaItemCriterion,
	PL: LevelItemCriterion,
	MK: MapCharactersItemCriterion,
	PR: MarriedItemCriterion,
	PQ: MaxRankCriterion,
	SG: MonthItemCriterion,
	PN: NameItemCriterion,
	PO: ObjectItemCriterion,
	Pp: PVPRankItemCriterion,
	PP: PVPRankItemCriterion,
	Qa: QuestItemCriterion,
	Qc: QuestItemCriterion,
	Qf: QuestItemCriterion,
	Pq: RankCriterion,
	Pz: RestrictedAreaItemCriterion,
	Pf: RideItemCriterion,
	SI: ServerItemCriterion,
	PS: SexItemCriterion,
	PA: SoulStoneItemCriterion,
	Pr: SpecializationItemCriterion,
	PB: SubareaItemCriterion,
	PT: SpellItemCriterion,
	Sc: StaticCriterionItemCriterion,
	PZ: SubscribeItemCriterion,
	BI: UnusableItem,
	PW: WeightItemCriterion
};

function createCriterion(criterionString, item) {
	var type = criterionString.substring(0, 2);

	if (!Criterions[type]) {
		console.warn('unknown criterion: ' + type);
		return;
	}

	return new Criterions[type](criterionString, item);
}

module.exports.createCriterion = createCriterion;

function createGroupCriterion(criterionString, item) {
	// remove spaces
	criterionString = criterionString.replace(/[\s+]/g, '');

	return new GroupCriterion(criterionString, this, item);
}

module.exports.createGroupCriterion = createGroupCriterion;
module.exports.groupOperators = GroupCriterion.operators;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/criterionFactory/index.js
 ** module id = 326
 ** module chunks = 0
 **/