import React, { useState } from "react";

import { SelectedItemsTable } from "../SelectedItemsTable";
import { KeyboardRender } from "../KeyboardRender";

import { ALL_PARTS, money } from "../../utils/shared";
import "./SelectedItems.scss";

export function SelectedItems(props) {
    const [collapsed, setCollapsed] = useState(false);

    const allPartsSelected = ALL_PARTS.every(part => props.selectedItems[part]);
    const totalPrice = ALL_PARTS.reduce((total, part) => total + props.selectedItems[part].price || 0, 0);

    return (
        <div id="selected-items-container">
            {!collapsed && (
                <div>
                    <SelectedItemsTable {...props} />
                    <div>Total Price: {money(totalPrice)}</div>
                </div>
            )}

            <div id="collapse-selected-items">
                <div className="vertical-line" />
                <div id="show-hide-arrow-container" className={!collapsed ? "flipped" : undefined} onClick={() => setCollapsed(!collapsed)}>
                    <div className="vertical">{props.collapsed ? "Show" : "Hide"}</div>
                    <div>&#x3009;</div>
                </div>
                <div className="vertical-line" />
            </div>

            <div>
                <div id="render-container">
                    {allPartsSelected ?
                        <KeyboardRender selectedItems={props.selectedItems} /> :
                        <h3>Select all parts to view keyboard render</h3>}
                </div>
            </div>
        </div>
    );
}
