import React from "react";
import { Link } from "react-router-dom";

import { ALL_PARTS, money } from "../../utils/shared";
import "./SelectedItemsTable.scss";

export const SelectedItemsTable = ({ partsInKit, selectedItems, onDelete }) => (
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
            {["Kit"].concat(ALL_PARTS).map(itemType => (
                <SelectedItemTableRow
                    key={itemType}
                    itemType={itemType}
                    isPartInKit={partsInKit.includes(itemType)}
                    item={selectedItems[itemType]}
                    onDelete={onDelete}
                />
            ))}
        </tbody>
    </table>
);

const SelectedItemTableRow = ({ itemType, isPartInKit, item, onDelete }) => (
    <tr className={isPartInKit ? "part-in-kit" : undefined}>
        <td className="item-select-cell">
            <Link to={`select-item/${itemType}`}>
                <button disabled={isPartInKit} className={`${itemType === "Kit" ? "orange": "blue"}-button`}>
                    {itemType}
                </button>
            </Link>
        </td>
        <td className="item-name-cell">
            {isPartInKit ? "Included in kit" :
                item &&
                <a href={item["Link"]} target="_blank" rel="noreferrer">
                    <div className="selected-item-image-container item-image-container">
                        <img src={item["Image"]} alt={item["Name"]} />
                    </div>
                    <span className="item-name">{item["Name"]}</span>
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
