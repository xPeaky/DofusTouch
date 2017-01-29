require('./styles.less');
var inherits = require('util').inherits;
var ItemSlot = require('ItemSlot');
var Scroller = require('Scroller');
var Window = require('Window');


function FightEndRewardsWindow() {
	Window.call(this, {
		className: 'FightEndRewardsWindow',
		positionInfo: { left: 'c', top: 'c', width: 356, height: 274 }
	});

	this.scroller = this.windowBody.appendChild(new Scroller());
	this.scroller.content.addClassNames('overlayBox');
}

inherits(FightEndRewardsWindow, Window);
module.exports = FightEndRewardsWindow;


FightEndRewardsWindow.prototype.updateContent = function (playerName, items, itemQuantityMap) {
	this.setTitle(playerName);

	var content = this.scroller.content;
	content.clearContent();

	for (var i = 0; i < items.length; i += 1) {
		content.appendChild(new ItemSlot({
			itemData: items[i],
			quantity: itemQuantityMap[items[i].id] || 0
		}));
	}

	this.scroller.refresh();
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/FightEndRewardsWindow/index.js
 ** module id = 951
 ** module chunks = 0
 **/