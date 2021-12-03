import { ItemType } from "../types";

export const money = (num: number) => "$" + num.toFixed(2);

export const ALL_PARTS: ItemType[] = ["Case", "Plate", "PCB", "Stabilizers", "Switches", "Keycaps"];

export const displayName = (name: string) => (
    {
        "price": "Base Price",
        "act_dist": "Actuation Distance",
        "bot_dist": "Bottom-out Distance",
        "hot_swap": "Hot-swap"
    }[name] || name.split("_")
                   .map(part => part.charAt(0).toUpperCase() + part.slice(1))
                   .join(" ")
);

// TODO move to better place
// export function getExtraFieldInfo(itemType: string) {
//     const std = (name: string) => ({ name, display: (x: number) => x });

//     return {
//         "Kit": [std("form_factor")].concat(ALL_PARTS.map((part: string) => std(part))),
//         "Case": [std("form_factor"), std("material"), std("color"), std("mount_method")],
//         "Plate": [std("form_factor"), std("material")],
//         "PCB": [std("form_factor"), std("hot_swap"), std("backlight")],
//         "Stabilizers": [std("mount_method")],
//         "Switches": [std("tactility"), { name: "spring_weight", display: (x: number) => x + "g" },
//             { name: "act_dist", display: (x: number) => x.toFixed(1) + " mm" },
//             { name: "bot_dist", display: (x: number) => x.toFixed(1) + " mm" }],
//         "Keycaps": [std("color"), std("material"), std("legends")]
//     }[itemType] || [];
// }

export class ItemField {

}

// default value of select field if no option is selected
export const NO_SELECTION = "-- select an option --";

// export class CompatibilityFilterObj {
//     constructor(field, origin, accepts) {
//         this.field = field;
//         this.origin = origin;
//         this.accepts = accepts;
//     }

//     passes(item) {
//         const fieldData = item[this.field];
//         return fieldData.type === "selection" ?
//             fieldData.options.some(option => this.accepts.includes(option.type || option)) :
//             this.accepts.includes(fieldData);
//     }
// }

// function that properly displays option text
export const displayOption = (x: any) => x && x.type && x.extra ? `${x.type} (+${money(x.extra)})` : x;

export const toColor = (hex: string) => [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5)].map(h => Number("0x" + h) / 255);
