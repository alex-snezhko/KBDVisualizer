import React from "react";
import { Link } from "react-router-dom";
import { Item, SelectedItems, ItemType } from "../../types";

import { ALL_ITEM_TYPES, money } from "../../utils/shared";

import "./SelectedItemsTable.scss";

interface SelectedItemsTableProps {
    itemsInKit: ItemType[];
    selectedItems: SelectedItems;
    onDelete: (itemType: ItemType) => void;
}

export const SelectedItemsTable = ({ itemsInKit, selectedItems, onDelete }: SelectedItemsTableProps) => (
    <table id="selected-item-table">
        <thead>
            <tr>
                <th className="item-select-cell">Item</th>
                <th className="item-name-cell">Selected</th>
                <th className="item-price-cell">Price</th>
                <th></th>
            </tr>
        </thead>
        <tbody>
            {/* TODO put Kit back once working properly */}
            {/* {["Kit", ...ALL_ITEM_TYPES].map(itemType => ( */}
            {ALL_ITEM_TYPES.map(itemType => {
                const selectedItem = selectedItems[itemType];
                return selectedItem && (
                    <SelectedItemTableRow
                        key={itemType}
                        itemType={itemType}
                        isItemInKit={itemsInKit.includes(itemType)}
                        item={selectedItem}
                        onDelete={onDelete}
                    />
                );
            })}
        </tbody>
    </table>
);

interface SelectedItemTableRowProps {
    itemType: ItemType;
    isItemInKit: boolean;
    item: Item;
    onDelete: (itemType: ItemType) => void;
}

const SelectedItemTableRow = ({ itemType, isItemInKit, item, onDelete }: SelectedItemTableRowProps) => (
    <tr className={isItemInKit ? "item-in-kit" : undefined}>
        <td className="item-select-cell">
            <Link to={`select-item/${itemType}`}>
                <button disabled={isItemInKit} className={`${/* TODO itemType === "Kit"  ? "orange": */"blue"}-button`}>
                    {itemType}
                </button>
            </Link>
        </td>
        <td className="item-name-cell">
            {isItemInKit ? "Included in kit" :
                item &&
                <a href={item.link} target="_blank" rel="noreferrer">
                    <div className="selected-item-image-container item-image-container">
                        <img src={item.image} alt={item.name} />
                    </div>
                    <span className="item-name">{item.name}</span>
                </a>
            }
        </td>
        <td className="item-price-cell">{item && money(item.price)}</td>
        <td>{item &&
            <button className="delete-button" onClick={() => onDelete(itemType)}>
                &#10006;
            </button>}
        </td>
    </tr>
);
