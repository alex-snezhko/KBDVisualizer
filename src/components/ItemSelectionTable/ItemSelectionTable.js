import React, { useState } from "react";
import { Link } from "react-router-dom";

import { NO_SELECTION, money, displayOption } from "../../utils/shared";

export const ItemSelectionTable = ({ displayedItems, ...otherProps }) => (
    displayedItems.length === 0 ? <h3>No Items Found To Match Filters</h3> : 
        <table>
            <thead>
                <tr>
                    {["Name", "Base Price"].concat(otherProps.extraFieldInfo.map(fieldInfo => fieldInfo.name))
                        .map(fieldName => <th key={fieldName}>{fieldName}</th>)
                    }
                </tr>
            </thead>
            <tbody>
                {displayedItems.map(item => <ItemSelectionRow key={item["Name"]} item={item} {...otherProps} />)}
            </tbody>
        </table>
);

function ItemSelectionRow(props) {
    const item = props.item;

    // keep state of all selections made for each field
    const [selections, setSelections] = useState(props.extraFieldInfo.reduce((obj, fieldInfo) => {
        const fieldData = item[fieldInfo.name];
        const selection = fieldData && fieldData.type === "selection" ? NO_SELECTION : fieldData;
        return Object.assign(obj, { [fieldInfo.name]: selection });
    }, {}));
    
    return (
        <tr>
            <td className="item-name-cell">
                <a href={item["Link"]} target="_blank" rel="noreferrer">
                    <div className="item-image-container">
                        <img src={item["Image"]} alt={item["Name"]} />
                    </div>
                    <div className="item-name">{item["Name"]}</div>
                </a>
            </td>
            <td className="item-price-cell">{money(item["Base Price"])}</td>

            {props.extraFieldInfo.map(f => (
                <ItemSelectionCell
                    key={f.name}
                    selections={selections}
                    fieldInfo={f}
                    onSelectionChange={(field, val) => 
                        setSelections({
                            ...selections,
                            [field]: item[field].options.find(x => displayOption(x) === val)
                        })
                    }
                    {...props}
                />
            ))}

            <td className="item-select-cell">
                <Link to="/">
                    <button className="blue-button" onClick={() => {
                        const allGood = props.onSelect(item, selections, props.itemType);
                        if (!allGood) {
                            alert("Please select all relevant values");
                        }
                    }}>
                        Select
                    </button>
                </Link>
            </td>
        </tr>
    );
}

function ItemSelectionCell({ item, selections, fieldInfo, onSelectionChange }) {
    const fieldName = fieldInfo.name;

    // the actual data of this item
    const data = item[fieldName];

    /* eslint-disable indent */
    return (
        <td>
            {
                data === undefined ? null :
                Array.isArray(data) ? data.join(", ") :
                data.type === "selection" ?
                    <select
                        value={displayOption(fieldInfo.display(selections[fieldName]))}
                        onChange={e => onSelectionChange(fieldName, e.target.value)}
                    >
                        {[NO_SELECTION].concat(data.options.map(opt => fieldInfo.display(opt))).map(opt => {
                            const displayed = displayOption(opt);
                            return <option key={displayed} value={displayed}>{displayed}</option>;
                        })}
                    </select> :
                fieldInfo.display(data)
            }
        </td>
    );
}
