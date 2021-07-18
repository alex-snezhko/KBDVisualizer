import React from "react";
import { mat4, vec3 } from "gl-matrix";

import "./KeyboardRender.scss";
import { GLCanvas } from "../GLCanvas/GLCanvas";
import { toColor } from "../../utils/shared";
import { fetchInfo, fetchCaseModel, fetchSwitchModel, fetchStabilizerModel } from "../../apiInteraction";
import {
    fShaderSelectionSrc,
    fShaderTexturedSrc,
    fShaderUntexturedSrc,
    vShaderSelectionSrc,
    vShaderTexturedSrc,
    vShaderUntexturedSrc
} from "../../utils/glesShaderSrc";

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
            legendColor: "#ffffff",

            keyRenderInstructions: [],
            keyNameToKeyObj: {},
            objectIdToKey: {}
        };

        this.tick = null;

        this.handleToggleHighlight = this.handleToggleHighlight.bind(this);
        this.handleCustomizeKeycaps = this.handleCustomizeKeycaps.bind(this);
        this.handleResetKeycaps = this.handleResetKeycaps.bind(this);
    }

    async loadModels(keyboardInfo, keycapsInfo, keycapProfile) {
        const progsInfo = this.state.progsInfo;
    
        // ---------------------------------------------------------------------------
        // prepare all necessary information for setting up key rendering instructions
        // ---------------------------------------------------------------------------
        const keyRenderInstructions = [];
        const keyNameToKeyObj = {};
        const objectIdToKey = {};
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
                        fetchKeycap(`models/keycaps/${keycapProfile}/${modelIdentifier}`)
                            .then(keycapModel => loadGLBuffers(bufs[modelIdentifier], keycapModel, true)));
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
            fetchCaseModel("tofu65")
                .then(trianglesInfo => loadGLBuffers(untexBufs["case"], trianglesInfo, false)));
    
        // load switches
        untexBufs["switch"] = {};
        resourceLoadPromises.push(
            fetchSwitchModel()
                .then(switchModel => loadGLBuffers(untexBufs["switch"], switchModel, false)));

        // load switches
        untexBufs["stabilizer"] = {};
        resourceLoadPromises.push(
            fetchStabilizerModel()
                .then(stabilizerModel => loadGLBuffers(untexBufs["stabilizer"], stabilizerModel, false)));

        await Promise.all(resourceLoadPromises);

        this.setState({ keyRenderInstructions, keyNameToKeyObj, objectIdToKey });
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
    }

    handleColorMultiple(which) {
        const { keycapColor, legendColor, keyNameToKeyObj } = this.state;

        const keys = { "alphas": alphasInSet, "mods": modsInSet, "accents": accentsInSet }[which];
        for (const keyName of keys) {
            const keyObj = keyNameToKeyObj[keyName];
            keyObj.keycapColor = toColor(keycapColor);
            keyObj.legendColor = toColor(legendColor);
        }

        // TODO figure this out
        renderScene();
    }

    handleCustomizeKeycaps() {
        this.keycapColors = this.state.keyRenderInstructions.map(key => ({ keycapColor: key.keycapColor, legendColor: key.legendColor }));
        this.setState({ highlightKeys: false, fullCustom: true });
    }

    handleResetKeycaps() {
        const keyRenderInstructions = this.state.keyRenderInstructions;

        for (const i in keyRenderInstructions) {
            keyRenderInstructions[i].keycapColor = this.keycapColors[i].keycapColor;
            keyRenderInstructions[i].legendColor = this.keycapColors[i].legendColor;
        }
        
        this.setState({ fullCustom: false });
    }
    
    async componentDidMount() {

        const selected = this.props.selectedItems;
        // const fetchInfo = async (infoType, name) => {// async function fetchInfo(infoType, name) {
        //     try {
        //         const res = await fetch(`http://localhost:3000/${infoType}/${encodeURIComponent(name)}`);
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
        let keyboardInfo;
        let keycapsInfo;
        try {
            const res = await fetchInfo(infoType, name);
            const data = await res.json();
            keyboardInfo = data;
        } catch (err) {
            console.error(`Error fetching ${infoType}: ${err}`);
        }
        infoType = "keycapsInfo";
        name = selected["Keycaps"]["Name"];
        try {
            const res = await fetchInfo(infoType, name);
            const data = await res.json();
            keycapsInfo = data;
        } catch (err) {
            console.error(`Error fetching ${infoType}: ${err}`);
        }

        // this.setState({ keyboardInfo: set.keyboardInfo, keycapsInfo: set.keycapsInfo });

        await this.loadModels(keyboardInfo, keycapsInfo, "cherry");
    }

    componentWillUnmount() {
        if (this.tick) {
            clearInterval(this.tick);
            this.tick = null;
        }
    }

    render() {
        return (
            <div id="keyboard-render">
                <GLCanvas />

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
