require('./styles.less');
var inherits = require('util').inherits;
var WuiDom = require('wuidom');
var CharacterTile = require('GiftSelectionWindow/CharacterTile');
var Scroller = require('Scroller');
var getText = require('getText').getText;
var CharacterDisplayWebGL = require('CharacterDisplayWebGL');

function CharactersSpace() {
	WuiDom.call(this, 'div', { className: 'CharactersSpace' });

	this._tiles = [];

	this.createChild('div', {
		className: 'title',
		text: getText('ui.connection.whosGift')
	});
	var content = this.createChild('div', { className: 'content' });
	this._scroll = content.appendChild(new Scroller({ className: 'scroll' }));
	this._scrollContent = this._scroll.content.createChild('div', { className: 'scrollContent' });

	var characterContainer = this.createChild('div', { className: 'characterContainer' });
	this._characterDisplayWebGL = characterContainer.appendChild(new CharacterDisplayWebGL({
		scale: 'fitin', horizontalAlign: 'center'
	}));

	this._loadingOverlay = characterContainer.createChild('div', {
		className: 'loadingOverlay',
		hidden: true,
		text: getText('ui.connection.assignGift')
	});
}

inherits(CharactersSpace, WuiDom);
module.exports = CharactersSpace;

/**
 *
 * @param {array} characterList
 */
CharactersSpace.prototype.update = function (characterList) {
	var self = this;
	this._scrollContent.clearContent();
	this._tiles = [];

	function selectTile(params) {
		self._deselecteAll();
		this.addClassNames('selected');
		self.emit('selectTile', params.id);

		// update look

		self._characterDisplayWebGL.release();
		self._characterDisplayWebGL.setLook(params.entityLook, {
			boneType: 'characters/',
			skinType: 'characters/'
		});
	}

	for (var i = 0, len = characterList.length; i < len; i += 1) {
		var character = characterList[i];
		var tile = this._scrollContent.appendChild(new CharacterTile(character.id, character.name, character.level,
			character.entityLook));
		self._tiles.push(tile);
		tile.on('select', selectTile);
	}
	this._scroll.refresh();
};

CharactersSpace.prototype._deselecteAll = function () {
	for (var i = 0, len = this._tiles.length; i < len; i += 1) {
		var title = this._tiles[i];
		title.delClassNames('selected');
	}
};

CharactersSpace.prototype.setAssignLoading = function (on) {
	this._loadingOverlay.toggleDisplay(on);
	this._loadingOverlay.addClassNames('spinner');
};

CharactersSpace.prototype.reset = function () {
	this._deselecteAll();
	this._characterDisplayWebGL.release();
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/GiftSelectionWindow/CharactersSpace/index.js
 ** module id = 703
 ** module chunks = 0
 **/