import React from "react";
import { mat4, vec3 } from "gl-matrix";

import "./KeyboardRender.scss";
import { GLCanvas } from "../GLCanvas/GLCanvas";
import { toColor } from "../../utils/shared";



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
