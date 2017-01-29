var canTouch = false;
if ('ontouchstart' in window) {
	canTouch = true;
}

var position = {
	x: 0,
	y: 0
};

var getPosition;
if (canTouch) {
	getPosition = function (e) {
		var touchList = e.touches || [];
		var touchCount = touchList.length;
		if (touchCount === 0) {
			return {
				x: position.x,
				y: position.y,
				touches: [],
				touchCount: 0
			};
		}

		var touches = [];
		for (var i = 0; i < touchCount; i += 1) {
			touches.push({ x: touchList[i].clientX, y: touchList[i].clientY });
		}

		position.x = touchList[0].clientX;
		position.y = touchList[0].clientY;

		return {
			x: position.x,
			y: position.y,
			touches: touches,
			touchCount: touchCount
		};
	};
} else {
	getPosition = function (e) {
		position.x = e.clientX;
		position.y = e.clientY;
		return {
			x: position.x,
			y: position.y,
			touchCount: e.type === 'mouseup' ? 0 : 1,
			touches: [{ x: position.x, y: position.y }]
		};
	};
}

module.exports = {
	canTouch: canTouch,
	getPosition: getPosition,
	position: position,
	events: {
		start: canTouch ? 'touchstart' : 'mousedown',
		move: canTouch ? 'touchmove' : 'mousemove',
		end: canTouch ? 'touchend' : 'mouseup'
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/tapHelper/index.js
 ** module id = 33
 ** module chunks = 0
 **/