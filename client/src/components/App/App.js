import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";

import { Login } from "../Login";
import { SignUp } from "../SignUp";
import { Header } from "../Header";
import { GroupBuys } from "../GroupBuys";
import { ItemSelection } from "../ItemSelection";
import { SelectedItems } from "../SelectedItems";

import { ALL_PARTS, NO_SELECTION, CompatibilityFilterObj } from "../../utils/shared";
import "./App.scss";
import { fetchRandomItemConfig } from "../../apiInteraction";

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
    const [selectedItems, setSelectedItems] = useState(null);
    const [compatibilityFilters, setCompatibilityFilters] = useState(["Kit"].concat(ALL_PARTS).reduce((o, part) => Object.assign(o, { [part]: [] }), {}));

    useEffect(async () => {
        const items = await fetchRandomItemConfig();
        setSelectedItems(items);
    }, []);

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

    if (selectedItems == null) {
        return null;
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
