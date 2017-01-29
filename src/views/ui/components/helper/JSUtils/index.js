
exports.isEmptyObject = function isEmptyObject(obj) {
	/*eslint no-unused-vars:0 */

	var name;
	for (name in obj) {
		return false;
	}
	return true;
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/helper/JSUtils/index.js
 ** module id = 603
 ** module chunks = 0
 **/