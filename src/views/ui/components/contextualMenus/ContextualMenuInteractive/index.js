var inherits = require('util').inherits;
var ContextualMenu = require('contextualMenus/ContextualMenu');
var EntityBanner = require('contextualMenus/EntityBanner');
var getText = require('getText').getText;
var Button = require('Button');
var StarCounter = require('StarCounter');
var windowsManager = require('windowsManager');

var displayJobNotification = require('./jobNotification').displayNotification;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** @class */
function ContextualMenuInteractive() {
	ContextualMenu.call(this);
	var self = this;

	this.once('open', function () {
		this._setupDom();
	});

	function useInteractive() {
		window.isoEngine.useInteractive(this.elementId, this.skillId);
		self.close();
	}

	this.on('open', function (params, contentReady) {
		var self = this;
		var data = params || {};

		if (data.ageBonus) {
			this.starCounter.setValue(data.ageBonus);
			this.starCounter.show();
		} else {
			this.starCounter.hide();
		}

		if (data._houseData) {
			windowsManager.getWindow('houseBuySell').prepareDialog(data._houseData);

			var houseId = data._houseData.houseId;
			var houseProperties = window.gui.playerData.position.getHousePropertiesById(houseId);

			if (houseProperties) {
				var ownerName;
				if (houseProperties.ownerName === '?') {
					ownerName = getText('ui.common.houseWithNoOwner');
				} else if (houseProperties.ownerName !== window.gui.playerData.identification.nickname) {
					ownerName = getText('ui.house.homeOf', houseProperties.ownerName);
				} else {
					ownerName = getText('ui.common.myHouse');
				}

				this.banner.setContent({
					house: {
						houseOwner: ownerName,
						houseName: houseProperties._name,
						houseId: houseProperties.houseId,
						forSale: houseProperties.isOnSale
					},
					guild: houseProperties.guildInfo
				});
				this._displayHeader(true);
			} else {
				this._displayHeader(false);
			}
		} else if (data._name) {
			this.banner.setContent({ name: data._name });
			this._displayHeader(true);
		} else {
			this._displayHeader(false);
		}

		this.actionsContainer.clearContent();

		function createSkillButton(skill, disabled) {
			var actionName = skill._name || 'skill ' + skill.skillId;
			var button = self.actionsContainer.appendChild(
				new Button({ text: actionName, className: 'cmButton' }, useInteractive)
			);

			if (disabled) {
				button.disable();
				return;
			}
			button.elementId = data.elementId;
			button.skillId = skill.skillInstanceUid;
		}

		var i, len;
		for (i = 0, len = data.enabledSkills.length; i < len; i++) {
			createSkillButton(data.enabledSkills[i]);
		}

		for (i = 0, len = data.disabledSkills.length; i < len; i++) {
			createSkillButton(data.disabledSkills[i], true);
		}

		// only call displayJobNotification if there are only disabledSkills
		if (data.enabledSkills.length === 0 && data.disabledSkills.length > 0) {
			displayJobNotification(data.elementTypeId, data.disabledSkills);
		}

		contentReady();
	});
}

inherits(ContextualMenuInteractive, ContextualMenu);
module.exports = ContextualMenuInteractive;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** create component dom elements
 * @private
 */
ContextualMenuInteractive.prototype._setupDom = function () {
	this.banner = this.header.appendChild(new EntityBanner());

	var container = this.entryList;
	this.starCounter = container.appendChild(new StarCounter());

	this.actionsContainer = container.createChild('div');
	this._addCancel();
};




/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/contextualMenus/ContextualMenuInteractive/index.js
 ** module id = 305
 ** module chunks = 0
 **/