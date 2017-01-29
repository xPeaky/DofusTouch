//getText replaces i18n strings
//A build tool (run manually from time to time) should replace the "findText" by "getText"
//A JSON file containing all UI texts will be sent by server to client and
//used by the client to retrieve texts.

var staticContent = require('staticContent');

var lang = 'en';
var failoverLanguage = 'en';
var dict = null;
var dictFailover = null;
var chaseText = false;


exports.initialize = function (config, cb) {
	if (dict && lang === config.language && chaseText === config.chaseText) {
		return cb();
	}

	lang = config.language;
	chaseText = config.chaseText;
	failoverLanguage = config.failoverLanguage || failoverLanguage;

	staticContent.getDictionary(failoverLanguage, function (err, uiDictionary) {
		if (err) {
			return cb(err);
		}
		dictFailover = uiDictionary;

		staticContent.getDictionary(lang, function (err, uiDictionary) {
			if (err) {
				return cb(err);
			}
			dict = uiDictionary;
			cb();
		});
	});
};

exports.initializeStatic = function (language, dictionary) {
	lang = language;
	dict = dictionary;
};

/**
 * Evaluates `baseString` by possibly injecting variables (replacements)
 * and inserting (or not) conditional text based on value of modifier (or previous argument).
 *
 * @param  {String} baseString - original text (usually from our dictionary)
 * @param  {Object} args - `arguments` object of the public function getText, processText, etc. (#0 is ignored here)
 * @param  {number|string} [modifier] - Decides conditional text (e.g. "{~ps}"); if not given, previous arg is used
 *
 * @return {String} resulting text
 */
function evalSpecialMarkers(baseString, args, modifier) {
	// TODO: might want to use regex instead of parsing the string character per character
	var lastArg = modifier !== undefined ? modifier : args[1]; // keeps last argument if no modifier given
	var result = '';
	for (var i = 0, len = baseString.length; i < len; i++) {
		var c = baseString[i];
		// Is it a marker for a variable injection ?
		if (c === '%' || c === '#') {
			var index = parseInt(baseString[i + 1], 10);
			if (!isNaN(index)) {
				var arg = args[index];
				if (modifier === undefined) { lastArg = arg; }
				if (arg !== undefined && arg !== null) {
					result += arg;
				}
				i++;
				continue;
			}
		}
		// Is it a marker?
		if (c === '{' || c === '(') {
			var end = baseString.indexOf(c === '{' ? '}' : ')', i);
			if (end !== -1 && baseString[i + 1] === '~') {
				var keepIt = false;
				switch (baseString[i + 2]) {
				case 'p':
					keepIt = (lastArg !== 1 && lastArg !== '1');
					break; //!=1 is gramatically correct and similar to Ankama's code
				case 's':
					keepIt = (lastArg === 1 || lastArg === '1');
					break;
				case 'm':
					keepIt = (lastArg === 0);
					break;
				case 'f':
					keepIt = (lastArg !== 0);
					break;
				case '1':
					if (baseString[i + 3] === '~' && baseString[i + 4] === '2') {
						keepIt = args[1] !== undefined && args[1] !== null && args[2] !== undefined && args[2] !== null;
						i += 2;
					}
					break;
				default:
					console.error('Found unknown marker in:', baseString);
				}
				if (keepIt) {
					result += baseString.substring(i + 3, end);
				}
				i = end;
				continue;
			}
		}
		//any other character gets added as is
		result += c;
	}
	return result;
}

/**
 * DEPRECATED!
 * Use findText when you could not find the right text in current dictionay.
 * @deprecated we should now create new texts inside addendum.json instead
 */
exports.findText = function (text) {
	if (chaseText) {
		return lang + '[' + text + ']';
	}
	return text;
};

/**
 * Use getText in most cases.
 *
 * No parameter replacement:
 *   getText('ui.common.ok');
 *
 * Parameter replacement + modifier: (the parameter is also used as modifier)
 *   getText('ui.item.usePerTurn', numUsePerTurn); // ui.item.usePerTurn = "%1 utilisation{~ps} par tour"
 *     => "1 utilisation par tour" OR "2 utilisations par tour"
 *
 * Modifier only: (the parameter is the modifier)
 *  windowTitle = getText('ui.common.spouse', spouseData.sex); // ui.common.spouse = "Conjoint{~fe}"; sex = 0 or 1
 *     => "Conjoint" OR "Conjointe"
 */
exports.getText = function (textId) {
	var text = dict[textId];
	if (!text) {
		//TODO: after the translation of the addendum that warning need to be an error
		console.warn('getText: no getText was found for', textId, 'in', lang);
		if (!dictFailover[textId]) {
			console.error('getText: no failover getText was found for', textId, 'in', failoverLanguage);
			return lang + '[?' + textId + ']';
		}
		text = dictFailover[textId];
	}
	return getTextProcess(text, arguments);
};


exports.getTextFailover = function (textId) {
	var text = dictFailover[textId];
	if (!text) {
		console.error('getTextFailover: no failover getText was found for', textId, 'in', failoverLanguage);
		return lang + '[?' + textId + ']';
	}
	return getTextProcess(text, arguments);
};

function getTextProcess(text, args) {
	if (chaseText) {
		return lang + '[' + text + ']';
	}
	if (args[1] === undefined) {
		return text;
	}
	return evalSpecialMarkers(text, args);
}

/**
 * Use processText when you already have the text (retrieved from a previous call to getText without parameters).
 *
 * Example:
 *   damageText = processText(damageDescr, min, max); // damageDescr = "Damage: #1{~1~2 to }#2"; min & max = numbers
 */
exports.processText = function (text) {
	return evalSpecialMarkers(text, arguments);
};

/**
 * Use processTextWithModifier for RARE special case,
 * where you need parameter replacements AND a modifier BUT the modifier's value should not appear in final text.
 *
 * Example:
 * In this example, the modifier (number 1 or 2 etc) decides if plural form is used, but is not in final text.
 *
 *   var text = getText('ui.party.teleportCriterionFallenAngels');
 *   // here text is "%1 ne respecte{~pnt} pas les conditions pour être invité{~ps}."
 *
 *   processTextWithModifier(text, 2, 'Pierre, Paul')
 *     => "Pierre, Paul ne respectent pas les conditions pour être invités."
 *   processTextWithModifier(text, 1, 'Pierre')
 *     => "Pierre ne respecte pas les conditions pour être invité."
 */
exports.processTextWithModifier = function (text, modifier) {
	return evalSpecialMarkers(text, Array.prototype.slice.call(arguments, 1), modifier);
};


//



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/getText/index.js
 ** module id = 35
 ** module chunks = 0
 **/