import React, { useState } from "react";

import { SelectedItemsTable } from "../SelectedItemsTable/SelectedItemsTable";
import { KeyboardRender } from "../KeyboardRender/KeyboardRender";

import { ALL_PARTS, money } from "../../utils/shared";
import { Items, ItemType } from "../../types";

import "./Visualizer.scss";

interface VisualizerProps {
    selectedItems: Items;
    partsInKit: ItemType[];
    onDelete: (itemType: ItemType) => void;
}

export function Visualizer({ selectedItems, partsInKit, onDelete }: VisualizerProps) {
    const [collapsed, setCollapsed] = useState(false);

    const totalPrice = ALL_PARTS.reduce((total, part) => {
        const selectedItem = selectedItems[part];
        return total + (selectedItem !== null ? selectedItem.price : 0);
    }, 0);

    return (
        <div id="selected-items-container">
            {!collapsed && (
                <div>
                    <SelectedItemsTable
                        partsInKit={partsInKit}
                        selectedItems={selectedItems}
                        onDelete={onDelete}
                    />
                    <div>Total Price: {money(totalPrice)}</div>
                </div>
            )}

            <div id="collapse-selected-items">
                <div className="vertical-line" />
                <div id="show-hide-arrow-container" className={!collapsed ? "flipped" : undefined} onClick={() => setCollapsed(!collapsed)}>
                    <div className="vertical">{collapsed ? "Show" : "Hide"}</div>
                    <div>&#x3009;</div>
                </div>
                <div className="vertical-line" />
            </div>

            <div>
                <KeyboardRender selectedItems={selectedItems} />
            </div>
        </div>
    );
}