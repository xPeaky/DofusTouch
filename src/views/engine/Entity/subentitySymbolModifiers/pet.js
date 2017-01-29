/** Returns the modified animation symbol of parent and pet */
function petSymbolModifer(symbol) {
	var base = symbol.base;
	return {
		parent: symbol,
		child: (base === 'AnimMarche' || base === 'AnimCourse') ? symbol : null
	};
}

module.exports = petSymbolModifer;


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/Entity/subentitySymbolModifiers/pet.js
 ** module id = 264
 ** module chunks = 0
 **/