export const money = (num) => "$" + num.toFixed(2);

export const ALL_PARTS = ["Case", "Plate", "PCB", "Stabilizers", "Switches", "Keycaps"];

export const displayName = (name) => (
    {
        "price": "Base Price",
        "act_dist": "Actuation Distance",
        "bot_dist": "Bottom-out Distance",
        "hot_swap": "Hot-swap"
    }[name] || name.split("_")
                   .map(part => part.charAt(0).toUpperCase() + part.slice(1))
                   .join(" ")
);

// default value of select field if no option is selected
export const NO_SELECTION = "-- select an option --";

export class CompatibilityFilterObj {
    constructor(field, origin, accepts) {
        this.field = field;
        this.origin = origin;
        this.accepts = accepts;
    }

    passes(item) {
        const fieldData = item[this.field];
        return fieldData.type === "selection" ?
            fieldData.options.some(option => this.accepts.includes(option.type || option)) :
            this.accepts.includes(fieldData);
    }
}

// function that properly displays option text
export const displayOption = (x) => x && x.type && x.extra ? `${x.type} (+${money(x.extra)})` : x;

export const toColor = (hex) => [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5)].map(h => Number("0x" + h) / 255);
