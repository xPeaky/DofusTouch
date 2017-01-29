var ContextualMenu = require('contextualMenus/ContextualMenu');
var EntityBanner = require('contextualMenus/EntityBanner');
var getText = require('getText').getText;
var inherits = require('util').inherits;


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** @class */
function ContextualMenuPlayer() {
	ContextualMenu.call(this);

	var banner;

	this.once('open', function () {
		banner = this.header.appendChild(new EntityBanner());

		var message = this._addEntry(getText('ui.common.ankaboxMessage'), function () {
			// TODO
		});
		message.disable();

		this._addCancel();
	});

	this.on('open', function (params, contentReady) {
		// formulas from Ankama's Flash code
		if (params.hoursSinceLastConnection === undefined) {
			banner.setContent({ name: params.playerName });
		} else {
			var hours = Math.floor(params.hoursSinceLastConnection); // 24 hours * 30 days = 720 hours
			var months = Math.floor(hours / 720); // 24 hours * 30 days = 720 hours
			var days =  Math.floor((hours - months * 720) / 24);
			var durationText = '';
			if (months > 0) {
				if (days > 0) {
					durationText = getText('ui.social.monthsAndDaysSinceLastConnection', months, days);
				} else {
					durationText = getText('ui.social.monthsSinceLastConnection', months);
				}
			} else {
				if (days > 0) {
					durationText = getText('ui.social.daysSinceLastConnection', days);
				} else {
					if (hours > 0) {
						durationText = getText('tablet.ui.social.hoursSinceLastConnection', hours);
					} else {
						durationText = getText('tablet.ui.social.lessThanOneHour');
					}
				}
			}
			banner.setContent({ name: params.playerName + '\n' + getText('ui.social.lastConnection', durationText) });
		}
		contentReady();
	});
}

inherits(ContextualMenuPlayer, ContextualMenu);
module.exports = ContextualMenuPlayer;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/contextualMenus/ContextualMenuOfflinePlayer/index.js
 ** module id = 413
 ** module chunks = 0
 **/