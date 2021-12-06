import { mat4, vec3 } from "gl-matrix";
import { Eye, WebGLBufferInfo, ObjectModel, WebGLProgramInfo, WebGLProgramsInfo, AttribInfo } from "../types";

export function rotateView(eye: Eye, ang: number, axis: vec3) {
    const rotationMat = mat4.fromRotation(mat4.create(), ang, axis);
    eye.position = vec3.transformMat4(vec3.create(), eye.position, rotationMat);
    eye.lookAt = vec3.transformMat4(vec3.create(), eye.lookAt, rotationMat);
    eye.lookUp = vec3.transformMat4(vec3.create(), eye.lookUp, rotationMat);
}

export function loadGLBuffers(gl: WebGLRenderingContext, glBuffers: Record<string, WebGLBufferInfo>, bufferName: string, model: ObjectModel, isTextured: boolean) {
    const vertices = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.vertices.flat()), gl.STATIC_DRAW);

    const normals = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, normals);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.normals.flat()), gl.STATIC_DRAW);

    let uvs;
    if (isTextured) {
        uvs = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, uvs);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.uvs.flat()), gl.STATIC_DRAW);
    }

    const triangles = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangles);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(model.triangles.flat()), gl.STATIC_DRAW);

    const numTriangles = model.triangles.length;

    glBuffers[bufferName] = { vertices, normals, uvs, triangles, numTriangles};
}

export function loadTexture(gl: WebGLRenderingContext, imgPath: string) {
    const texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA,
        gl.UNSIGNED_BYTE, new Uint8Array([0, 255, 255, 0]));

    const loadTexturePromise = new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

            const isPowerOf2 = (x: number) => (x & (x - 1)) === 0;
            if (isPowerOf2(img.width) && isPowerOf2(img.height)) {
                gl.generateMipmap(gl.TEXTURE_2D);
            } else {
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            }

            resolve(img);
        };
        img.onerror = () => {
            console.error(`Unable to fetch image ${imgPath}`);
            resolve(img);
        };
        import(`@assets/${imgPath}`)
            .then(({ default: src }) => img.src = src);
    });

    return { loadTexturePromise, texture };
}

export function renderObject(gl: WebGLRenderingContext, progInfo: WebGLProgramInfo, buffers: WebGLBufferInfo, uniformSetters: (() => void)[]) {
    gl.useProgram(progInfo.program);

    for (const attribName in progInfo.attribsInfo) {
        const attrib = progInfo.attribsInfo[attribName];
        gl.enableVertexAttribArray(attrib.loc);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers[attrib.bufferName]!);
        gl.vertexAttribPointer(attrib.loc, ...attrib.vapParams);
    }

    uniformSetters.forEach(setUniform => setUniform());

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.triangles);
    gl.drawElements(gl.TRIANGLES, buffers.numTriangles * 3, gl.UNSIGNED_SHORT, 0);

    for (const attribName in progInfo.attribsInfo) {
        gl.disableVertexAttribArray(progInfo.attribsInfo[attribName].loc);
    }
}

export function setupShaders(gl: WebGLRenderingContext): WebGLProgramsInfo | undefined {
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
    const vShaderUntextured = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vShaderUntextured, vShaderUntexturedSrc);
    const fShaderUntextured = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fShaderUntextured, fShaderUntexturedSrc);

    const vShaderTextured = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vShaderTextured, vShaderTexturedSrc);
    const fShaderTextured = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fShaderTextured, fShaderTexturedSrc);

    const vShaderSelection = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vShaderSelection, vShaderSelectionSrc);
    const fShaderSelection = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fShaderSelection, fShaderSelectionSrc);

    for (const shader of [
        vShaderUntextured, fShaderUntextured,
        vShaderTextured, fShaderTextured,
        vShaderSelection, fShaderSelection
    ]) {
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            alert("WebGL shader compilation error: " + gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return;
        }
    }

    // create shader program and link
    const untexturedProgram = gl.createProgram()!;
    gl.attachShader(untexturedProgram, vShaderUntextured);
    gl.attachShader(untexturedProgram, fShaderUntextured);

    const texturedProgram = gl.createProgram()!;
    gl.attachShader(texturedProgram, vShaderTextured);
    gl.attachShader(texturedProgram, fShaderTextured);

    const selectionProgram = gl.createProgram()!;
    gl.attachShader(selectionProgram, vShaderSelection);
    gl.attachShader(selectionProgram, fShaderSelection);

    for (const program of [untexturedProgram, texturedProgram, selectionProgram]) {
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            alert("WebGL shader program linking error: " + gl.getProgramInfoLog(program));
            return;
        }
    }

    function assignLocations(program: WebGLProgram, attribs: Record<string, Omit<AttribInfo, "loc">>, uniforms: string[]) {
        const attribsInfo: Record<string, AttribInfo> = {};
        for (const attribName in attribs) {
            const attribInfo = attribs[attribName];
            attribsInfo[attribName] = {
                loc: gl.getAttribLocation(program, attribName),
                ...attribInfo
            };
        }

        const uniformLocs: Record<string, WebGLUniformLocation> = {};
        for (const uniformName of uniforms) {
            uniformLocs[uniformName] = gl.getUniformLocation(program, uniformName)!;
        }

        return { attribsInfo, uniformLocs };
    }

    // vapParams: the parameters that will be passed into gl.vertexAttribPointer when buffer binding
    const V_INFO: Omit<AttribInfo, "loc"> = { bufferName: "vertices", vapParams: [3, gl.FLOAT, false, 0, 0] };
    const N_INFO: Omit<AttribInfo, "loc"> = { bufferName: "normals", vapParams: [3, gl.FLOAT, false, 0, 0] };
    const UV_INFO: Omit<AttribInfo, "loc"> = { bufferName: "uvs", vapParams: [2, gl.FLOAT, false, 0, 0] };

    const untextured: WebGLProgramInfo = {
        program: untexturedProgram,
        buffers: {},
        ...assignLocations(
            untexturedProgram,
            { aVertexPosition: V_INFO, aVertexNormal: N_INFO },
            ["uColor", "uEyePosition", "uModelMat", "uMVPMat"]
        )
    };

    const textured: WebGLProgramInfo = {
        program: texturedProgram,
        buffers: {},
        ...assignLocations(
            texturedProgram,
            { aVertexPosition: V_INFO, aVertexNormal: N_INFO, aVertexUV: UV_INFO },
            ["uColor", "uEyePosition", "uModelMat", "uMVPMat", "uTexture", "uTextureColor", "uIsBlinking", "uBlinkProportion"]
        )
    };

    const selection: WebGLProgramInfo = {
        program: selectionProgram,
        buffers: {},
        ...assignLocations(
            selectionProgram,
            { aVertexPosition: V_INFO },
            ["uModelMat", "uMVPMat", "uObjectId"]
        )
    };

    return { untextured, textured, selection };
}
