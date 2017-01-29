require('./draggedMount.less');
var dragManager = require('dragManager');
var WuiDom = require('wuidom');

var DRAG_ID = 'mountRoom'; // drag and drop ID for a mount

var MAX_DISPLAYED_FRAMES = 7;
var FRAME_OFFSET_X = -4;
var FRAME_OFFSET_Y = 4;

var FRAME_WIDTH = 138;
var FRAME_HEIGHT = 118;


function prepareFrames(num) {
	var numFrames = Math.min(num - 1, MAX_DISPLAYED_FRAMES);
	var frames = new WuiDom('div', { className: 'emptyFrame' });
	frames.setStyles({ left: numFrames * FRAME_OFFSET_X + 'px', top: numFrames * FRAME_OFFSET_Y + 'px' });

	var f = frames;
	for (var i = numFrames - 1; i >= 0; i--) {
		f = f.createChild('div', { className: 'emptyFrame' });
	}

	f.createChild('div', { className: 'number', text: num });
	return frames;
}


function DraggedMount(breedingWindow, element) {
	this.sourceData = { mount: null };

	this.styles = {};
	this.onDragClassName = 'draggedMount';
	this.wElement = element;
	this.imgElement = element; // can be redefined in setMount()
	this.breedingWindow = breedingWindow;

	var options = {
		// TODO: modify dragManager so containerWidth can be set on "this"?
		containerWidth: FRAME_WIDTH, containerHeight: FRAME_HEIGHT
	};

	dragManager.setDraggable(element, this, DRAG_ID, this.sourceData, options);
}
module.exports = DraggedMount;


DraggedMount.DRAG_ID = DRAG_ID;


DraggedMount.prototype.setMount = function (mountData, imgElement) {
	this.sourceData.mount = mountData;
	this.imgElement = imgElement || this.imgElement;
};

DraggedMount.prototype.setStyle = function (propertyName, value) {
	this.styles[propertyName] = value;
};

DraggedMount.prototype.prepareForDrag = function (sourceData, dragElement) {
	// "this" is the icon element inside dragElement
	this.setStyle('backgroundImage', this.imgElement.getStyle('backgroundImage'));
	var numDragged = this.breedingWindow.prepareDraggedTiles(this.sourceData.mount);

	if (numDragged > 1) {
		dragElement.addClassNames('multiselect');
		var addedFrames = prepareFrames(numDragged);
		dragElement.insertAsFirstChild(addedFrames);
		this.wElement.once('dragEnd', function () {
			dragElement.removeChild(addedFrames);
			dragElement.delClassNames('multiselect');
		});
	}

	return true; // accept the drag
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/BreedingWindow/DraggedMount.js
 ** module id = 653
 ** module chunks = 0
 **/