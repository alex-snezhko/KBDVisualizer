import React, { useState } from "react";

import { SelectedItemsTable } from "../SelectedItemsTable/SelectedItemsTable";
import { KeyboardRender } from "../KeyboardRender/KeyboardRender";

import { ALL_ITEM_TYPES, money } from "../../utils/shared";
import { SelectedItems, ItemType, ValidSelectedItems } from "../../types";

import "./Visualizer.scss";

interface VisualizerProps {
    selectedItems: SelectedItems;
    itemsInKit: ItemType[];
    onDelete: (itemType: ItemType) => void;
    onRandomize: () => void;
}

export function Visualizer({ selectedItems, itemsInKit, onDelete, onRandomize }: VisualizerProps) {
    const [collapsed, setCollapsed] = useState(false);

    const totalPrice = ALL_ITEM_TYPES.reduce((total, itemType) => {
        const selectedItem = selectedItems[itemType];
        return total + (selectedItem !== null ? selectedItem.price : 0);
    }, 0);

    const allItemsSelected = ALL_ITEM_TYPES.every(itemType => selectedItems[itemType]);

    return (
        <div id="selected-items-container">
            {!collapsed && (
                <div>
                    <button id="randomize-button" onClick={onRandomize}>Randomize Configuration</button>
                    <SelectedItemsTable
                        itemsInKit={itemsInKit}
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

            <div id="render-container">
                {!allItemsSelected
                    ? <h3>Select a complete keyboard configuration to view render</h3>
                    : <KeyboardRender selectedItems={selectedItems as ValidSelectedItems} />}
            </div>
        </div>
    );
}
