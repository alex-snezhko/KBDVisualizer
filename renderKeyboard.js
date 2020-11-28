"use strict";

let gl = null;

let locs = {};
let buffers = { keycapBuffers: {}, caseBuffer: {} };
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
    let rotationMat = mat4.fromRotation(mat4.create(), ang, axis);
    eye.position = vec3.transformMat4(vec3.create(), eye.position, rotationMat);
    eye.lookAt = vec3.transformMat4(vec3.create(), eye.lookAt, rotationMat);
    eye.lookUp = vec3.transformMat4(vec3.create(), eye.lookUp, rotationMat);
}

function loadGLBuffers(glObjectBuffer, object) {
    glObjectBuffer.vertices = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, glObjectBuffer.vertices);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(object.vertices.flat()), gl.STATIC_DRAW);

    glObjectBuffer.normals = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, glObjectBuffer.normals);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(object.normals.flat()), gl.STATIC_DRAW);

    glObjectBuffer.triangles = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, glObjectBuffer.triangles);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(object.triangles.flat()), gl.STATIC_DRAW);

    glObjectBuffer.numTriangles = object.triangles.length;
}

function loadTexture(url) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA,
        gl.UNSIGNED_BYTE, new Uint8Array([0, 255, 255, 255]));

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
    let keyInfo = ALPHAS.has(key) ? stdLayoutInfo.alphas :
                  stdLayoutInfo.exceptions.find(e => e.key == key) ||
                  stdLayoutInfo.others;

    return {
        legendTexture,
        keycapColor: keyInfo.keycapColor,
        legendColor: keyInfo.legendColor
    }
}

function loadModels(kbdName, keycapProfile, keycapSet) {
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
        for (let kg of kbdInfo.keyGroups) {
            // initialize position to beginning of row and increment after each key
            let posXZ = [kg.offset[0] - numUnitsX / 2, 0, kg.offset[1] - numUnitsY / 2 + 0.5];
            for (let key of kg.keys) {
                // if this key is not special (non-1u), then it must be 1 unit wide
                let keysize = SPECIAL_NUM_UNITS[key] || 1;
                let keycapIdentifier = SPECIAL_KEYCAP_IDENTIFIERS.has(key) ? key : `R${kg.row}_${keysize}U`;

                // if a keycap with these dimensions has not been loaded yet, then load it
                if (!keycapModelsVisited.has(keycapIdentifier)) {
                    buffers.keycapBuffers[keycapIdentifier] = {};
                    resourceLoadPromises.push(fetchJson(keycapProfile + "_" + keycapIdentifier)
                        .then(keycapModel => loadGLBuffers(buffers.keycapBuffers[keycapIdentifier], keycapModel)));
                    keycapModelsVisited.add(keycapIdentifier);
                }

                // move keycap to middle of keycap area
                let toPosMat = mat4.fromTranslation(mat4.create(), [posXZ[0] + keysize / 2, 0, posXZ[2]]);
                let finalTransformationMat = mat4.multiply(mat4.create(), heightInclineMat, toPosMat);
                
                keyRenderInstructions.push({
                    keycapIdentifier,
                    keycapInfo: getKeycapInfo(key, keycapsInfo),
                    transformation: finalTransformationMat
                })
                posXZ[0] += keysize;
            }
        }

        // load case
        resourceLoadPromises.push(fetchJson("Case_" + kbdName)
            .then(trianglesInfo => loadGLBuffers(buffers.caseBuffer, trianglesInfo)));

        // render once all loaded
        Promise.all(resourceLoadPromises)
            .then(() => renderScene())
            .catch(err => alert("Error loading resource file: " + err));
    });
}

function renderObject(glObjectBuffer) {
    gl.bindBuffer(gl.ARRAY_BUFFER, glObjectBuffer.vertices);
    gl.vertexAttribPointer(locs.aVertexPositionLoc, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, glObjectBuffer.normals);
    gl.vertexAttribPointer(locs.aVertexNormalLoc, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, glObjectBuffer.triangles);
    gl.drawElements(gl.TRIANGLES, glObjectBuffer.numTriangles * 3, gl.UNSIGNED_SHORT, 0);
}

function renderScene() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const projMat = mat4.perspective(mat4.create(), Math.PI / 2, 2, 0.1, 1000);
    const viewMat = mat4.lookAt(mat4.create(), eye.position, vec3.add(vec3.create(), eye.position, eye.lookAt), eye.lookUp);
    const viewProjMat = mat4.multiply(mat4.create(), projMat, viewMat);

    gl.uniform3f(locs.uEyePositionLoc, eye.position[0], eye.position[1], eye.position[2]);

    // render case
    gl.uniformMatrix4fv(locs.uMVPMatLoc, false, viewProjMat);
    gl.uniformMatrix4fv(locs.uModelMatLoc, false, mat4.create());
    gl.uniform3fv(locs.uColorLoc, [0.1, 0.1, 0.1]);

    renderObject(buffers.caseBuffer);

    // render keys
    for (let instr of keyRenderInstructions) {
        gl.uniformMatrix4fv(locs.uModelMatLoc, false, instr.transformation);
        let modelViewProjMat = mat4.multiply(mat4.create(), viewProjMat, instr.transformation);
        gl.uniformMatrix4fv(locs.uMVPMatLoc, false, modelViewProjMat);
        gl.uniform3fv(locs.uColorLoc, instr.keycapInfo.keycapColor);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, instr.keycapInfo.legendTexture);
        gl.uniform1f(locs.uLegendTextureLoc, 0);


        renderObject(buffers.keycapBuffers[instr.keycapIdentifier]);
    }
}

function setupShaders() {
    // define vertex shader in essl
    const vShaderSrc = `
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
            vVertexNormal = normalize(vec3(vWorldNormal4.x,vWorldNormal4.y,vWorldNormal4.z));
        }
    `;
    
    // define fragment shader in essl
    const fShaderSrc = `
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
            vec3 colorOut = ambient + diffuse + specular;
            gl_FragColor = vec4(colorOut, 1.0);
        }
    `;
    
    // compile vertex shader
    const vShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vShader, vShaderSrc);
    gl.compileShader(vShader);
    if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) {
        alert("Vertex shader compilation error: " + gl.getShaderInfoLog(vShader));
        gl.deleteShader(vShader);
        return;
    }

    // compile fragment shader
    const fShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fShader, fShaderSrc);
    gl.compileShader(fShader);
    if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) {
        alert("Fragment shader compilation error: " + gl.getShaderInfoLog(fShader));
        gl.deleteShader(fShader);
        return;
    }

    // create shader program and link
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vShader);
    gl.attachShader(shaderProgram, fShader);
    gl.linkProgram(shaderProgram);
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Shader program linking error: " + gl.getProgramInfoLog(shaderProgram));
        return;
    }

    gl.useProgram(shaderProgram);
    
    // locate and enable vertex attributes
    locs.aVertexPositionLoc = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(locs.aVertexPositionLoc);
    locs.aVertexNormalLoc = gl.getAttribLocation(shaderProgram, "aVertexNormal");
    gl.enableVertexAttribArray(locs.aVertexNormalLoc);

    // locate uniforms
    locs.uColorLoc = gl.getUniformLocation(shaderProgram, "uColor");
    locs.uEyePositionLoc = gl.getUniformLocation(shaderProgram, "uEyePosition");
    locs.uModelMatLoc = gl.getUniformLocation(shaderProgram, "uModelMatrix");
    locs.uMVPMatLoc = gl.getUniformLocation(shaderProgram, "uMVPMatrix");
}

// To-do list:
// different cases
// different profiles
// different textures

// Very low priority
// smooth scroll
// invert spacebar
// stepped caps
// use async await
// send flattened lists to loadGLBuffers
// only load keys necessary for this board
// remove row field from keyboardInfo and allow deduction of row in code
// store json files in DB
function main() {
    // get WebGL context
    let canvas = $("#webGLCanvas")[0];
    canvas.width = window.innerWidth;
    canvas.height = window.innerWidth / 2;
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
    $(document).on("mousedown", e => {
        prevDragPos = {x: e.pageX, y: e.pageY};

        // drag event handler; will be used for rotating view
        function drag(e) {
            console.log("moved");
            // find how much the mouse has moved since the last position
            let dx = e.pageX - prevDragPos.x;
            let dy = e.pageY - prevDragPos.y;
            if (dx != 0) {
                rotateView(-dx / 100, vec3.fromValues(0, 1, 0));
            }
            if (dy != 0) {
                // make it such that movement upwards is positive rotation
                let rotateAngle = dy / 100;
                // if this rotation will surpass lowest allowed viewing angle then clamp it
                const MIN_Y_ANG = 0.1;
                const MAX_Y_ANG = Math.PI / 2;
                let newAngle = Math.max(MIN_Y_ANG, Math.min(MAX_Y_ANG, eye.yAngle + rotateAngle));
                rotateView(newAngle - eye.yAngle, vec3.cross(vec3.create(), eye.lookUp, eye.lookAt));
                eye.yAngle = newAngle;
            }
            prevDragPos = {x: e.pageX, y: e.pageY};
            renderScene();
        }

        // enable drag event
        $(document).on("mousemove", drag);
        // disable drag event when mouse click released
        $(document).on("mouseup", () => $(document).off("mousemove", drag));
    });

    $(document).on("wheel", e => {
        let amtToMove = e.originalEvent.deltaY / 200;
        let dist = vec3.length(eye.position);
        // constrain the distance away from keyboard to [2, 10]
        const MIN_DIST = 8;
        const MAX_DIST = 20;
        let newDist = Math.max(MIN_DIST, Math.min(MAX_DIST, dist + amtToMove));
        eye.position = vec3.scale(vec3.create(), vec3.normalize(vec3.create(), eye.position), newDist);
        renderScene();
    })

    setupShaders();

    loadModels("tofu65", "cherry", "modern dolch light");
}