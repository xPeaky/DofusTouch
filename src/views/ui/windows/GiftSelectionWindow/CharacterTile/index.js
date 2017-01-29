require('./styles.less');
var inherits = require('util').inherits;
var Button = require('Button');
var getText = require('getText').getText;

function CharacterTile(id, name, level, entityLook) {
	Button.call(this, {
		className: 'CharacterTile',
		scaleOnPress: true
	}, function () {
		self.emit('select', {
			id: id,
			entityLook: entityLook
		});
	});
	var self = this;

	var nameText = getText('ui.common.name') + getText('ui.common.colon') + name;
	this.createChild('div', {
		className: 'name',
		text: nameText
	});

	var levelText = getText('ui.common.level') + getText('ui.common.colon') + level;
	this.createChild('div', {
		className: 'level',
		text: levelText
	});
}

inherits(CharacterTile, Button);
module.exports = CharacterTile;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/GiftSelectionWindow/CharacterTile/index.js
 ** module id = 705
 ** module chunks = 0
 **/