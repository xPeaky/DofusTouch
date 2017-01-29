// jscs: disable maximumLineLength
var WebGLRenderer = require('./main.js');

WebGLRenderer.shadersData = {
	vertexLine: {
		type: 'vertex',
		script:
			'attribute vec2 aPosition;' +
			'attribute vec4 aColorMul;' +
			'attribute vec4 aColorAdd;' +
			'uniform   mat4 uMatrix;'   +
			'varying   vec4 vColor;' +
			'void main() {' +
			'	vec4 tx = uMatrix[0];' + // transform for point x
			'	vec4 ty = uMatrix[1];' + // transform for point y
			'	vec4 cm = uMatrix[2];' + // color multiplication
			'	vec4 ca = uMatrix[3];' + // color addition
			'	vec4 colorMul = aColorMul * cm * 2.0;' +
			'	vec4 colorAdd = aColorAdd * cm + ca;'  +
			'	vColor = colorMul + colorAdd;' +
			'	vColor.rgb *= colorMul.a;' +
			'	gl_Position = vec4(' +
			'		aPosition.x * tx.x + aPosition.y * tx.y + tx.z,' +
			'		aPosition.x * ty.x + aPosition.y * ty.y + ty.z,' +
			'		0.0, 1.0' +
			'	);' +
			'}'
	},
	fragmentLine: {
		type: 'fragment',
		script:
			'varying mediump vec4 vColor;' +
			'void main() {'                    +
				// Applying color addition & Writing pixel
			'	gl_FragColor = vColor;' +
			'}'
	},
	vertexBox: {
		type: 'vertex',
		script:
			'attribute vec2 aPosition;' +
			'attribute vec4 aColorMul;' +
			'attribute vec4 aColorAdd;' +
			'uniform   mat4 uMatrix;'   +
			'varying mediump vec4 vColor;' +
			'void main() {' +
			'	vec4 tx = uMatrix[0];' + // transform for point x
			'	vec4 ty = uMatrix[1];' + // transform for point y
			'	vec4 cm = uMatrix[2];' + // color multiplication
			'	vec4 ca = uMatrix[3];' + // color addition
			'	vec4 colorMul = aColorMul * cm * 2.0;' +
			'	vec4 colorAdd = aColorAdd * cm + ca;'  +
			'	vColor = colorMul + colorAdd;' +
			'	vColor.rgb *= colorMul.a;' +
			'	gl_Position = vec4(' +
			'		aPosition.x * tx.x + aPosition.y * tx.y + tx.z,' +
			'		aPosition.x * ty.x + aPosition.y * ty.y + ty.z,' +
			'		0.0, 1.0' +
			'	);' +
			'}'
	},
	fragmentBox: {
		type: 'fragment',
		script:
			'varying mediump vec4 vColor;' +
			'void main() {'                    +
				// Applying color addition & Writing pixel
			'	gl_FragColor = vColor;' +
			'}'
	},
	vertexRegular: {
		type: 'vertex',
		script:
			'attribute vec2 aPosition;' +
			'attribute vec2 aTexCoord;' +
			'attribute vec4 aColorMul;' +
			'attribute vec4 aColorAdd;' +
			'uniform   mat4 uMatrix;'   +
			'varying   vec2 vTexCoord;' +
			'varying   vec4 vColorMul;' +
			'varying   vec4 vColorAdd;' +
			'void main() {' +
			'	vec4 tx = uMatrix[0];' + // transform for point x
			'	vec4 ty = uMatrix[1];' + // transform for point y
			'	vec4 cm = uMatrix[2];' + // color multiplication
			'	vec4 ca = uMatrix[3];' + // color addition
			'	vTexCoord = aTexCoord;' +
			'	vColorMul = aColorMul * cm * 2.0;' +
			'	vColorAdd = aColorAdd * cm + ca;'  +
			'	vColorMul.rgb *= vColorMul.a;' +
			'	gl_Position = vec4(' +
			'		aPosition.x * tx.x + aPosition.y * tx.y + tx.z,' +
			'		aPosition.x * ty.x + aPosition.y * ty.y + ty.z,' +
			'		0.0, 1.0' +
			'	);' +
			'}'
	},
	fragmentRegular: {
		type: 'fragment',
		script:
			'varying mediump vec2 vTexCoord;' +
			'varying mediump vec4 vColorMul;' +
			'varying mediump vec4 vColorAdd;' +
			'uniform sampler2D uTexture;'     +
			'void main() {'                    +
				// Fetching texture color value
			'	mediump vec4 color = texture2D(uTexture, vTexCoord);' +

				// Computing color addition alpha
			'	mediump float colorAddAlpha = vColorAdd.a * color.a;' +

				// Applying color multiplication
			'	color *= vColorMul;' +

				// Applying color addition & Writing pixel
				// Depremultiplying by alpha
			'	color.rgb /= color.a;' +

				// Applying color addition
			'	color.rgb += vColorAdd.rgb;' +
			'	color.a += colorAddAlpha;' +

				// Repremultiplying by alpha
			'	color.rgb *= color.a;' +

				// Bailing out if pixel is almost transparent
			'	if (color.a <= 0.05) { discard; }' +

			'	gl_FragColor = color;' +
			'}'
	},
	vertexRelativeScale: {
		type: 'vertex',
		script:
			'attribute vec2 aPosition;' +
			'attribute vec2 aTexCoord;' +
			'attribute vec4 aColorMul;' +
			'attribute vec4 aColorAdd;' + // In this shader aColorAdd corresponds to an offset (x,y) of the vertex
			'uniform   mat4 uMatrix;'   +
			'varying   vec2 vTexCoord;' +
			'varying   vec4 vColorMul;' +
			'varying   vec4 vColorAdd;' +
			'void main() {' +
			'	vec4 tx = uMatrix[0];' + // transform for point x
			'	vec4 ty = uMatrix[1];' + // transform for point y
			'	vec4 cm = uMatrix[2];' + // color multiplication
			'	vec4 ca = uMatrix[3];' + // color addition
			'	vTexCoord = aTexCoord;' +
			'	vColorMul = aColorMul * cm * 2.0;' +
			'	vColorAdd = ca;'  + // color addition
			'	vColorMul.rgb *= vColorMul.a;' +
			'	float x = aPosition.x + tx.w * (aColorAdd.r * 127.0 + aColorAdd.g);' +
			'	float y = aPosition.y + ty.w * (aColorAdd.b * 127.0 + aColorAdd.a);' +
			'	gl_Position = vec4(' +
			'		x * tx.x + y * tx.y + tx.z,' +
			'		x * ty.x + y * ty.y + ty.z,' +
			'		0.0, 1.0' +
			'	);' +
			'}'
	},
	vertexAbsoluteScale: {
		type: 'vertex',
		script:
			'attribute vec2 aPosition;' +
			'attribute vec2 aTexCoord;' +
			'attribute vec4 aColorMul;' +
			'attribute vec4 aColorAdd;' + // In this shader aColorAdd corresponds to an offset (x,y) of the vertex
			'uniform   mat4 uMatrix;'   +
			'varying   vec2 vTexCoord;' +
			'varying   vec4 vColorMul;' +
			'varying   vec4 vColorAdd;' +
			'void main() {' +
			'	vec4 tx = uMatrix[0];' + // transform for point x
			'	vec4 ty = uMatrix[1];' + // transform for point y
			'	vec4 cm = uMatrix[2];' + // color multiplication
			'	vec4 ca = uMatrix[3];' + // color addition
			'	vTexCoord = aTexCoord;' +
			'	vColorMul = aColorMul * cm * 2.0;' +
			'	vColorAdd = ca;'  + // color addition
			'	vColorMul.rgb *= vColorMul.a;' +
			'	gl_Position = vec4(' +
			'		aPosition.x * tx.x + aPosition.y * tx.y + tx.z + tx.w * 127.0 * aColorAdd.r * aColorAdd.b,' +
			'		aPosition.x * ty.x + aPosition.y * ty.y + ty.z - ty.w * 127.0 * aColorAdd.g * aColorAdd.a,' +
			'		0.0, 1.0' +
			'	);' +
			'}'
	},
	vertexMask: {
		type: 'vertex',
		script:
			'attribute vec2 aPosition;' +
			'attribute vec2 aTexCoord;' +
			'attribute vec4 aColorMul;' +
			'attribute vec4 aColorAdd;' +
			'uniform   mat4 uMatrix;'   +
			'uniform   vec4 uBbox;'     + // Bounding box of the animation containing the current vertex
			'varying   vec2 vPosition;' + // Relative position of the vertex that will be passed onto the fragment shader
			'varying   vec2 vTexCoord;' +
			'varying   vec4 vColorMul;' +
			'varying   vec4 vColorAdd;' +
			'void main() {' +
			'	vec4 tx = uMatrix[0];' + // transform for point x
			'	vec4 ty = uMatrix[1];' + // transform for point y
			'	vec4 cm = uMatrix[2];' + // color multiplication
			'	vec4 ca = uMatrix[3];' + // color addition
			'	vTexCoord = aTexCoord;' +
			'	vColorMul = aColorMul * cm * 2.0;' +
			'	vColorAdd = aColorAdd * cm + ca;'  +
			'	vColorMul.rgb *= vColorMul.a;' +
			'	gl_Position = vec4(' +
			'		aPosition.x * tx.x + aPosition.y * tx.y + tx.z,' +
			'		aPosition.x * ty.x + aPosition.y * ty.y + ty.z,' +
			'		0.0, 1.0' +
			'	);' +

				// Computing position of the vertex relatively to the top left corner of the bbox of the animation
			'	vPosition = (aPosition - vec2(uBbox.x, uBbox.z)) / vec2(uBbox.y - uBbox.x, uBbox.w - uBbox.z);' +
			'}'
	},
	fragmentMask: {
		type: 'fragment',
		script:
			'varying mediump vec2 vPosition;' + // Position of the fragment with respect to mask coordinate
			'varying mediump vec2 vTexCoord;' +
			'varying mediump vec4 vColorMul;' +
			'varying mediump vec4 vColorAdd;' +
			'uniform sampler2D uTexture;'     +
			'uniform sampler2D uMask;'        +
			'void main() {' +
				// Fetching texture color value
			'	mediump vec4 color = texture2D(uTexture, vTexCoord);' +

				// Computing color addition alpha
			'	mediump float colorAddAlpha = vColorAdd.a * color.a;' +

				// Applying color multiplication
			'	color *= vColorMul;' +

				// Applying color addition & Writing pixel
				// Depremultiplying by alpha
			'	color.rgb /= color.a;' +

				// Applying color addition
			'	color.rgb += vColorAdd.rgb;' +
			'	color.a += colorAddAlpha;' +

				// Repremultiplying by alpha
			'	color.rgb *= color.a;' +

				// Bailing out if pixel is almost transparent
			'	if (color.a <= 0.05) { discard; }' +

				// Bailing out if mask is almost transparent
			'	mediump float mask = texture2D(uMask, vPosition).a;' +
			'	if (mask == 0.0) { discard; }' +

				// Applying transparency if mask is almost transparent
			'	if (mask <= 0.2) {' +
			'		color *= mask * 5.0;' +
			'	}' +

				// Writing pixel because overlapping with mask
			'	gl_FragColor = color;' +
			'}'
	},
	vertexOutline: {
		type: 'vertex',
		script:
			'attribute vec2 aPosition;' +
			'attribute vec2 aTexCoord;' +
			'attribute vec4 aColorMul;' +
			'attribute vec4 aColorAdd;' +
			'uniform   mat4 uMatrix;'   +
			'varying   vec2 vTexCoord;' +
			'varying   vec4 vColorOutline;' +
			'void main() {' +
			'	vec4 tx = uMatrix[0];' + // transform for point x
			'	vec4 ty = uMatrix[1];' + // transform for point y
			'	vColorOutline = uMatrix[2] * aColorMul + aColorAdd;' + // outline color
			'	vTexCoord = aTexCoord;' +
			'	gl_Position = vec4(' +
			'		aPosition.x * tx.x + aPosition.y * tx.y + tx.z,' +
			'		aPosition.x * ty.x + aPosition.y * ty.y + ty.z,' +
			'		0.0, 1.0' +
			'	);' +
			'}'
	},
	fragmentOutline: {
		type: 'fragment',
		script:
			'precision mediump float;' +
			'varying mediump vec2 vTexCoord;' +
			'varying mediump vec4 vColorOutline;' +
			'uniform sampler2D uTexture;'     +
			'void main() {'                    +
			// Fetching texture color value & Applying color multiplication
			'	vec4 color = texture2D(uTexture, vTexCoord);' +
			'	if (color.a == 1.0) {' +
			'		discard;' +
			'	} else {' +
					// Computing outline color with respect to alpha gradients
			'		float gradX = texture2D(uTexture, vTexCoord + vec2(0.05, 0.0)).a - texture2D(uTexture, vTexCoord - vec2(0.05, 0.0)).a;' +
			'		float gradY = texture2D(uTexture, vTexCoord + vec2(0.0, 0.05)).a - texture2D(uTexture, vTexCoord - vec2(0.0, 0.05)).a;' +
			'		vec4 outlineColor = 0.5 * vColorOutline * (abs(gradX) + abs(gradY));' +
					// Outputting outline color
			'		gl_FragColor = outlineColor * outlineColor.a;' +
			'	}' +
			'}'
	},
	fragmentFiltering: {
		type: 'fragment',
		script:
			'precision mediump float;' +
			'varying mediump vec2 vTexCoord;' +
			'uniform float uRatio;'     +
			// 'uniform float uResolution;'     +
			'uniform sampler2D uTexture;'     +
			'void main() {'                    +
			'	vec2 res = vec2(1267.0, 865.5);' +
			// '	vec2 offsetToCenter = vTexCoord - 0.5;' +
			// '	float distToCenter = length(offsetToCenter);' +
			// '	float c1 = 2.0 * (0.5 - distToCenter * pow(uResolution - 1.0, 1.0));' +
			// '	float c2 = 2.0 * (0.5 - distToCenter * pow(uResolution - 1.0, 0.1));' +
			// '	vec2 textureCoord = vec2(0.5 + c1 * offsetToCenter.x, 0.5 + c1 * offsetToCenter.y);' +
			// '	if (vTexCoord.x < 0.5) { textureCoord.x = 0.5 - pow(2.0 * (0.5 - vTexCoord.x), uResolution) / 2.0; } else { textureCoord.x = 0.5 + pow(2.0 * (vTexCoord.x - 0.5), uResolution) / 2.0; }' +
			// '	if (vTexCoord.y < 0.5) { textureCoord.y = 0.5 - pow(2.0 * (0.5 - vTexCoord.y), uResolution) / 2.0; } else { textureCoord.y = 0.5 + pow(2.0 * (vTexCoord.y - 0.5), uResolution) / 2.0; }' +
			// '	vec2 textureCoord = pow(vTexCoord - vec2(1267.0, 865.5) / 2.0, vec2(uResolution, uResolution)) + vec2(1267.0, 865.5);' +
			// '	vec2 textureCoord = pow(2.0 * (vTexCoord - vec2(0.5, 0.5)), vec2(uResolution, uResolution)) / 2.0 + vec2(0.5, 0.5);' +
			'	vec4 color  = texture2D(uTexture, vTexCoord);' +
			'	vec4 color1 = texture2D(uTexture, vTexCoord + vec2(-0.7, -0.7) / res);' +
			'	vec4 color2 = texture2D(uTexture, vTexCoord + vec2(-0.7,  0.7) / res);' +
			'	vec4 color3 = texture2D(uTexture, vTexCoord + vec2( 0.7, -0.7) / res);' +
			'	vec4 color4 = texture2D(uTexture, vTexCoord + vec2( 0.7,  0.7) / res);' +
			'	gl_FragColor = color * (1.0 + 4.0 * uRatio) - uRatio * (color1 + color2 + color3 + color4);' +
			'}'
	},
	fragmentMapTransition: {
		type: 'fragment',
		script:
			'precision mediump float;' +
			'varying mediump vec2 vTexCoord;' +
			'varying mediump vec4 vColorMul;' +
			'uniform float uRatio;'           +
			'uniform sampler2D uTexture;'     +
			'void main() {'                    +
			'	vec2 offsetToCenter = vTexCoord - 0.5;' +
			'	float distToCenter = length(offsetToCenter);' +
			'	float c1 = 2.0 * (0.5 - distToCenter * pow(uRatio, 2.0) * 0.02);' +
			'	vec2 textureCoord = vec2(0.5 + c1 * offsetToCenter.x, 0.5 + c1 * offsetToCenter.y);' +

			'	vec4 color = texture2D(uTexture, textureCoord);' +
			'	float avg = (color.r + color.g + color.b) / 3.0;' +
			'	float greyRatio = uRatio * 1.0;' +
			'	vec4 greyedColor = color * (1.0 - greyRatio) + vec4(avg) * greyRatio;' +

			'	float blackRatio = uRatio * 0.2;' +
			'	gl_FragColor = vec4((greyedColor * (1.0 - blackRatio)).rgb, 1.0) * vColorMul;' +
			'}'
	},
	fragmentPixelArt: {
		type: 'fragment',
		script:
			'precision mediump float;' +
			'varying mediump vec2 vTexCoord;' +
			'uniform float uResolution;'      +
			'uniform sampler2D uTexture;'     +
			'void main() {'                    +
			'	vec4 color = texture2D(uTexture, floor(vTexCoord * uResolution) / uResolution);' +
			'	color.rgb = floor(color.rgb * 8.0) / 8.0;' +
			'	gl_FragColor = color;' +
			'}'
	},
	fragmentEnteringFight: {
		type: 'fragment',
		script:
			'precision mediump float;' +
			'varying mediump vec2 vTexCoord;' +
			'uniform float uRatio;'     +
			'uniform sampler2D uTexture;'     +
			'void main() {'                    +
			'	float u = 2.0 * (vTexCoord.x - 0.5);' +
			'	float v = 2.0 * (vTexCoord.y - 0.5);' +
			'	float r = uRatio * (pow(1.0 - max(abs(u), abs(v)), 2.0));' +
			'	vec2 uv = vTexCoord + vec2(u, v) * r;' +
			'	vec4 color = texture2D(uTexture, uv) + 0.8 * vec4(1.0, 1.0, 1.0, 0.0) * r;' +
			'	gl_FragColor = color;' +

			// '	vec4 color0 = texture2D(uTexture, vTexCoord);' +
			// '	vec4 color1 = texture2D(uTexture, vTexCoord + uRatio * vec2(0.01, 0.0));' +
			// '	vec4 color2 = texture2D(uTexture, vTexCoord - uRatio * vec2(0.01, 0.0));' +
			// '	vec4 color3 = texture2D(uTexture, vTexCoord + uRatio * vec2(0.0, 0.01));' +
			// '	vec4 color4 = texture2D(uTexture, vTexCoord - uRatio * vec2(0.0, 0.01));' +
			// '	gl_FragColor = color0 * 0.6 + 0.15 * (color1 + color2 + color3 + color4);' +

			// '	vec4 color = texture2D(uTexture, vTexCoord);' +
			// '	float noise = uRatio * 0.3 * fract(sin(dot(vTexCoord.xy ,vec2(uRatio + 1.0, 78.233))) * 43758.5453);' +
			// '	gl_FragColor = color * (1.0 - noise);' +

			// '	float resolution = 1000.0 - 900.0 * uRatio;' +
			// '	vec4 colorPixel = texture2D(uTexture, floor(vTexCoord * resolution) / resolution);' +
			// '	vec4 colorOriginal = texture2D(uTexture, vTexCoord);' +
			// '	gl_FragColor = colorOriginal * (1.0 - uRatio) + colorPixel * uRatio;' +
			'}'
	},
	fragmentColorSplit: {
		type: 'fragment',
		script:
			'precision mediump float;' +
			'varying mediump vec2 vTexCoord;' +
			'uniform sampler2D uTexture;'     +
			'void main() {'                    +
			'	vec4 color = vec4(0.0, 0.0, 0.0, 1.0);' +
			'	color.r = texture2D(uTexture, vTexCoord + vec2(-0.007, - 0.007)).r;' +
			'	color.g = texture2D(uTexture, vTexCoord + vec2(0.007, - 0.007)).g;' +
			'	color.b = texture2D(uTexture, vTexCoord + vec2(0.0, 0.01)).b;' +
			'	gl_FragColor = color;' +
			'}'
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/WebGLRenderer/shaders.js
 ** module id = 267
 ** module chunks = 0
 **/