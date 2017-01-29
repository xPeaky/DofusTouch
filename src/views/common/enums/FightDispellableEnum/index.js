/**
 * (c) 2013 - Ankama Studio and {your name here !} 
 * 
 * Complete Header in GlobalTemplate.js
 */


// package network.enums

/** Enumeration : Les différent types de résistance à la dissipation d'effet */
module.exports = {
	/** Dissipable par les effets désenvoûtement, ou par la mort (cas le plus courant) */
	DISPELLABLE: 1,
	/** Non dissipable par les effets désenvoûtement normaux, mais dissipé à la mort (du caster ou de la cible) */
	DISPELLABLE_BY_DEATH: 2,
	/** Pas dissipable, sauf par les effets de désenvoûtement forts */
	DISPELLABLE_BY_STRONG_DISPEL: 3,
	/** Pas dissipable du tout quoi qu'il arrive */
	REALLY_NOT_DISPELLABLE: 4
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/common/enums/FightDispellableEnum/index.js
 ** module id = 222
 ** module chunks = 0
 **/