import React from "react";
import { mat4, vec3 } from "gl-matrix";

import "./KeyboardRender.scss";
import { fetchInfo, fetchCaseModel, fetchKeycapModel, fetchSwitchModel, fetchStabilizerModel } from "../../apiInteraction";
import { loadTexture, loadGLBuffers } from "../../utils/glFuncs";
import { ACCENTS, ALPHAS, SPECIAL_KEYCAP_IDENTIFIERS, SPECIAL_NUM_UNITS } from "../../utils/keyboardComponents";
import { GLCanvas } from "./GLCanvas";

const newProgramInfo = () => ({
    program: null,
    attribs: {},
    uniforms: {},
    buffers: {}
});
let progsInfo = {
    textured: newProgramInfo(),
    untextured: newProgramInfo(),
    selection: newProgramInfo()
};

let keyRenderInstructions = [];

// lookup table for all non-1-unit-wide keys. Logically, SPECIAL_NUM_UNITS[key] || 1 will get key size

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

async function loadModels(gl, keyboardInfo, keycapsInfo, keycapProfile) {
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
        (rightmostUnits, keyGroup) => Math.max(
            rightmostUnits,
            keyGroup.keys.reduce(
                (numU, key) => numU + (SPECIAL_NUM_UNITS[key] || 1),
                keyGroup.offset[0]
            )
        ),
        0
    );
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
                    fetchKeycapModel(keycapProfile, modelIdentifier)
                        .then(keycapModel => loadGLBuffers(gl, bufs[modelIdentifier], keycapModel, true)));
                keycapModelsVisited.add(modelIdentifier);
            }

            // move keycap to middle of keycap area
            const toPosMat = mat4.fromTranslation(mat4.create(), [posXZ[0] + keysize / 2, 0, posXZ[2]]);
            const finalTransformationMat = mat4.multiply(mat4.create(), heightInclineMat, toPosMat);

            // load legend texture
            const { loadTexturePromise, texture } = loadTexture(gl, "resources/legends/" + key + ".png");
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
        fetchCaseModel("tofu65").then(trianglesInfo => loadGLBuffers(gl, untexBufs["case"], trianglesInfo, false)));

    // load switches
    untexBufs["switch"] = {};
    resourceLoadPromises.push(
        fetchSwitchModel().then(switchModel => loadGLBuffers(gl, untexBufs["switch"], switchModel, false)));

    // load switches
    untexBufs["stabilizer"] = {};
    resourceLoadPromises.push(
        fetchStabilizerModel().then(stabilizerModel => loadGLBuffers(gl, untexBufs["stabilizer"], stabilizerModel, false)));

    await Promise.all(resourceLoadPromises);
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

            highlightKeys: false,
            fullCustom: false,
            keycapColor: "#000000",
            legendColor: "#ffffff"
        };

        this.gl = null;
        this.eye = {
            position: vec3.fromValues(0, 30, 30),
            lookAt: vec3.normalize(vec3.create(), vec3.fromValues(0, -1, -1)),
            lookUp: vec3.normalize(vec3.create(), vec3.fromValues(0, 1, -1)),
            yAngle: Math.PI / 4
        };
        
        this.tick = null;

        this.handleToggleHighlight = this.handleToggleHighlight.bind(this);
        this.handleCustomizeKeycaps = this.handleCustomizeKeycaps.bind(this);
        this.handleResetKeycaps = this.handleResetKeycaps.bind(this);
        this.handleClickKey = this.handleClickKey.bind(this);
    }

    handleToggleHighlight() {
        if (this.tick !== null) {
            clearInterval(this.tick);
            this.setState({ increasing: false, blinkProportion: 0 });
            this.tick = null;
        } else {
            this.tick = setInterval(() => {
                if (this.state.highlightKeys) {
                    this.setState(({ highlightKeys, increasing, blinkProportion }) => {
                        if (increasing) {
                            blinkProportion = Math.min(1, blinkProportion + 0.05);
                            increasing = blinkProportion !== 1;
                        } else {
                            blinkProportion = Math.max(0, blinkProportion - 0.05);
                            increasing = blinkProportion === 0;
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

        // this.renderScene();
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

    handleClickKey(objectId) {
        const { fullCustom, keycapColor, legendColor } = this.state;

        const key = objectIdToKey[objectId];

        if (fullCustom) {
            key.keycapColor = toColor(keycapColor);
            key.legendColor = toColor(legendColor);
        } else {
            key.optionSelected = (key.optionSelected + 1) % key.colorOptions.length;

            key.keycapColor = key.colorOptions[key.optionSelected].keycapColor;
            key.legendColor = key.colorOptions[key.optionSelected].legendColor;
        }
    }

    async componentDidMount() {
        console.log(this.props.selectedItems);
        const keyboardInfo = await fetchInfo("keyboardInfo", this.props.selectedItems["Case"]["Name"]);
        const keycapsInfo = await fetchInfo("keycapsInfo", this.props.selectedItems["Keycaps"]["Name"]);

        this.setState({ keyboardInfo, keycapsInfo });

        await loadModels(this.gl, keyboardInfo, keycapsInfo, "cherry");

        // this.handleResizeCanvas();
        // this.renderScene();
    }

    componentWillUnmount() {
        if (this.tick) {
            clearInterval(this.tick);
            this.tick = null;
        }
        this.gl = null;
    }

    render() {
        console.log("gl:");
        console.log(this.gl);
        return (
            <div id="keyboard-render">
                <GLCanvas
                    gl={this.gl}
                    eye={this.eye}
                    progsInfo={progsInfo}
                    keyRenderInstructions={keyRenderInstructions}
                    onClickKey={this.handleClickKey}
                    onAcquireGl={gl => { this.gl = gl; this.forceUpdate(); } }
                />

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
