/**
 * (c) 2013 - Ankama Studio and {your name here !} 
 * 
 * Complete Header in GlobalTemplate.js
 */


// package network.enums

/** Enumeration : Les résultats potentiels d'une demande de création de guilde ou d'alliance */
module.exports = {
	/** La guilde/alliance a été créée (ou renommé) avec succès. */
	SOCIAL_GROUP_CREATE_OK: 1,
	/** Le nom de guilde/alliance désiré n'est pas conforme. */
	SOCIAL_GROUP_CREATE_ERROR_NAME_INVALID: 2,
	/** Le joueur/guilde est déjà membre d'une guilde/alliance. */
	SOCIAL_GROUP_CREATE_ERROR_ALREADY_IN_GROUP: 3,
	/** Le nom est déjà utilisé par une autre guilde/alliance. */
	SOCIAL_GROUP_CREATE_ERROR_NAME_ALREADY_EXISTS: 4,
	/** L'emblème est déjà utilisé par une autre guilde/alliance. */
	SOCIAL_GROUP_CREATE_ERROR_EMBLEM_ALREADY_EXISTS: 5,
	/** Le personnage a interrompu la création de l'guilde/alliance */
	SOCIAL_GROUP_CREATE_ERROR_LEAVE: 6,
	/** La création de l'guilde/alliance a été interrompue. */
	SOCIAL_GROUP_CREATE_ERROR_CANCEL: 7,
	/** Condition non remplise (exemple: objet manquant). */
	SOCIAL_GROUP_CREATE_ERROR_REQUIREMENT_UNMET: 8,
	/** L'emblème n'est pas conforme aux valeurs autorisées. */
	SOCIAL_GROUP_CREATE_ERROR_EMBLEM_INVALID: 9,
	/** Le tag n'est pas valide. */
	SOCIAL_GROUP_CREATE_ERROR_TAG_INVALID: 10,
	/** Le tag est déjà utilisé par une autre alliance */
	SOCIAL_GROUP_CREATE_ERROR_TAG_ALREADY_EXISTS: 11,
	/** La création du groupe nécéssite de diriger un sous-groupe */
	SOCIAL_GROUP_CREATE_ERROR_NEEDS_SUBGROUP: 12,
	/** Une erreur non précisée est survenue */
	SOCIAL_GROUP_CREATE_ERROR_UNKNOWN: 99
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/common/enums/SocialGroupCreationResultEnum/index.js
 ** module id = 341
 ** module chunks = 0
 **/