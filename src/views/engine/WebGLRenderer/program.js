// jscs: disable maximumLineLength
var WebGLRenderer = require('./main.js');

function ProgramData(program, data) {
	this.program = program;
	this.data = data || null;
}

var textureIndexes = {
	uTexture: 0,
	uMask: 1
};

function Program(renderer, vertexShaderId, fragmentShaderId, uniformIds, attributeIds) {
	this.binder = null;
	this.vertexShaderId   = vertexShaderId;
	this.fragmentShaderId = fragmentShaderId;

	this.uniformIds   = uniformIds;
	this.attributeIds = attributeIds;

	this.uniforms   = {};
	this.attributes = {};

	this.lastAttributeIndex = attributeIds.length - 1;

	this.vertexSize = renderer._vertexSize;
	this.gl = renderer.gl;
}

Program.prototype.setAttributes = function () {
	var floatSize = 4;
	var shortSize = 2;
	var byteSize  = 1;

	this.gl.vertexAttribPointer(this.attributes.aPosition, 2, this.gl.FLOAT, false, this.vertexSize, 0);
	// this.gl.vertexAttribPointer(this.attributes.aTexCoord, 2, this.gl.UNSIGNED_SHORT, true,  this.vertexSize, 2 * floatSize);
	this.gl.vertexAttribPointer(this.attributes.aColorMul, 4, this.gl.BYTE,  true,  this.vertexSize, 2 * floatSize + 2 * shortSize);
	this.gl.vertexAttribPointer(this.attributes.aColorAdd, 4, this.gl.BYTE,  true,  this.vertexSize, 2 * floatSize + 2 * shortSize + 4 * byteSize);
};

function TextureProgram(renderer, vertexShaderId, fragmentShaderId, uniformIds, attributeIds) {
	Program.call(this, renderer, vertexShaderId, fragmentShaderId, uniformIds, attributeIds);
}
TextureProgram.prototype.setAttributes = function () {
	var floatSize = 4;
	var shortSize = 2;
	var byteSize  = 1;

	this.gl.vertexAttribPointer(this.attributes.aPosition, 2, this.gl.FLOAT,          false, this.vertexSize, 0);
	this.gl.vertexAttribPointer(this.attributes.aTexCoord, 2, this.gl.UNSIGNED_SHORT, true,  this.vertexSize, 2 * floatSize);
	this.gl.vertexAttribPointer(this.attributes.aColorMul, 4, this.gl.BYTE,           true,  this.vertexSize, 2 * floatSize + 2 * shortSize);
	this.gl.vertexAttribPointer(this.attributes.aColorAdd, 4, this.gl.BYTE,           true,  this.vertexSize, 2 * floatSize + 2 * shortSize + 4 * byteSize);
};

WebGLRenderer.prototype._initPrograms = function () {
	// Object holding every built shaders
	this._shaders = {};

	var uniformsLine        = ['uMatrix'];
	var uniformsBox         = ['uMatrix'];
	var uniformsRegular     = ['uMatrix', 'uTexture'];
	var uniformsDeformation = ['uMatrix', 'uTexture', 'uRatio'];
	var uniformsMask        = ['uMatrix', 'uTexture', 'uMask', 'uBbox'];

	var attributes = ['aPosition', 'aColorMul', 'aColorAdd'];
	this._programLine = new Program(this, 'vertexLine', 'fragmentLine', uniformsLine, attributes);
	this._programBox  = new Program(this, 'vertexBox',  'fragmentBox',  uniformsBox,  attributes);

	var attributesTexture = ['aPosition', 'aTexCoord', 'aColorMul', 'aColorAdd'];
	this._programMask          = new TextureProgram(this, 'vertexMask',          'fragmentMask',          uniformsMask,        attributesTexture);
	this._programAbsoluteScale = new TextureProgram(this, 'vertexAbsoluteScale', 'fragmentRegular',       uniformsRegular,     attributesTexture);
	this._programPixelArt      = new TextureProgram(this, 'vertexRegular',       'fragmentPixelArt',      uniformsDeformation, attributesTexture);
	this._programFiltering     = new TextureProgram(this, 'vertexRegular',       'fragmentFiltering',     uniformsDeformation, attributesTexture);
	this._programMapTransition = new TextureProgram(this, 'vertexRegular',       'fragmentMapTransition', uniformsDeformation, attributesTexture);
	this._programRegular       = new TextureProgram(this, 'vertexRegular',       'fragmentRegular',       uniformsRegular,     attributesTexture);

	// Unused programs
	// this._programRelativeScale = new TextureProgram(this, 'vertexRelativeScale', 'fragmentRegular',       uniformsRegular,     attributesTexture);
	// this._programOutline       = new TextureProgram(this, 'vertexOutline',       'fragmentOutline',       uniformsRegular,     attributesTexture);
	// this._programColorSplit    = new TextureProgram(this, 'vertexRegular',       'fragmentColorSplit',    uniformsRegular,     attributesTexture);
	// this._programEnteringFight = new TextureProgram(this, 'vertexRegular',       'fragmentEnteringFight', uniformsDeformation, attributesTexture);

	this._currentProgram = { lastAttributeIndex: -1 }; // Dummy program
};

WebGLRenderer.prototype._getShader = function (shaderId) {
	if (this._shaders[shaderId]) {
		return this._shaders[shaderId];
	}

	var gl = this.gl;
	var shaderData = WebGLRenderer.shadersData[shaderId];

	var shader;
	if (shaderData.type === 'fragment') {
		shader = gl.createShader(gl.FRAGMENT_SHADER);
	} else if (shaderData.type === 'vertex') {
		shader = gl.createShader(gl.VERTEX_SHADER);
	} else {
		return null;
	}

	gl.shaderSource(shader, shaderData.script);
	gl.compileShader(shader);

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		throw new Error(gl.getShaderInfoLog(shader));
	}

	this._shaders[shaderId] = shader;
	return shader;
};

WebGLRenderer.prototype._buildProgram = function (program) {
	var gl = this.gl;

	// Creating the program
	var programBinder = gl.createProgram();
	gl.attachShader(programBinder, this._getShader(program.vertexShaderId));
	gl.attachShader(programBinder, this._getShader(program.fragmentShaderId));
	gl.linkProgram(programBinder);

	// Check the link status
	if (!gl.getProgramParameter(programBinder, gl.LINK_STATUS)) {
		// Something went wrong with the link
		var error = gl.getProgramInfoLog(programBinder);
		gl.deleteProgram(programBinder);
		throw new Error('Error linking the program:' + error);
	}

	gl.useProgram(programBinder);

	// Setting shader attribute pointers
	var attributeIds = program.attributeIds;
	var attributes = program.attributes;
	for (var a = 0; a < attributeIds.length; a += 1) {
		var attributeId = attributeIds[a];
		attributes[attributeId] = gl.getAttribLocation(programBinder, attributeId);
	}

	// Setting shader uniform pointers
	var uniformIds = program.uniformIds;
	var uniforms = program.uniforms;
	for (var u = 0; u < uniformIds.length; u += 1) {
		var uniformId = uniformIds[u];
		var uniformLocation = gl.getUniformLocation(programBinder, uniformId);

		if (textureIndexes[uniformId]) {
			gl.uniform1i(uniformLocation, textureIndexes[uniformId]);
		}

		uniforms[uniformId] = uniformLocation;
	}

	program.binder = programBinder;
};

WebGLRenderer.prototype._useProgram = function (programData) {
	var program = programData.program;
	if (program !== this._currentProgram) {
		var a; // attribute index

		var lastAttributesOld = this._currentProgram.lastAttributeIndex;
		var lastAttributesNew = program.lastAttributeIndex;
		if (lastAttributesOld > lastAttributesNew) {
			for (a = lastAttributesOld; a > lastAttributesNew; a -= 1) {
				this.gl.disableVertexAttribArray(a);
			}
		} else if (lastAttributesOld < lastAttributesNew) {
			for (a = lastAttributesOld + 1; a <= lastAttributesNew; a += 1) {
				this.gl.enableVertexAttribArray(a);
			}
		}

		var programBinder = program.binder;
		if (programBinder === null) {
			this._buildProgram(program);
		} else {
			this.gl.useProgram(program.binder);
		}

		program.setAttributes();
		this._currentProgram = program;
	}

	var data = programData.data;
	if (data !== null) {
		var gl = this.gl;

		if (data.mask !== undefined) {
			// Binding texture corresponding to mask to texture index 1
			gl.activeTexture(gl.TEXTURE1);
			gl.bindTexture(gl.TEXTURE_2D, data.mask);
			gl.activeTexture(gl.TEXTURE0);
		}

		if (data.ratio !== undefined) {
			gl.uniform1f(this._currentProgram.uniforms.uRatio, data.ratio);
		}

		if (data.resolution !== undefined) {
			gl.uniform1f(this._currentProgram.uniforms.uResolution, data.resolution);
		}
	}
};

WebGLRenderer.prototype.useProgram = function (program, params) {
	var programData = new ProgramData(program, params);

	this._programs.push(programData);
	this._useProgram(programData);
};

WebGLRenderer.prototype.stopProgram = function () {
	this._programs.pop();
	this._useProgram(this._programs[this._programs.length - 1]);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/WebGLRenderer/program.js
 ** module id = 272
 ** module chunks = 0
 **/