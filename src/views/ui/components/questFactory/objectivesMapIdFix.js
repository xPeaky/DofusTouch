/*
 * Quests objectives (QuestObjectives table) have 2 kind of coordinates: "coords" and "mapId".
 * In previous versions of Dofus only coords (that are not carrying any worldMap information) were used.
 * On the opposite side, from a mapId we can determine the world map.
 *
 * Version 2.14 was a transition version where a lot of objectives still had no mapId (mapId = 0), so it was not
 * possible to determine on which world an objective was belonging to. For instance, in original Flash client,
 * activating an Incarnam quest marker while being in Amakna was showing the flag on Amakna instead of Incarnam.
 * In Dofus Touch we are activating automatically the quests markers so the problem is exacerbated.
 *
 * What we have here is a patch of QuestObjective ID => mapId for all Incarnam quests.
 * So, in the code if a questObjective have:
 *   1) A mapId in its original data: we are using it to determine coordinates + world map.
 *      this step being the first one, when we will update the DB to a newer version we will have nothing to change
 *   2) A mapId === 0 and quest objective id is in the following object: we are using the corresponding mapId
 *      to determine coordinates + world map.
 *   3) A mapId === 0 and quest objective is NOT in the following object: we use original data coordinates +
 *      we consider the world map to be Amakna.
 */

var objectivesMapIdFix = {
	713: '80216068',
	4944: '80216068',
	4945: '80216068',
	5048: '80216068',
	5068: '80216068',
	5071: '80216068',
	5134: '80216068',
	720: '80216579',
	5051: '80216579',
	745: '80216580',
	5132: '80216580',
	5133: '80216580',
	4982: '80216833',
	757: '80217090',
	785: '80217090',
	4983: '80217098',
	748: '80217602',
	793: '80217605',
	794: '80217605',
	820: '80218116',
	5139: '80218116',
	5157: '80218116',
	5158: '80218116',
	5162: '80218116',
	5163: '80218116',
	5164: '80218116',
	5165: '80218116',
	5166: '80218116',
	5184: '80218116',
	787: '80218120',
	788: '80218120',
	789: '80218120',
	790: '80218120',
	791: '80218120',
	5073: '80218120',
	5074: '80218120',
	786: '80218624',
	5069: '80218624',
	5070: '80218624',
	751: '80218626',
	771: '80218626',
	4990: '80218627',
	5047: '80218631',
	810: '80219136',
	783: '80219143',
	784: '80219144',
	796: '80219144',
	4963: '80219144',
	4995: '80219653',
	808: '80219654',
	809: '80219654',
	749: '80219655',
	4991: '80220160',
	4993: '80220163',
	746: '80220164',
	753: '80220164',
	4992: '80220673',
	747: '80220676',
	4907: '80220676',
	4981: '80347648',
	4980: '80347651',
	4985: '80347653',
	5189: '80347656',
	4984: '80348167',
	5072: '80740865',
	4943: '81003522',
	4655: '81268739',
	4656: '81268739',
	4941: '81269763',
	4942: '81269763',
	758: '81270787',
	759: '81270787',
	4947: '81270787',
	4964: '81270787',
	4986: '81270787',
	4996: '81270787',
	5024: '81270787',
	5043: '81270787',
	4657: '81396739',
	729: '81527297',
	782: '81527297',
	822: '81527297',
	823: '81527297',
	724: '81527299',
	750: '81527299',
	755: '81527299',
	800: '81527299',
	806: '81527299',
	5067: '81527299',
	744: '81527301',
	752: '81527301',
	754: '81528321',
	824: '81528321',
	825: '81528321',
	4946: '81528321',
	5136: '81528321',
	5140: '81528321',
	5141: '81528321',
	5142: '81528321',
	5159: '81528321',
	5161: '81528321',
	804: '81528323',
	5058: '81528323',
	5135: '81528323',
	761: '81529345',
	795: '81529345',
	821: '81529345',
	5160: '81529345',
	4912: '84672515',
	4916: '84673538',
	4911: '84674048',
	4910: '84675586',
	5717: '84676097',
	4919: '84676101',
	4921: '84676103',
	4909: '84804101'
};

module.exports = objectivesMapIdFix;


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/questFactory/objectivesMapIdFix.js
 ** module id = 542
 ** module chunks = 0
 **/