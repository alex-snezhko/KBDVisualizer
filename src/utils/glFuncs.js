import { mat4, vec3 } from "gl-matrix";

export function rotateView(ang, axis, eye) {
    const rotationMat = mat4.fromRotation(mat4.create(), ang, axis);
    eye.position = vec3.transformMat4(vec3.create(), eye.position, rotationMat);
    eye.lookAt = vec3.transformMat4(vec3.create(), eye.lookAt, rotationMat);
    eye.lookUp = vec3.transformMat4(vec3.create(), eye.lookUp, rotationMat);
}

export function loadGLBuffers(gl, glObjectBuffers, object, isTextured) {
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

export function loadTexture(gl, url) {
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

export function renderSelection(gl, eye, progsInfo, keyRenderInstructions) {
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

export function renderScene(gl, eye, progsInfo, keyRenderInstructions) {
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

function renderObject(gl, progInfo, buffers, uniformVals) {
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

export function setupShaders(gl, progsInfo) {
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
