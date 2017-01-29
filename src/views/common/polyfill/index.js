/*eslint no-extend-native: 0 */

if (typeof String.prototype.startsWith !== 'function') {
	String.prototype.startsWith = function (str, position) {
		if (position === undefined) { position = 0; }
		return this.slice(position, str.length + position) === str;
	};
}

if (typeof String.prototype.endsWith !== 'function') {
	String.prototype.endsWith = function (searchString, position) {
		var subjectString = this.toString();
		if (position === undefined || position > subjectString.length) {
			position = subjectString.length;
		}
		position -= searchString.length;
		var lastIndex = subjectString.indexOf(searchString, position);
		return lastIndex !== -1 && lastIndex === position;
	};
}


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/common/polyfill/index.js
 ** module id = 4
 ** module chunks = 0
 **/