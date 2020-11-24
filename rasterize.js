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

let cherryProfileKey = (() => {
    return 0;
});
let keyRenderInstructions = [];

// TODO store in DB
let keyboardCaseInfo = {
    tofu65: {
        incline: 6,
        color: [0.1, 0.1, 0.1],
        keyGroups: [
            {
                rowNum: 1,
                offset: [0, 0],
                // TODO replace number with Key object (u, letter, isMod, etc)
                keys: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1]
            },
            {
                rowNum: 2,
                offset: [0, 1],
                keys: [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5, 1]
            },
            {
                rowNum: 3,
                offset: [0, 2],
                keys: [1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.25, 1]
            },
            {
                rowNum: 4,
                offset: [0, 3],
                keys: [2.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.75, 1, 1]
            },
            {
                rowNum: 4,
                offset: [0, 4],
                keys: [1.25, 1.25, 1.25, 6.25, 1, 1, 1, 1, 1, 1]
            },
        ]
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

            // diffuse term
            vec3 normal = normalize(vVertexNormal); 
            vec3 light = normalize(vec3(5.0, 10.0, 10.0) - vWorldPos);
            float lambert = max(0.0, dot(normal, light));
            vec3 diffuse = kDiffuse * lambert; // diffuse term
            
            // specular term
            vec3 eye = normalize(uEyePosition - vWorldPos);
            vec3 halfVec = normalize(light + eye);
            float highlight = pow(max(0.0, dot(normal, halfVec)), 3.0);
            vec3 specular = kSpecular * highlight; // specular term
            
            // combine to output color
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

function rotateView(ang, axis) {
    let rotationMat = mat4.fromRotation(mat4.create(), ang, axis);
    eye.position = vec3.transformMat4(vec3.create(), eye.position, rotationMat);
    eye.lookAt = vec3.transformMat4(vec3.create(), eye.lookAt, rotationMat);
    eye.lookUp = vec3.transformMat4(vec3.create(), eye.lookUp, rotationMat);
}

function setup() {
    // get WebGL context
    gl = $("#webGLCanvas")[0].getContext("webgl");
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
            render();
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
        render();
    })

    setupShaders();
}

function loadBlock(ll, w, h, d) {
    let llx = ll[0], lly = ll[1], llz = ll[2];

    //       7 --------  6
    //     /           / |
    //   3 --------- 2   |
    //   |           |   |
    //   |  (4)      |   5
    //   |           | /
    //   0 --------- 1
    const v0 = [llx, lly, llz];
    const v1 = [llx + w, lly, llz];
    const v2 = [llx + w, lly + h, llz];
    const v3 = [llx, lly + h, llz];

    const v4 = [llx, lly, llz + d];
    const v5 = [llx + w, lly, llz + d];
    const v6 = [llx + w, lly + h, llz + d];
    const v7 = [llx, lly + h, llz + d];

    const verts = [
        // front
        v0, v1, v2, v3,

        // back
        v4, v5, v6, v7,

        // right
        v1, v5, v6, v2,

        // top
        v3, v2, v6, v7,

        // left
        v0, v4, v7, v3,

        // bottom
        v0, v1, v5, v4
    ];

    const fn = [0, 0, -1]; // front face normal
    const bn = [0, 0, 1];  // back face normal
    const rn = [1, 0, 0];  // right face normal
    const un = [0, 1, 0];  // top face normal
    const ln = [-1, 0, 0]; // left face normal
    const dn = [0, -1, 0]; // bottom face normal

    const normals = [
        fn, fn, fn, fn,
        bn, bn, bn, bn,
        rn, rn, rn, rn,
        un, un, un, un,
        ln, ln, ln, ln,
        dn, dn, dn, dn
    ];
    
    const tris = [
        [0, 1, 2], [2, 3, 0], // front face
        [4, 5, 6], [6, 7, 4], // back face
        [8, 9, 10], [10, 11, 8], // right face
        [12, 13, 14], [14, 15, 12], // top face
        [16, 17, 18], [18, 19, 16], // left face
        [20, 21, 22], [22, 23, 20]  // bottom face
    ];
    

    return {
        vertices: verts,
        triangles: tris,
        normals: normals
    }
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

function loadKeycap(profile, units) {
    let httpReq = new XMLHttpRequest();
    httpReq.onreadystatechange = () => {
        if (this.readyState == XMLHttpRequest.DONE && this.status == 200) {
            let keycapInfo = JSON.parse(this.responseText);
            buffers.keycapBuffers
        }
    };
    httpReq.open("GET", "r1cherry1u.json", true);
    httpReq.send();
}

function loadKeycapSet(profile) {
    const k = loadBlock([0, 0, 0], 0.9, 0.5, 0.9);
    let sizes = {
        1: k,
        1.25: k,
        1.5: k,
        1.75: k,
        2: k,
        2.25: k,
        6.25: k
    };

    buffers.keycapBuffers = {};
    let offset = 0;
    for (let size in sizes) {
        let keycap = sizes[size];
        keycap.triangles = keycap.triangles.map(t => t.map(x => x + offset));

        buffers.keycapBuffers[size] = {};
        loadGLBuffers(buffers.keycapBuffers[size], keycap);

        // update offset for next triangle buffer to increase properly
        offset += keycap.vertices.length * 3;
    }
}

function loadCase(name) {
    const c = loadBlock([-2, 0, -2], 4, 0.25, 4);
    buffers.caseBuffer = {};
    loadGLBuffers(buffers.caseBuffer, c);
}

function loadModels() {
    loadKeycapSet("cherry");
    loadCase("tofu65");

    let kbdInfo = keyboardCaseInfo["tofu65"];

    // find total number of units horizontally and vertically
    let numUnitsX = kbdInfo.keyGroups.reduce((maxNum, g) => {
        let rightmostInGroup = g.keys.reduce((totalUnits, u) => totalUnits + u, g.offset[0]);
        return Math.max(maxNum, rightmostInGroup);
    }, 0);
    let numUnitsY = kbdInfo.keyGroups.reduce((maxNum, g) => Math.max(maxNum, g.offset[1]), 0) + 1;

    keyRenderInstructions = [];

    // define matrix used for rotating an object by the keyboard incline
    const inclineRotationMat = mat4.create();//mat4.fromRotation(mat4.create(), kbdInfo.incline * (Math.PI / 180), [1, 0, 0]);
    // define matrix used for translating upwards constand amount (to give keyboard a certain height)
    const HEIGHT = 0.5;
    const heightTranslationMat = mat4.fromTranslation(mat4.create(), vec3.fromValues(0, HEIGHT, 0));
    // define matrix for rotating an object and then moving it up to proper height
    const heightInclineMat = mat4.multiply(mat4.create(), heightTranslationMat, inclineRotationMat);

    // go through all keys and define matrixes for translating them to their world positions
    for (let g of kbdInfo.keyGroups) {
        // initialize position to beginning of row and increment after each key
        let posXZ = [g.offset[0] - numUnitsX / 2, 0, g.offset[1] - numUnitsY / 2];
        for (let key of g.keys) {
            posXZ[0] += key;
            let toPositionMat = mat4.fromTranslation(mat4.create(), posXZ);

            let finalTransformationMat = mat4.multiply(mat4.create(), heightInclineMat, toPositionMat);
            keyRenderInstructions.push({
                key: key,
                transformation: finalTransformationMat
            })
        }
    }
}

function renderObject(glObjectBuffer) {
    gl.bindBuffer(gl.ARRAY_BUFFER, glObjectBuffer.vertices);
    gl.vertexAttribPointer(locs.aVertexPositionLoc, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, glObjectBuffer.normals);
    gl.vertexAttribPointer(locs.aVertexNormalLoc, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, glObjectBuffer.triangles);
    gl.drawElements(gl.TRIANGLES, glObjectBuffer.numTriangles * 3, gl.UNSIGNED_SHORT, 0);
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const projMat = mat4.perspective(mat4.create(), Math.PI / 2, 1, 0.1, 1000);
    const viewMat = mat4.lookAt(mat4.create(), eye.position, vec3.add(vec3.create(), eye.position, eye.lookAt), eye.lookUp);
    const projViewMat = mat4.multiply(mat4.create(), projMat, viewMat);

    gl.uniform3f(locs.uEyePositionLoc, eye.position[0], eye.position[1], eye.position[2]);

    // render case
    gl.uniformMatrix4fv(locs.uPVMMatLoc, false, projViewMat);
    gl.uniformMatrix4fv(locs.uModelMatLoc, false, mat4.create());
    gl.uniform3fv(locs.uColorLoc, [0.3, 0.3, 0.3]);

    //renderObject(buffers.caseBuffer);

    // render keys
    for (let instr of keyRenderInstructions) {
        gl.uniformMatrix4fv(locs.uModelMatLoc, false, instr.transformation);
        let projViewModelMat = mat4.multiply(mat4.create(), projViewMat, instr.transformation);
        gl.uniformMatrix4fv(locs.uPVMMatLoc, false, projViewModelMat);

        renderObject(buffers.keycapBuffers[1]);
    }
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
function main() {
    setup();
    loadModels();
    render();
}