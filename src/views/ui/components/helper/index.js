var getText = require('getText').getText;
var async = require('async');
var dofusTimeYearLag = require('timeManager').time.dofusTimeYearLag;
var tweener = require('tweener');


exports.sortObjectInArray = function (array, key, isDescending) {
	var ascending = isDescending ? 1 : -1;
	var descending = isDescending ? -1 : 1;

	array.sort(function (a, b) {
		if (a[key] < b[key]) {
			return ascending;
		}

		if (a[key] > b[key]) {
			return descending;
		}

		return 0;
	});
};

exports.getObjectInArrayIndexById = function (array, key, id) {
	if (!Array.isArray(array)) {
		return console.error('Input not an array.', array);
	}

	for (var i = 0; i < array.length; i += 1) {
		var obj = array[i];
		if (obj.hasOwnProperty(key) && obj[key] === id) {
			return i;
		}
	}

	return -1;
};

exports.getObjectInArrayById = function (array, key, id) {
	var index = module.exports.getObjectInArrayIndexById(array, key, id);

	if (index >= 0) {
		return array[index];
	}
};

exports.removeObjectInArrayById = function (array, key, id) {
	if (!Array.isArray(array)) {
		return console.error('Input not an array.', array);
	}

	var removed = false;

	for (var i = array.length - 1; i >= 0; i -= 1) {
		var obj = array[i];
		if (obj.hasOwnProperty(key) && obj[key] === id) {
			array.splice(i, 1);
			removed = true;
		}
	}

	return removed;
};

/**
 * Merge a list of objects given as an array or separate parameters.
 * @param {Array} array - an array of objects to merge.
 * @returns {Object} - a new object with the properties of the given objects
 */
exports.mergeObjects = function (array) {
	var objects = array || arguments;
	var o = {};
	for (var i = 0, len = objects.length; i < len; i += 1) {
		var object = objects[i];
		for (var k in object) {
			if (object.hasOwnProperty(k)) {
				o[k] = object[k];
			}
		}
	}
	return o;
};


var stringToKamaRegExp = /[^0-9]+/g;
var intToStringRegExp = /\B(?=(\d{3})+(?!\d))/g;
var stringToIntRegExp = null;

var numberSeparator = null; // initialized with getText('ui.common.numberSeparator') upon first use

// "Escapes" special characters so you can create a regexp from a string
function escapeRegexp(str) {
	return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1');
}

/**
 * @method kamasToString
 * @desc Turns a kama value to string. Adds a separator every 3 digit and the currency at the end
 *
 * @param {Number} kamas - kama value
 * @param {String} unit - Currency unit - 'K' by default. If you pass '' you should instead call intToString.
 */
exports.kamasToString = function (kamas, unit) {
	if (!unit && unit !== '') {
		unit = getText('ui.common.short.kama');
	}

	var kamaString = this.intToString(kamas);

	if (unit) {
		return kamaString + ' ' + unit;
	} else {
		return kamaString;
	}
};

/**
 * @method stringToKamas
 * @desc Turns a currency string to a Number

 * @param {String} kamaString - kama currency string
 */
exports.stringToKamas = function (kamaString) {
	return Number(kamaString.replace(stringToKamaRegExp, ''));
};

/**
 * @method intToString
 * @desc Formats a number
 *
 * @param {Number} value - the number to format
 */
exports.intToString = function (value) {
	if (isNaN(value)) { return ''; }
	numberSeparator = numberSeparator !== null ? numberSeparator : getText('ui.common.numberSeparator');

	return value.toString().replace(intToStringRegExp, numberSeparator);
};

exports.stringToInt = function (valueStr) {
	if (!stringToIntRegExp) {
		numberSeparator = numberSeparator !== null ? numberSeparator : getText('ui.common.numberSeparator');
		//TODO: create an init function for helper and move this there - should be called each time we change language
		stringToIntRegExp = new RegExp(escapeRegexp(numberSeparator), 'g');
	}
	return Number(valueStr.replace(stringToIntRegExp, ''));
};

/**
 * Returns a string with both hard and soft amounts.
 * Reserved to places where displaying 2 currency icons is not possible.
 * @param {number|null} priceHard - price in hard currency (can be null if we only have a soft ccy price)
 * @param {number} priceSoft - price in soft currency
 * @return {string} - e.g. "1 G / 264 K" or "264 K"
 */
exports.hardAndSoftToString = function (priceHard, priceSoft) {
	var text = priceHard ? exports.kamasToString(priceHard, 'G') + ' / ' : '';
	return text + exports.kamasToString(priceSoft, 'K');
};

/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @method extractElementsFrom
 * @desc helper used to gather elements from a table or an object based on an id list
 *
 * @param {number[]} idList - Array of ids
 * @param {Object|Object[]} object - Object with indexes pointing to the right element
 * OR an Array containing the elements
 * @param {boolean} outputAsObject - Do we want an Array or an Object? default is false (outputs an Array)
 * @param {string} idName - Default is `id`, used if elements ids are something like `effectId` instead of `id`
 */
exports.extractElementsFrom = function (idList, object, outputAsObject, idName) {
	outputAsObject = outputAsObject || false;
	idName = idName || 'id';

	idList = idList.map(function (e) { return e.toString(); }); // strings enforcement

	var output, i;

	if (outputAsObject) {
		output = {};
	} else {
		output = [];
	}

	// `object` is a js array
	if (object instanceof Array) {
		var len = object.length;
		for (i = 0; i < len; i++) {
			if (object[i] && idList.indexOf(object[i][idName].toString()) !== -1) { // we got this element in the id list
				if (outputAsObject) {
					output[object[i][idName]] = object[i];
				} else {
					output.push(object[i]);
				}
			}
		}
	} else {
		// `object` is a js object
		for (i in object) {
			if (object[i] && idList.indexOf(object[i][idName].toString()) !== -1) { // we got this element in the id list
				if (outputAsObject) {
					output[object[i][idName]] = object[i];
				} else {
					output.push(object[i]);
				}
			}
		}
	}
	return output;
};

/** Stores a set of values in a map owned by "self" and emit an event if any value changed. <br>
 *  e.g. storeMapAndEmit(self, self.alignmentInfos, msg.stats.alignmentInfos, 'alignmentUpdated');
 *  @param {object} self - object on which event will be sent
 *  @param {map} map - map receiving the new values
 *  @param {map} newValues - new values
 *  @param {string} eventName - event to be sent */
exports.storeMapAndEmit = function (self, map, newValues, eventName) {
	var modified = false;
	for (var key in newValues) {
		if (map[key] !== newValues[key]) {
			map[key] = newValues[key];
			modified = true;
		}
	}
	if (modified) {
		self.emit(eventName);
	}
};

/** Stores a single value in a map owned by "self" and emit an event if the value changed
 *  e.g. storeValueAndEmit(self, self.inventoryContent, 'kamas', msg.stats.kamas, 'kamasUpdated');
 *  @param {object} self - object on which event will be sent
 *  @param {map} map - map receiving the new value
 *  @param {string} key
 *  @param {map} newValue - new value
 *  @param {string} eventName - event to be sent */
exports.storeValueAndEmit = function (self, map, key, newValue, eventName) {
	if (map[key] !== newValue) {
		map[key] = newValue;
		self.emit(eventName, newValue);
	}
};

// input format is either #ff00ff or ff00ff, # is optional
exports.hexToRgb = function (hex) {
	var lengthDiff = 6 - hex.length;

	for (var i = 0; i < lengthDiff; i++) {
		hex = lengthDiff + hex;
	}

	var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : null;
};


//

/**
 * [durationToString description]
 * @param  {number} duration in seconds
 * @return {string}          format HH:MM:SS (Ex: 0:16:45)
 */
exports.durationToString = function (duration) {
	var seconds = ~~duration % 60;
	if (seconds < 10) {
		seconds = '0' + seconds;
	}
	var minutes = ~~(duration / 60) % 60;
	if (minutes < 10) {
		minutes = '0' + minutes;
	}
	var hours = ~~(duration / 3600);
	if (hours < 10) {
		hours = '0' + hours;
	}
	return hours + ':' + minutes + ':' + seconds;
};


// TODO: We need a time module to handle the date as in the flash version
exports.getAlmanaxDate = function (date, useLocalTime) {
	date = date ? new Date(date) : new Date();

	var year = useLocalTime ? date.getFullYear() : date.getUTCFullYear();
	var month = useLocalTime ? date.getMonth() : date.getUTCMonth();
	var day = useLocalTime ? date.getDate() : date.getUTCDate();
	var hour = useLocalTime ? date.getHours() : date.getUTCHours();
	var minute = useLocalTime ? date.getMinutes() : date.getUTCMinutes();

	return {
		year: year + dofusTimeYearLag,
		month: month + 1,
		day: day,
		monthName: window.gui.databases.Months[month].nameId,
		hour: hour < 10 ? '0' + hour : hour,
		minute: minute < 10 ? '0' + minute : minute
	};
};

// Temporary solution : dot not re-use
// TODO : we should read "non diacritic text" from the server
exports.simplifyString = function (strAccents) {
	strAccents = strAccents.split('');
	var strAccentsOut = [];
	var strAccentsLen = strAccents.length;
	var accents = 'ÀÁÂÃÄÅàáâãäåÒÓÔÕÕÖØòóôõöøÈÉÊËèéêëðÇçÐÌÍÎÏìíîïÙÚÛÜùúûüÑñŠšŸÿýŽž';
	var accentsOut = 'AAAAAAaaaaaaOOOOOOOooooooEEEEeeeeeCcDIIIIiiiiUUUUuuuuNnSsYyyZz';
	for (var y = 0; y < strAccentsLen; y++) {
		if (accents.indexOf(strAccents[y]) !== -1) {
			strAccentsOut[y] = accentsOut.substr(accents.indexOf(strAccents[y]), 1);
		} else {
			strAccentsOut[y] = strAccents[y];
		}
	}
	strAccentsOut = strAccentsOut.join('');
	return strAccentsOut.toLowerCase();
};

/**
 * Creates a FIFO stack (queue). If you need the first mess to finish before the next.
 *
 * E.g.
 *    var fifo = helper.createFifo();
 *    // ...
 *    fifo.push(function (cb) {
 *        // ...
 *        cb();
 *    });
 * (See JobsData.js for full example)
 */
exports.createFifo = function () {
	// create the FIFO
	return async.queue(function (task, callback) {
		try {
			task(function (error) {
				if (error) { throw new Error(error); }
				callback();
			});
		} catch (e) {
			console.error(e);
			callback(e);
		}
	});
};

exports.getObjectInstanceName = function (object) {
	if (!object) {
		return null;
	}
	var regex = /function ([^(]+)/.exec(String(Object.getPrototypeOf(object).constructor)) || [];
	return regex[1];
};

/**
 * Transform an object into array
 * @param {object} object
 * @param {object} [options]
 * @param {string} [options.sortBy] - sort the array by that object property
 * @return {Array}
 */
exports.mapToArray = function (object, options) {
	var keys = Object.keys(object);
	var len = keys.length;
	var result = new Array(len);

	for (var i = 0; i < len; i++) {
		result[i] = object[keys[i]];
	}

	if (options && options.sortBy) {
		var key = options.sortBy;
		result.sort(function (a, b) {
			return a[key] - b[key];
		});
	}

	return result;
};

/**
 * Force CSS reflow.
 * Used to be sure a css value defined in javascript is really applied.
 * Useful for instance when using css transition: if the value rendered on screen during the latest reflow
 * was "1", then you reset it to "0" to transition to "1" again before any new reflow, the initial value
 * and the final one being the same ("1"), nothing happen on screen.
 * See more explanations and demonstration at https://github.com/Wizcorp/Dofus/pull/2952#discussion-diff-61195542
 */
exports.forceReflow = function (wuiDom) {
	/* eslint no-unused-vars:0 */
	var reflow = wuiDom.rootElement.offsetWidth;
};

/**
 * Makes an element appear "progressively" by increasing the opacity from 0 to 1.
 * @param {WuiDom} element - element we want to show; can be null if we only want a "fadingElement" (see below)
 * @param {number} time - the time it takes from opacity 0 to 1, in ms
 * @param {number} [delay] - a delay before we start the animation (default is 0)
 * @param {WuiDom} [fadingElement] - element to show fading while the new element appears
 */
exports.showProgressively = function (element, time, delay, fadingElement) {
	if (element) {
		element.setStyle('opacity', 0);
		element.show();
		exports.forceReflow(element);
	}

	function startTweener() {
		if (fadingElement) {
			tweener.tween(fadingElement,
				{ opacity: 0 },
				{ time: time || 250 });
		}
		if (element) {
			tweener.tween(element,
				{ opacity: 1 },
				{ time: time || 250 });
		}
	}

	if (delay) {
		window.setTimeout(startTweener, delay);
	} else {
		startTweener();
	}
};

/**
 * To be able to open href links in crosswalk embedded browser, it is required to open them from javascript-land with a
 * window.open and a _blank target.
 * @param {wuidom} wuidom - The wuidom that contain the link tag <a>
 */
exports.allLinksOnTargetBlank = function (wuidom) {
	var links = wuidom.rootElement.getElementsByTagName('a');
	var onTap = function (e) {
		e.preventDefault();
		exports.openUrlInAppBrowser(this.href);
	};
	for (var i = 0; i < links.length; i++) {
		links[i].onclick = onTap;
	}
};

/**
 * Open an url in device default browser (and leave the current app if running in a native application)
 * @param {string} url - The url to open
 */
exports.openUrlInDeviceBrowser = function (url) {
	window.open(url, '_system');
};

/**
 * Open an url in crosswalk embedded browser
 * @param {string} url - The url to open
 */
exports.openUrlInAppBrowser = function (url) {
	if (window.cordova && window.cordova.InAppBrowser) {
		window.cordova.InAppBrowser.open(url, '_blank', 'closebuttoncaption=' + getText('tablet.common.backToGame'));
	} else {
		window.open(url, '_blank');
	}
};

exports.cssTransform = function (wuiDom, value) {
	wuiDom.setStyles({
		transform: value,
		oTransform: value,
		msTransform: value,
		mozTransform: value,
		webkitTransform: value
	});
};

exports.cssTransition = function (wuiDom, value) {
	wuiDom.setStyles({
		transition: value,
		oTransition: value,
		msTransition: value,
		mozTransition: value,
		webkitTransition: value
	});
};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/helper/index.js
 ** module id = 209
 ** module chunks = 0
 **/