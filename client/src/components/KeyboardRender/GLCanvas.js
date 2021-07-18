import React from "react";
import { vec3 } from "gl-matrix";

import { renderScene, renderSelection, rotateView, setupShaders } from "../../utils/glFuncs";
import { toColor } from "../../utils/shared";

export class GLCanvas extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            prevWidth: 0
        };

        this.webGlCanvas = React.createRef();

        // this.gl = null;

        this.handleCanvasClicked = this.handleCanvasClicked.bind(this);
        this.handleCanvasMouseMove = this.handleCanvasMouseMove.bind(this);
        this.handleCanvasWheel = this.handleCanvasWheel.bind(this);
        this.handleResizeCanvas = this.handleResizeCanvas.bind(this);
    }

    handleCanvasClicked(event) {
        // const gl = this.gl;
        const { gl, eye, progsInfo, keyRenderInstructions } = this.props;

        if (event.clientX === this.beginClick.x && event.clientY === this.beginClick.y) {
            const { left, top, height } = event.target.getBoundingClientRect();

            const x = event.clientX - left;
            const y = height - (event.clientY - top);

            renderSelection(gl, eye, progsInfo, keyRenderInstructions);

            let pixelClicked = new Uint8Array(4);
            gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixelClicked);

            const objectWasClicked = pixelClicked[3] === 0;
            const objectId = pixelClicked[0];
            if (objectWasClicked && objectId !== 0) {
                this.props.onClickKey(objectId);
            }

            renderScene(gl, eye, progsInfo, keyRenderInstructions);
        }
    }

    handleCanvasMouseMove(event) {
        // const gl = this.gl;
        const { gl, eye, progsInfo, keyRenderInstructions } = this.props;

        if (event.buttons !== 0) {
            // find how much the mouse has moved since the last position
            const dx = event.movementX;
            const dy = event.movementY;
            if (dx !== 0) {
                rotateView(-dx / 100, vec3.fromValues(0, 1, 0), eye);
            }
            if (dy !== 0) {
                // make it such that movement upwards is positive rotation
                const rotateAngle = dy / 100;
                // if this rotation will surpass lowest allowed viewing angle then clamp it
                const MIN_Y_ANG = 0.1;
                const MAX_Y_ANG = Math.PI / 2;
                const newAngle = Math.max(MIN_Y_ANG, Math.min(MAX_Y_ANG, eye.yAngle + rotateAngle));
                rotateView(newAngle - eye.yAngle, vec3.cross(vec3.create(), eye.lookUp, eye.lookAt), eye);
                eye.yAngle = newAngle;
            }
            renderScene(gl, eye, progsInfo, keyRenderInstructions);
        }
    }

    handleCanvasWheel(event) {
        event.preventDefault();
        // const gl = this.gl;
        const { gl, eye, progsInfo, keyRenderInstructions } = this.props;

        const amtToMove = event.deltaY / 100;
        const dist = vec3.length(eye.position);
        // constrain the distance away from keyboard to [2, 10]
        const MIN_DIST = 14;
        const MAX_DIST = 50;
        const newDist = Math.max(MIN_DIST, Math.min(MAX_DIST, dist + amtToMove));
        eye.position = vec3.scale(vec3.create(), vec3.normalize(vec3.create(), eye.position), newDist);
        renderScene(gl, eye, progsInfo, keyRenderInstructions);
    }

    handleResizeCanvas() {
        // const gl = this.gl;
        const { gl } = this.props;
        const container = document.getElementById("render-container");

        const left = container.offsetLeft;
        const rightBound = window.innerWidth - container.style.marginRight.replace("px", "");
        const w = Math.max(600, rightBound - left);
        const h = Math.floor(w / 2);

        if (this.state.prevWidth !== w) {
            const canvas = this.webGlCanvas.current;
            canvas.width = w;
            canvas.height = h;

            gl.viewport(0, 0, w, h);

            this.setState({ prevWidth: w });
        }
    }

    async componentDidMount() {
        const { progsInfo, onAcquireGl } = this.props;
        
        const canvas = this.webGlCanvas.current;
        canvas.addEventListener("wheel", this.handleCanvasWheel);
        window.addEventListener("resize", this.handleResizeCanvas);
        
        const gl = canvas.getContext("webgl");
        if (gl === null) {
            alert("Error in fetching GL context. Please ensure that your browser supports WebGL.");
            return;
        }
        

        gl.viewport(0, 0, canvas.width, canvas.height);

        // enable gl attributes: use z-buffering, make background black
        gl.clearColor(...toColor("#fcfcf8"), 1.0);
        gl.clearDepth(1.0);
        // gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        // gl.enable(gl.BLEND);
        // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.enable(gl.DEPTH_TEST);

        setupShaders(gl, progsInfo);

        onAcquireGl(gl);
    }

    componentDidUpdate() {
        // const { gl } = this.state;
        // const { eye, progsInfo, keyRenderInstructions } = this.props;

        this.handleResizeCanvas();
        // renderScene(gl, eye, progsInfo, keyRenderInstructions);
    }

    componentWillUnmount() {
        this.webGlCanvas.current.removeEventListener("wheel", this.handleCanvasWheel);
        window.removeEventListener("resize", this.handleResizeCanvas);
    }

    render() {
        return (
            <canvas id="webgl-canvas"
                ref={this.webGlCanvas}
                onMouseDown={e => this.beginClick = { x: e.clientX, y: e.clientY }}
                onMouseUp={this.handleCanvasClicked}
                onMouseMove={this.handleCanvasMouseMove} />
        );
    }
}
