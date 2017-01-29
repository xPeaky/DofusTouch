var DoublyList = require('container-doublylist');
var AnimationTemplate = require('AnimationTemplate');
var inherits = require('util').inherits;

function HierarchicalAnimationTemplate(id) {
	this._id  = id; // internal id
	AnimationTemplate.call(this, id);

	// Lists of Symbols exposed by merged templates
	// Mapped by symbol id
	this.externalSymbols = {};

	// Map of merged templates
	this.mergedTemplates = {};

	// Lists of Symbols exposed by merged templates
	// Mapped by template id
	this.mergedSymbols = {};

	// Distribution of animation Data
	this.matrices = [];
	this.colors   = [];

	this.only4Directions = false;
}
inherits(HierarchicalAnimationTemplate, AnimationTemplate);
module.exports = HierarchicalAnimationTemplate;

HierarchicalAnimationTemplate.prototype._updateId = function () {
	this.id = this._id;

	var templateIds = Object.keys(this.mergedTemplates);
	for (var t = 0; t < templateIds.length; t += 1) {
		this.id += '#' + this.mergedTemplates[templateIds[t]].id;
	}

	templateIds = Object.keys(this.parentTemplates);
	for (t = 0; t < templateIds.length; t += 1) {
		this.parentTemplates[templateIds[t]]._updateId();
	}
};

HierarchicalAnimationTemplate.prototype.clear = function () {
	AnimationTemplate.prototype.clear.call(this);

	var templateIds = Object.keys(this.mergedTemplates);
	for (var t = 0; t < templateIds.length; t += 1) {
		this.mergedTemplates[templateIds[t]].clear();
	}
};

HierarchicalAnimationTemplate.prototype.merge = function (template, hasPriority) {
	var templateName = template.name;
	var mergedSymbols = {};
	this.mergedSymbols[templateName] = mergedSymbols;
	this.mergedTemplates[templateName] = template;
	template.parentTemplates[this.name] = this;

	var templateSymbols = template.exposedSymbols;
	for (var symbolId in templateSymbols) {
		var symbol = templateSymbols[symbolId];
		var classSymbols = this.externalSymbols[symbol.className];
		if (!classSymbols) {
			classSymbols = new DoublyList();
			this.externalSymbols[symbol.className] = classSymbols;
		}
		mergedSymbols[symbol.className] = (hasPriority) ? classSymbols.addBack(symbol) : classSymbols.addFront(symbol);
	}

	this._updateId();
	return templateName;
};

HierarchicalAnimationTemplate.prototype.unmerge = function (template) {
	var templateName = template.name;
	var mergedSymbols = this.mergedSymbols[templateName];
	if (!mergedSymbols) {
		return;
	}

	for (var className in mergedSymbols) {
		var classSymbols = this.externalSymbols[className];
		classSymbols.removeByReference(mergedSymbols[className]);

		if (classSymbols.length === 0) {
			delete this.externalSymbols[className];
		}
	}

	delete template.parentTemplates[this.name];
	delete this.mergedTemplates[templateName];
	delete this.mergedSymbols[templateName];

	template.clear();
	this._updateId();
};

HierarchicalAnimationTemplate.prototype.generateTemplate = function (textureHandle, animationHandle) {
	this.animationHandle = animationHandle;
	var animationData = animationHandle.element;

	this.texture  = textureHandle;
	this.symbols  = animationData.symbols;
	this.matrices = animationData.matrices;
	this.colors   = animationData.colors;

	var symbolIds = Object.keys(this.symbols);
	for (var i = 0; i < symbolIds.length; i += 1) {
		var symbol = this.symbols[symbolIds[i]];
		if (symbol.className) {
			this.exposedSymbols[symbol.className] = symbol;
		}
	}

	this.isEmpty = (symbolIds.length === 0);
};

HierarchicalAnimationTemplate.prototype.getSymbol = function (animationName) {
	var symbol = this.exposedSymbols[animationName];
	if (symbol) { return symbol; }
	symbol = this.externalSymbols[animationName];
	if (!symbol) { return null; }
	return symbol.last.object;
};

function Sprite(texture, vertexPos, textureCoord, color) {
	this.color        = color;
	this.texture      = texture;
	this.vertexPos    = vertexPos;
	this.textureCoord = textureCoord;
}

// A Mask is defined by the Sprites within its maskDef and maskUse tags
// and is applied on the Sprites between its maskUse and maskStop

// A MaskDef contains the id of the mask that was just defined
function MaskDef(id) {
	this.id = id;
}
MaskDef.prototype.isMaskTag = true;
MaskDef.prototype.isMaskDef = true;

// A MaskUse contains the id of the mask that will be defined
function MaskUse(id) {
	this.id = id;
}
MaskUse.prototype.isMaskTag = true;
MaskUse.prototype.isMaskUse = true;

// A MaskStop only contains the id of the mask
function MaskStop(id) {
	this.id = id;
}
MaskStop.prototype.isMaskTag  = true;
MaskStop.prototype.isMaskStop = true;

HierarchicalAnimationTemplate.prototype.createSprites =
	function (symbolAnim, frame, symbol, tints, scaleX, scaleY, replace) {
	if (symbol === undefined) {
		return [];
	}
	var animationData = symbol.animationData;
	var transform = animationData.matrices[symbolAnim.matrices[frame]];
	var color     = animationData.colors[symbolAnim.colors[frame]];

	var vertices, colorMatrix;
	var s, sprite, sprites;

	var a = transform[0];
	var b = transform[1];
	var c = transform[2];
	var d = transform[3];
	var e = transform[4] * scaleX;
	var f = transform[5] * scaleY;

	var rm = color[0];
	var gm = color[1];
	var bm = color[2];
	var am = color[3];
	var ra = color[4];
	var ga = color[5];
	var ba = color[6];
	var aa = color[7];

	var x0, y0, x1, y1, x2, y2, x3, y3;
	if (symbol.className) {
		if (replace[symbol.className]) {
			var subentity = replace[symbol.className];
			if (subentity.mirrored) {
				a = -a;
				b = -b;
			}
			sprites = subentity.prepareCurrentAnimationFrame();
			var subentitySprites = [];
			var nbSprites = sprites.length;
			for (s = 0; s < nbSprites; s += 1) {
				sprite = sprites[s];
				subentitySprites.push(sprite);

				if (sprite.isMaskTag) {
					continue;
				}

				colorMatrix = sprite.color;
				sprite.color = [
					colorMatrix[0] * rm,
					colorMatrix[1] * gm,
					colorMatrix[2] * bm,
					colorMatrix[3] * am,
					colorMatrix[4] * rm + ra,
					colorMatrix[5] * gm + ga,
					colorMatrix[6] * bm + ba,
					colorMatrix[7] * am + aa
				];

				vertices = sprite.vertexPos;
				x0 = vertices[0];
				y0 = vertices[1];
				x1 = vertices[2];
				y1 = vertices[3];
				x2 = vertices[4];
				y2 = vertices[5];
				x3 = vertices[6];
				y3 = vertices[7];
				sprite.vertexPos = [
					a * x0 + c * y0 + e,
					b * x0 + d * y0 + f,
					a * x1 + c * y1 + e,
					b * x1 + d * y1 + f,
					a * x2 + c * y2 + e,
					b * x2 + d * y2 + f,
					a * x3 + c * y3 + e,
					b * x3 + d * y3 + f
				];
			}
			return subentitySprites;
		} else {
			var classSymbols = this.externalSymbols[symbol.className];
			if (classSymbols && classSymbols.length > 0) {
				symbol = classSymbols.last.object;
				animationData = symbol.animationData;
			}
		}
	}

	a *= scaleX;
	b *= scaleY;
	c *= scaleX;
	d *= scaleY;

	if (symbol.isGraphic) {
		colorMatrix = [
			rm, gm, bm, am,
			ra, ga, ba, aa
		];

		if (symbol.tint !== undefined) {
			var tint = tints[symbol.tint] || { r: 1, g: 1, b: 1 };
			colorMatrix[0] *= tint.r;
			colorMatrix[1] *= tint.g;
			colorMatrix[2] *= tint.b;
		}

		var vertexPos = symbol.vertexPos;
		x0 = vertexPos[0];
		y0 = vertexPos[1];
		x1 = vertexPos[2];
		y1 = vertexPos[3];

		vertices = [
			a * x0 + c * y0 + e,
			b * x0 + d * y0 + f,
			a * x1 + c * y0 + e,
			b * x1 + d * y0 + f,
			a * x0 + c * y1 + e,
			b * x0 + d * y1 + f,
			a * x1 + c * y1 + e,
			b * x1 + d * y1 + f
		];

		return [new Sprite(symbol.texture, vertices, symbol.textureCoord, colorMatrix)];
	}

	if (symbol.isAnim) {
		frame = frame % symbol.nbFrames;

		var childrenInstances = [];
		var children = symbol.children;
		var vx0, vy0, vx1, vy1, vx2, vy2, vx3, vy3;
		for (var c1 = children.length - 1; c1 >= 0; c1 -= 1) {
			var child = children[c1];
			if (frame < child.frames[0] || frame > child.frames[1]) {
				continue;
			}

			if (child.maskEnd) {
				// Sprites for the mask has already been created
				childrenInstances.push(new MaskStop(child.id));
				continue;
			}

			if (child.maskStart) {
				childrenInstances.push(new MaskDef(child.id));
			}

			sprites = this.createSprites(child, frame - child.frames[0],
				animationData.symbols[child.id], tints, 1, 1, replace);
			for (s = 0; s < sprites.length; s += 1) {
				sprite = sprites[s];
				childrenInstances.push(sprite);

				if (sprite.isMaskTag) {
					continue;
				}

				// Apply current transformation on vertex positions
				vertices = sprite.vertexPos;

				vx0 = vertices[0];
				vy0 = vertices[1];
				vx1 = vertices[2];
				vy1 = vertices[3];
				vx2 = vertices[4];
				vy2 = vertices[5];
				vx3 = vertices[6];
				vy3 = vertices[7];

				vertices[0] = a * vx0 + c * vy0 + e;
				vertices[1] = b * vx0 + d * vy0 + f;

				vertices[2] = a * vx1 + c * vy1 + e;
				vertices[3] = b * vx1 + d * vy1 + f;

				vertices[4] = a * vx2 + c * vy2 + e;
				vertices[5] = b * vx2 + d * vy2 + f;

				vertices[6] = a * vx3 + c * vy3 + e;
				vertices[7] = b * vx3 + d * vy3 + f;

				// Applying current transformation on color
				colorMatrix = sprite.color;
				colorMatrix[0] *= rm;
				colorMatrix[1] *= gm;
				colorMatrix[2] *= bm;
				colorMatrix[3] *= am;
				colorMatrix[4] = colorMatrix[4] * rm + ra;
				colorMatrix[5] = colorMatrix[5] * gm + ga;
				colorMatrix[6] = colorMatrix[6] * bm + ba;
				colorMatrix[7] = colorMatrix[7] * am + aa;
			}

			if (child.maskStart) {
				childrenInstances.push(new MaskUse(child.id));
			}
		}
		return childrenInstances;
	}

	return [];
};

// N.B Code of HierarchicalAnimationTemplate.prepareAnimationFrame could be simplified
//     using the HierarchicalAnimationTemplate.createSprites method but it would have
//     a non-neglectable impact on performance as transformations
//     would have to be applied on each sprite vertex
HierarchicalAnimationTemplate.prototype.prepareAnimationFrame =
	function (animationName, frame, tints, scaleX, scaleY, replace) {
	var symbol = this.getSymbol(animationName);
	if (!symbol) {
		console.warn('Symbol ' + animationName + ' not registered in character\'s template');
		return [];
	}

	var animationData = symbol.animationData;
	if (symbol.isGraphic) {
		var v = symbol.vertexPos;
		var vertices   = [v[0], v[1], v[2], v[1], v[0], v[3], v[2], v[3]];
		return [new Sprite(symbol.texture, vertices, symbol.textureCoord, [1, 1, 1, 1, 0, 0, 0, 0])];
	}

	var spriteBatch = [];
	var children = symbol.children;
	for (var c = children.length - 1; c >= 0; c -= 1) {
		var child = children[c];
		if (child.frames[0] <= frame && frame <= child.frames[1]) {
			if (child.maskEnd) {
				// Sprites for the mask has already been created
				spriteBatch.push(new MaskStop(child.id));
				continue;
			}

			var childData = this.createSprites(child, frame - child.frames[0],
				animationData.symbols[child.id], tints, scaleX, scaleY, replace);

			if (child.maskStart) {
				// Sprites defining the mask are within MaskDef and MaskUse
				spriteBatch.push(new MaskDef(child.id));
				Array.prototype.push.apply(spriteBatch, childData);
				spriteBatch.push(new MaskUse(child.id));
			} else {
				Array.prototype.push.apply(spriteBatch, childData);
			}
		}
	}

	return spriteBatch;
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/HierarchicalAnimationTemplate/index.js
 ** module id = 256
 ** module chunks = 0
 **/