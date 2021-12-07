import { mat4, vec3 } from "gl-matrix";

export interface Eye {
    position: vec3;
    lookAt: vec3;
    lookUp: vec3;
    yAngle: number;
}

export interface WebGLBufferInfo {
    vertices: WebGLBuffer;
    normals: WebGLBuffer;
    uvs?: WebGLBuffer;
    triangles: WebGLBuffer;
    numTriangles: number;
}

export interface AttribInfo {
    loc: number;
    bufferName: "vertices" | "normals" | "uvs";
    // the parameters that will be passed into gl.vertexAttribPointer when buffer binding
    vapParams: [number, number, boolean, number, number];
}

export interface WebGLProgramInfo {
    program: WebGLProgram;
    attribsInfo: Record<string, AttribInfo>;
    uniformLocs: Record<string, WebGLUniformLocation>;
    buffers: Record<string, WebGLBufferInfo>;
}

export interface WebGLProgramsInfo {
    textured: WebGLProgramInfo;
    untextured: WebGLProgramInfo;
    // 'invisible' program used for detecting clicks on objects
    selection: WebGLProgramInfo;
}

export type Color = [number, number, number];

export interface KeycapColor {
    keycapColor: Color;
    legendColor: Color;
}

export interface KeyRenderInstruction extends KeycapColor {
    modelIdentifier: string;
    keysize: number;
    transformation: mat4;
    legendTexture: WebGLTexture;
    colorOptions: KeycapColor[];
    optionSelected: number;
    objectId: number;
}

// TODO pre-flatten
export interface ObjectModel {
    vertices: number[][];
    normals: number[][];
    uvs: number[][];
    triangles: number[][];
}

// TODO export from backend
export interface KeyboardInfo {
    incline: number;
    color: number[];
    keyGroups: {
        row: number;
        offset: number[];
        keys: string[];
    }[];
}

export interface KeycapsInfo {
    font: "standard";
    alphas: KeycapColor;
    mods: KeycapColor;
    accents: KeycapColor[];
    exceptions: ({ keys: string[] } & KeycapColor)[];
    extras: ({ keys: string[] } & KeycapColor)[];
}

export interface FieldInfo {
    name: string;
    display: (x: string) => string;
}

// export interface SingleProperty {
//     type: "normal";
//     value: any; // TODO look into this
// }
export type SimpleProperty = string | number | Color;

export const NO_SELECTION = "-- select an option --";

export interface ValidSelectionPropertyOption {
    optionText: string;
    extra: number;
}

export type SelectionPropertyOption = ValidSelectionPropertyOption | typeof NO_SELECTION;

export interface SelectionProperty {
    type: "selection";
    options: SelectionPropertyOption[];
}

export interface MultipleProperty {
    type: "multiple";
    values: string[];
}

export type ItemProperty = SimpleProperty | SelectionProperty | MultipleProperty;

export interface Item {
    name: string;
    link: string;
    image: string;
    price: number;
    [property: string]: string | number | ItemProperty;
    // properties: Record<string, ItemProperty>;
}

export type ItemType = "Case" | "Plate" | "PCB" | "Stabilizers" | "Switches" | "Keycaps";

export type ValidSelectedItems = {
    [a in ItemType]: Item;
};

export type SelectedItems = {
    [a in ItemType]: Item | null;
};

export interface NumRangeFilter {
    filterType: "numeric";
    fieldName: string;
    value: {
        low: number;
        high: number;
    };
}

export interface SelectFilter {
    filterType: "selectionAllOf" | "selectionOneOf";
    fieldName: string;
    value: {
        option: string;
        selected: boolean;
    }[];
}

export type Filter = NumRangeFilter | SelectFilter;

// Acceptable range of values for items based on items in database
export interface NumRangeFilterRange {
    filterType: "numeric";
    fieldName: string;
    value: {
        low: number;
        high: number;
    };
}

export interface SelectFilterRange {
    filterType: "selectionAllOf" | "selectionOneOf";
    fieldName: string;
    value: string[];
}

export type FilterRange = NumRangeFilterRange | SelectFilterRange;

export interface GroupBuyItem {
    name: string;
    link: string;
    image: string;
    // itemType: string; // TODO partType
    price: number;
    startDate: Date;
    endDate: Date; // TODO change from end_date and start_date
    end_date: string;
    start_date: string;
    part_type: ItemType;
}
