// import React from "react";
// import { mat4, vec3 } from "gl-matrix";

// import { fetchInfo } from "../../api";
// import { loadGLBuffers, loadTexture, renderScene, renderSelection, rotateView, setupShaders } from "../../utils/glFuncs";
// import { toColor } from "../../utils/shared";

// // lookup table for all non-1-unit-wide keys. Logically, SPECIAL_NUM_UNITS[key] || 1 will get key size
// const SPECIAL_NUM_UNITS = {
//     "Backspace": 2,
//     "Tab": 1.5,
//     "Backslash": 1.5,
//     "Caps": 1.75,
//     "ANSIEnter": 2.25,
//     "LShift": 2.25,
//     "RShift1_75": 1.75,
//     "RShift2_75": 2.75,
//     "LCtrl1_25": 1.25,
//     "LWin1_25": 1.25,
//     "LAlt1_25": 1.25,
//     "LCtrl1_5": 1.5,
//     "LWin1_5": 1.5,
//     "LAlt1_5": 1.5,
//     "RCtrl1_25": 1.25,
//     "RWin1_25": 1.25,
//     "RAlt1_25": 1.25,
//     "RCtrl1_5": 1.5,
//     "RWin1_5": 1.5,
//     "RAlt1_5": 1.5,
//     "Fn1_25": 1.25,
//     "Fn1_5": 1.5,
//     "Space6": 6,
//     "Space6_25": 6.25,
//     "Space7": 7,
//     "Num0": 2
// };

// const SPECIAL_KEYCAP_IDENTIFIERS = new Set([
//     "Space6_25", "Space6", "Space7", "NumEnter", "NumPlus", "ISOEnter"
// ]);

// export class GLCanvas extends React.Component {
//     constructor(props) {
//         super(props);

//         this.state = {
//             gl: null,
//             progsInfo: {
//                 textured: {
//                     program: null,
//                     attribs: {},
//                     uniforms: {},
//                     buffers: {}
//                 },
//                 untextured: {
//                     program: null,
//                     attribs: {},
//                     uniforms: {},
//                     buffers: {}
//                 },
//                 selection: {
//                     program: null,
//                     attribs: {},
//                     uniforms: {},
//                     buffers: {}
//                 }
//             },
//             eye: {
//                 position: vec3.fromValues(0, 30, 30),
//                 lookAt: vec3.normalize(vec3.create(), vec3.fromValues(0, -1, -1)),
//                 lookUp: vec3.normalize(vec3.create(), vec3.fromValues(0, 1, -1)),
//                 yAngle: Math.PI / 4
//             }
//         };

//         this.handleCanvasClicked = this.handleCanvasClicked.bind(this);
//         this.handleCanvasMouseMove = this.handleCanvasMouseMove.bind(this);
//         this.handleCanvasWheel = this.handleCanvasWheel.bind(this);
//         this.handleResizeCanvas = this.handleResizeCanvas.bind(this);
//     }

//     async loadModels(keyboardInfo, keycapsInfo, keycapProfile) {
//         const progsInfo = this.state.progsInfo;

//         // TODO make resources get from local path
//         const fetchJson = filename => import("@resources/" + filename + ".json").then(({ default: json }) => json);
    
//         // ---------------------------------------------------------------------------
//         // prepare all necessary information for setting up key rendering instructions
//         // ---------------------------------------------------------------------------
//         const keyRenderInstructions = [];
//         const keyNameToKeyObj = {};
//         const objectIdToKey = {};
//         // list of promises to load each model (keycaps and keyboard case)
//         let resourceLoadPromises = [];
//         let keycapModelsVisited = new Set();
//         // find total number of units horizontally and vertically
//         // to get number of units horizontally, find the keygroup that extends farthest right
//         const numUnitsX = keyboardInfo.keyGroups.reduce(
//             (rightmostUnits, keyGroup) => Math.max(rightmostUnits, keyGroup.keys.reduce(
//                 (numU, key) => numU + (SPECIAL_NUM_UNITS[key] || 1),
//                 keyGroup.offset[0])),
//             0);
//         // to get number of units vertically, find the keygroup that extends farthest down
//         const numUnitsY = keyboardInfo.keyGroups.reduce((max, kg) => Math.max(max, kg.offset[1]), 0) + 1;
//         const HEIGHT = 1.25;
//         // define matrix for rotating an object by the keyboard incline and then moving it up to proper height
//         const heightInclineMat = mat4.multiply(mat4.create(),
//             mat4.fromTranslation(mat4.create(), vec3.fromValues(0, HEIGHT, 0)),
//             mat4.fromRotation(mat4.create(), keyboardInfo.incline * (Math.PI / 180), [1, 0, 0]) // incline
//         );
//         // -------------------------------------------------
//         // define instructions for rendering all needed keys
//         // -------------------------------------------------
//         for (const kg of keyboardInfo.keyGroups) {
//             // initialize position to beginning of row and increment after each key
//             let posXZ = [kg.offset[0] - numUnitsX / 2, 0, kg.offset[1] - numUnitsY / 2 + 0.5];
//             for (const key of kg.keys) {
//                 // if this key is not special (non-1u), then it must be 1 unit wide
//                 const keysize = SPECIAL_NUM_UNITS[key] || 1;
//                 const keysizeStr = keysize.toString().replace(".", "_");
//                 const modelIdentifier = SPECIAL_KEYCAP_IDENTIFIERS.has(key) ? key : `R${kg.row}_${keysizeStr}U`;
    
//                 // if a keycap with these dimensions has not been loaded yet, then load it
//                 if (!keycapModelsVisited.has(modelIdentifier)) {
//                     let bufs = progsInfo.textured.buffers;
//                     bufs[modelIdentifier] = {};
//                     resourceLoadPromises.push(
//                         fetchJson(`models/keycaps/${keycapProfile}/${modelIdentifier}`)
//                             .then(keycapModel => loadGLBuffers(bufs[modelIdentifier], keycapModel, true)));
//                     keycapModelsVisited.add(modelIdentifier);
//                 }
    
//                 // move keycap to middle of keycap area
//                 const toPosMat = mat4.fromTranslation(mat4.create(), [posXZ[0] + keysize / 2, 0, posXZ[2]]);
//                 const finalTransformationMat = mat4.multiply(mat4.create(), heightInclineMat, toPosMat);
    
//                 // load legend texture
//                 const { loadTexturePromise, texture } = loadTexture("resources/legends/" + key + ".png");
//                 resourceLoadPromises.push(loadTexturePromise);
    
//                 // construct an object to represent all relevant information of a keycap for rendering
//                 const keycapObj = {
//                     modelIdentifier,
//                     keysize,
//                     transformation: finalTransformationMat,
//                     legendTexture: texture,
//                     ...getKeycapColorOptions(key, keycapsInfo),
//                 };
    
//                 // find an appropriate object id for this key
//                 const objectId = Object.keys(objectIdToKey).length + 1;
//                 objectIdToKey[objectId] = keycapObj;
//                 keyNameToKeyObj[key] = keycapObj;
//                 keycapObj.objectId = objectId;
    
//                 keyRenderInstructions.push(keycapObj);
//                 posXZ[0] += keysize;
//             }
//         }
//         const untexBufs = progsInfo.untextured.buffers;
    
//         // load case
//         untexBufs["case"] = {};
//         resourceLoadPromises.push(
//             fetchJson("models/cases/tofu65" /* TODO + kbdName*/)
//                 .then(trianglesInfo => loadGLBuffers(untexBufs["case"], trianglesInfo, false)));
    
//         // load switches
//         untexBufs["switch"] = {};
//         resourceLoadPromises.push(
//             fetchJson("models/switch")
//                 .then(switchInfo => loadGLBuffers(untexBufs["switch"], switchInfo, false)));
    
//         // load switches
//         untexBufs["stabilizer"] = {};
//         resourceLoadPromises.push(
//             fetchJson("models/stabilizer")
//                 .then(stabInfo => loadGLBuffers(untexBufs["stabilizer"], stabInfo, false)));

//         this.setState({ keyRenderInstructions, keyNameToKeyObj, objectIdToKey });
    
//         return await Promise.all(resourceLoadPromises);
//     }

//     handleCanvasClicked(event) {
//         const gl = this.state.gl;

//         if (event.clientX === this.beginClick.x && event.clientY === this.beginClick.y) {
//             const { left, top, height } = event.target.getBoundingClientRect();

//             const x = event.clientX - left;
//             const y = height - (event.clientY - top);

//             renderSelection();

//             let pixelClicked = new Uint8Array(4);
//             gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixelClicked);

//             const objectWasClicked = pixelClicked[3] === 0;
//             const objectId = pixelClicked[0];
//             if (objectWasClicked && objectId !== 0) {
//                 const key = objectIdToKey[objectId];

//                 if (this.state.fullCustom) {
//                     key.keycapColor = toColor(this.state.keycapColor);
//                     key.legendColor = toColor(this.state.legendColor);
//                 } else {
//                     key.optionSelected = (key.optionSelected + 1) % key.colorOptions.length;

//                     key.keycapColor = key.colorOptions[key.optionSelected].keycapColor;
//                     key.legendColor = key.colorOptions[key.optionSelected].legendColor;
//                 }
//             }

//             renderScene(gl, eye, progsInfo, keyRenderInstructions);
//         }
//     }

//     handleCanvasMouseMove(event) {
//         const eye = this.state.eye;

//         if (event.buttons !== 0) {
//             // find how much the mouse has moved since the last position
//             const dx = event.movementX;
//             const dy = event.movementY;
//             if (dx !== 0) {
//                 rotateView(-dx / 100, vec3.fromValues(0, 1, 0));
//             }
//             if (dy !== 0) {
//                 // make it such that movement upwards is positive rotation
//                 const rotateAngle = dy / 100;
//                 // if this rotation will surpass lowest allowed viewing angle then clamp it
//                 const MIN_Y_ANG = 0.1;
//                 const MAX_Y_ANG = Math.PI / 2;
//                 const newAngle = Math.max(MIN_Y_ANG, Math.min(MAX_Y_ANG, eye.yAngle + rotateAngle));
//                 rotateView(newAngle - eye.yAngle, vec3.cross(vec3.create(), eye.lookUp, eye.lookAt));
//                 eye.yAngle = newAngle;
//             }
//             renderScene(gl, eye, progsInfo, keyRenderInstructions);
//         }
//     }

//     handleCanvasWheel(event) {
//         event.preventDefault();
//         const eye = this.state.eye;

//         const amtToMove = event.deltaY / 100;
//         const dist = vec3.length(eye.position);
//         // constrain the distance away from keyboard to [2, 10]
//         const MIN_DIST = 14;
//         const MAX_DIST = 50;
//         const newDist = Math.max(MIN_DIST, Math.min(MAX_DIST, dist + amtToMove));
//         eye.position = vec3.scale(vec3.create(), vec3.normalize(vec3.create(), eye.position), newDist);
//         renderScene(gl, eye, progsInfo, keyRenderInstructions);
//     }

//     handleResizeCanvas() {
//         const { gl, prevWidth } = this.state;
//         const container = document.getElementById("render-container");

//         const left = container.offsetLeft;
//         const rightBound = window.innerWidth - container.style.marginRight.replace("px", "");
//         const w = Math.max(600, rightBound - left);
//         const h = Math.floor(w / 2);

//         if (prevWidth !== w) {
//             const canvas = document.getElementById("webgl-canvas");
//             canvas.width = w;
//             canvas.height = h;

//             gl.viewport(0, 0, w, h);

//             this.setState({ prevWidth: w });
//         }
//     }

//     async componentDidMount() {
//         const canvas = document.getElementById("webgl-canvas");
//         const gl = canvas.getContext("webgl");
//         if (gl === null) {
//             alert("Error in fetching GL context. Please ensure that your browser supports WebGL.");
//             return;
//         }

//         gl.viewport(0, 0, canvas.width, canvas.height);

//         // enable gl attributes: use z-buffering, make background black
//         gl.clearColor(...toColor("#fcfcf8"), 1.0);
//         gl.clearDepth(1.0);
//         // gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
//         // gl.enable(gl.BLEND);
//         // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
//         gl.enable(gl.DEPTH_TEST);

//         canvas.addEventListener("wheel", this.handleCanvasWheel);
//         window.addEventListener("resize", this.handleResizeCanvas);

//         setupShaders(gl, this.state.progsInfo);


//         const selected = this.props.selectedItems;
//         // const fetchInfo = async (infoType, name) => {// async function fetchInfo(infoType, name) {
//         //     try {
//         //         const res = await fetch(`http://localhost:3000/${infoType}/${encodeURIComponent(name)}`);
//         //         const data = await res.json();
//         //         this.setState({ [infoType]: data });
//         //     } catch (err) {
//         //         console.error(`Error fetching ${infoType}: ${err}`);
//         //     }
//         // };

//         // await fetchInfo("keyboardInfo", selected["Case"]["Name"]);
//         // await fetchInfo("keycapsInfo", selected["Keycaps"]["Name"]);
//         let infoType = "keyboardInfo";
//         let name = selected["Case"]["Name"];
//         let keyboardInfo;
//         let keycapsInfo;
//         try {
//             const res = await fetchInfo(infoType, name);
//             const data = await res.json();
//             keyboardInfo = data;
//         } catch (err) {
//             console.error(`Error fetching ${infoType}: ${err}`);
//         }
//         infoType = "keycapsInfo";
//         name = selected["Keycaps"]["Name"];
//         try {
//             const res = await fetchInfo(infoType, name);
//             const data = await res.json();
//             keycapsInfo = data;
//         } catch (err) {
//             console.error(`Error fetching ${infoType}: ${err}`);
//         }

//         // this.setState({ keyboardInfo: set.keyboardInfo, keycapsInfo: set.keycapsInfo });

//         console.log("kbd");
//         console.log(keyboardInfo);
//         console.log("kc");
//         console.log(keycapsInfo);

//         await this.loadModels(keyboardInfo, keycapsInfo, "cherry");

//         this.handleResizeCanvas();

//         this.setState({ gl });
//         renderScene(gl, eye, progsInfo, keyRenderInstructions);
//     }

//     componentDidUpdate() {
//         this.handleResizeCanvas();
//         renderScene(gl, eye, progsInfo, keyRenderInstructions);
//     }

//     componentWillUnmount() {
//         document.getElementById("webgl-canvas").removeEventListener("wheel", this.handleCanvasWheel);
//         window.removeEventListener("resize", this.handleResizeCanvas);
//         this.setState({ gl: null});
//     }

//     render() {
//         return (
//             <canvas id="webgl-canvas"
//                 onMouseDown={e => this.beginClick = { x: e.clientX, y: e.clientY }}
//                 onMouseUp={this.handleCanvasClicked}
//                 onMouseMove={this.handleCanvasMouseMove} />
//         );
//     }
// }
