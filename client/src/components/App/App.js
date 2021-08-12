import React, { useState } from "react";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";

import { Login } from "../Login";
import { SignUp } from "../SignUp";
import { Header } from "../Header";
import { GroupBuys } from "../GroupBuys";
import { ItemSelection } from "../ItemSelection";
import { SelectedItems } from "../SelectedItems";

import { ALL_PARTS, NO_SELECTION, SelectionFilterObj, NumRangeFilterObj, CompatibilityFilterObj } from "../../utils/shared";
import "./App.scss";

function getExtraFieldInfo(itemType) {
    const generateNumericFilter = (display) => function(fieldName, fieldData) {
        // function that returns the smallest or largest value if there are multiple options for this field
        const getMinOrMax = (operation, data) => data.type === "selection" ? operation(...data.options) : data;

        const low = Math.min(...fieldData.map(x => getMinOrMax(Math.min, x)));
        const high = Math.max(...fieldData.map(x => getMinOrMax(Math.max, x)));
        return new NumRangeFilterObj(fieldName, low, high, display);
    };

    function generateSelectionFilter(fieldName, fieldData) {
        const options = new Set();

        // determine if this is a field with many options or just one
        const hasManyValues = Array.isArray(fieldData[0]);

        // generate set of all options for this field
        for (const data of fieldData) {
            if (data !== undefined) {
                if (hasManyValues) {
                    data.forEach(val => options.add(this.display(val)));
                } else {
                    if (data.type === "selection") {
                        data.options.forEach(x => options.add(this.display(x.type || x)));
                    } else {
                        options.add(this.display(data));
                    }
                }
            }
        }

        // create filter out of set of options; filter will match all selections if this field
        //   contained arrays (meaning there are several values for the field for each item)
        //   or at least one selection otherwise (meaning there is an option for some fields for some items)
        return new SelectionFilterObj(fieldName, Array.from(options).sort(), hasManyValues);
    }

    const std = (name) => ({ name, display: x => x, generateFilter: generateSelectionFilter });

    // TODO maybe change display to a field of NumRangeFilter
    return {
        "Switches": [std("Tactility"), { name: "Spring Weight", display: x => x + "g", generateFilter: generateNumericFilter(x => <span className="numeric-range-input">{x}g</span>) },
            { name: "Actuation Distance", display: x => x.toFixed(1) + " mm", generateFilter: generateNumericFilter(x => <span className="numeric-range-input">{x}mm</span>) },
            { name: "Bottom-out Distance", display: x => x.toFixed(1) + " mm", generateFilter: generateNumericFilter(x => <span className="numeric-range-input">{x}mm</span>) }],
    }[itemType] || [];
}

export function App() {
    const [selectedItems, setSelectedItems] = useState({
        "Kit": null,
        "Case": {
            "Name": "Tofu 65% Aluminum",
            "Image": "https://cdn.shopify.com/s/files/1/1473/3902/products/8b9cc7c9808a81fc8db0eaf67a4d79d7_b3abc1fb-7837-45dd-bbca-f1b4202bc9e2_1800x1800.jpg?v=1584436794",
            "Link": "https://kbdfans.com/collections/65-layout-case/products/in-stocktofu-65-aluminum-case",
            "Base Price": 125,
            "Form Factor": "65%",
            "Mount Method": "Tray Mount",
            "Material": "Aluminum",
            "Primary Color": {"type": "selection", "options": ["Silver", "Grey", "Black", "Chocolate", "Burgundy", "Purple", "Ink Blue", {"type": "E-White", "extra": 4}]},
            price: 1
        },
        "Plate": {
            "Name": "KBDPad MKII Brass Plate",
            "Image": "https://cdn.shopify.com/s/files/1/1473/3902/products/8_d0a22ed5-026f-4709-b469-2cb6d618abb1_1800x1800.jpg?v=1601098440",
            "Link": "https://kbdfans.com/collections/plate/products/kbdpad-mkii-brass-plate",
            "Base Price": 18,
            "Form Factor": "Numpad",
            "Material": "Brass",
            price: 1
        },
        "PCB": {
            "Name": "DZ60 Rev 3.0 PCB",
            "Image": "https://cdn.shopify.com/s/files/1/1473/3902/products/c_1_1800x1800.jpg?v=1584436582",
            "Link": "https://kbdfans.com/collections/pcb/products/dz60-60-pcb",
            "Base Price": 38,
            "Form Factor": "60%",
            "Hot-swap": "No",
            "Backlight": "RGB Underglow",
            price: 1
        },
        "Switches": {
            "Name": "Cherry MX Red",
            "Image": "https://www.cherrymx.de/_Resources/Persistent/d4e5d661da4d28eb2c5d6321289c29ac2d6cbd56/img-productstage-mxRed%402x_100-368x368.png",
            "Link": "https://www.cherrymx.de/en/mx-original/mx-red.html",
            "Base Price": 1,
            "Tactility": "Linear",
            "Spring Weight": "46g",
            "Actuation Distance": "2.0 mm",
            "Bottom-out Distance": "4.0 mm",
            price: 1,
            casingColor: [0.05, 0.05, 0.05]
        },
        "Keycaps": {
            "Name": "GMK Modern Dolch",
            "Image": "https://matrixzj.github.io/assets/images/gmk-keycaps/Hanami-Dango/kits_pics/base.jpg",
            "Link": "https://geekhack.org/index.php?topic=110049.0",
            "Base Price": 134.99,
            "Colors": [
                "Beige",
                "Green",
                "Red"
            ],
            "Material": "ABS",
            "Legends": "Doubleshot",
            price: 1,
            profile: "cherry"
        },
        "Stabilizers": {
            "Name": "GMK Screw-in Stabilizers",
            "Image": "https://cdn.shopify.com/s/files/1/1473/3902/products/O1CN01MtwenC1amQ9FHFKxo__134583372_1800x1800.jpg?v=1598932169",
            "Link": "https://kbdfans.com/collections/keyboard-stabilizer/products/gmk-screw-in-stabilizers",
            "Base Price": 19,
            "Mount Method": "PCB Screw-in",
            "color": [0.05, 0.05, 0.05, 0],
            price: 1
        }
    }); //["Kit"].concat(ALL_PARTS).reduce((o, part) => Object.assign(o, { [part]: null }), {}));
    const [compatibilityFilters, setCompatibilityFilters] = useState(["Kit"].concat(ALL_PARTS).reduce((o, part) => Object.assign(o, { [part]: [] }), {}));

    function handleSelectItem(item, selections, itemType) {
        const selectedValues = Object.values(selections).filter(x => x !== undefined);
        if (selectedValues.some(val => val === NO_SELECTION)) {
            return false;
        }

        // TODO actually look up and get references to items if this is a kit
        // if (itemType === "Case" || itemType === "Plate" || itemType == "PCB") {
        //     // TODO handle compatibility
        // }

        let compatibility = { ...compatibilityFilters };
        const ff = new CompatibilityFilterObj("Form Factor", itemType, [selections["Form Factor"]]);
        if (itemType === "Case") {
            compatibility["PCB"].push(ff);
            compatibility["Plate"].push(ff);
        } else if (itemType === "Plate") {
            compatibility["Case"].push(ff);
            compatibility["PCB"].push(ff);
        } else if (itemType === "PCB") {
            compatibility["Case"].push(ff);
            compatibility["Plate"].push(ff);
        }

        const price = item["Base Price"] + selectedValues.reduce((extra, val) => extra + (val.extra || 0), 0);

        setSelectedItems({ ...selectedItems, [itemType]: { ...item, price } });
        setCompatibilityFilters(compatibility);

        return true;
    }

    function handleRemoveItem(itemType) {
        const filters = { ...compatibilityFilters };
        for (const field in filters) {
            filters[field] = filters[field].filter(f => f.origin !== itemType);
        }

        setSelectedItems({ ...selectedItems, [itemType]: null });
        setCompatibilityFilters(filters);
    }

    const partsInKit = selectedItems["Kit"] === null ? [] : ALL_PARTS.filter(part => selectedItems["Kit"][part] !== undefined);

    return (
        <Router>
            <Header />

            <main>
                <Switch>
                    <Route exact path="/">
                        <SelectedItems
                            selectedItems={selectedItems}
                            partsInKit={partsInKit}
                            onDelete={handleRemoveItem}
                        />
                    </Route>
                    <Route path="/select-item/:itemType" render={({ match }) => (
                        <ItemSelection
                            compatibilityFilters={compatibilityFilters[match.params.itemType]}
                            extraFieldInfo={getExtraFieldInfo(match.params.itemType)}
                            onSelect={handleSelectItem}
                        />
                    )} />
                    <Route path="/group-buys">
                        <GroupBuys onSelectItem={
                            (partType, item) => setSelectedItems({ ...selectedItems, [partType]: item })
                        } />
                    </Route>
                    <Route path="/login">
                        <Login />
                    </Route>
                    <Route path="/signup">
                        <SignUp />
                    </Route>
                </Switch>
            </main>
        </Router>
    );
}
