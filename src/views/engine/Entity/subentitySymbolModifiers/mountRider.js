var constants = require('constants');
var ANIM_SYMBOLS = constants.ANIM_SYMBOLS;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

function mountRiderWeapon(symbol) {
	// if weapon type is 0 (punch) then mount play this animation
	if (symbol.type === 0) { return { parent: symbol, child: null }; }
	// other weapon animations are played by rider
	return { parent: null, child: symbol };
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

function mountRiderAttack(symbol) {
	// modifier on child (only one type of attack: 0)
	var riderSymbol = symbol;
	if (symbol.type) {
		// copy symbol to be modified
		riderSymbol = {
			id: symbol.base + '0_' + ANIM_SYMBOLS[symbol.direction],
			type: 0,
			base: symbol.base,
			direction: symbol.direction
		};
	}
	// TODO: mount has attack 0, 1, 5 (?)
	return { parent: null, child: riderSymbol };
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// jscs:disable disallowQuotedKeysInObjects
var MOUNT_ONLY_ANIM = {
	'Rest_0': true,
	'Sit_0':  true,
	'Oups_0': true,
	'Shit_0': true
};

var MOUNT_ANIM = {
	'Appl_0':  true,
	'Bye_0':   true,
	'Champ_0': true,
	'Cross_0': true,
	'Drink_0': true,
	'Eat_0':   true,
	'Fear_0':  true,
	'Hi_0':    true,
	'Kiss_0':  true,
	'Mad_0':   true,
	'Pfc1_0':  true,
	'Pfc2_0':  true,
	'Pfc3_0':  true,
	'Pipo_0':  true,
	'Point_0': true
};
// jscs:enable disallowQuotedKeysInObjects

function mountRiderEmote(symbol) {
	// emote type 'Rest', 'Sit', 'Oups' and 'Shit' are played by mount only
	if (MOUNT_ONLY_ANIM[symbol.type]) { return { parent: symbol, child: null }; }
	// emote played by mount and rider
	if (MOUNT_ANIM[symbol.type]) { return { parent: symbol, child: symbol }; }
	// other emote are played only by rider
	return { parent: null, child: symbol };
}

function mountRiderCueillirSol(symbol) {
	var newSymbol = { base: 'AnimCueillirSol0', direction: symbol.direction };
	return { parent: null, child: newSymbol };
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

var MOUNT_RIDER = {
	// ------------------ special cases (modifiers) ---------------
	AnimArme:         mountRiderWeapon,
	AnimAttaque:      mountRiderAttack,
	AnimEmote:        mountRiderEmote,
	AnimCueillirSol1: mountRiderCueillirSol, // AnimCueillirSol1 is missing, using AnimCueillirSol0 instead

	// -------------- anim played by child only -------------------
	AnimConsulter:    { parent: null, child: true },
	AnimCueillir0:    { parent: null, child: true },
	AnimCueillirSol0: { parent: null, child: true },
	AnimDrop:         { parent: null, child: true },
	AnimFaucher:      { parent: null, child: true },
	AnimHache:        { parent: null, child: true },
	AnimPeche:        { parent: null, child: true },
	AnimPickup:       { parent: null, child: true },
	AnimPioche:       { parent: null, child: true },
	AnimPuiser:       { parent: null, child: true },
	AnimThrow:        { parent: null, child: true },
	carrying:         { parent: null, child: true },

	// ------------- anim played by parent only --------------------
	AnimCourse:       { parent: true, child: null },
	AnimMarche:       { parent: true, child: null },
	AnimTacle:        { parent: true, child: null },

	// ----------- anim played by both parent and child ------------
	AnimStatique:     { parent: true, child: true },
	AnimMort:         { parent: true, child: true },
	AnimHit:          { parent: true, child: true },
	AnimVanish:       { parent: true, child: true }
};

/** Returns the modified animation symbol of mount and rider */
function mountRiderSymbolModifier(symbol) {
	var base = symbol.base;
	var modifier = MOUNT_RIDER[base];
	if (!modifier) {
		console.error('No modifier for symbol base ' + base);
		// return default value
		return { parent: null, child: null };
	}
	if (typeof modifier === 'function') { return modifier(symbol); }

	// construct a new object for result
	var result = { parent: null, child: null };
	if (modifier.parent) { result.parent = symbol; }
	if (modifier.child)  { result.child  = symbol; }
	return result;
}

module.exports = mountRiderSymbolModifier;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/Entity/subentitySymbolModifiers/mountRider.js
 ** module id = 263
 ** module chunks = 0
 **/