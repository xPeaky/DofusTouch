var inherits   = require('util').inherits;
var Sprite     = require('Sprite');
var TINAlight  = require('TINAlight');
var DoublyList = require('container-doublylist');

var Tween = TINAlight.Tween;

var ICON_SCALE    = 3.3;
var SCALE_PADDING = 0.2; // Maximum number that can be added to default icon scale without the buffer getting crazy

var VISIBILITY_SWITCH_DURATION = 9;

function VertexBufferSlot(icon, index) {
	this.icon = icon;
	this.index = index;
	this.reference = null;
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** @class IconBatch
 *
 * @param {Object} params - properties of the icon batch
 *        {number} params.w - width
 *        {number} params.h - height
 *        {number} params.texture - texture
 *        {number} params.iconsData - positions and colors of the icons
 */
function IconBatch(params) {
	Sprite.call(this, params);

	this._bbox = [0, params.w, 0, params.h];

	this._iconsData = params.iconsData;
	this._texture = this._iconsData.texture;

	this._textureWidth  = this._texture.element.width;
	this._textureHeight = this._texture.element.height;

	// Size of an icon in bytes, in the vertex buffer
	this._iconByteSize = this.renderer.getNbBytesPerSprite();
	this._vertexBufferSlots = new DoublyList();

	this._populateVertexBuffer();
}
inherits(IconBatch, Sprite);
module.exports = IconBatch;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** To create the vertex buffer
 *
 */
IconBatch.prototype._createVertexBuffer = function () {
	// Generating vertex buffer
	this._vertexBuffer = new ArrayBuffer(this._vertexBufferSlots.length * this._iconByteSize);
	this._floatView    = new Float32Array(this._vertexBuffer);
	this._longView     = new Uint32Array(this._vertexBuffer);
	this._shortView    = new Uint16Array(this._vertexBuffer);
	this._byteView     = new Uint8Array(this._vertexBuffer);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** To assign slots in the vertex buffer to each icon
 *
 */
IconBatch.prototype._assignVertexBufferSlots = function () {
	var vertexBufferIndex = 0;
	var iconClusters = this._iconsData.zIndexedIconClusters;
	for (var c = 0; c < iconClusters.length; c += 1) {
		var cluster = iconClusters[c];
		var clusterIcons = cluster.icons;
		for (var i = 0; i < clusterIcons.length; i += 1) {
			var icon = clusterIcons[i];
			var bufferSlot = new VertexBufferSlot(icon, vertexBufferIndex);
			bufferSlot.reference = this._vertexBufferSlots.addBack(bufferSlot);
			icon.vertexBufferSlot = bufferSlot;
			vertexBufferIndex += 1;
		}
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** To populate the vertex buffer with the information in iconsData
 *
 */
IconBatch.prototype._populateVertexBuffer = function () {
	this._assignVertexBufferSlots();
	this._createVertexBuffer();

	var iconClusters = this._iconsData.zIndexedIconClusters;
	for (var c = 0; c < iconClusters.length; c++) {
		this._populateClusterVertexBuffer(iconClusters[c]);
	}

	// Vertex buffer will have to be reloaded
	// Releasing the currently loaded one
	this.renderer.releaseBuffer(this.id);

	// Making sure the sprite will be updated
	this.forceRefresh();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** To populate the vertex buffer with the given icon cluster
 *
 * @param {IconCluster} iconCluster
 */
IconBatch.prototype._populateClusterVertexBuffer = function (iconCluster) {
	var visibleIconIdx = 0;
	var icons = iconCluster.icons;
	for (var i = 0; i < icons.length; i += 1) {
		visibleIconIdx = this._populateIconVertexBuffer(icons[i], visibleIconIdx);
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** To populate the vertex buffer with the icon
 *
 * @param {Icon} icon
 * @param {Number} visibleIconIdx - Index of the icon among visible icons of its cluster
 */
IconBatch.prototype._populateIconVertexBuffer = function (icon, visibleIconIdx) {
	var positions          = this._floatView;
	var colors             = this._longView;
	var textureCoordinates = this._longView;

	var iconPos     = icon.cluster.getIconPosition(visibleIconIdx);
	var iconBuffPos = icon.vertexBufferSlot.index * this._iconByteSize / 4;

	positions[iconBuffPos + 0]  = positions[iconBuffPos + 5]  = positions[iconBuffPos + 10] = iconPos.x;
	positions[iconBuffPos + 15] = positions[iconBuffPos + 20] = positions[iconBuffPos + 25] = iconPos.x;

	positions[iconBuffPos + 1]  = positions[iconBuffPos + 6]  = positions[iconBuffPos + 11] = iconPos.y;
	positions[iconBuffPos + 16] = positions[iconBuffPos + 21] = positions[iconBuffPos + 26] = iconPos.y;

	// Computing texture coordinates
	var dimensions = icon.dimensions;

	var sx0 = dimensions.sx / this._textureWidth;
	var sy0 = dimensions.sy / this._textureHeight;
	var sx1 = (dimensions.sx + dimensions.sw) / this._textureWidth;
	var sy1 = (dimensions.sy + dimensions.sh) / this._textureHeight;

	// Computing compressed texture coordinates
	var tx0Compressed = 0xffff & (0xffff * sx0);
	var tx1Compressed = 0xffff & (0xffff * sx1);

	var ty0Compressed = 0xffff0000 & (0xffff0000 * sy0);
	var ty1Compressed = 0xffff0000 & (0xffff0000 * sy1);

	colors[iconBuffPos + 2]  = tx0Compressed + ty0Compressed;
	colors[iconBuffPos + 7]  = tx0Compressed + ty1Compressed;
	colors[iconBuffPos + 12] = tx1Compressed + ty1Compressed;
	colors[iconBuffPos + 17] = tx0Compressed + ty0Compressed;
	colors[iconBuffPos + 22] = tx1Compressed + ty1Compressed;
	colors[iconBuffPos + 27] = tx1Compressed + ty0Compressed;

	var color = icon.infoData.color || [1, 1, 1, 1];
	var cmr = Math.max(-128, Math.min(127, color[0] * 64));
	var cmg = Math.max(-128, Math.min(127, color[1] * 64));
	var cmb = Math.max(-128, Math.min(127, color[2] * 64));
	var cma = icon.visible ? Math.max(-128, Math.min(127, color[3] * 64)) : 0;

	var cm = ((cma << 24) & 0xff000000) + ((cmb << 16) & 0xff0000) + ((cmg << 8) & 0xff00) + (cmr & 0xff);
	colors[iconBuffPos + 3]  = colors[iconBuffPos + 8]  = colors[iconBuffPos + 13] = cm;
	colors[iconBuffPos + 18] = colors[iconBuffPos + 23] = colors[iconBuffPos + 28] = cm;

	// Color addition buffer part is used to store the icon's corners offset with respect to its center
	// RG is interprated by the shaders as a value within [0, 1]^2
	// R is converted into the x component of the offset as such: offsetX = R * 255
	// therefore offsetX has to be an integer within [0, 255]
	// B is converted into the y component similarly, therefore offsetY has to be an integer within [0, 255]

	// One sprite has four offsets: Top-left, Bottom-left, Bottom-right, Top-right
	// Respectively corresponding to (dx, dy), (dx, dy + h), (dx + w, dy + h), (dx + w, dy)
	var l = dimensions.x;
	var r = dimensions.w + l;
	var t = dimensions.y;
	var b = dimensions.h + t;

	var lCompressed = l & 0xff;
	var rCompressed = r & 0xff;

	var tCompressed = (t & 0xff) << 8;
	var bCompressed = (b & 0xff) << 8;

	var scale = (127 * (1 - SCALE_PADDING)) & 0xff;
	var scaleCompressed = (scale << 24) + (scale << 16);

	textureCoordinates[iconBuffPos + 4]  = lCompressed + tCompressed + scaleCompressed; // Top-left
	textureCoordinates[iconBuffPos + 9]  = lCompressed + bCompressed + scaleCompressed; // Bottom-left
	textureCoordinates[iconBuffPos + 14] = rCompressed + bCompressed + scaleCompressed; // Bottom-right
	textureCoordinates[iconBuffPos + 19] = lCompressed + tCompressed + scaleCompressed; // Top-left
	textureCoordinates[iconBuffPos + 24] = rCompressed + bCompressed + scaleCompressed; // Bottom-right
	textureCoordinates[iconBuffPos + 29] = rCompressed + tCompressed + scaleCompressed; // Top-right

	if (icon.visible) {
		return visibleIconIdx + 1;
	}

	return visibleIconIdx;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** To set given icons' visibility by tweening their alpha value in the vertex buffer.
 * As a side effect, icons in the same cluster of the icons whose visibility change will have their positions changed
 *
 * @param {Array} icons - List of icons whose visibility should change
 * @param {Boolean} visible - Whether icons become visible or invisible
 * @param {Function} cb - Callback triggered when the tweening finishes (optional)
 * @param {Object} clustersToUpdate - list of clusters whose icons' positions to update (optional)
 */
IconBatch.prototype.setVisibility = function (icons, visible, cb, clustersToUpdate) {
	// Making a list of icon clusters affected
	// And specifying number of icons that differs in each of those clusters
	var involvedClusters = clustersToUpdate || {};
	var icon, cluster;
	for (var i = 0; i < icons.length; i += 1) {
		cluster = icons[i].cluster;
		if (involvedClusters[cluster.id] === undefined) {
			involvedClusters[cluster.id] = cluster;
		}
	}

	// Making list of icons that will have to move on the scene
	var movingIcons = [];
	var iconMotions = {};
	var clusterIds = Object.keys(involvedClusters);
	for (var c = 0; c < clusterIds.length; c += 1) {
		var clusterId = clusterIds[c];
		cluster = involvedClusters[clusterId];

		var clusterIcons = cluster.icons;
		var visibleIconIdx = 0;
		for (i = 0; i < clusterIcons.length; i += 1) {
			icon = clusterIcons[i];

			// This icon will be moved
			if (icon.visible) {
				var iconFloatPos = icon.vertexBufferSlot.index * this._iconByteSize / 4;
				movingIcons.push(icon);

				iconMotions[icon.id] = {
					origin: {
						x: this._floatView[iconFloatPos],
						y: this._floatView[iconFloatPos + 1]
					},
					destination: cluster.getIconPosition(visibleIconIdx)
				};

				visibleIconIdx += 1;
			}
		}
	}

	// Tweening icons into visible/invisible
	var easeReference = {
		ease: 0
	};

	var self = this;
	var alphaTween = new Tween(easeReference, ['ease']);
	alphaTween.onUpdate(function () {
		var floatView = self._floatView;
		var shortView = self._shortView;
		var byteView  = self._byteView;

		var ease = easeReference.ease;

		// Tweening scale and alpha of icon whose visibility is changing
		// The ease is a bouncing effect
		var ease0 = visible ? ease : 1 - ease; // Depending on visibility, either fading in or out
		var alpha = (64 * ease0) & 0xff; // converting ease in [0, 1] into alpha in [0, 64]

		var ease1 = ease0 - 1;
		var elasticity = 2; // Elasticity of the bouncing effect
		var scale = ease1 * ease1 * ((elasticity + 1) * ease1 + elasticity) + 1 - SCALE_PADDING;
		scale = (127 * scale) & 0xff; // converting ease in [0, 1] into scale in [0, 127]
		scale += scale << 8; // Copying scale in x for the scale in y

		for (var i = 0; i < icons.length; i += 1) {
			var fadingIcon   = icons[i];
			var iconBytePos  = fadingIcon.vertexBufferSlot.index * self._iconByteSize;
			var iconShortPos = iconBytePos / 2;

			// Updating buffer with new scale
			shortView[iconShortPos + 9]  = shortView[iconShortPos + 19] = shortView[iconShortPos + 29] = scale;
			shortView[iconShortPos + 39] = shortView[iconShortPos + 49] = shortView[iconShortPos + 59] = scale;

			// Updating buffer with new alpha value
			byteView[iconBytePos + 15] = byteView[iconBytePos + 35] = byteView[iconBytePos + 55]  = alpha;
			byteView[iconBytePos + 75] = byteView[iconBytePos + 95] = byteView[iconBytePos + 115] = alpha;
		}

		// Tweening icons that belong to clusters for which an icon's visibility is changing
		// The ease is a polynomial easeOut
		var ease2 = 1 - Math.pow((1 - ease) / 1, 4);
		for (i = 0; i < movingIcons.length; i += 1) {
			var movingIcon = movingIcons[i];
			var motion = iconMotions[movingIcon.id];

			var x = motion.origin.x * (1 - ease2) + motion.destination.x * ease2;
			var y = motion.origin.y * (1 - ease2) + motion.destination.y * ease2;

			var iconFloatPos = movingIcon.vertexBufferSlot.index * self._iconByteSize / 4;
			floatView[iconFloatPos + 0]  = floatView[iconFloatPos + 5]  = floatView[iconFloatPos + 10] = x;
			floatView[iconFloatPos + 15] = floatView[iconFloatPos + 20] = floatView[iconFloatPos + 25] = x;

			floatView[iconFloatPos + 1]  = floatView[iconFloatPos + 6]  = floatView[iconFloatPos + 11] = y;
			floatView[iconFloatPos + 16] = floatView[iconFloatPos + 21] = floatView[iconFloatPos + 26] = y;
		}

		// Vertex buffer will have to be reloaded
		// Releasing the currently loaded one
		self.renderer.releaseBuffer(self.id);

		// Making sure the sprite will be updated
		self.forceRefresh();
	});

	alphaTween.from({ ease: 0 });
	alphaTween.to({ ease: 1 }, VISIBILITY_SWITCH_DURATION);
	alphaTween.onFinish(cb);
	alphaTween.start();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** To get the vertex buffer slot where an icon should fit
 *
 * @param {Icon} icon
 */
IconBatch.prototype.getSlotWhereIconShouldFit = function (icon) {
	// Checking whether the icon cluster is already in the buffer
	var iconClusterOfNewIcon = icon.cluster;

	// Finding next cluster in the buffer
	var zIndexedIconClusters = this._iconsData.zIndexedIconClusters;
	var iconClusters = zIndexedIconClusters;
	var iconClusterIndex = iconClusters.indexOf(iconClusterOfNewIcon);
	if (iconClusterIndex === -1) {
		console.error(new Error('[IconBatch.addIconToVertexBuffer] Icon cluster not present in ordered list'));
		return;
	}

	// Searching for an empty slot to put the icon

	// Searching for insertion index in the vertex buffer
	var clusterIcons = iconClusterOfNewIcon.icons;
	var iconIndex = clusterIcons.indexOf(icon);
	if (iconIndex === -1) {
		console.error(new Error('[IconBatch.addIconToVertexBuffer] Icon not present in its cluster'));
		return;
	}

	// Fetching position of icon coming after
	var fittingSlot;
	if (iconIndex === clusterIcons.length - 1) {
		// No icon coming after within this cluster
		if (iconClusterIndex === zIndexedIconClusters.length - 1) {
			// No cluster coming after
			if (iconClusterIndex === 0) {
				// No cluster coming before
				if (!this._vertexBufferSlots.first) {
					return null;
				}
				fittingSlot = this._vertexBufferSlots.first.object; // Insertion at the beginning of the vertex buffer
			} else {
				// Fetching last icon of previous cluster
				var iconsOfPreviousCluster = zIndexedIconClusters[iconClusterIndex - 1].icons;
				fittingSlot = iconsOfPreviousCluster[iconsOfPreviousCluster.length - 1].vertexBufferSlot;
			}
		} else {
			// Fetching first icon of following cluster
			fittingSlot = zIndexedIconClusters[iconClusterIndex + 1].icons[0].vertexBufferSlot;
		}
	} else {
		// Fetching next icon of given cluster
		fittingSlot = clusterIcons[iconIndex + 1].vertexBufferSlot;
	}

	var currentSlot = icon.vertexBufferSlot;
	if (icon.vertexBufferSlot !== null) {
		if (currentSlot.index < fittingSlot.index) {
			fittingSlot = fittingSlot.reference.previous.object;
		}
	}

	return fittingSlot;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** To add given icon to the batch
 *
 * @param {Icon} icon
 */
IconBatch.prototype.addIcon = function (icon) {
	if (icon.vertexBufferSlot !== null) {
		console.warn('[IconBatch.addIconToVertexBuffer] Trying to add an icon already present in the vertex buffer');
		return;
	}

	var insertionSlot = this.getSlotWhereIconShouldFit(icon);
	var insertionIndex, emptySlotReference;
	if (insertionSlot === null) {
		// Icon is alone
		// Creating the first slot of the vertex buffer
		var firstSlot = new VertexBufferSlot(icon, 0);
		firstSlot.reference = this._vertexBufferSlots.add(firstSlot);
		icon.vertexBufferSlot = firstSlot;
		emptySlotReference = null;
		insertionIndex = 0;
	} else {
		// Saving insertion index
		insertionIndex = insertionSlot.index;

		// Creating a new slot right before the insertion slot
		var newSlot = new VertexBufferSlot(icon, insertionIndex);
		newSlot.reference = this._vertexBufferSlots.addBefore(insertionSlot.reference, newSlot);
		icon.vertexBufferSlot = newSlot;

		// Shifting index of all the icons coming after
		emptySlotReference = insertionSlot.reference;
		while (emptySlotReference !== null && emptySlotReference.icon !== null) {
			// Slot is not empty!

			// Shifting vertex buffer index
			emptySlotReference.object.index += 1;

			// Trying the next slot
			emptySlotReference = emptySlotReference.next;
		}
	}

	// Shifting part of the vertex buffer after where the new icon is coming
	if (emptySlotReference === null) {
		// No empty slot between insertionIndex and end of the list

		// Saving current vertex buffer
		var vertexBuffer = this._floatView;

		// Creating a new vertex buffer of required size
		this._createVertexBuffer();

		// Making room at insertionIndex
		var iconVertexBufferPosition = insertionIndex * this._iconByteSize / 4; // Position in a 4 byte buffer

		// Copying saved vertex buffer into the new one
		var firstPart  = vertexBuffer.subarray(0, iconVertexBufferPosition);
		var secondPart = vertexBuffer.subarray(iconVertexBufferPosition);

		// Copying part before the current icon
		this._floatView.set(firstPart, 0);

		// Copying part after the current icon
		this._floatView.set(secondPart, iconVertexBufferPosition + this._iconByteSize / 4);
	} else {
		// Shifting part of the vertex buffer between insertion index and empty slot
		var from = insertionIndex * this._iconByteSize / 4;
		var to = emptySlotReference.object.index * this._iconByteSize / 4;

		// Removing empty slot
		this._vertexBufferSlots.removeByReference(emptySlotReference);

		var shiftingPart = this._floatView.subarray(from, to);
		this._floatView.set(shiftingPart, from + this._iconByteSize / 4);
	}

	// Populating vertex buffer with new icon
	this._populateIconVertexBuffer(icon, 0);
	this.setVisibility([icon], true);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** To update the position of an icon
 *
 * @param {Icon} icon
 */
IconBatch.prototype.updateIconPosition = function (icon) {
	var currentSlot = icon.vertexBufferSlot;
	if (currentSlot === null) {
		console.error(new Error('[IconBatch.updateIconPosition] Given icon is not present in the vertex buffer'));
		return;
	}

	var insertionSlot = this.getSlotWhereIconShouldFit(icon);
	if (currentSlot.index !== insertionSlot.index) {
		// Icon has to change slot
		var iconVertexBufferPosition = currentSlot.index * this._iconByteSize / 4;

		// Copying part of the vertex buffer corresponding to the icon
		var nextIconPosition = iconVertexBufferPosition + this._iconByteSize / 4;
		var iconPart = new Float32Array(this._floatView.subarray(iconVertexBufferPosition, nextIconPosition));

		// Shifting part of the vertex buffer between current slot and the slot where to move the icon into
		var shiftStart, shiftEnd;
		var slot, slotIcon, slotReference;
		if (currentSlot.index < insertionSlot.index) {
			// Current slot comes before new slot
			// Shifting one index to the left
			shiftStart = nextIconPosition;
			shiftEnd   = insertionSlot.index * this._iconByteSize / 4 + this._iconByteSize / 4;

			this._floatView.set(this._floatView.subarray(shiftStart, shiftEnd), iconVertexBufferPosition);

			// Updating slot icons
			slotReference = currentSlot.reference;
			while (slotReference !== null && slotReference.object !== insertionSlot) {
				// Binding slot to following icon
				slot = slotReference.object;
				slotReference = slotReference.next;
				slotIcon = slotReference.object.icon;
				slotIcon.vertexBufferSlot = slot;
				slot.icon = slotIcon;
			}
		} else {
			// Current slot comes after new slot
			// Shifting one index to the right
			shiftStart = insertionSlot.index * this._iconByteSize / 4;
			shiftEnd   = iconVertexBufferPosition;

			this._floatView.set(this._floatView.subarray(shiftStart, shiftEnd), shiftStart + this._iconByteSize / 4);

			// Updating slot icons
			slotReference = currentSlot.reference;
			while (slotReference !== null && slotReference.object !== insertionSlot) {
				// Binding icon to following slot
				slot = slotReference.object;
				slotReference = slotReference.previous;
				slotIcon = slotReference.object.icon;
				slotIcon.vertexBufferSlot = slot;
				slot.icon = slotIcon;
			}
		}

		insertionSlot.icon = icon;
		icon.vertexBufferSlot = insertionSlot;

		// Pasting part of the vertex buffer corresponding to the icon
		this._floatView.set(iconPart, insertionSlot.index * this._iconByteSize / 4);
	}

	var clustersToUpdate = {};
	var iconCluster = icon.cluster;
	clustersToUpdate[iconCluster.id] = iconCluster;
	this.setVisibility([], true, null, clustersToUpdate);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** To remove given icon. The icon is not really removed, its slot in the vertex buffer is simply made available
 *
 * @param {Icon} icon
 */
IconBatch.prototype.removeIcon = function (icon) {
	// Icon is not really removed, it is just hidden
	this.setVisibility([icon], false, function () {
		// Making sure the icon is still supposed to not be displayed
		if (icon.visible === false) {
			// Virtually removing icon from vertex buffer
			// (virtually -> icon not really removed and buffer size remains unchanged
			// but the slot the icon used to occupy is now available)

			// Vertex buffer slot is now considered empty (no icon attached to it)
			icon.vertexBufferSlot.icon = null;
			icon.vertexBufferSlot = null;
		}
	});
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Custom render method for icon batch, renders all the icons with a fixed scale regardless of zoom level
 */
IconBatch.prototype.render = function () {
	this.renderer.drawSpriteBatchAbsoluteScale(this.id, ICON_SCALE * this.scene.pixelRatio);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Render method of Sprite overridden for performance
 */
IconBatch.prototype.generateCurrentFrameData = function () {
	// Checking whether the vertex buffer is already loaded on the GPU
	var batchData = this.renderer.getBufferData(this.id);
	if (batchData === undefined) { // batchData should never be null
		// Loading the vertex buffer onto the GPU
		var batchId      = this.id;
		var vertexBuffer = this._floatView;
		var texture      = this._texture;
		var prerender    = false;
		this.renderer.loadSpriteBuffer(batchId, vertexBuffer, texture, this._bbox, prerender);
		this.renderer.lockBuffer(this.id);
	}

	return this._bbox;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/* Icon batch stops being used, buffer is release */
IconBatch.prototype.clear = function () {
	this.renderer.releaseBuffer(this.id);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/IconBatch/index.js
 ** module id = 851
 ** module chunks = 0
 **/