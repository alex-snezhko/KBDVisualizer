import React from "react";
import { mat4, vec3 } from "gl-matrix";

import "./KeyboardRender.scss";

let gl = null;

let progsInfo = {
    textured: {
        program: null,
        attribs: {},
        uniforms: {},
        buffers: {}
    },
    untextured: {
        program: null,
        attribs: {},
        uniforms: {},
        buffers: {}
    },
    selection: {
        program: null,
        attribs: {},
        uniforms: {},
        buffers: {}
    }
};

let eye = {
    position: vec3.fromValues(0, 30, 30),
    lookAt: vec3.normalize(vec3.create(), vec3.fromValues(0, -1, -1)),
    lookUp: vec3.normalize(vec3.create(), vec3.fromValues(0, 1, -1)),
    yAngle: Math.PI / 4
};

let keyRenderInstructions = [];

// lookup table for all non-1-unit-wide keys. Logically, SPECIAL_NUM_UNITS[key] || 1 will get key size
const SPECIAL_NUM_UNITS = {
    "Backspace": 2,
    "Tab": 1.5,
    "Backslash": 1.5,
    "Caps": 1.75,
    "ANSIEnter": 2.25,
    "LShift": 2.25,
    "RShift1_75": 1.75,
    "RShift2_75": 2.75,
    "LCtrl1_25": 1.25,
    "LWin1_25": 1.25,
    "LAlt1_25": 1.25,
    "LCtrl1_5": 1.5,
    "LWin1_5": 1.5,
    "LAlt1_5": 1.5,
    "RCtrl1_25": 1.25,
    "RWin1_25": 1.25,
    "RAlt1_25": 1.25,
    "RCtrl1_5": 1.5,
    "RWin1_5": 1.5,
    "RAlt1_5": 1.5,
    "Fn1_25": 1.25,
    "Fn1_5": 1.5,
    "Space6": 6,
    "Space6_25": 6.25,
    "Space7": 7,
    "Num0": 2
};

const SPECIAL_KEYCAP_IDENTIFIERS = new Set([
    "Space6_25", "Space6", "Space7", "NumEnter", "NumPlus", "ISOEnter"
]);

// , "Minus",
//     "Equals", "Backspace", "OSqr", "CSqr", "Backspace", "Semicolon", "Apostrophe",
//     "Comma", "Period", "Forwardslash"

function rotateView(ang, axis) {
    const rotationMat = mat4.fromRotation(mat4.create(), ang, axis);
    eye.position = vec3.transformMat4(vec3.create(), eye.position, rotationMat);
    eye.lookAt = vec3.transformMat4(vec3.create(), eye.lookAt, rotationMat);
    eye.lookUp = vec3.transformMat4(vec3.create(), eye.lookUp, rotationMat);
}

function loadGLBuffers(glObjectBuffers, object, isTextured) {
    glObjectBuffers.vertices = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, glObjectBuffers.vertices);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(object.vertices.flat()), gl.STATIC_DRAW);

    glObjectBuffers.normals = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, glObjectBuffers.normals);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(object.normals.flat()), gl.STATIC_DRAW);

    if (isTextured) {
        glObjectBuffers.uvs = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, glObjectBuffers.uvs);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(object.uvs.flat()), gl.STATIC_DRAW);
    }

    glObjectBuffers.triangles = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, glObjectBuffers.triangles);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(object.triangles.flat()), gl.STATIC_DRAW);

    glObjectBuffers.numTriangles = object.triangles.length;
}

function loadTexture(url) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA,
        gl.UNSIGNED_BYTE, new Uint8Array([0, 255, 255, 0]));

    return {
        texture,
        loadTexturePromise: new Promise(resolve => {
            const img = new Image();
            img.onload = () => {
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    
                const isPowerOf2 = x => (x & (x - 1)) === 0;
                if (isPowerOf2(img.width) && isPowerOf2(img.height)) {
                    gl.generateMipmap(gl.TEXTURE_2D);
                } else {
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                }
    
                resolve(img);
            };
            img.onerror = () => resolve(img);
            img.src = url;

            // TODO remove when working
            // resolve(img);
        })
    };
}

const ALPHAS = new Set([
    "F1", "F2", "F3", "F4", "F9", "F10", "F11", "F12",
    "Tilde", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "Minus", "Equals",
    "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "OSqr", "CSqr", "Backslash",
    "A", "S", "D", "F", "G", "H", "J", "K", "L", "Semicolon", "Apostrophe",
    "Z", "X", "C", "V", "B", "N", "M", "Comma", "Period", "Forwardslash", "Space6", "Space6_25", "Space7",
    "Num0", "Num1", "Num2", "Num3", "Num4", "Num5", "Num6", "Num7", "Num8", "Num9", "NumPoint"
]);

const ACCENTS = new Set(["Esc", "ANSIEnter", "ISOEnter", "NumEnter"]);

let alphasInSet = new Set();
let modsInSet = new Set();
let accentsInSet = new Set();

function getKeycapColorOptions(key, keycapsInfo) {
    // keep a list of all possible color options available for this keycap
    let colorOptions = [];

    if (ACCENTS.has(key)) {
        accentsInSet.add(key);
        colorOptions.push(...keycapsInfo.accents);
    }

    let exception;
    if ((exception = keycapsInfo.exceptions.find(e => e.keys.includes(key)))) {
        colorOptions.push(exception);
    } else if (ALPHAS.has(key)) {
        alphasInSet.add(key);
        colorOptions.push(keycapsInfo.alphas);
    } else {
        modsInSet.add(key);
        colorOptions.push(keycapsInfo.mods);
    }

    const extraOptions = keycapsInfo.extras.filter(e => e.keys.includes(key));
    colorOptions.push(...extraOptions);

    return {
        colorOptions,
        optionSelected: 0,
        keycapColor: colorOptions[0].keycapColor,
        legendColor: colorOptions[0].legendColor
    };
}

let keyNameToKeyObj = {};
let objectIdToKey = {};

async function loadModels(keyboardInfo, keycapsInfo, keycapProfile) {
    // TODO make resources get from local path
    const fetchJson = filename => import("@resources/" + filename + ".json").then(({ default: json }) => json);

    // ---------------------------------------------------------------------------
    // prepare all necessary information for setting up key rendering instructions
    // ---------------------------------------------------------------------------
    keyRenderInstructions = [];
    keyNameToKeyObj = {};
    objectIdToKey = {};
    // list of promises to load each model (keycaps and keyboard case)
    let resourceLoadPromises = [];
    let keycapModelsVisited = new Set();
    // find total number of units horizontally and vertically
    // to get number of units horizontally, find the keygroup that extends farthest right
    const numUnitsX = keyboardInfo.keyGroups.reduce(
        (rightmostUnits, keyGroup) => Math.max(rightmostUnits, keyGroup.keys.reduce(
            (numU, key) => numU + (SPECIAL_NUM_UNITS[key] || 1),
            keyGroup.offset[0])),
        0);
    // to get number of units vertically, find the keygroup that extends farthest down
    const numUnitsY = keyboardInfo.keyGroups.reduce((max, kg) => Math.max(max, kg.offset[1]), 0) + 1;
    const HEIGHT = 1.25;
    // define matrix for rotating an object by the keyboard incline and then moving it up to proper height
    const heightInclineMat = mat4.multiply(mat4.create(),
        mat4.fromTranslation(mat4.create(), vec3.fromValues(0, HEIGHT, 0)),
        mat4.fromRotation(mat4.create(), keyboardInfo.incline * (Math.PI / 180), [1, 0, 0]) // incline
    );
    // -------------------------------------------------
    // define instructions for rendering all needed keys
    // -------------------------------------------------
    for (const kg of keyboardInfo.keyGroups) {
        // initialize position to beginning of row and increment after each key
        let posXZ = [kg.offset[0] - numUnitsX / 2, 0, kg.offset[1] - numUnitsY / 2 + 0.5];
        for (const key of kg.keys) {
            // if this key is not special (non-1u), then it must be 1 unit wide
            const keysize = SPECIAL_NUM_UNITS[key] || 1;
            const keysizeStr = keysize.toString().replace(".", "_");
            const modelIdentifier = SPECIAL_KEYCAP_IDENTIFIERS.has(key) ? key : `R${kg.row}_${keysizeStr}U`;

            // if a keycap with these dimensions has not been loaded yet, then load it
            if (!keycapModelsVisited.has(modelIdentifier)) {
                let bufs = progsInfo.textured.buffers;
                bufs[modelIdentifier] = {};
                resourceLoadPromises.push(
                    fetchJson(`models/keycaps/${keycapProfile}/${modelIdentifier}`)
                        .then(keycapModel => loadGLBuffers(bufs[modelIdentifier], keycapModel, true)));
                keycapModelsVisited.add(modelIdentifier);
            }

            // move keycap to middle of keycap area
            const toPosMat = mat4.fromTranslation(mat4.create(), [posXZ[0] + keysize / 2, 0, posXZ[2]]);
            const finalTransformationMat = mat4.multiply(mat4.create(), heightInclineMat, toPosMat);

            // load legend texture
            const { loadTexturePromise, texture } = loadTexture("resources/legends/" + key + ".png");
            resourceLoadPromises.push(loadTexturePromise);

            // construct an object to represent all relevant information of a keycap for rendering
            const keycapObj = {
                modelIdentifier,
                keysize,
                transformation: finalTransformationMat,
                legendTexture: texture,
                ...getKeycapColorOptions(key, keycapsInfo),
            };

            // find an appropriate object id for this key
            const objectId = Object.keys(objectIdToKey).length + 1;
            objectIdToKey[objectId] = keycapObj;
            keyNameToKeyObj[key] = keycapObj;
            keycapObj.objectId = objectId;

            keyRenderInstructions.push(keycapObj);
            posXZ[0] += keysize;
        }
    }
    const untexBufs = progsInfo.untextured.buffers;

    // load case
    untexBufs["case"] = {};
    resourceLoadPromises.push(
        fetchJson("models/cases/tofu65" /* TODO + kbdName*/)
            .then(trianglesInfo => loadGLBuffers(untexBufs["case"], trianglesInfo, false)));

    // load switches
    untexBufs["switch"] = {};
    resourceLoadPromises.push(
        fetchJson("models/switch")
            .then(switchInfo => loadGLBuffers(untexBufs["switch"], switchInfo, false)));

    // load switches
    untexBufs["stabilizer"] = {};
    resourceLoadPromises.push(
        fetchJson("models/stabilizer")
            .then(stabInfo => loadGLBuffers(untexBufs["stabilizer"], stabInfo, false)));

    return await Promise.all(resourceLoadPromises);
}

function renderObject(progInfo, buffers, uniformVals) {
    gl.useProgram(progInfo.program);

    for (const attribName in progInfo.attribs) {
        const attrib = progInfo.attribs[attribName];
        gl.enableVertexAttribArray(attrib.loc);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers[attrib.bufferName]);
        gl.vertexAttribPointer(attrib.loc, ...attrib.vapParams);
    }

    for (const uniformName in uniformVals) {
        const uniform = progInfo.uniforms[uniformName];
        uniform.method(uniform.loc, ...uniformVals[uniformName]);
    }

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.triangles);
    gl.drawElements(gl.TRIANGLES, buffers.numTriangles * 3, gl.UNSIGNED_SHORT, 0);

    for (const attribName in progInfo.attribs) {
        gl.disableVertexAttribArray(progInfo.attribs[attribName].loc);
    }
}

function renderSelection() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const projMat = mat4.perspective(mat4.create(), Math.PI / 9, 2, 0.1, 1000);
    const viewMat = mat4.lookAt(mat4.create(), eye.position, vec3.add(vec3.create(), eye.position, eye.lookAt), eye.lookUp);
    const viewProjMat = mat4.multiply(mat4.create(), projMat, viewMat);

    renderObject(progsInfo.selection, progsInfo.untextured.buffers["case"], {
        uMVPMat: [false, viewProjMat],
        uModelMat: [false, mat4.create()],
        uObjectId: [0]
    });

    // render keys
    for (const { transformation, objectId, modelIdentifier } of keyRenderInstructions) {
        const modelViewProjMat = mat4.multiply(mat4.create(), viewProjMat, transformation);

        renderObject(progsInfo.selection, progsInfo.untextured.buffers["switch"], {
            uMVPMat: [false, modelViewProjMat],
            uModelMat: [false, transformation],
            uObjectId: [0]
        });

        renderObject(progsInfo.selection, progsInfo.textured.buffers[modelIdentifier], {
            uMVPMat: [false, modelViewProjMat],
            uModelMat: [false, transformation],
            uObjectId: [objectId]
        });
    }
}

function setupShaders() {
    // ------------------------------------------------------------------
    // define source to be shared between untextured and textured shaders
    // ------------------------------------------------------------------

    const vShaderSharedHeader = `
        attribute vec3 aVertexPosition; // vertex position
        attribute vec3 aVertexNormal; // vertex normal
        
        uniform mat4 uModelMat; // model matrix
        uniform mat4 uMVPMat; // model-view-projection matrix
        
        varying vec3 vWorldPos; // interpolated world position of vertex
        varying vec3 vVertexNormal; // interpolated normal for frag shader
    `;

    const fShaderSharedHeader = `
        precision mediump float;

        // eye world position
        uniform vec3 uEyePosition;

        uniform vec3 uColor;
        
        // geometry properties
        varying vec3 vWorldPos; // world xyz of fragment
        varying vec3 vVertexNormal; // normal of fragment
    `;

    const vShaderSharedBody = `
        // vertex position
        vec4 vWorldPos4 = uModelMat * vec4(aVertexPosition, 1.0);
        vWorldPos = vec3(vWorldPos4.x,vWorldPos4.y,vWorldPos4.z);
        gl_Position = uMVPMat * vec4(aVertexPosition, 1.0);

        // vertex normal (assume no non-uniform scale)
        vec4 vWorldNormal4 = uModelMat * vec4(aVertexNormal, 0.0);
        vVertexNormal = normalize(vec3(vWorldNormal4.x, vWorldNormal4.y, vWorldNormal4.z));
    `;

    const blinnPhongFunction = `
        vec3 blinnPhong(vec3 ambient, vec3 diffuse, vec3 specular) {
            vec3 normal = normalize(vVertexNormal); 

            vec3 lightPos = vec3(0.0, 20.0, 10.0);

            // compute diffuse term
            vec3 toLight = normalize(lightPos - vWorldPos);
            float lambert = max(0.0, dot(normal, toLight));
            vec3 diffVal = diffuse * lambert;
            
            // compute specular term
            vec3 toEye = normalize(uEyePosition - vWorldPos);
            vec3 halfVec = normalize(toLight + toEye);
            float highlight = pow(max(0.0, dot(normal, halfVec)), 10.0);
            vec3 specVal = specular * highlight;
            
            // combine ambient, diffuse, specular to output color
            return ambient + diffVal + specVal;
        }
    `;

    // ------------------------
    // untextured shader source
    // ------------------------

    const vShaderUntexturedSrc = `
        ${vShaderSharedHeader}

        void main(void) {
            ${vShaderSharedBody}
        }
    `;

    const fShaderUntexturedSrc = `
        ${fShaderSharedHeader}

        ${blinnPhongFunction}

        void main(void) {
            vec3 colorFromLighting = blinnPhong(uColor * 0.4, uColor * 0.4, vec3(0.2, 0.2, 0.2));
            gl_FragColor = vec4(colorFromLighting, 1.0);
        }
    `;

    // ----------------------
    // textured shader source
    // ----------------------

    const vShaderTexturedSrc = `
        ${vShaderSharedHeader}

        attribute vec2 aVertexUV;
        varying vec2 vVertexUV;

        void main(void) {
            ${vShaderSharedBody}

            vVertexUV = aVertexUV;
            // TODO
            if (vVertexUV.x == 0.0 && vVertexUV.y == 0.0) {
                vVertexUV = vec2(-10000.0, -10000.0);
            }
        }
    `;

    const fShaderTexturedSrc = `
        ${fShaderSharedHeader}

        varying vec2 vVertexUV;

        uniform sampler2D uTexture;
        uniform vec3 uTextureColor;

        uniform bool uIsBlinking;
        uniform float uBlinkProportion;

        ${blinnPhongFunction}

        void main(void) {
            vec3 color = uColor;

            vec2 actualUV = vec2(1.0 - vVertexUV.s, vVertexUV.t);
            if (actualUV.x >= 0.0 && actualUV.y >= 0.0) {
                vec4 baseTextureColor = texture2D(uTexture, actualUV);
                baseTextureColor.r = 1.0;
                baseTextureColor.g = 1.0;
                baseTextureColor.b = 1.0;

                vec4 colorFromTexture = vec4(uTextureColor, 1.0) * baseTextureColor;
                float alpha = colorFromTexture.a;

                color = alpha * colorFromTexture.rgb + (1.0 - alpha) * uColor;
            }
            float kAmb =  0.3;
            float kDiff = 0.7;
            float kSpec = 0.2;

            vec3 spec = vec3(kSpec, kSpec, kSpec);
            vec3 colorFromLighting = blinnPhong(color * kAmb, color * kDiff, spec);
            if (uIsBlinking) {
                vec3 blinkColor = vec3(1.0, 1.0, 0.0);
                colorFromLighting = uBlinkProportion * blinkColor + (1.0 - uBlinkProportion) * colorFromLighting;
            }

            gl_FragColor = vec4(colorFromLighting, 1.0);
        }
    `;

    // --------------------------------------------------
    // shader source for selecting an object in the scene
    // --------------------------------------------------

    const vShaderSelectionSrc = `
        attribute vec3 aVertexPosition; // vertex position
        
        uniform mat4 uModelMat; // model matrix
        uniform mat4 uMVPMat; // model-view-projection matrix

        void main(void) {
            gl_Position = uMVPMat * vec4(aVertexPosition, 1.0);
        }
    `;

    const fShaderSelectionSrc = `
        precision mediump float;

        uniform int uObjectId;

        void main(void) {
            vec3 color = vec3(float(uObjectId) / 255.0, 1.0, 1.0);
            gl_FragColor = vec4(color, 0.0);
        }
    `;
    
    // compile vertex shader
    const vShaderUntextured = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vShaderUntextured, vShaderUntexturedSrc);
    const fShaderUntextured = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fShaderUntextured, fShaderUntexturedSrc);

    const vShaderTextured = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vShaderTextured, vShaderTexturedSrc);
    const fShaderTextured = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fShaderTextured, fShaderTexturedSrc);

    const vShaderSelection = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vShaderSelection, vShaderSelectionSrc);
    const fShaderSelection = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fShaderSelection, fShaderSelectionSrc);

    for (const shader of [
        vShaderUntextured, fShaderUntextured,
        vShaderTextured, fShaderTextured,
        vShaderSelection, fShaderSelection
    ]) {
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            alert("Shader compilation error: " + gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return;
        }
    }

    const { textured, untextured, selection } = progsInfo;

    // create shader program and link
    untextured.program = gl.createProgram();
    gl.attachShader(untextured.program, vShaderUntextured);
    gl.attachShader(untextured.program, fShaderUntextured);

    textured.program = gl.createProgram();
    gl.attachShader(textured.program, vShaderTextured);
    gl.attachShader(textured.program, fShaderTextured);

    selection.program = gl.createProgram();
    gl.attachShader(selection.program, vShaderSelection);
    gl.attachShader(selection.program, fShaderSelection);

    for (const program of [untextured.program, textured.program, selection.program]) {
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            alert("Shader program linking error: " + gl.getProgramInfoLog(program));
            return;
        }
    }

    function assignLocations(progInfo, attribs, uniforms) {
        for (const attribName in attribs) {
            const attribInfo = attribs[attribName];
            progInfo.attribs[attribName] = {
                loc: gl.getAttribLocation(progInfo.program, attribName),
                ...attribInfo
            };
        }

        for (const uniformName in uniforms) {
            progInfo.uniforms[uniformName] = {
                loc: gl.getUniformLocation(progInfo.program, uniformName),
                method: uniforms[uniformName].bind(gl)
            };
        }
    }

    // vapParams: the parameters that will be passed into gl.vertexAttribPointer when buffer binding
    const V_INFO = { bufferName: "vertices", vapParams: [3, gl.FLOAT, false, 0, 0] };
    const N_INFO = { bufferName: "normals", vapParams: [3, gl.FLOAT, false, 0, 0] };
    const UV_INFO = { bufferName: "uvs", vapParams: [2, gl.FLOAT, false, 0, 0] };

    assignLocations(untextured, { aVertexPosition: V_INFO, aVertexNormal: N_INFO },
        { uColor: gl.uniform3f, uEyePosition: gl.uniform3f, uModelMat: gl.uniformMatrix4fv, uMVPMat: gl.uniformMatrix4fv });

    assignLocations(textured, { aVertexPosition: V_INFO, aVertexNormal: N_INFO, aVertexUV: UV_INFO },
        { uColor: gl.uniform3f, uEyePosition: gl.uniform3f, uModelMat: gl.uniformMatrix4fv,
            uMVPMat: gl.uniformMatrix4fv, uTexture: gl.uniform1i, uTextureColor: gl.uniform3f,
            uIsBlinking: gl.uniform1i, uBlinkProportion: gl.uniform1f });

    assignLocations(selection, { aVertexPosition: V_INFO },
        { uModelMat: gl.uniformMatrix4fv, uMVPMat: gl.uniformMatrix4fv, uObjectId: gl.uniform1i });
}

const toColor = (hex) => [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5)].map(h => Number("0x" + h) / 255);

// To-do list:
// different cases
// different profiles
// different textures

// stepped caps
// store json files in DB
// make shaders cleaner; use uniform blocks maybe
// allow untextured keys and textured cases
// refactor to make working with buffers easier
// use webgl built in alpha blending (gl.enable(GL.BLEND))

// Test: Future funk, high voltage, metropolis, dmg, hallyu
// fonts: pixel, dots, etc

// UI
// implement in-stock/vendor tracking
// Implement show all/hide for filters with many items
// finish describing subjective colors
// allow selection for different base kits of same set (e.g. Modern dolch)
// upload favicon and update header




// TODO refactor this clusterfuck of a file

export class KeyboardRender extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            keyboardInfo: null,
            keycapsInfo: null,

            blinkProportion: 0,
            increasing: false,
            prevWidth: 0,

            highlightKeys: false,
            fullCustom: false,
            keycapColor: "#000000",
            legendColor: "#ffffff"
        };

        this.tick = null;

        this.handleCanvasClicked = this.handleCanvasClicked.bind(this);
        this.handleCanvasMouseMove = this.handleCanvasMouseMove.bind(this);
        this.handleCanvasWheel = this.handleCanvasWheel.bind(this);
        this.handleToggleHighlight = this.handleToggleHighlight.bind(this);
        this.handleCustomizeKeycaps = this.handleCustomizeKeycaps.bind(this);
        this.handleResetKeycaps = this.handleResetKeycaps.bind(this);
        this.handleResizeCanvas = this.handleResizeCanvas.bind(this);
    }

    handleResizeCanvas() {
        const container = document.getElementById("render-container");

        const left = container.offsetLeft;
        const rightBound = window.innerWidth - container.style.marginRight.replace("px", "");
        const w = Math.max(600, rightBound - left);
        const h = Math.floor(w / 2);

        if (this.state.prevWidth !== w) {
            const canvas = document.getElementById("webgl-canvas");
            canvas.width = w;
            canvas.height = h;

            gl.viewport(0, 0, w, h);

            this.setState({ prevWidth: w });
        }
    }

    handleCanvasMouseMove(event) {
        if (event.buttons !== 0) {
            // find how much the mouse has moved since the last position
            const dx = event.movementX;
            const dy = event.movementY;
            if (dx !== 0) {
                rotateView(-dx / 100, vec3.fromValues(0, 1, 0));
            }
            if (dy !== 0) {
                // make it such that movement upwards is positive rotation
                const rotateAngle = dy / 100;
                // if this rotation will surpass lowest allowed viewing angle then clamp it
                const MIN_Y_ANG = 0.1;
                const MAX_Y_ANG = Math.PI / 2;
                const newAngle = Math.max(MIN_Y_ANG, Math.min(MAX_Y_ANG, eye.yAngle + rotateAngle));
                rotateView(newAngle - eye.yAngle, vec3.cross(vec3.create(), eye.lookUp, eye.lookAt));
                eye.yAngle = newAngle;
            }
            this.renderScene();
        }
    }

    handleCanvasWheel(event) {
        event.preventDefault();

        const amtToMove = event.deltaY / 100;
        const dist = vec3.length(eye.position);
        // constrain the distance away from keyboard to [2, 10]
        const MIN_DIST = 14;
        const MAX_DIST = 50;
        const newDist = Math.max(MIN_DIST, Math.min(MAX_DIST, dist + amtToMove));
        eye.position = vec3.scale(vec3.create(), vec3.normalize(vec3.create(), eye.position), newDist);
        this.renderScene();
    }

    handleCanvasClicked(event) {
        if (event.clientX === this.beginClick.x && event.clientY === this.beginClick.y) {
            const { left, top, height } = event.target.getBoundingClientRect();

            const x = event.clientX - left;
            const y = height - (event.clientY - top);

            renderSelection();

            let pixelClicked = new Uint8Array(4);
            gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixelClicked);

            const objectWasClicked = pixelClicked[3] === 0;
            const objectId = pixelClicked[0];
            if (objectWasClicked && objectId !== 0) {
                const key = objectIdToKey[objectId];

                if (this.state.fullCustom) {
                    key.keycapColor = toColor(this.state.keycapColor);
                    key.legendColor = toColor(this.state.legendColor);
                } else {
                    key.optionSelected = (key.optionSelected + 1) % key.colorOptions.length;

                    key.keycapColor = key.colorOptions[key.optionSelected].keycapColor;
                    key.legendColor = key.colorOptions[key.optionSelected].legendColor;
                }
            }

            this.renderScene();
        }
    }

    handleToggleHighlight() {
        if (this.tick !== null) {
            clearInterval(this.tick);
            this.setState({ increasing: false, blinkProportion: 0 });
            this.tick = null;
        } else {
            this.tick = setInterval(() => {
                if (this.state.highlightKeys) {
                    this.setState(currState => {
                        let { highlightKeys, increasing, blinkProportion } = currState;
                        if (increasing) {
                            blinkProportion = Math.min(1, blinkProportion + 0.05);
                            if (blinkProportion === 1) {
                                increasing = false;
                            }
                        } else {
                            blinkProportion = Math.max(0, blinkProportion - 0.05);
                            if (blinkProportion === 0) {
                                increasing = true;
                            }
                        }

                        return { highlightKeys, increasing, blinkProportion };
                    });
                }
            }, 20);
        }

        this.setState(currState => ({ highlightKeys: !currState.highlightKeys }));
        // this.renderScene();
    }

    handleColorMultiple(which) {
        const keys = { "alphas": alphasInSet, "mods": modsInSet, "accents": accentsInSet }[which];
        for (const keyName of keys) {
            const keyObj = keyNameToKeyObj[keyName];
            keyObj.keycapColor = toColor(this.state.keycapColor);
            keyObj.legendColor = toColor(this.state.legendColor);
        }

        this.renderScene();
    }

    handleCustomizeKeycaps() {
        this.keycapColors = keyRenderInstructions.map(key => ({ keycapColor: key.keycapColor, legendColor: key.legendColor }));
        this.setState({ highlightKeys: false, fullCustom: true });
    }

    handleResetKeycaps() {
        for (const i in keyRenderInstructions) {
            keyRenderInstructions[i].keycapColor = this.keycapColors[i].keycapColor;
            keyRenderInstructions[i].legendColor = this.keycapColors[i].legendColor;
        }
        
        this.setState({ fullCustom: false });
    }

    async componentDidMount() {
        const canvas = document.getElementById("webgl-canvas");
        gl = canvas.getContext("webgl");
        if (gl === null) {
            alert("Error in fetching GL context. Please ensure that your browser supports WebGL.");
            return;
        }

        gl.viewport(0, 0, canvas.width, canvas.height);

        // enable gl attributes: use z-buffering, make background black
        gl.clearColor(...toColor("#fcfcf8"), 1.0);
        gl.clearDepth(1.0);
        // gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        // gl.enable(gl.BLEND);
        // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.enable(gl.DEPTH_TEST);

        window.addEventListener("resize", this.handleResizeCanvas);
        canvas.addEventListener("wheel", this.handleCanvasWheel);

        setupShaders();

        const selected = this.props.selectedItems;
        // const fetchInfo = async (infoType, name) => {// async function fetchInfo(infoType, name) {
        //     try {
        //         const res = await fetch(`http://localhost:3001/${infoType}/${encodeURIComponent(name)}`);
        //         const data = await res.json();
        //         this.setState({ [infoType]: data });
        //     } catch (err) {
        //         console.error(`Error fetching ${infoType}: ${err}`);
        //     }
        // };

        // await fetchInfo("keyboardInfo", selected["Case"]["Name"]);
        // await fetchInfo("keycapsInfo", selected["Keycaps"]["Name"]);
        let infoType = "keyboardInfo";
        let name = selected["Case"]["Name"];
        const set = {};
        try {
            const res = await fetch(`http://localhost:3001/${infoType}/${encodeURIComponent(name)}`);
            const data = await res.json();
            set[infoType] = data;
        } catch (err) {
            console.error(`Error fetching ${infoType}: ${err}`);
        }
        infoType = "keycapsInfo";
        name = selected["Keycaps"]["Name"];
        try {
            const res = await fetch(`http://localhost:3001/${infoType}/${encodeURIComponent(name)}`);
            const data = await res.json();
            set[infoType] = data;
        } catch (err) {
            console.error(`Error fetching ${infoType}: ${err}`);
        }

        this.setState({ keyboardInfo: set.keyboardInfo, keycapsInfo: set.keycapsInfo });

        console.log("kbd");
        console.log(this.state.keyboardInfo);
        console.log("kc");
        console.log(this.state.keycapsInfo);

        await loadModels(this.state.keyboardInfo, this.state.keycapsInfo, "cherry");

        this.handleResizeCanvas();
        this.renderScene();
    }

    componentDidUpdate() {
        this.handleResizeCanvas();
        // this.renderScene();
    }

    componentWillUnmount() {
        window.removeEventListener("resize", this.handleResizeCanvas);
        document.getElementById("webgl-canvas").removeEventListener("wheel", this.handleCanvasWheel);
        if (this.tick) {
            clearInterval(this.tick);
            this.tick = null;
        }
        gl = null;
    }

    renderScene() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
        const projMat = mat4.perspective(mat4.create(), Math.PI / 9, 2, 0.1, 1000);
        const viewMat = mat4.lookAt(mat4.create(), eye.position, vec3.add(vec3.create(), eye.position, eye.lookAt), eye.lookUp);
        const viewProjMat = mat4.multiply(mat4.create(), projMat, viewMat);
    
        renderObject(progsInfo.untextured, progsInfo.untextured.buffers["case"], {
            uEyePosition: [eye.position[0], eye.position[1], eye.position[2]],
            uMVPMat: [false, viewProjMat],
            uModelMat: [false, mat4.create()],
            uColor: [0.1, 0.1, 0.1]
        });
    
        // render keys
        for (const instr of keyRenderInstructions) {
            const modelViewProjMat = mat4.multiply(mat4.create(), viewProjMat, instr.transformation);

            const STAB_OFFSETS = {
                2: 0.65,
                2.25: 0.65,
                2.75: 0.65,
                6: 2.5,
                6.25: 2.5,
                7: 2.5
            };

            const stabOffset = STAB_OFFSETS[instr.keysize];
            if (stabOffset) {
                const renderStab = (offset) => {
                    const offsetMat = mat4.fromTranslation(mat4.create(), offset);
                    const transformation = mat4.multiply(mat4.create(), offsetMat, instr.transformation);
                    renderObject(progsInfo.untextured, progsInfo.untextured.buffers["stabilizer"], {
                        uEyePosition: [eye.position[0], eye.position[1], eye.position[2]],
                        uMVPMat: [false, mat4.multiply(mat4.create(), viewProjMat, transformation)],
                        uModelMat: [false, transformation],
                        uColor: this.props.selectedItems["Stabilizers"].color.slice(0, 3) // TODO
                    });
                };

                renderStab([stabOffset, 0, 0]);
                renderStab([-stabOffset, 0, 0]);
            }
    
            // render keyswitch
            renderObject(progsInfo.untextured, progsInfo.untextured.buffers["switch"], {
                uEyePosition: [eye.position[0], eye.position[1], eye.position[2]],
                uMVPMat: [false, modelViewProjMat],
                uModelMat: [false, instr.transformation],
                uColor: this.props.selectedItems["Switches"].casingColor
            });
    
            // render keycap
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, instr.legendTexture);
    
            renderObject(progsInfo.textured, progsInfo.textured.buffers[instr.modelIdentifier], {
                uEyePosition: [eye.position[0], eye.position[1], eye.position[2]],
                uMVPMat: [false, modelViewProjMat],
                uModelMat: [false, instr.transformation],
                uColor: instr.keycapColor,
                uTexture: [0],
                uTextureColor: instr.legendColor,
                uIsBlinking: [!this.state.fullCustom && this.state.highlightKeys && instr.colorOptions.length > 1],
                uBlinkProportion: [this.state.blinkProportion]
            });
        }
    
        // TODO maybe refactor this to first drawing all textured items and then untextured
    }

    render() {
        return (
            <div id="keyboard-render">
                <canvas id="webgl-canvas"
                    onMouseDown={e => this.beginClick = { x: e.clientX, y: e.clientY }}
                    onMouseUp={this.handleCanvasClicked}
                    onMouseMove={this.handleCanvasMouseMove} />

                <div id="render-inputs">
                    
                    {this.state.fullCustom ? (
                        <React.Fragment>
                            <button onClick={this.handleResetKeycaps}>Reset</button>
                            <div>
                                {/* <div className="color-picker"> */}
                                    <input type="color" id="keycap-color" value={this.state.keycapColor}
                                        onChange={e => this.setState({ keycapColor: e.target.value })} />
                                    <label htmlFor="keycap-color">Keycap Color</label>
                                {/* </div> */}
                                {/* <div className="color-picker"> */}
                                    <input type="color" id="legend-color" value={this.state.legendColor}
                                        onChange={e => this.setState({ legendColor: e.target.value })} />
                                    <label htmlFor="legend-color">Legend Color</label>
                                {/* </div> */}
                            </div>
                            <button onClick={() => this.handleColorMultiple("alphas")}>Color Alphas</button>
                            <button onClick={() => this.handleColorMultiple("mods")}>Color Mods</button>
                            <button onClick={() => this.handleColorMultiple("accents")}>Color Accents</button>
                        </React.Fragment>
                    ) : (
                        <div>
                            <button onClick={this.handleCustomizeKeycaps}>Customize</button>
                            <input type="checkbox" id="highlight-changeable" onChange={this.handleToggleHighlight} />
                            <label htmlFor="highlight-changeable">Highlight Changeable Keys</label>
                        </div>
                    )}
                </div>
            </div>
        );
    }
}
