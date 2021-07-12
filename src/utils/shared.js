export const money = (num) => "$" + num.toFixed(2);

export const ALL_PARTS = ["Case", "Plate", "PCB", "Stabilizers", "Switches", "Keycaps"];

// default value of select field if no option is selected
export const NO_SELECTION = "-- select an option --";

// function that properly displays option text
export const displayOption = (x) => x && x.type && x.extra ? `${x.type} (+${money(x.extra)})` : x;

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

export class NumRangeFilterObj {
    constructor(field, low, high, display) {
        this.field = field;
        this.low = low;
        this.high = high;
        this.display = display;
    }

    updateData([low, high]) {
        this.low = low;
        this.high = high;
    }

    passes(item) {
        const fieldData = item[this.field];
        const low = this.low === "" ? 0 : Number(this.low);
        const high = this.high === "" ? Infinity : Number(this.high);
        return fieldData.type === "selection" ?
            fieldData.options.some(option => option >= low && option <= high) :
            fieldData >= low && fieldData <= high;
    }
}

export class SelectionFilterObj {
    constructor(field, allOptions, passAll) {
        this.field = field;
        this.all = allOptions;
        this.selected = new Set();
        this.passAll = passAll;
    }

    updateData(option) {
        if (this.selected.has(option)) {
            this.selected.delete(option);
        } else {
            this.selected.add(option);
        }
    }

    passes(item) {
        // if no options are selected for this filter then it is fine
        if (this.selected.size === 0) {
            return true;
        }
    
        const fieldData = item[this.field];
        if (this.passAll) { // ensure that the item meets every selected filter option
            return Array.from(this.selected).every(selection => fieldData.includes(selection));
        } else { // ensure that the item meets at least one selected filter option
            // if there are several options make sure that one of them passes filter
            return fieldData.type === "selection" ?
                fieldData.options.some(option => this.selected.has(option.type || option)) :
                this.selected.has(fieldData);
        }
    }
}

export const toColor = (hex) => [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5)].map(h => Number("0x" + h) / 255);
