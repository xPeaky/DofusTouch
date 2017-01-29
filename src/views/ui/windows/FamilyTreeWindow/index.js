require('./styles.less');
var inherits = require('util').inherits;
var Window = require('Window');
var getText = require('getText').getText;
var assetPreloading = require('assetPreloading');

function FamilyTreeWindow() {
	Window.call(this, {
		className: 'FamilyTreeWindow',
		positionInfo: { left: 'c', top: 'c', width: '688px', height: '511px' }
	});

	var tree = this.windowBody.createChild('div', { className: 'tree' });
	this._myMount = tree.createChild('div', { className: ['mountDisplay', 'myMount'] });
	this._myMountName = tree.createChild('div', { className: 'myMountName' });

	this._ancestorBoxes = [];
	var NB_GENERATION = 3;
	var ancestor = 0;
	for (var geneMinus = 1; geneMinus <= NB_GENERATION; geneMinus += 1) {
		for (var previousAncestor = ancestor; ancestor < Math.pow(2, geneMinus) + previousAncestor; ancestor += 1) {
			var classNames = ['mountDisplay', 'ancestor_' + ancestor, 'geneMinus' + geneMinus];
			this._ancestorBoxes.push(tree.createChild('div', { className: classNames }));
		}
	}

	this.on('open', this._setMount);
}

inherits(FamilyTreeWindow, Window);
module.exports = FamilyTreeWindow;


FamilyTreeWindow.prototype._setMount = function (mountData) {
	var self = this;
	var ancestorData = mountData.ancestor || [];
	var i, len;

	var name = mountData.name || getText('ui.common.noName');
	this.windowTitle.setText(getText('ui.mount.ancestors', name));
	this._myMountName.setText(name);

	// get images

	var images = ['gfx/mounts/' + mountData.model + '.png'];
	for (i = 0, len = ancestorData.length; i < len; i += 1) {
		if (!ancestorData[i]) {
			continue;
		}
		images.push('gfx/mounts/' + ancestorData[i] + '.png');
	}

	// TODO: if content is already existing from previous open, hide images before async load
	// (to avoid "blinking" of old images on slower tablets). OR do a freeContent method to save memory!
	assetPreloading.preloadImages(images, function (urls) {
		self._myMount.setStyle('backgroundImage', urls[0]);

		for (i = 0, len = self._ancestorBoxes.length; i < len; i += 1) {
			var ancestorBox = self._ancestorBoxes[i];
			// +1 because the first one is my mount not the ancestor
			var url = urls[i + 1];

			if (url) {
				ancestorBox.setStyle('backgroundImage', url);
			} else {
				ancestorBox.setStyle('backgroundImage', 'none');
			}
		}
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/FamilyTreeWindow/index.js
 ** module id = 898
 ** module chunks = 0
 **/