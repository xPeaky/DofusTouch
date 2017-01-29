var WebGLRenderer = require('./main.js');

WebGLRenderer.prototype.initBuffer = function (maxSprites) {
	// Provide positions for the sprites
	var gl = this.gl;

	// Allocating vertex buffer (GPU memory)
	var vertexBufferBinder = gl.createBuffer();

	// Creating structure of the vertex buffer
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferBinder);

	// Vertex buffer that will hold all the vertices
	var vertexBuffer = new ArrayBuffer(maxSprites * this._spriteSize);

	// Feeding vertex data that will be used to render images
	var positions = new Float32Array(vertexBuffer);
	var colorView = new Uint32Array(vertexBuffer);

	positions[0]  = 0;
	positions[1]  = 0;
	colorView[2]  = 0;

	positions[5]  = 0;
	positions[6]  = 1;
	colorView[7]  = 0xffff0000;

	positions[10] = 1;
	positions[11] = 1;
	colorView[12] = 0xffffffff;

	positions[15] = 0;
	positions[16] = 0;
	colorView[17] = 0;

	positions[20] = 1;
	positions[21] = 1;
	colorView[22] = 0xffffffff;

	positions[25] = 1;
	positions[26] = 0;
	colorView[27] = 0x0000ffff;

	// 0x40404040 === (64 << 24) + (64 << 16) + (64 << 8) + 64 where 64 corresponds to a color multiplier of 1
	colorView[3] = colorView[8] = colorView[13] = colorView[18] = colorView[23] = colorView[28] = 0x40404040;
	colorView[4] = colorView[9] = colorView[14] = colorView[19] = colorView[24] = colorView[29] = 0;

	gl.bufferData(gl.ARRAY_BUFFER, vertexBuffer, gl.STATIC_DRAW);
};

WebGLRenderer.prototype.updateGPUBuffer = function (startingByte, subBuffer) {
	var gl = this.gl;
	// TODO: add security mechanism to make sure that the subBuffer never overflows the number of reserved bytes
	gl.bufferSubData(gl.ARRAY_BUFFER, startingByte, subBuffer);
};

WebGLRenderer.prototype.isInBuffer = function (batchId) {
	return this.sFMPartitioner.possess(batchId);
};

WebGLRenderer.prototype.getBufferData = function (batchId) {
	return this.sFMPartitioner.touch(batchId);
};

WebGLRenderer.prototype.lockBuffer = function (batchId) {
	return this.sFMPartitioner.addLock(batchId);
};

WebGLRenderer.prototype.releaseBuffer = function (batchId) {
	return this.sFMPartitioner.release(batchId);
};

WebGLRenderer.prototype.unlockBuffer = function (batchId) {
	this.sFMPartitioner.removeLock(batchId);
};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/WebGLRenderer/buffer.js
 ** module id = 274
 ** module chunks = 0
 **/