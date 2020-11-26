"use strict";

let gl = null;

let locs = {};
let buffers = {};
let keyLocations = null;
let keys = null;
let eye = {
    position: vec3.fromValues(0, 8, 8),
    lookAt: vec3.normalize(vec3.create(), vec3.fromValues(0, -1, -1)),
    lookUp: vec3.normalize(vec3.create(), vec3.fromValues(0, 1, -1)),
    yAngle: Math.PI / 4
}
let prevDragPos;
let keyRenderInstructions = [];
const NUM_UNITS = {
    "Space_6.25U": 6.25,
    "Space_6U": 6,
    "Space_7U": 7,
    "Numpad_Plus": 1,
    "Numpad_Enter": 1,
    1: 1,
    1.25: 1.25,
    1.5: 1.5,
    1.75: 1.75,
    2: 2,
    2.25: 2.25,
    2.75: 2.75
}

// TODO store in DB
class Key {
    constructor(kind, color, texture, legendColor) {
        this.kind = kind;
        this.color = color;
        this.texture = texture;
        this.legendColor = legendColor;
    }
}
let ab = new Key(1, [0.8, 0.8, 0.8], null);
let a = letter => Key(1, [0.8, 0.8, 0.8], "resources/legends/" + letter + ".png", [0, 0, 0]);
let mc = [0.5, 0.5, 0.5];
let m = {
    1: new Key(1, mc, null),
    1.25: new Key(1.25, mc, null),
    1.5: new Key(1.5, mc, null),
    1.75: new Key(1.75, mc, null),
    2: new Key(2, mc, null),
    2.25: new Key(2.25, mc, null),
}
let sp = new Key("Space_6.25U", [0.8, 0.8, 0.8], null);
let ent = new Key(2.25, [0.6, 1, 0.6], null);
let esc = new Key(1, [1, 0.6, 0.6], null);
let keyboadInfo = {
    tofu65: {
        incline: 6,
        color: [0.1, 0.1, 0.1],
        keyGroups: [
            {
                rowNum: 1,
                offset: [0, 0],
                // TODO replace number with Key object (u, letter, isMod, etc)
                keys: [esc, ab, ab, ab, ab, ab, ab, ab, ab, ab, ab, ab, ab, m[2], m[1]]
            },
            {
                rowNum: 2,
                offset: [0, 1],
                keys: [m[1.5], a("Q"), a("W"), a("E"), a("R"), a("T"), a("Y"), a("U"), a("I"), a("O"), a("P"), ab, ab, m[1.5], m[1]]
            },
            {
                rowNum: 3,
                offset: [0, 2],
                keys: [m[1.75], a("A"), a("S"), a("D"), a("F"), a("G"), a("H"), a("J"), a("K"), a("L"), ab, ab, ent, m[1]]
            },
            {
                rowNum: 4,
                offset: [0, 3],
                keys: [m[2.25], a("Z"), a("X"), a("C"), a("V"), a("B"), a("N"), a("M"), ab, ab, ab, m[1.75], m[1], m[1]]
            },
            {
                rowNum: 4,
                offset: [0, 4],
                keys: [m[1.25], m[1.25], m[1.25], sp, m[1], m[1], m[1], m[1], m[1], m[1]]
            },
        ]
    }
}
// let keyboadInfo = {
//     tofu65: {
//         incline: 6,
//         color: [0.1, 0.1, 0.1],
//         keyGroups: [
//             {
//                 rowNum: 1,
//                 offset: [0, 0],
//                 // TODO replace number with Key object (u, letter, isMod, etc)
//                 keys: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1]
//             },
//             {
//                 rowNum: 2,
//                 offset: [0, 1],
//                 keys: [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5, 1]
//             },
//             {
//                 rowNum: 3,
//                 offset: [0, 2],
//                 keys: [1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.25, 1]
//             },
//             {
//                 rowNum: 4,
//                 offset: [0, 3],
//                 keys: [2.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.75, 1, 1]
//             },
//             {
//                 rowNum: 4,
//                 offset: [0, 4],
//                 keys: [1.25, 1.25, 1.25, 6.25, 1, 1, 1, 1, 1, 1]
//             },
//         ]
//     }
// }



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

function setupRenderInstructions(kbdInfo) {
    // find total number of units horizontally and vertically
    let numUnitsX = kbdInfo.keyGroups.reduce((maxNum, g) => {
        let rightmostInGroup = g.keys.reduce((totalUnits, k) => totalUnits + NUM_UNITS[k.kind], g.offset[0]);
        return Math.max(maxNum, rightmostInGroup);
    }, 0);
    let numUnitsY = kbdInfo.keyGroups.reduce((maxNum, g) => Math.max(maxNum, g.offset[1]), 0) + 1;

    keyRenderInstructions = [];

    // define matrix used for rotating an object by the keyboard incline
    const inclineRotationMat = mat4.fromRotation(mat4.create(), kbdInfo.incline * (Math.PI / 180), [1, 0, 0]);
    // define matrix used for translating upwards constand amount (to give keyboard a certain height)
    const HEIGHT = 1.2;
    const heightTranslationMat = mat4.fromTranslation(mat4.create(), vec3.fromValues(0, HEIGHT, 0));
    // define matrix for rotating an object and then moving it up to proper height
    const heightInclineMat = mat4.multiply(mat4.create(), heightTranslationMat, inclineRotationMat);

    // go through all keys and define matrixes for translating them to their world positions
    for (let g of kbdInfo.keyGroups) {
        // initialize position to beginning of row and increment after each key
        let posXZ = [g.offset[0] - numUnitsX / 2, 0, g.offset[1] - numUnitsY / 2 + 0.5];
        for (let key of g.keys) {
            let keysize = NUM_UNITS[key.kind];
            
            // move key to middle of area dedicated for them
            posXZ[0] += keysize / 2;
            let toPositionMat = mat4.fromTranslation(mat4.create(), posXZ);
            posXZ[0] += keysize / 2;

            let finalTransformationMat = mat4.multiply(mat4.create(), heightInclineMat, toPositionMat);
            keyRenderInstructions.push({
                key,
                row: typeof(key.kind) == "string" ? "special" : g.rowNum,
                transformation: finalTransformationMat
            })
        }
    }
}

function loadModels(keycapProfile, kbd) {
    let kbdInfo = keyboadInfo[kbd];
    setupRenderInstructions(kbdInfo);
    let keycapsNeeded = new Set();
    // let allKeys = kbdInfo.keyGroups.forEach(kg => {
    //     kg.keys.forEach(k => {
    //         let identifier = typeof(k.kind) == "string" ? k.kind : `R${kg.row}_${k.kind}U`;
    //         keycapsNeeded.add(identifier);
    //     })
    // })

    buffers.keycapBuffers = { 1: {}, 2: {}, 3: {}, 4: {}, "special": {} };
    buffers.caseBuffer = {};

    // list of promises to load each model (keycaps and keyboard case)
    let modelLoadPromises = [];

    // load case
    modelLoadPromises.push(fetch(`resources/Case_${kbd}.json`)
        .then(response => response.json())
        .then(trianglesInfo => loadGLBuffers(buffers.caseBuffer, trianglesInfo)));

    // load all 'standard' keycaps
    for (let row of [1, 2, 3, 4]) {
        for (let units of [1, 1.25, 1.5, 1.75, 2, 2.25, 2.75]) {
            modelLoadPromises.push(fetch(`resources/${keycapProfile}_R${row}_${units}U.json`)
                .then(response => response.json())
                .then(keycapModel => {
                    buffers.keycapBuffers[row][units] = {};
                    loadGLBuffers(buffers.keycapBuffers[row][units], keycapModel);
                }));
        }
    }

    // load special keycaps
    for (let additional of ["Numpad_Plus", "Numpad_Enter", "Space_6U", "Space_6.25U", "Space_7U"]) {
        modelLoadPromises.push(fetch(`resources/${keycapProfile}_${additional}.json`)
            .then(response => response.json())
            .then(keycapModel => {
                buffers.keycapBuffers["special"][additional] = {};
                loadGLBuffers(buffers.keycapBuffers["special"][additional], keycapModel);
            }));
    }

    // render once all loaded
    Promise.all(modelLoadPromises)
        .then(() => renderScene())
        .catch(err => alert("Error loading resource files: " + err))
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
    const projViewMat = mat4.multiply(mat4.create(), projMat, viewMat);

    gl.uniform3f(locs.uEyePositionLoc, eye.position[0], eye.position[1], eye.position[2]);

    // render case
    gl.uniformMatrix4fv(locs.uPVMMatLoc, false, projViewMat);
    gl.uniformMatrix4fv(locs.uModelMatLoc, false, mat4.create());
    gl.uniform3fv(locs.uColorLoc, [0.1, 0.1, 0.1]);

    renderObject(buffers.caseBuffer);

    // render keys
    for (let instr of keyRenderInstructions) {
        gl.uniformMatrix4fv(locs.uModelMatLoc, false, instr.transformation);
        let projViewModelMat = mat4.multiply(mat4.create(), projViewMat, instr.transformation);
        gl.uniformMatrix4fv(locs.uPVMMatLoc, false, projViewModelMat);
        gl.uniform3fv(locs.uColorLoc, instr.key.color);

        renderObject(buffers.keycapBuffers[instr.row][instr.key.kind]);
    }
}

function setupShaders() {
    // define vertex shader in essl
    const vShaderSrc = `
        attribute vec3 aVertexPosition; // vertex position
        attribute vec3 aVertexNormal; // vertex normal
        
        uniform mat4 uModelMatrix; // model matrix
        uniform mat4 uPVMMatrix; // projection-view-model matrix
        
        varying vec3 vWorldPos; // interpolated world position of vertex
        varying vec3 vVertexNormal; // interpolated normal for frag shader

        void main(void) {
            
            // vertex position
            vec4 vWorldPos4 = uModelMatrix * vec4(aVertexPosition, 1.0);
            vWorldPos = vec3(vWorldPos4.x,vWorldPos4.y,vWorldPos4.z);
            gl_Position = uPVMMatrix * vec4(aVertexPosition, 1.0);

            // vertex normal (assume no non-uniform scale)
            vec4 vWorldNormal4 = uModelMatrix * vec4(aVertexNormal, 0.0);
            vVertexNormal = normalize(vec3(vWorldNormal4.x,vWorldNormal4.y,vWorldNormal4.z));
        }
    `;
    
    // define fragment shader in essl
    const fShaderSrc = `
        precision mediump float; // set float to medium precision

        // eye location
        uniform vec3 uEyePosition; // the eye's position in world

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
    locs.uPVMMatLoc = gl.getUniformLocation(shaderProgram, "uPVMMatrix");
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

    loadModels("Cherry", "tofu65");
}