import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

import { Login } from "../Login/Login";
import { SignUp } from "../SignUp/SignUp";
import { Header } from "../Header/Header";
import { GroupBuys } from "../GroupBuys/GroupBuys";
import { ItemSelection } from "../ItemSelection/ItemSelection";
import { Visualizer } from "../Visualizer/Visualizer";

import { Item, Items, ItemType } from "../../types";

import { ALL_PARTS, NO_SELECTION } from "../../utils/shared";
import { fetchRandomItemConfig } from "../../apiInteraction";

import "./App.scss";

const emptyItems: Items = {
    "Case": null,
    "Plate": null,
    "PCB": null,
    "Stabilizers": null,
    "Switches": null,
    "Keycaps": null
};

// TODO decide on "part" or "item"

export function App() {
    const [selectedItems, setSelectedItems] = useState<Items>(emptyItems);
    // TODO
    // const [compatibilityFilters, setCompatibilityFilters] = useState(["Kit"].concat(ALL_PARTS).reduce((o, part) => Object.assign(o, { [part]: [] }), {}));

    // TODO generate random config button
    useEffect(() => {
        fetchRandomItemConfig()
        .then(items => setSelectedItems(items));
    }, []);

    function handleSelectItem(item: Item, selections: Record<string, string>, itemType: ItemType) {
        const selectedValues = Object.values(selections).filter(x => x !== undefined);
        if (selectedValues.some(val => val === NO_SELECTION)) {
            alert("Please select a value for all options for this item");
            return;
        }

        // TODO actually look up and get references to items if this is a kit
        // if (itemType === "Case" || itemType === "Plate" || itemType == "PCB") {
        //     // TODO handle compatibility
        // }

        // let compatibility = { ...compatibilityFilters };
        // const ff = new CompatibilityFilterObj("form_factor", itemType, [selections["form_factor"]]);
        // if (itemType === "Case") {
        //     compatibility["PCB"].push(ff);
        //     compatibility["Plate"].push(ff);
        // } else if (itemType === "Plate") {
        //     compatibility["Case"].push(ff);
        //     compatibility["PCB"].push(ff);
        // } else if (itemType === "PCB") {
        //     compatibility["Case"].push(ff);
        //     compatibility["Plate"].push(ff);
        // }

        const price = item.price + selectedValues.reduce((extra, val) => extra + (val.extra || 0), 0);

        setSelectedItems({ ...selectedItems, [itemType]: { ...item, price } });
        // setCompatibilityFilters(compatibility);

    }

    function handleRemoveItem(itemType: ItemType) {
        // const filters = { ...compatibilityFilters };
        // for (const field in filters) {
        //     filters[field] = filters[field].filter(f => f.origin !== itemType);
        // }

        setSelectedItems({ ...selectedItems, [itemType]: null });
        // setCompatibilityFilters(filters);
    }

    // TODO
    // const partsInKit = selectedItems["Kit"] === null ? [] : ALL_PARTS.filter(part => selectedItems["Kit"][part] !== undefined);
    const partsInKit: ItemType[] = [];

    return (
        <Router>
            <Header />

            <main>
                <Routes>
                    <Route path="/" element={
                        <Visualizer
                            selectedItems={selectedItems}
                            partsInKit={partsInKit}
                            onDelete={handleRemoveItem}
                        />}
                    />
                    <Route path="/select-item/:itemType" element={
                        <ItemSelection
                            // compatibilityFilters={compatibilityFilters[match.params.itemType]}
                            // extraFieldInfo={getExtraFieldInfo(match.params.itemType)}
                            onSelect={handleSelectItem}
                        />}
                    />
                    <Route path="/group-buys" element={
                        <GroupBuys onSelectItem={
                            (partType: ItemType, item: Item) => setSelectedItems({ ...selectedItems, [partType]: item })
                        } />}
                    />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<SignUp />} />
                </Routes>
            </main>
        </Router>
    );
}