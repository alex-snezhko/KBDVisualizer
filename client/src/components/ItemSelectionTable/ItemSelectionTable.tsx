import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Item, ItemType } from "../../types";

import { NO_SELECTION, money, displayOption, displayName } from "../../utils/shared";

interface ItemSelectionTableProps {
    itemType: ItemType;
    displayedItems: Item[];
    onSelect: (item: Item, selections: Record<string, string>, itemType: ItemType) => boolean;
}

export const ItemSelectionTable = ({ itemType, displayedItems, onSelect }: ItemSelectionTableProps) => (
    displayedItems.length === 0 ? <h3>No Items Found To Match Filters</h3> : 
        <table>
            <thead>
                <tr>
                    {["Name", "Base Price"].concat(otherProps.extraFieldInfo.map(fieldInfo => displayName(fieldInfo.name)))
                        .map(fieldName => <th key={fieldName}>{fieldName}</th>)
                    }
                </tr>
            </thead>
            <tbody>
                {displayedItems.map(item =>
                    <ItemSelectionRow
                        key={item.name}
                        item={item}
                        itemType={itemType}
                        onSelect={onSelect}
                    />)}
            </tbody>
        </table>
);

interface ItemSelectionRowProps {
    item: Item;
    itemType: ItemType;
    extraFieldInfo: any;
    onSelect: (item: Item, selections: Record<string, string>, itemType: ItemType) => boolean;
}

function ItemSelectionRow({ item, itemType, extraFieldInfo, onSelect }: ItemSelectionRowProps) {
    // keep state of all selections made for each field
    const [selections, setSelections] = useState(extraFieldInfo.reduce((obj, fieldInfo) => {
        const fieldData = item[fieldInfo.name];
        const selection = fieldData && fieldData.type === "selection" ? NO_SELECTION : fieldData;
        return Object.assign(obj, { [fieldInfo.name]: selection });
    }, {}));

    function handleSelectionChange(field: string, val) {
        setSelections({
            ...selections,
            [field]: item[field].options.find(x => displayOption(x) === val)
        });
    }
    
    return (
        <tr>
            <td className="item-name-cell">
                <a href={item.link} target="_blank" rel="noreferrer">
                    <div className="item-image-container">
                        <img src={item.image} alt={item.name} />
                    </div>
                    <div className="item-name">{item.name}</div>
                </a>
            </td>
            <td className="item-price-cell">{money(item.price)}</td>

            {extraFieldInfo.map(f => (
                <ItemSelectionCell
                    key={f.name}
                    item={item}
                    selections={selections}
                    fieldInfo={f}
                    onSelectionChange={handleSelectionChange}
                />
            ))}

            <td className="item-select-cell">
                <Link to="/">
                    <button className="blue-button" onClick={() => {
                        const allGood = onSelect(item, selections, itemType);
                        if (!allGood) {
                            alert("Please select a value for all options for this item");
                        }
                    }}>
                        Select
                    </button>
                </Link>
            </td>
        </tr>
    );
}

interface ItemSelectionCellProps {
    item: Item; // TODO
    selections: any;
    fieldInfo: any;
    onSelectionChange: any;
}

function ItemSelectionCell({ item, selections, fieldInfo, onSelectionChange }: ItemSelectionCellProps) {
    const fieldName = fieldInfo.name;

    // the actual data of this item
    const data = item[fieldName];

    if (data === undefined) {
        return null;
    }

    let content;
    if (Array.isArray(data)) {
        content = data.join(", ");
    } else if (data.type !== "selection") {
        content = fieldInfo.display(data);
    } else {
        content = (
            <select
                value={displayOption(fieldInfo.display(selections[fieldName]))}
                onChange={e => onSelectionChange(fieldName, e.target.value)}
            >
                {[NO_SELECTION].concat(data.options.map(opt => fieldInfo.display(opt))).map(opt => {
                    const displayed = displayOption(opt);
                    return <option key={displayed} value={displayed}>{displayed}</option>;
                })}
            </select>
        );
    }

    return <td>{content}</td>;
}
