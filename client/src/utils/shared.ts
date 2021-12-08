import { ItemType } from "../types";

export const money = (num: number) => "$" + num.toFixed(2);

export const ALL_ITEM_TYPES: ItemType[] = ["Case", "Plate", "PCB", "Stabilizers", "Switches", "Keycaps"];

export const displayName = (name: string) => (
    {
        "price": "Base Price",
        "act_dist": "Actuation Distance",
        "bot_dist": "Bottom-out Distance",
        "hot_swap": "Hot-swap"
    }[name] || name.split("_")
                   .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                   .join(" ")
);

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
