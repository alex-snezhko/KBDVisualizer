// interface ItemBase {
//     name: string;
//     link: string;
//     image: string;
//     price: number;
// }

// interface Case extends ItemBase {
//     itemType: "Case";
//     form_factor: string; // TODO
//     material: string;
//     color: string;
//     mount_method: string;
// }

// interface Plate extends ItemBase {
//     itemType: "Plate";
//     form_factor: string;
//     material: string;
// }

// interface Pcb extends ItemBase {
//     itemType: "PCB";
//     form_factor: string;
//     hot_swap: string;
//     backlight: string;
// }

// interface Stabilizers extends ItemBase {
//     itemType: "Stabilizers";
//     mount_method: string;
// }

// interface Switches extends ItemBase {
//     itemType: "Switches";
//     tactility: string;
//     spring_weight: number;
//     act_dist: number;
//     bot_dist: number;
// }

// interface Keycaps extends ItemBase {
//     itemType: "Keycaps";
//     color: string;
//     material: string;
//     legends: string;
// }

// // export interface Item {
// //     name: string;
// //     link: string;
// //     image: string;
// //     price: number;
// // }

export interface KeyboardInfo {

}

export interface KeycapsInfo {

}

export interface FieldInfo {
    name: string;
    display: (x: string) => string
}

export interface SingleProperty {
    type: "normal";
    value: string;
}

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

export type ItemProperty = SingleProperty | SelectionProperty | MultipleProperty;

export interface Item {
    name: string;
    link: string;
    image: string;
    price: number;
    properties: Record<string, ItemProperty>;
}

// export type Item = Case | Plate | Pcb | Stabilizers | Switches | Keycaps;

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
