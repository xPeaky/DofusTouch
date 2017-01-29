var WebGLRenderer = require('./main.js');

function populateSpriteVertexBuffer(positions, colorView, spriteIdx, sprite) {
	var vertexPos    = sprite.vertexPos;
	var textureCoord = sprite.textureCoord;
	var color        = sprite.color;

	positions[spriteIdx + 0]  = vertexPos[0];
	positions[spriteIdx + 1]  = vertexPos[1];
	colorView[spriteIdx + 2]  = (textureCoord[0] * 0xffff & 0xffff) + (textureCoord[1] * 0xffff0000 & 0xffff0000);

	positions[spriteIdx + 5]  = vertexPos[4];
	positions[spriteIdx + 6]  = vertexPos[5];
	colorView[spriteIdx + 7]  = (textureCoord[0] * 0xffff & 0xffff) + (textureCoord[3] * 0xffff0000 & 0xffff0000);

	positions[spriteIdx + 10] = vertexPos[6];
	positions[spriteIdx + 11] = vertexPos[7];
	colorView[spriteIdx + 12] = (textureCoord[2] * 0xffff & 0xffff) + (textureCoord[3] * 0xffff0000 & 0xffff0000);

	positions[spriteIdx + 15] = vertexPos[0];
	positions[spriteIdx + 16] = vertexPos[1];
	colorView[spriteIdx + 17] = (textureCoord[0] * 0xffff & 0xffff) + (textureCoord[1] * 0xffff0000 & 0xffff0000);

	positions[spriteIdx + 20] = vertexPos[6];
	positions[spriteIdx + 21] = vertexPos[7];
	colorView[spriteIdx + 22] = (textureCoord[2] * 0xffff & 0xffff) + (textureCoord[3] * 0xffff0000 & 0xffff0000);

	positions[spriteIdx + 25] = vertexPos[2];
	positions[spriteIdx + 26] = vertexPos[3];
	colorView[spriteIdx + 27] = (textureCoord[2] * 0xffff & 0xffff) + (textureCoord[1] * 0xffff0000 & 0xffff0000);

	// Clamping color components in [-128, 127]
	var cmr = Math.max(-128, Math.min(127, color[0] * 64));
	var cmg = Math.max(-128, Math.min(127, color[1] * 64));
	var cmb = Math.max(-128, Math.min(127, color[2] * 64));
	var cma = Math.max(-128, Math.min(127, color[3] * 64));
	var car = Math.max(-128, Math.min(127, color[4] * 128));
	var cag = Math.max(-128, Math.min(127, color[5] * 128));
	var cab = Math.max(-128, Math.min(127, color[6] * 128));
	var caa = Math.max(-128, Math.min(127, color[7] * 128));

	var cm = ((cma << 24) & 0xff000000) + ((cmb << 16) & 0xff0000) + ((cmg << 8) & 0xff00) + (cmr & 0xff);
	var ca = ((caa << 24) & 0xff000000) + ((cab << 16) & 0xff0000) + ((cag << 8) & 0xff00) + (car & 0xff);

	colorView[spriteIdx + 3]  = colorView[spriteIdx + 8]  = colorView[spriteIdx + 13] = cm;
	colorView[spriteIdx + 18] = colorView[spriteIdx + 23] = colorView[spriteIdx + 28] = cm;
	colorView[spriteIdx + 4]  = colorView[spriteIdx + 9]  = colorView[spriteIdx + 14] = ca;
	colorView[spriteIdx + 19] = colorView[spriteIdx + 24] = colorView[spriteIdx + 29] = ca;
}

function SubBatchData(startingByte, nBytes, drawMode, texture) {
	this.nBytes       = nBytes;
	this.drawMode     = drawMode;
	this.texture      = texture || null;
	this.startingByte = startingByte;
}

function BatchData(spriteBatches, bbox, prerender) {
	this.bbox          = bbox;
	this.prerender     = prerender;
	this.spriteBatches = spriteBatches;
}

WebGLRenderer.prototype.prepareBatchFromSpriteList = function (batchId, batchData, prerender) {
	prerender = prerender ? true : false; // Whether to prerender the sprite batch

	var spriteBatch = batchData.spriteBatch;
	var lastSprite  = spriteBatch.length - 1;
	var batchSize   = batchData.nbSprites * this._spriteSize;

	var reservedChunk = this.sFMPartitioner.reserve(batchId, batchSize);
	var startingByte  = reservedChunk.start;
	var startSubBatch = startingByte;
	var endingByte    = startingByte;

	var vertexBuffer = new ArrayBuffer(batchSize);
	var positions    = new Float32Array(vertexBuffer);
	var colorView    = new Uint32Array(vertexBuffer);

	var byteCoeff = this._spriteSize / 4;

	var spritesIdx    = 0;
	var spriteBatches = [];
	for (var s = 0; s <= lastSprite; s += 1) {
		var sprite = spriteBatch[s];
		if (sprite.isMaskTag) {
			prerender = true; // Sprite batch includes a mask, will be prerendered
			spriteBatches.push(sprite); // adding sprite as a mask tag
			continue;
		}

		populateSpriteVertexBuffer(positions, colorView, spritesIdx * byteCoeff, sprite);
		endingByte += this._spriteSize;
		spritesIdx += 1;

		var nextSprite = spriteBatch[s + 1];
		if ((s === lastSprite)                     || // Last sprite of the batch
			sprite.texture !== nextSprite.texture  || // Texture differs from texture of next sprite
			nextSprite.isMaskTag                      // Next sprite is a mask tag
		) {
			// Texturing is switching
			spriteBatches.push(
				new SubBatchData(startSubBatch, endingByte - startSubBatch, this._drawModes.triangles, sprite.texture)
			);

			startSubBatch = endingByte;
		}
	}

	// Uploading created buffer onto the GPU
	this.updateGPUBuffer(startingByte, positions);

	// Attaching preloaded batch object to its memory chunk reference for easy access
	// Also attaching bounding box of the animation for ulterior access
	reservedChunk.obj = new BatchData(spriteBatches, batchData.bbox, prerender);
};

WebGLRenderer.prototype.loadSpriteBuffer = function (batchId, vertexBuffer, texture, bbox, prerender) {
	this._loadVertexBuffer(batchId, vertexBuffer, texture, bbox, this._drawModes.triangles, prerender);
};

WebGLRenderer.prototype.loadLineBuffer = function (batchId, vertexBuffer, bbox, prerender) {
	this._loadVertexBuffer(batchId, vertexBuffer, null, bbox, this._drawModes.lines, prerender);
};

WebGLRenderer.prototype._loadVertexBuffer = function (batchId, vertexBuffer, texture, bbox, drawMode, prerender) {
	var batchSize     = vertexBuffer.byteLength;
	var reservedChunk = this.sFMPartitioner.reserve(batchId, batchSize);
	var startingByte  = reservedChunk.start;

	var batch = new SubBatchData(startingByte, batchSize, drawMode, texture);
	reservedChunk.obj = new BatchData([batch], bbox, prerender);

	// Uploading buffer onto the GPU
	this.updateGPUBuffer(startingByte, vertexBuffer);
};

WebGLRenderer.prototype.updateVertexBuffer = function (batchId, vertexBuffer, byteOffset, byteSize) {
	var reservedChunk = this.sFMPartitioner.getChunk(batchId);
	if (reservedChunk === undefined) {
		console.warn('[WebGLRenderer.updateVertexBuffer] No buffer loaded for', batchId);
		return;
	}

	var startingByte  = reservedChunk.start;

	// Uploading buffer onto the GPU
	this.updateGPUBuffer(startingByte + byteOffset, vertexBuffer, byteSize);
};

WebGLRenderer.prototype.drawLineBatch = function (batchId, lineWidth) {
	// Switching to program that enables the fixed scaling of the sprites
	this.useProgram(this._programLine);

	this.gl.lineWidth(lineWidth);
	var batchData = this.sFMPartitioner.touch(batchId);
	if (batchData === undefined) {
		console.warn('[WebGLRenderer.drawLineBatch] No buffer loaded for', batchId);
		this.stopProgram();
		return;
	}

	this._drawBatch(batchData);

	// Switching back to previous program
	this.stopProgram();
};

WebGLRenderer.prototype.drawBoxBatch = function (batchId) {
	// Switching to program that enables the fixed scaling of the sprites
	this.useProgram(this._programBox);

	var batchData = this.sFMPartitioner.touch(batchId);
	if (batchData === undefined) {
		console.warn('[WebGLRenderer.drawBoxBatch] No buffer loaded for', batchId);
		this.stopProgram();
		return;
	}

	this._drawBatch(batchData);

	// Switching back to previous program
	this.stopProgram();
};

WebGLRenderer.prototype.drawSpriteBatchAbsoluteScale = function (batchId, scale) {
	// Switching to program that enables the fixed scaling of the sprites
	this.useProgram(this._programAbsoluteScale);

	// Adding necessary info to correctly scale the sprites
	var matrix = this._matrixStack[0];
	matrix[3] = scale / this._renderTarget.width;
	matrix[7] = scale / this._renderTarget.height;

	this.drawSpriteBatch(batchId);

	// Switching back to previous program
	this.stopProgram();
};

WebGLRenderer.prototype.drawSpriteBatch = function (batchId) {
	var batchData = this.sFMPartitioner.touch(batchId);
	if (batchData === undefined) {
		console.warn('[WebGLRenderer.drawSpriteBatch] No buffer loaded for', batchId);
		return;
	}

	if (batchData.prerender) {
		var texture = this.textureCache.holdElement(batchId);
		var bbox    = batchData.bbox;
		if (texture === undefined) {
			// Bounds of the texture
			var x0 = bbox[0];
			var x1 = bbox[1];
			var y0 = bbox[2];
			var y1 = bbox[3];

			// Scale of the texture (for improved rendering quality)
			var matrix = this._matrixStack[0];
			var a = this._renderTarget.width  * matrix[0] / 2;
			var b = this._renderTarget.width  * matrix[4] / 2;
			var c = this._renderTarget.height * matrix[1] / 2;
			var d = this._renderTarget.height * matrix[5] / 2;
			var scale = Math.sqrt(Math.max(a * a + b * b, c * c + d * d)) * this.prerenderRatio;

			var renderTarget = this.startTextureUsage(x1 - x0, y1 - y0, scale, batchId, 'nearest');
			this.startTextureRendering(renderTarget, x0, x1, y0, y1);
			this._drawBatch(batchData);
			this.stopTextureRendering(true, true);

			texture = renderTarget.texture;
		}

		this.drawImage(texture, bbox[0], bbox[2], bbox[1] - bbox[0], bbox[3] - bbox[2]);
		texture.release();
	} else {
		this._drawBatch(batchData);
	}
};

WebGLRenderer.prototype.handleMaskTag = function (maskTag, bbox, maskStack) {
	if (maskTag.isMaskDef) {
		var x0 = bbox[0];
		var x1 = bbox[1];
		var y0 = bbox[2];
		var y1 = bbox[3];

		// Start rendering into the mask texture
		var renderTarget = this.startTextureUsage(x1 - x0, y1 - y0, this.maskQuality);
		this.startTextureRendering(renderTarget, x0, x1, y0, y1);
		maskStack.push(renderTarget);
		return;
	}

	var gl = this.gl;
	if (maskTag.isMaskUse) {
		// Using program to render masked sprites with the current render target as the mask
		this.useProgram(this._programMask, { mask: this._renderTarget.textureBinder });

		// Uploading bounding box
		gl.uniform4fv(this._currentProgram.uniforms.uBbox, bbox);

		// Stop rendering into the mask texture
		this.stopTextureRendering(true, true);
		return;
	}

	if (maskTag.isMaskStop) {
		// Stop using the mask texture
		maskStack.pop().texture.release();

		// Stop using the program that renders masked sprite
		this.stopProgram();
		return;
	}
};

WebGLRenderer.prototype._drawBatch = function (batchData) {
	var spriteBatches = batchData.spriteBatches;
	var maskStack     = null;
	for (var b = 0; b < spriteBatches.length; b += 1) {
		var subBatch = spriteBatches[b];
		if (subBatch.isMaskTag) {
			if (maskStack === null) {
				maskStack = [];
			}
			this.handleMaskTag(subBatch, batchData.bbox, maskStack);
			continue;
		}

		var offset    = subBatch.startingByte / this._vertexSize;
		var nVertices = subBatch.nBytes       / this._vertexSize;
		this._drawSubBatch(offset, nVertices, subBatch.texture, subBatch.drawMode);
	}
};

WebGLRenderer.prototype.drawSpriteSubBatch = function (batchId, fromVertex, toVertex) {
	var batchData = this.sFMPartitioner.touch(batchId);
	if (batchData === undefined) {
		console.warn('[WebGLRenderer.drawSpriteSubBatch] No buffer loaded for', batchId);
		return;
	}

	var subBatch  = batchData.spriteBatches[0];
	var offset    = subBatch.startingByte / this._vertexSize + fromVertex;
	var nVertices = toVertex - fromVertex;
	this._drawSubBatch(offset, nVertices, subBatch.texture, subBatch.drawMode);
};

WebGLRenderer.prototype._drawSubBatch = function (offset, nVertices, texture, drawMode) {
	if (nVertices <= 0) {
		return;
	}

	// Draw
	var gl = this.gl;
	if (texture !== null) {
		var textureHandle = this.textureCache.useElement(texture.id);
		if (textureHandle === undefined) {
			console.warn('[WebGLRenderer._drawSubBatch] Texture not loaded:', texture.id);
			return;
		}

		gl.bindTexture(gl.TEXTURE_2D, textureHandle.element.binder);
	}

	gl.uniformMatrix4fv(this._currentProgram.uniforms.uMatrix, false, this._matrixStack[0]);
	gl.drawArrays(drawMode, offset, nVertices);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/WebGLRenderer/batch.js
 ** module id = 277
 ** module chunks = 0
 **/