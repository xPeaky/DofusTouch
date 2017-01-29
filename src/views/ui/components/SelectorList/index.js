var helper = require('helper');
var staticContent = require('staticContent');

var areasWithHouse = null;
var areasWithPaddock = null;
var skillsAvailableInHouse = null;


module.exports.getAreasWithHouseOrPaddock = function (houseOrPaddock) {
	var isPaddock = houseOrPaddock === 'paddock';
	if (areasWithHouse) { return isPaddock ? areasWithPaddock : areasWithHouse; }

	var areas = window.gui.databases.Areas;

	//we will create both lists at the same time since job is similar
	areasWithPaddock = [];
	areasWithHouse = [];
	for (var areaId in areas) {
		var area = areas[areaId];
		if (area.containPaddocks || area.containHouses) {
			var a = { id: areaId, nameId: area.nameId };
			if (area.containPaddocks) { areasWithPaddock.push(a); }
			if (area.containHouses) { areasWithHouse.push(a); }
		}
	}

	helper.sortObjectInArray(areasWithPaddock, 'nameId');
	helper.sortObjectInArray(areasWithHouse, 'nameId');
	return isPaddock ? areasWithPaddock : areasWithHouse;
};

module.exports.getSkillsAvailableInHouse = function (cb) {
	if (skillsAvailableInHouse) { return cb(null, skillsAvailableInHouse); }

	staticContent.getAllDataMap('Skills', function (error, skills) {
		if (error) {
			return cb(error);
		}

		skillsAvailableInHouse = [];
		for (var i in skills) {
			var skill = skills[i];
			if (!skill.availableInHouse) {
				continue;
			}
			skillsAvailableInHouse.push({
				id: skill.id,
				nameId: skill.nameId
			});
		}

		helper.sortObjectInArray(skillsAvailableInHouse, 'nameId');
		return cb(null, skillsAvailableInHouse);
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/SelectorList/index.js
 ** module id = 721
 ** module chunks = 0
 **/