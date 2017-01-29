var mountRiderSymbolModifier = require('./mountRider.js');
var petSymbolModifer         = require('./pet.js');


function defaultSymbolModifier(symbol) {
	return { parent: symbol, child: null };
}

var subentitySymbolModifiers = [
	defaultSymbolModifier, // unused
	petSymbolModifer,         // SYMBOL_MAP_PET
	mountRiderSymbolModifier, // SYMBOL_MOUNT_RIDER
	defaultSymbolModifier, // SYMBOL_MAP_LIFTED_ENTITY
	defaultSymbolModifier, // SYMBOL_MAP_BASE_BACKGROUND
	defaultSymbolModifier, // SYMBOL_MERCHANT_BAG
	defaultSymbolModifier  // SYMBOL_BASE_FOREGROUND
];

module.exports = subentitySymbolModifiers;


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/Entity/subentitySymbolModifiers/index.js
 ** module id = 262
 ** module chunks = 0
 **/