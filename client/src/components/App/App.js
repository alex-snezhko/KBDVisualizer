import React, { useState } from "react";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";

import { Login } from "../Login";
import { SignUp } from "../SignUp";
import { Header } from "../Header";
import { GroupBuys } from "../GroupBuys";
import { ItemSelection } from "../ItemSelection";
import { SelectedItems } from "../SelectedItems";

import { ALL_PARTS, NO_SELECTION, CompatibilityFilterObj } from "../../utils/shared";
import "./App.scss";

function getExtraFieldInfo(itemType) {
    const std = (name) => ({ name, display: x => x });

    return {
        "Kit": [std("form_factor")].concat(ALL_PARTS.map(part => std(part))),
        "Case": [std("form_factor"), std("material"), std("color"), std("mount_method")],
        "Plate": [std("form_factor"), std("material")],
        "PCB": [std("form_factor"), std("hot_swap"), std("backlight")],
        "Stabilizers": [std("mount_method")],
        "Switches": [std("tactility"), { name: "spring_weight", display: x => x + "g" },
            { name: "act_dist", display: x => x.toFixed(1) + " mm" },
            { name: "bot_dist", display: x => x.toFixed(1) + " mm" }],
        "Keycaps": [std("color"), std("material"), std("legends")]
    }[itemType] || [];
}

export function App() {
    const [selectedItems, setSelectedItems] = useState({
        "Kit": null,
        "Case": {
            "name": "Tofu 65% Aluminum",
            "image": "https://cdn.shopify.com/s/files/1/1473/3902/products/8b9cc7c9808a81fc8db0eaf67a4d79d7_b3abc1fb-7837-45dd-bbca-f1b4202bc9e2_1800x1800.jpg?v=1584436794",
            "link": "https://kbdfans.com/collections/65-layout-case/products/in-stocktofu-65-aluminum-case",
            "price": 125,
            "form_factor": "65%",
            "mount_method": "Tray Mount",
            "material": "Aluminum",
            "color": {"type": "selection", "options": ["Silver", "Grey", "Black", "Chocolate", "Burgundy", "Purple", "Ink Blue", {"type": "E-White", "extra": 4}]}
        },
        "Plate": {
            "name": "KBDPad MKII Brass Plate",
            "image": "https://cdn.shopify.com/s/files/1/1473/3902/products/8_d0a22ed5-026f-4709-b469-2cb6d618abb1_1800x1800.jpg?v=1601098440",
            "link": "https://kbdfans.com/collections/plate/products/kbdpad-mkii-brass-plate",
            "price": 18,
            "form_factor": "Numpad",
            "material": "Brass"
        },
        "PCB": {
            "name": "DZ60 Rev 3.0 PCB",
            "image": "https://cdn.shopify.com/s/files/1/1473/3902/products/c_1_1800x1800.jpg?v=1584436582",
            "link": "https://kbdfans.com/collections/pcb/products/dz60-60-pcb",
            "price": 38,
            "form_factor": "60%",
            "hot_swap": "No",
            "backlight": "RGB Underglow",
        },
        "Switches": {
            "name": "Cherry MX Red",
            "image": "https://www.cherrymx.de/_Resources/Persistent/d4e5d661da4d28eb2c5d6321289c29ac2d6cbd56/img-productstage-mxRed%402x_100-368x368.png",
            "link": "https://www.cherrymx.de/en/mx-original/mx-red.html",
            "price": 1,
            "tactility": "Linear",
            "spring_weight": "46g",
            "act_dist": "2.0 mm",
            "bot_dist": "4.0 mm",
            casingColor: [0.05, 0.05, 0.05]
        },
        "Keycaps": {
            "name": "GMK Modern Dolch",
            "image": "https://matrixzj.github.io/assets/images/gmk-keycaps/Hanami-Dango/kits_pics/base.jpg",
            "link": "https://geekhack.org/index.php?topic=110049.0",
            "price": 134.99,
            "color": [
                "Beige",
                "Green",
                "Red"
            ],
            "material": "ABS",
            "legends": "Doubleshot",
            profile: "cherry"
        },
        "Stabilizers": {
            "name": "GMK Screw-in Stabilizers",
            "image": "https://cdn.shopify.com/s/files/1/1473/3902/products/O1CN01MtwenC1amQ9FHFKxo__134583372_1800x1800.jpg?v=1598932169",
            "link": "https://kbdfans.com/collections/keyboard-stabilizer/products/gmk-screw-in-stabilizers",
            "price": 19,
            "mount_method": "PCB Screw-in",
            "color": [0.05, 0.05, 0.05, 0]
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
        const ff = new CompatibilityFilterObj("form_factor", itemType, [selections["form_factor"]]);
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

        const price = item["price"] + selectedValues.reduce((extra, val) => extra + (val.extra || 0), 0);

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
