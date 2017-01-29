/**
 * (c) 2013 - Ankama Studio and {your name here !} 
 * 
 * Complete Header in GlobalTemplate.js
 */


// package network.enums

/** Enumeration : Les erreurs lors de manipulation d'objet d'inventaire */
module.exports = {
	/** L'inventaire est plein */
	INVENTORY_FULL: 1,
	/** L'objet ne peut être équipé qu'une fois */
	CANNOT_EQUIP_TWICE: 2,
	/** L'objet ne peut être échangé */
	NOT_TRADABLE: 3,
	/** Impossible de poser cet objet au sol */
	CANNOT_DROP: 4,
	/** Impossible de poser cet objet au sol car il n'y a plus de place */
	CANNOT_DROP_NO_PLACE: 5,
	/** Impossible de détruire cet objet */
	CANNOT_DESTROY: 6,
	/** Niveau trop bas */
	LEVEL_TOO_LOW: 7,
	/** L'objet vivant a refusé la nourriture qu'on lui proposait */
	LIVING_OBJECT_REFUSED_FOOD: 8,
	/** Un objet ne peut pas être déséquipé */
	CANNOT_UNEQUIP: 9,
	/** L'objet ne peut pas être équipé dans ce slot */
	CANNOT_EQUIP_HERE: 10,
	/** Les critères pour équiper l'objet ne sont pas remplis */
	CRITERIONS: 11,
	/** Le mimibiote refuse l'action */
	MIMICRY_OBJECT_ERROR: 12
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/common/enums/ObjectErrorEnum/index.js
 ** module id = 528
 ** module chunks = 0
 **/