"use strict";

let gl = null;
let progsInfo = {
    textured: {
        program: null,
        locs: {},
        buffers: {}
    },
    untextured: {
        program: null,
        locs: {},
        buffers: {}
    }
}

let eye = {
    position: vec3.fromValues(0, 8, 8),
    lookAt: vec3.normalize(vec3.create(), vec3.fromValues(0, -1, -1)),
    lookUp: vec3.normalize(vec3.create(), vec3.fromValues(0, 1, -1)),
    yAngle: Math.PI / 4
}
let prevDragPos;
let keyRenderInstructions = [];

// lookup table for all non-1-unit-wide keys. Logically, SPECIAL_NUM_UNITS[key] || 1 will get key size
const SPECIAL_NUM_UNITS = {
    "Backspace": 2,
    "Tab": 1.5,
    "\\": 1.5,
    "Caps": 1.75,
    "Enter": 2.25,
    "LShift": 2.25,
    "RShift1.75": 1.75,
    "Ctrl1.25": 1.25,
    "Win1.25": 1.25,
    "Alt1.25": 1.25,
    "Space_6.25U": 6.25
}

const SPECIAL_KEYCAP_IDENTIFIERS = new Set([
    "Space_6.25U", "Space_6U", "Space_7U", "Numpad_Enter", "Numpad_Plus", "ISO_Enter"
]);

const ALPHAS = new Set([
    "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=",
    "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",
    "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'",
    "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/",
]);


// TODO store in DB

// TODO checkbox for split space, split shifts, etc

class Key {
    constructor(row, kind, keycapColor, legendTexture, legendColor) {
        this.keycapIdentifier = row != null ? `R${row}_${kind}U` : kind;
        this.kind = kind;
        this.color = keycapColor;
        this.texture = legendTexture;
        this.legendColor = legendColor;
        this.units = SPECIAL_NUM_UNITS[kind] ? SPECIAL_NUM_UNITS[kind] : 1;
    }
}

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

    const img = new Image();
    img.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

        const isPowerOf2 = x => (x & (x - 1)) == 0;
        if (isPowerOf2(img.width) && isPowerOf2(img.height)) {
            gl.generateMipmap(gl.TEXTURE_2D);
        } else {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }
    }
    img.src = url;

    return texture;
}

function getKeycapInfo(key, keycapsInfo) {
    let legendTexture;
    if (keycapsInfo.font == "std GMK") {
        legendTexture = loadTexture("resources/legends/" + key + ".png");
    } else {
        alert("Problem loading keycap font");
    }

    const stdLayoutInfo = keycapsInfo.standard;

    // first check if is alpha, then if is exception, otherwise use the 'others'
    const keyInfo = ALPHAS.has(key) ? stdLayoutInfo.alphas :
                  stdLayoutInfo.exceptions.find(e => e.key == key) ||
                  stdLayoutInfo.others;

    return {
        legendTexture,
        keycapColor: keyInfo.keycapColor,
        legendColor: keyInfo.legendColor
    }
}

function loadModels(kbdName, keycapProfile, keycapSet) {
    if (gl == null) {
        initKBRender();
    }

    const fetchJson = filename => fetch("resources/" + filename + ".json").then(response => response.json());

    let kbdInfo;
    let keycapsInfo;
    Promise.all([
        fetchJson("keyboardInfo").then(allKbdInfo => kbdInfo = allKbdInfo[kbdName]),
        fetchJson("keycapInfo").then(allKcInfo => keycapsInfo = allKcInfo[keycapProfile][keycapSet])
    ]).then(() => {
        // ---------------------------------------------------------------------------
        // prepare all necessary information for setting up key rendering instructions
        // ---------------------------------------------------------------------------

        keyRenderInstructions = [];
        // list of promises to load each model (keycaps and keyboard case)
        let resourceLoadPromises = [];
        let keycapModelsVisited = new Set();

        // find total number of units horizontally and vertically
        // to get number of units horizontally, find the keygroup that extends farthest right
        const numUnitsX = kbdInfo.keyGroups.reduce(
            (rightmostUnits, keyGroup) => Math.max(rightmostUnits, keyGroup.keys.reduce(
                (numU, key) => numU + (SPECIAL_NUM_UNITS[key] || 1),
                keyGroup.offset[0])),
            0);
        // to get number of units vertically, find the keygroup that extends farthest down
        const numUnitsY = kbdInfo.keyGroups.reduce((max, kg) => Math.max(max, kg.offset[1]), 0) + 1;

        const HEIGHT = 1.25;
        // define matrix for rotating an object by the keyboard incline and then moving it up to proper height
        const heightInclineMat = mat4.multiply(mat4.create(),
            mat4.fromTranslation(mat4.create(), vec3.fromValues(0, HEIGHT, 0)), // translate upwards
            mat4.fromRotation(mat4.create(), kbdInfo.incline * (Math.PI / 180), [1, 0, 0]) // incline
        );

        // -------------------------------------------------
        // define instructions for rendering all needed keys
        // -------------------------------------------------
        for (const kg of kbdInfo.keyGroups) {
            // initialize position to beginning of row and increment after each key
            let posXZ = [kg.offset[0] - numUnitsX / 2, 0, kg.offset[1] - numUnitsY / 2 + 0.5];
            for (const key of kg.keys) {
                // if this key is not special (non-1u), then it must be 1 unit wide
                const keysize = SPECIAL_NUM_UNITS[key] || 1;
                const keycapIdentifier = SPECIAL_KEYCAP_IDENTIFIERS.has(key) ? key : `R${kg.row}_${keysize}U`;

                // if a keycap with these dimensions has not been loaded yet, then load it
                if (!keycapModelsVisited.has(keycapIdentifier)) {
                    let bufs = progsInfo.textured.buffers;
                    bufs[keycapIdentifier] = {};
                    resourceLoadPromises.push(
                        fetchJson(keycapProfile + "_" + keycapIdentifier)
                        .then(keycapModel => loadGLBuffers(bufs[keycapIdentifier], keycapModel, true)));
                    keycapModelsVisited.add(keycapIdentifier);
                }

                // move keycap to middle of keycap area
                const toPosMat = mat4.fromTranslation(mat4.create(), [posXZ[0] + keysize / 2, 0, posXZ[2]]);
                const finalTransformationMat = mat4.multiply(mat4.create(), heightInclineMat, toPosMat);
                
                keyRenderInstructions.push({
                    keycapIdentifier,
                    keycapInfo: getKeycapInfo(key, keycapsInfo),
                    transformation: finalTransformationMat
                })
                posXZ[0] += keysize;
            }
        }

        // load case
        progsInfo.untextured.buffers["case"] = {};
        resourceLoadPromises.push(
            fetchJson("Case_" + kbdName)
            .then(trianglesInfo => loadGLBuffers(progsInfo.untextured.buffers["case"], trianglesInfo, false)));

        // render once all loaded
        Promise.all(resourceLoadPromises).then(() => renderScene())
        .catch(err => alert("Error loading resource file: " + err));
    });
}

function renderObject(identifier, uniformsToSet) {
    const isTextured = progsInfo.textured.buffers[identifier] !== undefined;

    const progInfo = isTextured ? progsInfo.textured : progsInfo.untextured;
    const { program, locs } = progInfo;
    const buffers = progInfo.buffers[identifier];

    gl.useProgram(program);

    for (const uniform of uniformsToSet) {
        uniform.method(uniform.loc, ...uniform.params);
    }

    gl.enableVertexAttribArray(locs.aVertexPositionLoc);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vertices);
    gl.vertexAttribPointer(locs.aVertexPositionLoc, 3, gl.FLOAT, false, 0, 0);

    gl.enableVertexAttribArray(locs.aVertexNormalLoc);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normals);
    gl.vertexAttribPointer(locs.aVertexNormalLoc, 3, gl.FLOAT, false, 0, 0);

    if (isTextured) {
        gl.enableVertexAttribArray(locs.aVertexUVLoc);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.uvs);
        gl.vertexAttribPointer(locs.aVertexUVLoc, 2, gl.FLOAT, false, 0, 0);
    }

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.triangles);
    gl.drawElements(gl.TRIANGLES, buffers.numTriangles * 3, gl.UNSIGNED_SHORT, 0);

    gl.disableVertexAttribArray(locs.aVertexPositionLoc);
    gl.disableVertexAttribArray(locs.aVertexNormalLoc);
    if (isTextured) {
        gl.disableVertexAttribArray(locs.aVertexUVLoc);
    }
}

function renderScene() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const projMat = mat4.perspective(mat4.create(), Math.PI / 2, 2, 0.1, 1000);
    const viewMat = mat4.lookAt(mat4.create(), eye.position, vec3.add(vec3.create(), eye.position, eye.lookAt), eye.lookUp);
    const viewProjMat = mat4.multiply(mat4.create(), projMat, viewMat);

    const utLocs = progsInfo.untextured.locs;
    const tLocs = progsInfo.textured.locs;

    // gl.useProgram(progsInfo.untextured.program);
    // gl.enableVertexAttribArray(untexturedLocs.aVertexPositionLoc);
    // gl.enableVertexAttribArray(untexturedLocs.aVertexNormalLoc);

    

    // gl.uniform3f(utLocs.uEyePositionLoc, eye.position[0], eye.position[1], eye.position[2]);

    // // render case
    // gl.uniformMatrix4fv(utLocs.uMVPMatLoc, false, viewProjMat);
    // gl.uniformMatrix4fv(utLocs.uModelMatLoc, false, mat4.create());
    // gl.uniform3fv(utLocs.uColorLoc, [0.1, 0.1, 0.1]);

    const uniformsToSet = uniforms => uniforms.map(u => ({ loc: u[0], method: u[1].bind(gl), params: u[2] }));
    const uniforms = uniformsToSet([
        [utLocs.uEyePositionLoc, gl.uniform3f, [eye.position[0], eye.position[1], eye.position[2]]],
        [utLocs.uMVPMatLoc, gl.uniformMatrix4fv, [false, viewProjMat]],
        [utLocs.uModelMatLoc, gl.uniformMatrix4fv, [false, mat4.create()]],
        [utLocs.uColorLoc, gl.uniform3f, [0.1, 0.1, 0.1]]
    ]);
    
    renderObject("case", uniforms);

    // gl.disableVertexAttribArray(untexturedLocs.aVertexPositionLoc);
    // gl.disableVertexAttribArray(untexturedLocs.aVertexNormalLoc);

    // gl.useProgram(progsInfo.textured.program);

    // gl.uniform3f(tLocs.uEyePositionLoc, eye.position[0], eye.position[1], eye.position[2]);
    // // gl.enableVertexAttribArray(texturedLocs.aVertexPositionLoc);
    // // gl.enableVertexAttribArray(texturedLocs.aVertexNormalLoc);
    // // gl.enableVertexAttribArray(texturedLocs.aVertexUVLoc);
    // render keys
    for (const instr of keyRenderInstructions) {
        // gl.uniformMatrix4fv(tLocs.uModelMatLoc, false, instr.transformation);
        const modelViewProjMat = mat4.multiply(mat4.create(), viewProjMat, instr.transformation);
        // gl.uniformMatrix4fv(tLocs.uMVPMatLoc, false, modelViewProjMat);
        // gl.uniform3fv(tLocs.uColorLoc, instr.keycapInfo.keycapColor);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, instr.keycapInfo.legendTexture);
        // gl.uniform1f(tLocs.uTextureLoc, 0);

        // gl.uniform3fv(tLocs.uTextureColorLoc, [0, 0, 0]);//instr.keycapInfo.legendColor);

        // const a = gl.getVertexAttrib(0,gl.VERTEX_ATTRIB_ARRAY_ENABLED);
        // const b = gl.getVertexAttrib(1,gl.VERTEX_ATTRIB_ARRAY_ENABLED);
        // const c = gl.getVertexAttrib(2,gl.VERTEX_ATTRIB_ARRAY_ENABLED);
        // const d = gl.getVertexAttrib(3,gl.VERTEX_ATTRIB_ARRAY_ENABLED);

        const uniforms = uniformsToSet([
            [tLocs.uEyePositionLoc, gl.uniform3f, [eye.position[0], eye.position[1], eye.position[2]]],
            [tLocs.uMVPMatLoc, gl.uniformMatrix4fv, [false, modelViewProjMat]],
            [tLocs.uModelMatLoc, gl.uniformMatrix4fv, [false, instr.transformation]],
            [tLocs.uColorLoc, gl.uniform3f, instr.keycapInfo.keycapColor],
            [tLocs.uTexture, gl.uniform1f, [0]],
            [tLocs.uTextureColorLoc, gl.uniform3f, [0, 0, 1]]
        ]);

        renderObject(instr.keycapIdentifier, uniforms);

        // const glObjectBuffer = progsInfo.textured.buffers[instr.keycapIdentifier];

        // gl.bindBuffer(gl.ARRAY_BUFFER, glObjectBuffer.vertices);
        // gl.vertexAttribPointer(texturedLocs.aVertexPositionLoc, 3, gl.FLOAT, false, 0, 0);

        // gl.bindBuffer(gl.ARRAY_BUFFER, glObjectBuffer.normals);
        // gl.vertexAttribPointer(texturedLocs.aVertexNormalLoc, 3, gl.FLOAT, false, 0, 0);

        // gl.bindBuffer(gl.ARRAY_BUFFER, glObjectBuffer.uvs);
        // gl.vertexAttribPointer(texturedLocs.aVertexUVLoc, 2, gl.FLOAT, false, 0, 0);

        // gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, glObjectBuffer.triangles);
        // gl.drawElements(gl.TRIANGLES, glObjectBuffer.numTriangles * 3, gl.UNSIGNED_SHORT, 0);
    }

    // TODO maybe refactor this to first drawing all textured items and then untextured
}

function setupShaders() {
    // // define vertex shader in essl
    // const sharedVShaderSrcHeader = `
    //     attribute vec3 aVertexPosition; // vertex position
    //     attribute vec3 aVertexNormal; // vertex normal
        
    //     uniform mat4 uModelMatrix; // model matrix
    //     uniform mat4 uMVPMatrix; // projection-view-model matrix
        
    //     varying vec3 vWorldPos; // interpolated world position of vertex
    //     varying vec3 vVertexNormal; // interpolated normal for frag shader
    // `;
    // const sharedVShaderSrcMain = `
    //     void main(void) {
    //         // vertex position
    //         vec4 vWorldPos4 = uModelMatrix * vec4(aVertexPosition, 1.0);
    //         vWorldPos = vec3(vWorldPos4.x,vWorldPos4.y,vWorldPos4.z);
    //         gl_Position = uMVPMatrix * vec4(aVertexPosition, 1.0);

    //         // vertex normal (assume no non-uniform scale)
    //         vec4 vWorldNormal4 = uModelMatrix * vec4(aVertexNormal, 0.0);
    //         vVertexNormal = normalize(vec3(vWorldNormal4.x, vWorldNormal4.y, vWorldNormal4.z));
    // `;

    // const vShaderUntexturedSrc = sharedVShaderSrcHeader + sharedVShaderSrcMain + "}";
    // const vShaderTexturedSrc = sharedVShaderSrcHeader + `
    //         attribute vec2 aVertexUV;
    //         varying vec2 vVertexUV;
    //     ` + sharedVShaderSrcMain + "vVertexUV = aVertexUV; }";

    // const sharedFShaderSrcHeader = `
    //     precision mediump float;

    //     // eye world position
    //     uniform vec3 uEyePosition;

    //     uniform vec3 uColor;
        
    //     // geometry properties
    //     varying vec3 vWorldPos; // world xyz of fragment
    //     varying vec3 vVertexNormal; // normal of fragment
    // `;
    // const sharedFShaderSrcMain = `
    //     void main(void) {
    //         vec3 ambient = uColor * 0.4;
    //         vec3 kDiffuse = uColor * 0.4;
    //         vec3 kSpecular = vec3(0.2, 0.2, 0.2);

    //         vec3 normal = normalize(vVertexNormal); 

    //         vec3 lightPos = vec3(5.0, 10.0, 10.0);

    //         // compute diffuse term
    //         vec3 toLight = normalize(lightPos - vWorldPos);
    //         float lambert = max(0.0, dot(normal, toLight));
    //         vec3 diffuse = kDiffuse * lambert;
            
    //         // compute specular term
    //         vec3 toEye = normalize(uEyePosition - vWorldPos);
    //         vec3 halfVec = normalize(toLight + toEye);
    //         float highlight = pow(max(0.0, dot(normal, halfVec)), 3.0);
    //         vec3 specular = kSpecular * highlight;
            
    //         // combine ambient, diffuse, specular to output color
    //         vec3 colorOut = ambient + diffuse + specular;
    // `;
    
    // const fShaderUntexturedSrc = sharedFShaderSrcHeader + sharedFShaderSrcMain +
    //     "gl_FragColor = vec4(colorOut, 1.0); }";
    // const fShaderTexturedSrc = sharedFShaderSrcHeader + `
    //         varying vec2 vVertexUV;
    //         uniform sampler2D uTexture;
    //         uniform vec3 uTextureColor;
    //     ` + sharedFShaderSrcMain + `
    //         vec2 actualUV = vec2(1.0 - vVertexUV.s, 1.0 - vVertexUV.t);
    //         vec4 colorFromTexture = texture2D(uTexture, actualUV);
    //         gl_FragColor = vec4(colorOut, 1.0) * colorFromTexture; }
    //     `;



    const vShaderUntexturedSrc = `
        attribute vec3 aVertexPosition; // vertex position
        attribute vec3 aVertexNormal; // vertex normal
        
        uniform mat4 uModelMatrix; // model matrix
        uniform mat4 uMVPMatrix; // projection-view-model matrix
        
        varying vec3 vWorldPos; // interpolated world position of vertex
        varying vec3 vVertexNormal; // interpolated normal for frag shader

        void main(void) {
            // vertex position
            vec4 vWorldPos4 = uModelMatrix * vec4(aVertexPosition, 1.0);
            vWorldPos = vec3(vWorldPos4.x,vWorldPos4.y,vWorldPos4.z);
            gl_Position = uMVPMatrix * vec4(aVertexPosition, 1.0);

            // vertex normal (assume no non-uniform scale)
            vec4 vWorldNormal4 = uModelMatrix * vec4(aVertexNormal, 0.0);
            vVertexNormal = normalize(vec3(vWorldNormal4.x, vWorldNormal4.y, vWorldNormal4.z));
        }
    `;

    const fShaderUntexturedSrc = `
        precision mediump float;

        // eye world position
        uniform vec3 uEyePosition;

        uniform vec3 uColor;
        
        // geometry properties
        varying vec3 vWorldPos; // world xyz of fragment
        varying vec3 vVertexNormal; // normal of fragment

        void main(void) {
            vec3 ambient = uColor * 0.4;
            vec3 kDiffuse = uColor * 0.4;
            vec3 kSpecular = vec3(0.2, 0.2, 0.2);

            vec3 normal = normalize(vVertexNormal); 

            vec3 lightPos = vec3(5.0, 10.0, 10.0);

            // compute diffuse term
            vec3 toLight = normalize(lightPos - vWorldPos);
            float lambert = max(0.0, dot(normal, toLight));
            vec3 diffuse = kDiffuse * lambert;
            
            // compute specular term
            vec3 toEye = normalize(uEyePosition - vWorldPos);
            vec3 halfVec = normalize(toLight + toEye);
            float highlight = pow(max(0.0, dot(normal, halfVec)), 3.0);
            vec3 specular = kSpecular * highlight;
            
            // combine ambient, diffuse, specular to output color
            vec3 colorFromLighting = ambient + diffuse + specular;
            gl_FragColor = vec4(colorFromLighting, 1.0);
        }
    `;

    const vShaderTexturedSrc = `
        attribute vec3 aVertexPosition; // vertex position
        attribute vec3 aVertexNormal; // vertex normal
        
        uniform mat4 uModelMatrix; // model matrix
        uniform mat4 uMVPMatrix; // projection-view-model matrix
        
        varying vec3 vWorldPos; // interpolated world position of vertex
        varying vec3 vVertexNormal; // interpolated normal for frag shader

        attribute vec2 aVertexUV;
        varying vec2 vVertexUV;

        void main(void) {
            // vertex position
            vec4 vWorldPos4 = uModelMatrix * vec4(aVertexPosition, 1.0);
            vWorldPos = vec3(vWorldPos4.x,vWorldPos4.y,vWorldPos4.z);
            gl_Position = uMVPMatrix * vec4(aVertexPosition, 1.0);

            // vertex normal (assume no non-uniform scale)
            vec4 vWorldNormal4 = uModelMatrix * vec4(aVertexNormal, 0.0);
            vVertexNormal = normalize(vec3(vWorldNormal4.x, vWorldNormal4.y, vWorldNormal4.z));

            vVertexUV = aVertexUV;
            if (vVertexUV.x == 0.0 && vVertexUV.y == 0.0) {
                vVertexUV = vec2(-10000.0, -10000.0);
            }
        }
    `;

    const fShaderTexturedSrc = `
        precision mediump float;

        // eye world position
        uniform vec3 uEyePosition;

        uniform vec3 uColor;
        
        // geometry properties
        varying vec3 vWorldPos; // world xyz of fragment
        varying vec3 vVertexNormal; // normal of fragment

        varying vec2 vVertexUV;
        uniform sampler2D uTexture;
        uniform vec3 uTextureColor;

        void main(void) {
            vec3 ambient = uColor * 0.4;
            vec3 kDiffuse = uColor * 0.4;
            vec3 kSpecular = vec3(0.2, 0.2, 0.2);

            vec3 normal = normalize(vVertexNormal); 

            vec3 lightPos = vec3(5.0, 10.0, 10.0);

            // compute diffuse term
            vec3 toLight = normalize(lightPos - vWorldPos);
            float lambert = max(0.0, dot(normal, toLight));
            vec3 diffuse = kDiffuse * lambert;
            
            // compute specular term
            vec3 toEye = normalize(uEyePosition - vWorldPos);
            vec3 halfVec = normalize(toLight + toEye);
            float highlight = pow(max(0.0, dot(normal, halfVec)), 3.0);
            vec3 specular = kSpecular * highlight;
            
            // combine ambient, diffuse, specular to output color
            vec3 colorFromLighting = ambient + diffuse + specular;
            vec2 actualUV = vec2(1.0 - vVertexUV.s, vVertexUV.t);
            if (actualUV.x < 0.0 || actualUV.y < 0.0) {
                gl_FragColor = vec4(colorFromLighting, 1.0);
            } else {
                vec4 colorFromTexture = vec4(uTextureColor, 1.0) * texture2D(uTexture, actualUV);
                float alpha = colorFromTexture.a;

                vec3 colorOut = alpha * colorFromTexture.rgb + (1.0 - alpha) * colorFromLighting;
                gl_FragColor = vec4(colorOut, 1.0);
            }
        }
    `;
    
    // compile vertex shader
    const vShaderUntextured = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vShaderUntextured, vShaderUntexturedSrc);
    const vShaderTextured = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vShaderTextured, vShaderTexturedSrc);

    const fShaderUntextured = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fShaderUntextured, fShaderUntexturedSrc);
    const fShaderTextured = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fShaderTextured, fShaderTexturedSrc);

    for (const shader of [vShaderUntextured, vShaderTextured, fShaderUntextured, fShaderTextured]) {
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            alert("Shader compilation error: " + gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return;
        }
    }

    const { textured, untextured } = progsInfo;

    // create shader program and link
    untextured.program = gl.createProgram();
    gl.attachShader(untextured.program, vShaderUntextured);
    gl.attachShader(untextured.program, fShaderUntextured);

    textured.program = gl.createProgram();
    gl.attachShader(textured.program, vShaderTextured);
    gl.attachShader(textured.program, fShaderTextured);

    for (const program of [untextured.program, textured.program]) {
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            alert("Shader program linking error: " + gl.getProgramInfoLog(program));
            return;
        }
    }

    for (const { locs, program } of [untextured, textured]) {
        gl.useProgram(program);

        // locate and enable vertex attributes
        locs.aVertexPositionLoc = gl.getAttribLocation(program, "aVertexPosition");
        
        locs.aVertexNormalLoc = gl.getAttribLocation(program, "aVertexNormal");
        
        
        // locate uniforms
        locs.uColorLoc = gl.getUniformLocation(program, "uColor");
        locs.uEyePositionLoc = gl.getUniformLocation(program, "uEyePosition");
        locs.uModelMatLoc = gl.getUniformLocation(program, "uModelMatrix");
        locs.uMVPMatLoc = gl.getUniformLocation(program, "uMVPMatrix");
    }

    gl.useProgram(textured.program);

    textured.locs.aVertexUVLoc = gl.getAttribLocation(textured.program, "aVertexUV");
    //gl.enableVertexAttribArray(progsInfo.textured.locs.aVertexUVLoc);

    textured.locs.uTextureLoc = gl.getUniformLocation(textured.program, "uTexture");
    textured.locs.uTextureColorLoc = gl.getUniformLocation(textured.program, "uTextureColor");
}

// To-do list:
// different cases
// different profiles
// different textures

// smooth scroll
// invert spacebar
// stepped caps
// use async await
// send flattened lists to loadGLBuffers
// only load keys necessary for this board
// remove row field from keyboardInfo and allow deduction of row in code
// store json files in DB
// make shaders cleaner; use uniform blocks maybe
// allow untextured keys and textured cases
// refactor to make working with buffers easier
// use webgl built in alpha blending (gl.enable(GL.BLEND))
// change implementation such that resources are only loaded if needed

// UI
// implement in-stock/vendor tracking
// implement efficient item search (maybe Suffix Tree)
// Implement show all/hide for filters with many items
// Implement different kinds of filters - numeric range, must contain all of, must contain one of
// fix honeywell & co keycaps
function initKBRender() {
    // get WebGL context
    const $canvas = $("#webGLCanvas");
    const canvas = $canvas[0];
    const w = window.innerWidth;
    // canvas.width = w;
    // canvas.height = w / 2;

    canvas.style.width = w + "px";
    canvas.style.height = (w / 2) + "px";
    gl = canvas.getContext("webgl");
    if (gl == null) {
        alert("Error in fetching GL context. Please ensure that your browser support WebGL.");
        return;
    }

    // enable gl attributes: use z-buffering, make background black
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);

    // add mouse event for rotating view
    $canvas.on("mousedown", e => {
        prevDragPos = {x: e.pageX, y: e.pageY};

        // drag event handler; will be used for rotating view
        function drag(e) {
            console.log("moved");
            // find how much the mouse has moved since the last position
            const dx = e.pageX - prevDragPos.x;
            const dy = e.pageY - prevDragPos.y;
            if (dx != 0) {
                rotateView(-dx / 100, vec3.fromValues(0, 1, 0));
            }
            if (dy != 0) {
                // make it such that movement upwards is positive rotation
                const rotateAngle = dy / 100;
                // if this rotation will surpass lowest allowed viewing angle then clamp it
                const MIN_Y_ANG = 0.1;
                const MAX_Y_ANG = Math.PI / 2;
                const newAngle = Math.max(MIN_Y_ANG, Math.min(MAX_Y_ANG, eye.yAngle + rotateAngle));
                rotateView(newAngle - eye.yAngle, vec3.cross(vec3.create(), eye.lookUp, eye.lookAt));
                eye.yAngle = newAngle;
            }
            prevDragPos = {x: e.pageX, y: e.pageY};
            renderScene();
        }

        // enable drag event
        $canvas.on("mousemove", drag);
        // disable drag event when mouse click released
        $canvas.on("mouseup", () => $canvas.off("mousemove", drag));
    });

    $canvas.on("wheel", e => {
        const amtToMove = e.originalEvent.deltaY / 200;
        const dist = vec3.length(eye.position);
        // constrain the distance away from keyboard to [2, 10]
        const MIN_DIST = 4;
        const MAX_DIST = 20;
        const newDist = Math.max(MIN_DIST, Math.min(MAX_DIST, dist + amtToMove));
        eye.position = vec3.scale(vec3.create(), vec3.normalize(vec3.create(), eye.position), newDist);
        renderScene();
    })

    setupShaders();
}
