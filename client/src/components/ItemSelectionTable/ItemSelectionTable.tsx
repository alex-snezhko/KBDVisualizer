import React, { useState } from "react";
import { Link } from "react-router-dom";
import { FieldInfo, Item, ItemType, NO_SELECTION, SelectionPropertyOption, SelectionProperty, ValidSelectionPropertyOption, ItemProperty, MultipleProperty } from "../../types";

import { money, displayName } from "../../utils/shared";

import "./ItemSelectionTable.scss";

interface ItemSelectionTableProps {
    itemType: ItemType;
    displayedItems: Item[];
    extraFieldInfo: FieldInfo[];
    onSelectItem: (item: Item, selections: Record<string, ValidSelectionPropertyOption>, itemType: ItemType) => void;
}

export const ItemSelectionTable = ({ itemType, displayedItems, extraFieldInfo, onSelectItem }: ItemSelectionTableProps) => (
    <table>
        <thead>
            <tr>
                {["Name", "Base Price", "Status", ...extraFieldInfo.map(({ name }) => displayName(name))]
                    .map(fieldName => <th key={fieldName}>{fieldName}</th>)
                }
            </tr>
        </thead>
        <tbody>
            {displayedItems.map(item =>
                <ItemSelectionTableRow
                    key={item.name}
                    item={item}
                    itemType={itemType}
                    extraFieldInfo={extraFieldInfo}
                    onSelectItem={onSelectItem}
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
        return `${x.value} (+${money(x.extra)})`;
    } else {
        return x.value;
    }
}

const allFieldsSelected = (selections: Record<string, SelectionPropertyOption>): selections is Record<string, ValidSelectionPropertyOption> => (
    Object.values(selections).every(val => val !== NO_SELECTION)
);

interface ItemSelectionTableRowProps {
    item: Item;
    itemType: ItemType;
    extraFieldInfo: FieldInfo[];
    onSelectItem: (item: Item, selections: Record<string, ValidSelectionPropertyOption>, itemType: ItemType) => void;
}

function ItemSelectionTableRow({ item, itemType, extraFieldInfo, onSelectItem }: ItemSelectionTableRowProps) {
    function initSelections() {
        const selections: Record<string, SelectionPropertyOption> = {};
        for (const fieldInfo of extraFieldInfo) {
            const fieldData = item[fieldInfo.name] as ItemProperty;
            const isSelectionProperty = fieldInfo.type === "single" && Array.isArray(fieldData);
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
            onSelectItem(item, selections, itemType);
        }
    }

    const itemStatusClass = {
        "Interest Check": "interest-check",
        "Group Buy - Active": "group-buy-active",
        "Group Buy - Closed": "group-buy-closed",
        "Restocking": "restocking"
    }[item.status];
    
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
            <td><div className={`item-status ${itemStatusClass}`}>{item.status}</div></td>

            {extraFieldInfo.map(f => (
                <ItemSelectionTableCell
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

interface ItemSelectionTableCellProps {
    item: Item;
    selections: Record<string, SelectionPropertyOption>;
    fieldInfo: FieldInfo;
    onSelectOption: (fieldName: string, selectedOption: SelectionPropertyOption) => void;
}

function ItemSelectionTableCell({ item, selections, fieldInfo, onSelectOption }: ItemSelectionTableCellProps) {

    function handleSelectionChange(e: React.ChangeEvent<HTMLSelectElement>) {
        const options = item[fieldInfo.name] as SelectionProperty;
        const selectedOption = options.find(opt => displayOption(opt) === e.target.value) || NO_SELECTION;
        onSelectOption(fieldName, selectedOption);
    }

    const fieldName = fieldInfo.name;

    // the actual data of this item
    const data = item[fieldName] as ItemProperty;

    // let content;
    // const isSimpleProperty = !(typeof data === "object" && "type" in data);
    // if (isSimpleProperty) {
    //     content = fieldInfo.display(data.toString());
    // } else if (data.type === "multiple") {
    //     content = data.values.join(", ");
    // } else if (data.type === "selection") {
    //     content = (
    //         <select
    //             value={displayOption(selections[fieldName])}
    //             onChange={handleSelectionChange}
    //         >
    //             {[NO_SELECTION as SelectionPropertyOption, ...data.options].map(opt => {
    //                 const displayed = displayOption(opt);
    //                 return <option key={displayed} value={displayed}>{displayed}</option>;
    //             })}
    //         </select>
    //     );
    // }
    let content;
    if (fieldInfo.type === "single") {
        const isSelection = Array.isArray(data);
        if (isSelection) {
            const options = data as SelectionProperty;
            content = (
                <select
                    value={displayOption(selections[fieldName])}
                    onChange={handleSelectionChange}
                >
                    {[NO_SELECTION as SelectionPropertyOption, ...options].map(opt => {
                        const displayed = displayOption(opt);
                        return <option key={displayed} value={displayed}>{displayed}</option>;
                    })}
                </select>
            );
        } else {
            content = fieldInfo.display(data.toString());
        }
    } else if (fieldInfo.type === "multiple") {
        content = (data as MultipleProperty).join(", ");
    }

    return <td>{content}</td>;
}
