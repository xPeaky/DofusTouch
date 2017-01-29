var EntityBanner = require('contextualMenus/EntityBanner');
var inherits = require('util').inherits;
var ContextualMenu = require('contextualMenus/ContextualMenu');
var PlayerContent = require('./contentPlayer.js');
var MyPlayerContent = require('./contentMyPlayer.js');


/** @class */
function ContextualMenuPlayer() {
	ContextualMenu.call(this);

	var playerContent, myPlayerContent;

	this.once('open', function () {
		var self = this;

		var banner = this.header.appendChild(new EntityBanner());

		playerContent = this.entryList.appendChild(new PlayerContent(banner));
		playerContent.on('close', function () {
			self.close();
		});
		myPlayerContent = this.entryList.appendChild(new MyPlayerContent(banner));
		myPlayerContent.on('close', function () {
			self.close();
		});

		this._addCancel();
	});

	this.on('open', function (params, contentReady) {
		var isMyself = params.playerId === window.gui.playerData.id;
		if (isMyself) {
			myPlayerContent.updateContent(params);
		} else {
			playerContent.updateContent(params);
		}

		myPlayerContent.toggleDisplay(isMyself);
		playerContent.toggleDisplay(!isMyself);

		contentReady();
	});
}

inherits(ContextualMenuPlayer, ContextualMenu);
module.exports = ContextualMenuPlayer;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/contextualMenus/ContextualMenuPlayer/index.js
 ** module id = 415
 ** module chunks = 0
 **/