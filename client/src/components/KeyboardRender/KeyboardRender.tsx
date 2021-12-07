import React from "react";
import { mat4, vec3 } from "gl-matrix";

import { fetchCaseModel, fetchKeycapModel, fetchSwitchModel, fetchStabilizerModel, fetchKeyboardInfo, fetchKeycapsInfo } from "../../apiInteraction";
import { renderObject, loadTexture, loadGLBuffers, setupShaders, rotateView } from "../../utils/glFuncs";
import { ACCENTS, ALPHAS, SPECIAL_KEYCAP_IDENTIFIERS, SPECIAL_NUM_UNITS } from "../../utils/keyboardComponents";

import "./KeyboardRender.scss";
import { Eye, KeyboardInfo, KeycapColor, KeycapsInfo, KeyRenderInstruction, WebGLProgramsInfo, ValidSelectedItems, Color } from "../../types";

function toColor(hex: string): Color {
    const num = (h: string) => Number("0x" + h) / 255;
    const r = num(hex.slice(1, 3));
    const g = num(hex.slice(3, 5));
    const b = num(hex.slice(5));
    return [r, g, b];
} 

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

interface KeysInSet {
    alphasInSet: Set<string>;
    modsInSet: Set<string>;
    accentsInSet: Set<string>;
}

interface KbdRenderData {
    eye: Eye;
    keyboardInfo: KeyboardInfo;
    keycapsInfo: KeycapsInfo;
    progsInfo: WebGLProgramsInfo;

    keysInSet: KeysInSet;

    keyRenderInstructions: KeyRenderInstruction[];
    // colors of keycaps from set, to be reverted to upon cancel of customization
    originalKeycapColors: KeycapColor[];
    keyNameToKeyObj: Record<string, KeyRenderInstruction>;
    objectIdToKey: Record<number, KeyRenderInstruction>;
    tick: number | null;
}

interface KeyboardRenderState {
    blinkProportion: number;
    increasing: boolean;
    highlightKeys: boolean;
    fullCustom: boolean;
    selectedKeycapColor: string;
    selectedLegendColor: string;
}

interface KeyboardRenderProps {
    selectedItems: ValidSelectedItems
}

export class KeyboardRender extends React.Component<KeyboardRenderProps, KeyboardRenderState> {
    gl!: WebGLRenderingContext;
    kbdRenderData!: KbdRenderData;
    webGlCanvas: React.RefObject<HTMLCanvasElement> = React.createRef();
    keyboardRenderContainer: React.RefObject<HTMLDivElement> = React.createRef();

    constructor(props: KeyboardRenderProps) {
        super(props);

        this.state = {
            blinkProportion: 0,
            increasing: false,

            highlightKeys: false,
            fullCustom: false,
            selectedKeycapColor: "#000000",
            selectedLegendColor: "#ffffff"
        };

        this.handleCanvasClick = this.handleCanvasClick.bind(this);
        this.handleCanvasMouseMove = this.handleCanvasMouseMove.bind(this);
        this.handleCanvasWheel = this.handleCanvasWheel.bind(this);
        this.handleResizeCanvas = this.handleResizeCanvas.bind(this);
        this.handleToggleHighlight = this.handleToggleHighlight.bind(this);
        this.handleCustomizeKeycaps = this.handleCustomizeKeycaps.bind(this);
        this.handleResetKeycaps = this.handleResetKeycaps.bind(this);
    }

    getKeycapColorOptions(key: string, keycapsInfo: KeycapsInfo, keysInSet: KeysInSet) {
        const { alphasInSet, modsInSet, accentsInSet } = keysInSet;

        // keep a list of all possible color options available for this keycap
        const colorOptions = [];
    
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

    renderSelection() {
        const { gl, kbdRenderData: { eye, progsInfo } } = this;
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
        const projMat = mat4.perspective(mat4.create(), Math.PI / 9, 2, 0.1, 1000);
        const viewMat = mat4.lookAt(mat4.create(), eye.position, vec3.add(vec3.create(), eye.position, eye.lookAt), eye.lookUp);
        const viewProjMat = mat4.multiply(mat4.create(), projMat, viewMat);
    
        const uniformLoc = (name: string) => progsInfo.selection.uniformLocs[name];
        renderObject(gl, progsInfo.selection, progsInfo.untextured.buffers["case"], [
            () => gl.uniformMatrix4fv(uniformLoc("uMVPMat"), false, viewProjMat),
            () => gl.uniformMatrix4fv(uniformLoc("uModelMat"), false, mat4.create()),
            () => gl.uniform1i(uniformLoc("uObjectId"), 0)
        ]);
    
        // render keys
        for (const { transformation, objectId, modelIdentifier } of this.kbdRenderData.keyRenderInstructions) {
            const modelViewProjMat = mat4.multiply(mat4.create(), viewProjMat, transformation);
    
            renderObject(gl, progsInfo.selection, progsInfo.untextured.buffers["switch"], [
                () => gl.uniformMatrix4fv(uniformLoc("uMVPMat"), false, modelViewProjMat),
                () => gl.uniformMatrix4fv(uniformLoc("uModelMat"), false, transformation),
                () => gl.uniform1i(uniformLoc("uObjectId"), 0)
            ]);
    
            renderObject(gl, progsInfo.selection, progsInfo.textured.buffers[modelIdentifier], [
                () => gl.uniformMatrix4fv(uniformLoc("uMVPMat"), false, modelViewProjMat),
                () => gl.uniformMatrix4fv(uniformLoc("uModelMat"), false, transformation),
                () => gl.uniform1i(uniformLoc("uObjectId"), objectId)
            ]);
        }
    }

    renderScene() {
        const { gl, kbdRenderData: { eye, progsInfo, keyRenderInstructions } } = this;

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
        const projMat = mat4.perspective(mat4.create(), Math.PI / 9, 2, 0.1, 1000);
        const viewMat = mat4.lookAt(mat4.create(), eye.position, vec3.add(vec3.create(), eye.position, eye.lookAt), eye.lookUp);
        const viewProjMat = mat4.multiply(mat4.create(), projMat, viewMat);

        const utUniformLoc = (name: string) => progsInfo.untextured.uniformLocs[name];
        renderObject(gl, progsInfo.untextured, progsInfo.untextured.buffers["case"], [
            () => gl.uniform3f(utUniformLoc("uEyePosition"), eye.position[0], eye.position[1], eye.position[2]),
            () => gl.uniformMatrix4fv(utUniformLoc("uMVPMat"), false, viewProjMat),
            () => gl.uniformMatrix4fv(utUniformLoc("uModelMat"), false, mat4.create()),
            () => gl.uniform3f(utUniformLoc("uColor"), 0.1, 0.1, 0.1)
        ]);
    
        // render keys
        for (const instr of keyRenderInstructions) {
            const modelViewProjMat = mat4.multiply(mat4.create(), viewProjMat, instr.transformation);

            const STAB_OFFSETS: Record<number, number> = {
                2: 0.65,
                2.25: 0.65,
                2.75: 0.65,
                6: 2.5,
                6.25: 2.5,
                7: 2.5
            };

            const stabOffset = STAB_OFFSETS[instr.keysize];
            if (stabOffset) {
                const colorArr = this.props.selectedItems["Stabilizers"]["color_arr"] as Color;
                const color = colorArr.slice(0, 3);
                const renderStab = (offset: vec3) => {
                    const offsetMat = mat4.fromTranslation(mat4.create(), offset);
                    const transformation = mat4.multiply(mat4.create(), offsetMat, instr.transformation);
                    renderObject(gl, progsInfo.untextured, progsInfo.untextured.buffers["stabilizer"], [
                        () => gl.uniform3f(utUniformLoc("uEyePosition"), eye.position[0], eye.position[1], eye.position[2]),
                        () => gl.uniformMatrix4fv(utUniformLoc("uMVPMat"), false, mat4.multiply(mat4.create(), viewProjMat, transformation)),
                        () => gl.uniformMatrix4fv(utUniformLoc("uModelMat"), false, transformation),
                        () => gl.uniform3fv(utUniformLoc("uColor"), color)
                    ]);
                };

                renderStab([stabOffset, 0, 0]);
                renderStab([-stabOffset, 0, 0]);
            }
    
            // render keyswitch
            const colorArr = this.props.selectedItems["Switches"]["color_arr"] as Color;
            const color = colorArr.slice(0, 3);
            renderObject(gl, progsInfo.untextured, progsInfo.untextured.buffers["switch"], [
                () => gl.uniform3f(utUniformLoc("uEyePosition"), eye.position[0], eye.position[1], eye.position[2]),
                () => gl.uniformMatrix4fv(utUniformLoc("uMVPMat"), false, modelViewProjMat),
                () => gl.uniformMatrix4fv(utUniformLoc("uModelMat"), false, instr.transformation),
                () => gl.uniform3fv(utUniformLoc("uColor"), color)
            ]);
    
            // render keycap
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, instr.legendTexture);
    
            const tUniformLoc = (name: string) => progsInfo.textured.uniformLocs[name];
            renderObject(gl, progsInfo.textured, progsInfo.textured.buffers[instr.modelIdentifier], [
                () => gl.uniform3f(tUniformLoc("uEyePosition"), eye.position[0], eye.position[1], eye.position[2]),
                () => gl.uniformMatrix4fv(tUniformLoc("uMVPMat"), false, modelViewProjMat),
                () => gl.uniformMatrix4fv(tUniformLoc("uModelMat"), false, instr.transformation),
                () => gl.uniform3fv(tUniformLoc("uColor"), instr.keycapColor),
                () => gl.uniform1i(tUniformLoc("uTexture"), 0),
                () => gl.uniform3fv(tUniformLoc("uTextureColor"), instr.legendColor),
                () => gl.uniform1i(tUniformLoc("uIsBlinking"), Number(!this.state.fullCustom && this.state.highlightKeys && instr.colorOptions.length > 1)),
                () => gl.uniform1f(tUniformLoc("uBlinkProportion"), this.state.blinkProportion)
            ]);
        }
    
        // TODO maybe refactor this to first drawing all textured items and then untextured
    }

    handleCanvasMouseMove(event: React.MouseEvent<HTMLCanvasElement>) {
        const { eye } = this.kbdRenderData;

        if (event.buttons !== 0) {
            // find how much the mouse has moved since the last position
            const dx = event.movementX;
            const dy = event.movementY;
            if (dx !== 0) {
                rotateView(eye, -dx / 100, vec3.fromValues(0, 1, 0));
            }
            if (dy !== 0) {
                // make it such that movement upwards is positive rotation
                const rotateAngle = dy / 100;
                // if this rotation will surpass lowest allowed viewing angle then clamp it
                const MIN_Y_ANG = 0.1;
                const MAX_Y_ANG = Math.PI / 2;
                const newAngle = Math.max(MIN_Y_ANG, Math.min(MAX_Y_ANG, eye.yAngle + rotateAngle));
                rotateView(eye, newAngle - eye.yAngle, vec3.cross(vec3.create(), eye.lookUp, eye.lookAt));
                eye.yAngle = newAngle;
            }
            // TODO try replacing with forceUpdate
            this.renderScene();
        }
    }

    handleCanvasWheel(event: WheelEvent) {
        const { eye } = this.kbdRenderData;
        event.preventDefault();

        const amtToMove = event.deltaY / 100;
        const dist = vec3.length(eye.position);
        // constrain the distance away from keyboard to [2, 10]
        const MIN_DIST = 14;
        const MAX_DIST = 50;
        const newDist = Math.max(MIN_DIST, Math.min(MAX_DIST, dist + amtToMove));
        eye.position = vec3.scale(vec3.create(), vec3.normalize(vec3.create(), eye.position), newDist);
        // this.renderScene();
        this.forceUpdate();
    }

    handleCanvasClick(event: React.MouseEvent<HTMLCanvasElement>) {
        const { gl } = this;
        // TODO undo if broken
        if (event.movementX === 0 && event.movementY === 0) {
        // if (event.clientX === this.beginClick.x && event.clientY === this.beginClick.y) {
            const { left, top, height } = event.currentTarget.getBoundingClientRect();

            const x = event.clientX - left;
            const y = height - (event.clientY - top);

            this.renderSelection();

            const pixelClicked = new Uint8Array(4);
            gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixelClicked);

            const objectWasClicked = pixelClicked[3] === 0;
            const objectId = pixelClicked[0];
            if (objectWasClicked && objectId !== 0) {
                const key = this.kbdRenderData.objectIdToKey[objectId];

                if (this.state.fullCustom) {
                    key.keycapColor = toColor(this.state.selectedKeycapColor);
                    key.legendColor = toColor(this.state.selectedLegendColor);
                } else {
                    key.optionSelected = (key.optionSelected + 1) % key.colorOptions.length;

                    key.keycapColor = key.colorOptions[key.optionSelected].keycapColor;
                    key.legendColor = key.colorOptions[key.optionSelected].legendColor;
                }
            }

            // TODO try this.forceUpdate instead
            this.renderScene();
        }
    }

    handleResizeCanvas() {
        const container = this.keyboardRenderContainer.current!;
        const w = container.offsetWidth;

        const canvas = this.webGlCanvas.current!;

        if (canvas.width !== w) {
            canvas.width = w;
            const h = Math.floor(w / 2);
            canvas.height = h;

            this.gl.viewport(0, 0, w, h);
        }
    }

    handleToggleHighlight() {
        if (this.kbdRenderData.tick !== null) {
            clearInterval(this.kbdRenderData.tick);
            this.setState({ increasing: false, blinkProportion: 0 });
            this.kbdRenderData.tick = null;
        } else {
            this.kbdRenderData.tick = window.setInterval(() => {
                if (this.state.highlightKeys) {
                    this.setState(currState => {
                        let { increasing, blinkProportion } = currState;
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

                        return { increasing, blinkProportion };
                    });
                }
            }, 20);
        }

        this.setState(currState => ({ highlightKeys: !currState.highlightKeys }));
        // this.renderScene();
    }

    handleColorMultiple(which: "alphas" | "mods" | "accents") {
        const { alphasInSet, modsInSet, accentsInSet } = this.kbdRenderData.keysInSet;
        const keys = { "alphas": alphasInSet, "mods": modsInSet, "accents": accentsInSet }[which];
        for (const keyName of keys) {
            const keyObj = this.kbdRenderData.keyNameToKeyObj[keyName];
            keyObj.keycapColor = toColor(this.state.selectedKeycapColor);
            keyObj.legendColor = toColor(this.state.selectedLegendColor);
        }

        this.renderScene();
    }

    handleCustomizeKeycaps() {
        this.setState({ highlightKeys: false, fullCustom: true });
    }

    handleResetKeycaps() {
        const { keyRenderInstructions, originalKeycapColors } = this.kbdRenderData;
        for (const i in keyRenderInstructions) {
            keyRenderInstructions[i].keycapColor = originalKeycapColors[i].keycapColor;
            keyRenderInstructions[i].legendColor = originalKeycapColors[i].legendColor;
        }
        
        this.setState({ fullCustom: false });
    }

    async loadKeyboard(keycapProfile: string, progsInfo: WebGLProgramsInfo, keyboardInfo: KeyboardInfo, keycapsInfo: KeycapsInfo) {
        const { gl } = this;

        const keyRenderInstructions: KeyRenderInstruction[] = [];
        const keysInSet = { alphasInSet: new Set<string>(), modsInSet: new Set<string>(), accentsInSet: new Set<string>() };
        const keyNameToKeyObj: Record<string, KeyRenderInstruction> = {};
        const objectIdToKey: Record<number, KeyRenderInstruction> = {};
        // ---------------------------------------------------------------------------
        // prepare all necessary information for setting up key rendering instructions
        // ---------------------------------------------------------------------------
        // list of promises to load each model (keycaps and keyboard case)
        const resourceLoadPromises = [];
        const keycapModelsVisited = new Set();
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
            const posXZ = [kg.offset[0] - numUnitsX / 2, 0, kg.offset[1] - numUnitsY / 2 + 0.5];
            for (const key of kg.keys) {
                // if this key is not special (non-1u), then it must be 1 unit wide
                const keysize = SPECIAL_NUM_UNITS[key] || 1;
                const keysizeStr = keysize.toString().replace(".", "_");
                const modelIdentifier = SPECIAL_KEYCAP_IDENTIFIERS.has(key) ? key : `R${kg.row}_${keysizeStr}U`;
    
                // if a keycap with these dimensions has not been loaded yet, then load it
                if (!keycapModelsVisited.has(modelIdentifier)) {
                    const bufs = progsInfo.textured.buffers;
                    resourceLoadPromises.push(
                        fetchKeycapModel(keycapProfile, modelIdentifier)
                            .then(keycapModel => loadGLBuffers(gl, bufs, modelIdentifier, keycapModel, true)));
                    keycapModelsVisited.add(modelIdentifier);
                }
    
                // move keycap to middle of keycap area
                const toPosMat = mat4.fromTranslation(mat4.create(), [posXZ[0] + keysize / 2, 0, posXZ[2]]);
                const finalTransformationMat = mat4.multiply(mat4.create(), heightInclineMat, toPosMat);
    
                // load legend texture
                const { loadTexturePromise, texture } = loadTexture(gl, "legends/" + key + ".png");
                resourceLoadPromises.push(loadTexturePromise);

                // find an appropriate object id for this key
                const objectId = Object.keys(objectIdToKey).length + 1;
    
                // construct an object to represent all relevant information of a keycap for rendering
                const keycapObj: KeyRenderInstruction = {
                    modelIdentifier,
                    keysize,
                    transformation: finalTransformationMat,
                    legendTexture: texture,
                    objectId,
                    ...this.getKeycapColorOptions(key, keycapsInfo, keysInSet),
                };
    
                objectIdToKey[objectId] = keycapObj;
                keyNameToKeyObj[key] = keycapObj;
    
                keyRenderInstructions.push(keycapObj);
                posXZ[0] += keysize;
            }
        }
        const untexBufs = progsInfo.untextured.buffers;
    
        // load case
        resourceLoadPromises.push(
            fetchCaseModel("tofu65")
                .then(trianglesInfo => loadGLBuffers(gl, untexBufs, "case", trianglesInfo, false)));
    
        // load switches
        resourceLoadPromises.push(
            fetchSwitchModel()
                .then(switchModel => loadGLBuffers(gl, untexBufs, "switch", switchModel, false)));
    
        // load switches
        resourceLoadPromises.push(
            fetchStabilizerModel()
                .then(stabilizerModel => loadGLBuffers(gl, untexBufs, "stabilizer", stabilizerModel, false)));
    
        try {
            await Promise.all(resourceLoadPromises);
        } catch (err) {
            console.error(`Error fetching some or all resources requested: ${err}`);
        }

        return { keyRenderInstructions, keysInSet, keyNameToKeyObj, objectIdToKey };
    }

    async componentDidMount() {
        const canvas = this.webGlCanvas.current!;
        const gl = canvas.getContext("webgl")!;
        this.gl = gl;
        if (gl === null) {
            alert("Error in fetching GL context. Please ensure that your browser supports WebGL.");
            return;
        }

        // gl.viewport(0, 0, canvas.width, canvas.height);

        // enable gl attributes: use z-buffering, make background black
        const [r, g, b] = toColor("#fcfcf8");
        gl.clearColor(r, g, b, 1.0);
        gl.clearDepth(1.0);
        // gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        // gl.enable(gl.BLEND);
        // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.enable(gl.DEPTH_TEST);

        const progsInfo = setupShaders(gl)!;

        let keyboardInfo: KeyboardInfo;
        try {
            keyboardInfo = await fetchKeyboardInfo(this.props.selectedItems["Case"].name);
        } catch (e) {
            keyboardInfo = await fetchKeyboardInfo("Tofu 65% Aluminum");
            alert("The model for the keyboard case selected has not yet been created. Defaulting to Tofu 65% model");
        }
        const keycapsInfo = await fetchKeycapsInfo(this.props.selectedItems["Keycaps"].name);

        const { keyRenderInstructions, ...rest } = await this.loadKeyboard("cherry", progsInfo, keyboardInfo, keycapsInfo);

        const eye = {
            position: vec3.fromValues(0, 30, 30),
            lookAt: vec3.normalize(vec3.create(), vec3.fromValues(0, -1, -1)),
            lookUp: vec3.normalize(vec3.create(), vec3.fromValues(0, 1, -1)),
            yAngle: Math.PI / 4
        };
        const originalKeycapColors = keyRenderInstructions.map(({ keycapColor, legendColor }) => ({ keycapColor, legendColor }));
        
        this.kbdRenderData = { eye, progsInfo, keyboardInfo, keycapsInfo, keyRenderInstructions, originalKeycapColors, tick: null, ...rest };

        window.addEventListener("resize", this.handleResizeCanvas);
        canvas.addEventListener("wheel", this.handleCanvasWheel);
        
        this.handleResizeCanvas();
        this.renderScene();
    }

    componentDidUpdate() {
        this.handleResizeCanvas();
        this.renderScene();
    }

    componentWillUnmount() {
        window.removeEventListener("resize", this.handleResizeCanvas);
        this.webGlCanvas.current!.removeEventListener("wheel", this.handleCanvasWheel);
        if (this.kbdRenderData.tick) {
            clearInterval(this.kbdRenderData.tick);
            this.kbdRenderData.tick = null;
        }
    }

    render() {
        return (
            <div id="keyboard-render" ref={this.keyboardRenderContainer}>
                <canvas id="webgl-canvas"
                    ref={this.webGlCanvas}
                    // onMouseDown={e => this.beginClick = { x: e.clientX, y: e.clientY }}
                    onClick={this.handleCanvasClick}
                    onMouseMove={this.handleCanvasMouseMove} />

                <div id="render-inputs">
                    
                    {this.state.fullCustom ? (
                        <React.Fragment>
                            <button onClick={this.handleResetKeycaps}>Reset</button>
                            <div>
                                {/* <div className="color-picker"> */}
                                <input type="color" id="keycap-color" value={this.state.selectedKeycapColor}
                                    onChange={e => this.setState({ selectedKeycapColor: e.target.value })} />
                                <label htmlFor="keycap-color">Keycap Color</label>
                                {/* </div> */}
                                {/* <div className="color-picker"> */}
                                <input type="color" id="legend-color" value={this.state.selectedLegendColor}
                                    onChange={e => this.setState({ selectedLegendColor: e.target.value })} />
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
