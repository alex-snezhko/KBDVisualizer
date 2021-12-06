import React, { useState } from "react";
import { Link } from "react-router-dom";
import { FieldInfo, Item, ItemType, NO_SELECTION, SelectionPropertyOption, SelectionProperty, ValidSelectionPropertyOption, ItemProperty } from "../../types";

import { money, displayName } from "../../utils/shared";

interface ItemSelectionTableProps {
    itemType: ItemType;
    displayedItems: Item[];
    extraFieldInfo: FieldInfo[];
    onSelect: (item: Item, selections: Record<string, ValidSelectionPropertyOption>, itemType: ItemType) => void;
}

export const ItemSelectionTable = ({ itemType, displayedItems, extraFieldInfo, onSelect }: ItemSelectionTableProps) => (
    displayedItems.length === 0 ? <h3>No Items Found To Match Filters</h3> : 
        <table>
            <thead>
                <tr>
                    {["Name", "Base Price"].concat(extraFieldInfo.map(fieldInfo => displayName(fieldInfo.name)))
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
                        extraFieldInfo={extraFieldInfo}
                        onSelect={onSelect}
                    />)}
            </tbody>
        </table>
);

// function that properly displays option text
function displayOption(x: SelectionPropertyOption): string {
    if (x === NO_SELECTION) {
        // default value of select field if no option is selected
        return NO_SELECTION;
    } else if (x.extra) {
        return `${x.optionText} (+${money(x.extra)})`;
    } else {
        return x.optionText;
    }
}

const allFieldsSelected = (selections: Record<string, SelectionPropertyOption>): selections is Record<string, ValidSelectionPropertyOption> => (
    Object.values(selections).every(val => val !== NO_SELECTION)
);

interface ItemSelectionRowProps {
    item: Item;
    itemType: ItemType;
    extraFieldInfo: FieldInfo[];
    onSelect: (item: Item, selections: Record<string, ValidSelectionPropertyOption>, itemType: ItemType) => void;
}

function ItemSelectionRow({ item, itemType, extraFieldInfo, onSelect }: ItemSelectionRowProps) {
    function initSelections() {
        const selections: Record<string, SelectionPropertyOption> = {};
        for (const fieldInfo of extraFieldInfo) {
            const fieldData = item[fieldInfo.name] as ItemProperty;
            const isSelectionProperty = typeof fieldData === "object" && "type" in fieldData && fieldData.type === "selection";
            if (isSelectionProperty) {
                selections[fieldInfo.name] = NO_SELECTION;
            }
        }
        return selections;
    }

    // keep state of all selections made for each field
    const [selections, setSelections] = useState(initSelections());

    function handleSelectOption(field: string, selectedOption: SelectionPropertyOption) {
        setSelections({ ...selections, [field]: selectedOption });
    }

    function handleSelectItem() {
        if (!allFieldsSelected(selections)) {
            alert("Please select a value for all options for this item");
        } else {
            onSelect(item, selections, itemType);
        }
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
                    onSelectOption={handleSelectOption}
                />
            ))}

            <td className="item-select-cell">
                <Link to="/">
                    <button className="blue-button" onClick={handleSelectItem}>
                        Select
                    </button>
                </Link>
            </td>
        </tr>
    );
}

interface ItemSelectionCellProps {
    item: Item;
    selections: Record<string, SelectionPropertyOption>;
    fieldInfo: FieldInfo;
    onSelectOption: (fieldName: string, selectedOption: SelectionPropertyOption) => void;
}

function ItemSelectionCell({ item, selections, fieldInfo, onSelectOption }: ItemSelectionCellProps) {

    function handleSelectionChange(e: React.ChangeEvent<HTMLSelectElement>) {
        const options = (item[fieldInfo.name] as SelectionProperty).options;
        const selectedOption = options.find(opt => displayOption(opt) === e.target.value) || NO_SELECTION;
        onSelectOption(fieldName, selectedOption);
    }

    const fieldName = fieldInfo.name;

    // the actual data of this item
    const data = item[fieldName] as ItemProperty;

    let content;
    const isSimpleProperty = !(typeof data === "object" && "type" in data);
    if (isSimpleProperty) {
        content = fieldInfo.display(data.toString());
    } else if (data.type === "multiple") {
        content = data.values.join(", ");
    } else if (data.type === "selection") {
        content = (
            <select
                value={displayOption(selections[fieldName])}
                onChange={handleSelectionChange}
            >
                {[NO_SELECTION as SelectionPropertyOption].concat(data.options).map(opt => {
                    const displayed = displayOption(opt);
                    return <option key={displayed} value={displayed}>{displayed}</option>;
                })}
            </select>
        );
    }

    return <td>{content}</td>;
}
