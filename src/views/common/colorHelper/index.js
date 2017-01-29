// colorHelper
function toHexaString(n, format) {
	var s = n.toString(16).toUpperCase();
	if (format) {
		while (s.length < format) {
			s = '0' + s;
		}
	}
	return s;
}

function colorArrayToHexa(c) {
	var red   = toHexaString(c[0], 2);
	var green = toHexaString(c[1], 2);
	var blue  = toHexaString(c[2], 2);
	return '#' + red + green + blue;
}
exports.colorArrayToHexa = colorArrayToHexa;


function hexaToColorArray(color) {
	color = color.substr(1);
	if (color.length === 3) {
		return [
			parseInt(color[0] + color[0], 16) / 255.0,
			parseInt(color[1] + color[1], 16) / 255.0,
			parseInt(color[2] + color[2], 16) / 255.0,
			1
		];
	} else {
		return [
			parseInt(color.substr(0, 2), 16) / 255.0,
			parseInt(color.substr(2, 2), 16) / 255.0,
			parseInt(color.substr(4, 2), 16) / 255.0,
			1
		];
	}
}
exports.hexToColorArray = hexaToColorArray;


function rgbaToColorArray(colorString) {
	// Parse color from rgba(255, 255, 255, 1) style string
	var index0 = colorString.indexOf('(');
	var index1 = colorString.indexOf(',');
	var index2 = colorString.indexOf(',', index1 + 1);
	var index3 = colorString.indexOf(',', index2 + 1);
	var index4 = colorString.indexOf(')', index3 + 1);

	return [
		parseInt(colorString.substr(index0 + 1, index1), 10) / 255.0,
		parseInt(colorString.substr(index1 + 1, index2), 10) / 255.0,
		parseInt(colorString.substr(index2 + 1, index3), 10) / 255.0,
		parseFloat(colorString.substr(index3 + 1, index4))
	];
}
exports.rgbaToColorArray = rgbaToColorArray;


function parseIndexedColor(indexedColor) {
	var index = (indexedColor & 0xF000000) >> 24;
	var red   = (indexedColor & 0xFF0000) >> 16;
	var green = (indexedColor & 0x00FF00) >> 8;
	var blue  = (indexedColor & 0x0000FF);
	return { index: index, color: { r: red, g: green, b: blue } };
}
exports.parseIndexedColor = parseIndexedColor;


function addIndex(color, index) {
	return color + (index << 24);
}
exports.addIndex = addIndex;


function addIndexes(colors) {
	var indexed = [];
	for (var i = 0; i < colors.length; i++) {
		indexed.push(addIndex(colors[i], i + 1));
	}
	return indexed;
}
exports.addIndexes = addIndexes;


function anyToColorArray(color) {
	if (typeof color === 'string') {
		if (color.indexOf('#') === 0) {
			return hexaToColorArray(color);
		}

		if (color.indexOf('rgba(') === 0) {
			return rgbaToColorArray(color);
		}
	}

	return color;
}
exports.anyToColorArray = anyToColorArray;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * @param {Number[]} indexedColors - indexed color array as sent by server within `EntityLook` data
 */
function parseIndexedColors(indexedColors) {
	var tints = null;
	if (indexedColors && indexedColors.length > 0) {
		tints = [null, null, null, null, null, null];
		for (var i = 0; i < indexedColors.length; i++) {
			var indexedColor = parseIndexedColor(indexedColors[i]);
			tints[indexedColor.index] = indexedColor.color;
		}
	}
	return tints;
}

exports.parseIndexedColors = parseIndexedColors;

function getIndexedColor(index, red, green, blue) {
	var result = 0;
	result |= (index & 0xF)  << 24;
	result |= (red   & 0xFF) << 16;
	result |= (green & 0xFF) << 8;
	result |= (blue  & 0xFF);
	return result;
}

exports.getIndexedColor = getIndexedColor;

/**
 * Transform hex to rgb colors
 * @param {string} hex - the hexa color can be 'FFF' or 'FFFFFF'
 * @return {object|null} - object with rgb values or null
 */
function hexToRgb(hex) {
	var rgb = parseInt(hex, 16);
	if (hex.length === 6) {
		return {
			r: (rgb & 0xff0000) >> 16,
			g: (rgb & 0x00ff00) >> 8,
			b: (rgb & 0x0000ff)
		};
	}

	if (hex.length === 3) {
		// Short hand format
		var r0 = (rgb & 0xf00) >> 8;
		var g0 = (rgb & 0x0f0) >> 4;
		var b0 = (rgb & 0x00f);
		return {
			r: r0 + (r0 << 4),
			g: g0 + (g0 << 4),
			b: b0 + (b0 << 4)
		};
	}

	console.warn('[hexToRgb] Invalid hex value');
	return null;
}

exports.hexToRgb = hexToRgb;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/common/colorHelper/index.js
 ** module id = 246
 ** module chunks = 0
 **/