/** For all "$links" below see Flash code in ParamDecoder.as.
 *  Most of the remaining interesting code is in classes like HyperlinkShowAchievementManager and the alike */

var CompassTypeEnum = require('CompassTypeEnum');
var getText = require('getText').getText;
var hintArrowHelper = require('hintArrowHelper');
var itemManager = require('itemManager');
var staticContent = require('staticContent');
var windowsManager = require('windowsManager');
var WuiDom = require('wuidom');
var tapBehavior = require('tapBehavior');
var BidHouseShopWindow = require('BidHouseShopWindow');
var helper = require('helper');

var ARROW_SHOW_IN_MS = 5000; // how long do we show the arrows pointing at monsters/NPC/etc.


// Generic regexp list:
var dollarNameNumber = '\\$[a-zA-Z]+[0-9]+'; // covers all "$name99" links
var bracesAroundText = '\\{[a-zA-Z]+[^\\}]*\\}'; // covers all "{abcd...}" links
var htmlTagA = '<a href=[^>]+>.+</a>';


/** List of link regular expressions and parsing functions.
 *  Order does not matter much but very slightly faster if more frequent ones are on top. */
var genericRegexps = [];
var linkFunctions = [];
var linkRegExps = [];

function newExternalLink(url, label, options) {
	options = options || {};
	var text = label || '';
	var link = new WuiDom('span', { className: 'externalLink', text: text });
	link.addClassNames(options.className || 'link');
	if (options.html) {
		link.setHtml(options.html);
	}
	tapBehavior(link);
	link.on('tap', function () {
		helper.openUrlInAppBrowser(url);
	});
	return link;
}

exports.newExternalLink = newExternalLink;


/** Adds a new type of link to our list of handled hyperlinks.
 *  @param {string} genericRegexp - most generic regexpr to match this kind of link
 *  @param {string} specificRegexp - when the generic regexp matches, this specific one will be applied
 *  @param {function} parsingFunc - this function will be called for matches to specificRegexp */
function addLinkHandler(genericRegexp, specificRegexp, parsingFunc) {
	// only keep the generic regexp we did not see yet
	if (genericRegexps.indexOf(genericRegexp) === -1) { genericRegexps.push(genericRegexp); }

	linkFunctions.push(parsingFunc);
	linkRegExps.push(new RegExp(specificRegexp));
}

/**
 * Creates a new span WuiDom for a hyperlink
 * @param {string} link - original link's text - for warning message in case of dead link
 * @param {string} [label] - the link's label
 * @param {function} [linkAction] - the link's action; if not given a dead link will be created
 * @param {objet} [options]
 * @param {string} [options.className] - className for the link; default is 'link'
 * @return {WuiDom} - the new span with the link in it
 */
function newLinkSpan(link, label, linkAction, options) {
	var className = options && options.className || 'link';
	if (!linkAction) {
		label = label || link;
		if (linkAction === undefined) { console.warn('Skipped not handled hyperlink: ' + link); }
		return new WuiDom('span', { text: label, className: 'deadLink' });
	}
	var span = new WuiDom('span', { text: label, className: className });
	tapBehavior(span);
	span.on('tap', linkAction);
	return span;
}

/**
 * Creates a new span WuiDom for a hyperlink - static data version.
 * @param {string} tableName - e.g. Quests
 * @param {string|number} id - ID in static data
 * @param {function} getLabelAndAction - will be called and passed the data, e.g. getLabelAndAction(theObject)
 * @param {objet} [options]
 * @param {string} [options.className] - className for the link; default is 'link'
 * @return {WuiDom} - the new span. The link in it will be updated asynchronously when data is retrieved
 */
function newLinkSpanFromDb(tableName, id, getLabelAndAction, options) {
	var className = options && options.className || 'link';
	var span = new WuiDom('span', { className: className });

	staticContent.getData(tableName, id, function (error, data) {
		if (!span.rootElement) {
			return;
		}
		if (error) {
			span.replaceClassNames([className], ['deadLink']);
			span.setText('[' + tableName + ' ' + id + '?]'); // we cannot guess the label if data was not found!
			return console.error('Failed getting link data: ' + tableName + ' #' + id, error);
		}
		var res = getLabelAndAction(data);
		span.setText(res[0]);
		// if there is no action, this is not a real link
		if (!res[1]) {
			span.replaceClassNames([className], ['deadLink']);
			return;
		}
		tapBehavior(span);
		span.on('tap', res[1]);
	});

	return span;
}

/** Used to open 'grimoire' or 'social' books */
function openBookAction(book, tabId, params) {
	return function () {
		windowsManager.open(book, { tabId: tabId, tabParams: params });
	};
}

function handleItemHyperlink(itemParams) {
	return newLinkSpanFromDb('Items', itemParams.objectGID, function (item) {
		return [item.nameId, function () {
			windowsManager.open('itemBox', itemParams);
		}];
	});
}

/** Player menu link - e.g. "{player,Verdichex,29}" */
addLinkHandler(bracesAroundText, '\\{player,([^,]+),([0-9]+)\\}', function (match) {
	var label = match[1];
	return newLinkSpan(match[0], label, function () {
		window.gui.openContextualMenu('player', { playerId: match[2], playerName: label });
	});
});

/** Item link - e.g. "{item,309,696191}" */
addLinkHandler(bracesAroundText, '\\{item,([0-9]+),([0-9]+)\\}', function (match) {
	return handleItemHyperlink({ objectGID: parseInt(match[1], 10), objectUID: parseInt(match[2], 10) });
});

/** Item's Recipe link - e.g. "{recipe,7467}" */
addLinkHandler(bracesAroundText, '\\{recipe,([0-9]+)\\}', function (match) {
	return newLinkSpanFromDb('Items', parseInt(match[1], 10), function (item) {
		var label = '[' + getText('ui.common.recipes', 1) + getText('ui.common.colon') + item.nameId + ']';
		return [label, function () {
			itemManager.getItems([item.id], function (error, items) {
				if (error) { return console.error('Broken link item:', item); } // never happens: see newLinkSpanFromDb
				windowsManager.open('itemRecipes', { itemData: items[0] });
			});
		}];
	}, { className: 'insertedLink' });
});

/** NPC arrow link - e.g. "{npc,-1::[personnage non joueur]}" - the brackets are regular characters here */
addLinkHandler(bracesAroundText, '\\{npc,([-0-9]+)::([^\\}]*)\\}', function (match) {
	return newLinkSpan(match[0], match[2], function () {
		window.isoEngine.addArrowOnNpc(parseInt(match[1], 10), ARROW_SHOW_IN_MS);
	});
});

/** Monster arrow link - e.g. "{monster,-1::[monstre]}" - the brackets are regular characters here */
addLinkHandler(bracesAroundText, '\\{monster,([-0-9]+)::([^\\}]*)\\}', function (match) {
	return newLinkSpan(match[0], match[2], function () {
		window.isoEngine.addArrowOnMonster(parseInt(match[1], 10), ARROW_SHOW_IN_MS);
	});
});

/** Title chat link - e.g. "{chattitle,20::[Terror of the Peninsula]}" */
addLinkHandler(bracesAroundText, '\\{chattitle,([-0-9]+)::([^\\}]*)\\}', function (match) {
	return newLinkSpan(match[0], match[2], openBookAction('grimoire', 'ornaments', { titleId: match[1] }));
});

/** Achievement chat link - e.g. "{chatachievement,100::[Sixth Generation]}" */
addLinkHandler(bracesAroundText, '\\{chatachievement,([-0-9]+)::([^\\}]*)\\}', function (match) {
	return newLinkSpan(match[0], match[2], openBookAction('grimoire', 'achievements', { achievementId: match[1] }));
});

/** Guild card link - e.g. "{guild,27::Go Gobball}" */
addLinkHandler(bracesAroundText, '\\{guild,([-0-9]+)::([^\\}]*)\\}', function (match) {
	return newLinkSpan(match[0], match[2], function () {
		window.dofus.sendMessage('GuildFactsRequestMessage', { guildId: match[1] });
	});
});

/** Alliance card link - e.g. "{alliance,14::[PCT]}" */
addLinkHandler(bracesAroundText, '\\{alliance,([-0-9]+)::([^\\}]*)\\}', function (match) {
	return newLinkSpan(match[0], match[2], function () {
		window.dofus.sendMessage('AllianceFactsRequestMessage', { allianceId: match[1] });
	});
});

/**
 * Ping system link - e.g. "{pingsystem,100,pingSystemMpBI::[Attaque]}"
 *                                       ^cellId   ^className   ^text to show
 */
addLinkHandler(bracesAroundText, '\\{pingsystem,([0-9]+),([^:]*)::([^\\}]*)\\}', function (match) {
	var pingSystem = window.gui.pingSystem;
	var raw = match[0];
	var cellId = match[1];
	var className = match[2] || '';
	var text = match[3] || '';

	// add pingSystem into the name

	text = getText('tablet.pingsystem.pingsystem') + getText('ui.common.colon') + text;

	pingSystem.addPingPicto(cellId, className);

	return newLinkSpan(raw, text, function () {
		pingSystem.addPingPicto(cellId, className);
	});
});


//TODO: many more links come from tutorial (and probably from Tutorial only)
//A lot of it is hardcoded anyway so I (OL) am not sure how much effort would be wasted in making this generic.
var uiLinks = {
	'banner,btn_items,1': function () { hintArrowHelper.pointToMenuIcon('Bag'); },
	'storage,slot_2,2': function () { hintArrowHelper.pointToCharacterItem(2); },
	'storage,grid': function () { hintArrowHelper.pointToStorageFirstSlotBox(); }
};

/** UI link - e.g. "{ui,banner,btn_items,1::inventory}" */
addLinkHandler(bracesAroundText, '\\{ui,([a-zA-Z_,0-9]+)::([^\\}]*)\\}', function (match) {
	return newLinkSpan(match[0], match[2], uiLinks[match[1]]);
});

/** Open UI link - e.g. "{openSocial,0,0::ami(s)}" */
addLinkHandler(bracesAroundText, '\\{openSocial,([0-9]+),([0-9]+)::([^\\}]*)\\}', function (match) {
	return newLinkSpan(match[0], match[3],
		openBookAction('social', parseInt(match[1], 10), { tabId: parseInt(match[2], 10) }));
});

/** Item link - e.g. "$item12360" */
addLinkHandler(dollarNameNumber, '\\$item([0-9]+)', function (match) {
	return handleItemHyperlink({ objectGID: parseInt(match[1], 10) });
});

/** Job link - e.g. "$job36" */
addLinkHandler(dollarNameNumber, '\\$job([0-9]+)', function (match) {
	return newLinkSpanFromDb('Jobs', match[1], function (job) {
		// NB: not a link in Flash game (just a text)
		return [job.nameId, openBookAction('grimoire', 'jobs', { jobId: job.id })];
	});
});

/** Quest link - e.g. "$quest1423" */
addLinkHandler(dollarNameNumber, '\\$quest([0-9]+)', function (match) {
	return newLinkSpanFromDb('Quests', match[1], function (quest) {
		return [quest.nameId, openBookAction('grimoire', 'quests', {
			questId: quest.id,
			categoryId: quest.categoryId
		})];
	});
});

/** Area name - e.g "$area234" */
addLinkHandler(dollarNameNumber, '\\$area([0-9]+)', function (match) {
	return newLinkSpanFromDb('Areas', match[1], function (area) {
		return [area.nameId, null]; // no link in Flash game
	});
});

/** $subarea link */
addLinkHandler(dollarNameNumber, '\\$subarea([0-9]+)', function (match) {
	return newLinkSpanFromDb('SubAreas', match[1], function (subarea) {
		return [subarea.nameId, null]; // TODO link code; see Flash HyperlinkShowSubArea.as
	});
});

/** Map link - e.g. "$map84804608" */
addLinkHandler(dollarNameNumber, '\\$map([0-9]+)', function (match) {
	return newLinkSpanFromDb('MapPositions', match[1], function (position) {
		return [
			position.nameId || '[' + position.posX + ',' + position.posY + ']',
			function () {
				window.gui.emit('CompassUpdateMessage', {
					type: CompassTypeEnum.COMPASS_TYPE_SIMPLE,
					worldX: position.posX,
					worldY: position.posY
				});
			}
		];
	});
});

/** Map link - e.g. "{map,-4,0::votre carte}" */
addLinkHandler(bracesAroundText, '\\{map,(-?[0-9]+),(-?[0-9]+)::([^\\}]*)\\}', function (match) {
	var worldX = parseInt(match[1], 10), worldY = parseInt(match[2], 10);
	var label = match[3] || '[' + worldX + ',' + worldY + ']';
	return newLinkSpan(match[0], label, function () {
		windowsManager.open('worldMap', { x: worldX, y: worldY });
	});
});

/** Item type name - e.g. $itemType23 */
addLinkHandler(dollarNameNumber, '\\$itemType([0-9]+)', function (match) {
	return newLinkSpanFromDb('ItemTypes', match[1], function (itemType) {
		return [itemType.nameId, null]; // no link in Flash game
	});
});

/** Achievement link - e.g. $achievement100 - TODO: grimoire opening on the right achievement */
addLinkHandler(dollarNameNumber, '\\$achievement([0-9]+)', function (match) {
	return newLinkSpanFromDb('Achievements', match[1], function (achievement) {
		return [achievement.nameId, openBookAction('grimoire', 'achievements', { achievementId: match[1] })];
	});
});

/** Title link - e.g. $title120 */
addLinkHandler(dollarNameNumber, '\\$title([0-9]+)', function (match) {
	return newLinkSpanFromDb('Titles', match[1], function (title) {
		var name = window.gui.playerData.characterBaseInformations.sex ? title.nameFemaleId : title.nameMaleId;
		return [name, openBookAction('grimoire', 'ornaments', { titleId: match[1] })];
	});
});

/** Ornament link - e.g. $ornament13 */
addLinkHandler(dollarNameNumber, '\\$ornament([0-9]+)', function (match) {
	return newLinkSpanFromDb('Ornaments', match[1], function (ornament) {
		return [ornament.nameId, openBookAction('grimoire', 'ornaments', { ornamentId: match[1] })];
	});
});

/** Spell name - e.g. $spell1 */
addLinkHandler(dollarNameNumber, '\\$spell([0-9]+)', function (match) {
	return newLinkSpanFromDb('Spells', match[1], function (spell) {
		return [spell.nameId, null]; // no link in Flash game
	});
});

/** Spell state name - e.g. $spellState1 */
addLinkHandler(dollarNameNumber, '\\$spellState([0-9]+)', function (match) {
	return newLinkSpanFromDb('SpellStates', match[1], function (spellState) {
		return [spellState.nameId, null]; // no link in Flash game
	});
});

/** Breed name - e.g. $breed1 */
addLinkHandler(dollarNameNumber, '\\$breed([0-9]+)', function (match) {
	return newLinkSpanFromDb('Breeds', match[1], function (breed) {
		return [breed.shortNameId, null]; // no link in Flash game
	});
});

/** Emoticon name - e.g. $emote1 */
addLinkHandler(dollarNameNumber, '\\$emote([0-9]+)', function (match) {
	return newLinkSpanFromDb('Emoticons', match[1], function (emote) {
		return [emote.nameId, null]; // no link in Flash game
	});
});

/** Monster name - e.g. $monster31 */
addLinkHandler(dollarNameNumber, '\\$monster([0-9]+)', function (match) {
	return newLinkSpanFromDb('Monsters', match[1], function (monster) {
		return [monster.nameId, null]; // no link in Flash game
	});
});

/** Monster race name - e.g. $monsterRace1 */
addLinkHandler(dollarNameNumber, '\\$monsterRace([0-9]+)', function (match) {
	return newLinkSpanFromDb('MonsterRaces', match[1], function (monsterRace) {
		return [monsterRace.nameId, null]; // no link in Flash game
	});
});

/** Monster super race name - e.g. $monsterSuperRace1 */
addLinkHandler(dollarNameNumber, '\\$monsterSuperRace([0-9]+)', function (match) {
	return newLinkSpanFromDb('MonsterSuperRaces', match[1], function (monsterSuperRace) {
		return [monsterSuperRace.nameId, null]; // no link in Flash game
	});
});

/** Alignment name - e.g. $alignment1 */
addLinkHandler(dollarNameNumber, '\\$alignment([0-9]+)', function (match) {
	return newLinkSpanFromDb('AlignmentSides', match[1], function (alignmentSide) {
		return [alignmentSide.nameId, null]; // no link in Flash game
	});
});

/** Character stat name - e.g. $stat1 */
addLinkHandler(dollarNameNumber, '\\$stat([0-9]+)', function (match) {
	var stats = getText('ui.item.characteristics').split(',');
	return newLinkSpan(match[0], stats[match[1]], null); // no link in Flash game
});

/** Dungeon name - e.g. $dungeon1 */
addLinkHandler(dollarNameNumber, '\\$dungeon([0-9]+)', function (match) {
	return newLinkSpanFromDb('Dungeons', match[1], function (dungeon) {
		return [dungeon.nameId, null]; // no link in Flash game
	});
});

/** Challenge name - e.g. "$challenge41" - not actually a link, just a text replacement */
addLinkHandler(dollarNameNumber, '\\$challenge([0-9]+)', function (match) {
	return newLinkSpanFromDb('Challenge', match[1], function (challenge) {
		return [challenge.nameId, null]; // no link in Flash game
	});
});

/** HTML link - e.g. "<a href=...>htmlContent</a>" */
addLinkHandler(htmlTagA, '<a href=([^>]+)>(.+)</a>', function (match) {
	var href = match[1];
	var html = match[2]; // it is really HTML: there can be tags like <u> </u> in there
	if (href[0] === '"' || href[0] === '\'') { href = href.slice(1, -1); } // remove quotes around href link
	return newExternalLink(href, null, { html: html });
});

/** Style tag - e.g. "{style:className,text}" */
addLinkHandler(bracesAroundText, '\\{style:([a-zA-Z]+),([^\\}]*)\\}', function (match) {
	return new WuiDom('span', { text: match[2], className: match[1] });
});

/** `My Shop` interface e.g. "{myShop::your shop}" */
addLinkHandler(bracesAroundText, '\\{myShop::([^\\}]*)\\}', function (match) {
	return newLinkSpan(match[0], match[1], function () {
		window.dofus.sendMessage('ExchangeRequestOnShopStockMessage');
	});
});

/** Generic open window with a specific tab e.g. "{windowTab,windowName,tabId::yourText}"
  * e.g. "{windowTab,grimoire,alignment::fenetre d'alignement}"
  */
addLinkHandler(bracesAroundText, '\\{windowTab,([a-zA-Z_,0-9]+),([a-zA-Z_,0-9]+)::([^\\}]*)\\}', function (match) {
	return newLinkSpan(match[0], match[3], function () {
		windowsManager.open(match[1], { tabId: match[2] });
	});
});

/** Generic open window "{window,windowName::yourText}" e.g. "{window,equipment::your inventory}" */
addLinkHandler(bracesAroundText, '\\{window,([a-zA-Z_,0-9]+)::([^\\}]*)\\}', function (match) {
	return newLinkSpan(match[0], match[2], function () {
		if (match[1] === 'bidHouseShop') {
			return BidHouseShopWindow.openBidHouse(/*isSellMode=*/false);
		}
		windowsManager.open(match[1]);
	});
});

//--- end of regular links

/** Unknown "braces" dead link - catches everything in braces that was not caught above */
addLinkHandler(bracesAroundText, '\\{([a-zA-Z_,0-9\\-]+)::([^\\}]*)\\}', function (match) {
	return newLinkSpan(match[0], match[2]);
});

//--- end links

// Build the "master" generic regexp that will match all the links we know
var masterGenericRegExp = new RegExp(genericRegexps.join('|'));


/** Replaces links in given text.
 *  No options right now. Could be things like "no-color" etc.
 *  @param {string} text - e.g. 'Join {player,Verdichex,29}?'
 *  @return {WuiDom} - new span element
 */
exports.process = function (text) {
	var content = new WuiDom('span');
	for (;;) {
		//look for next match
		var match = masterGenericRegExp.exec(text);
		if (!match) { break; } // no links left
		var occurence = match[0];
		//we split the text: before the link and after it
		var posOccurence = text.indexOf(occurence);
		var beforeOccurence = text.substr(0, posOccurence);
		var afterOccurence = text.substr(posOccurence + occurence.length);

		// find which specific regexp matches this occurence
		var link, specificMatch = null;
		for (var i = 0; i < linkFunctions.length; i++) {
			specificMatch = linkRegExps[i].exec(occurence);
			if (specificMatch) {
				//...and call the link function for the one that matched
				link = linkFunctions[i](specificMatch);
				break;
			}
		}
		// create a dead link if no match was found
		if (!specificMatch) { link = newLinkSpan(occurence); }

		//the part "before" is added as a simple text span
		content.createChild('span').setHtml(beforeOccurence);
		//the link is added
		content.appendChild(link);
		//we continue the parsing of the remaining text
		text = afterOccurence;
	}
	//now append the remaining text as a simple text span
	content.createChild('span').setHtml(text);
	return content;
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/hyperlink/index.js
 ** module id = 449
 ** module chunks = 0
 **/