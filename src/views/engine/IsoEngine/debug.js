var IsoEngine = require('./main.js');

var MAP_N_COLUMNS = 14;
var MAP_N_LINES = 40;

/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @method   class:IsoEngine._logMap
 * @desc     Debug function, to print the map in text mode in the browser console.
 *           colors parameter can be provided to highlight cells with specified color.
 *
 * @private
 *
 * @param {number[]} colors - cellId is key and value is color used to highlight this cell in log.
 */
IsoEngine.prototype._logMap = function (colors) {
	colors = colors || [];
	var coloredCells = {};
	for (var i = 0; i < colors.length; i++) {
		coloredCells[colors[i]] = true;
	}

	var map       = this.mapRenderer.map;
	var occupied  = this.actorManager.occupiedCells;
	var userActor = this.actorManager.userActor;

	var c, l, n, s;
	var log = '';
	var styles = [];

	for (c = 0; c < MAP_N_COLUMNS; c++) {
		log += '┌───┐   ';
	}

	var p = true;
	for (l = 0; l < MAP_N_LINES; l++) {
		log += '\n';
		log += p ? '│' : '├';
		for (c = 0; c < MAP_N_COLUMNS; c++) {
			n = l * MAP_N_COLUMNS + c;
			s = (n < 100) ? ' ' : '';
			s += n;
			s += (n < 10) ? ' ' : '';
			log += p ? '%c' + s + '%c├───┤' : '───┤%c' + s + '%c├';

			if (coloredCells[n]) {
				styles.push('background-color: #FF0');
			} else if (map && ((map.cells[n].l & 2) !== 2)) {
				styles.push('background-color: #00F');
			} else if (map && ((map.cells[n].l & 1) === 0)) {
				styles.push('background-color: #113; color: #779');
			} else if (userActor.cellId === n) {
				styles.push('background-color: #CD8; color: #072');
			} else if (occupied[n]) {
				styles.push('background-color: #F88');
			} else {
				styles.push('background-color: #FFF');
			}

			styles.push('background-color: #FFF, color: #000');
		}
		p = !p;
	}

	log += '\n ';

	for (c = 0; c < MAP_N_COLUMNS; c++) {
		log += '   └───┘';
	}

	styles.unshift(log);
	console.log.apply(window.console, styles);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/IsoEngine/debug.js
 ** module id = 1058
 ** module chunks = 0
 **/