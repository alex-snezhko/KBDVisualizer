import React from "react";

import { SelectionFilterObj } from "../../utils/shared";
import "./ItemSelectionFilters.scss";

export const ItemSelectionFilters = ({ filters, onUpdateFilter }) => (
    <div id="filters-box">
        <h2>Filters</h2>

        {filters.map(filter => {
            const propsToPass = {
                filter,
                onUpdateFilter: val => onUpdateFilter(filter.field, val)
            };

            return filter instanceof SelectionFilterObj ?
                <SelectionFilter key={filter.field} {...propsToPass} /> :
                <NumericRangeFilter key={filter.field} {...propsToPass} />;
        })}
    </div>
);

function NumericRangeFilter(props) {
    const { field, low, high, display } = props.filter;

    function handleOnChange(event, other, isLow) {
        const val = event.target.value;
        if (!isNaN(val)) {
            props.onUpdateFilter(isLow ? [val, other] : [other, val]);
        }
    }

    return (
        <div>
            <h4>{field}</h4>
            {display(<input type="text" value={low} onChange={e => handleOnChange(e, high, false)} />)}
            -
            {display(<input type="text" value={high} onChange={e => handleOnChange(e, low, true)} />)}
        </div>
    );
}

function SelectionFilter(props) {
    const { field, passAll, all, selected } = props.filter;

    // TODO add 'alternate' field to items to describe a more general (say, color)

    return (
        <div>
            <h4>{field} {passAll && <em>(Match all)</em>}</h4>
            {Array.from(all).map(opt =>
                <div key={opt}>
                    <input
                        type="checkbox"
                        id={`filter-option-${field}-${opt}`}
                        checked={selected.has(opt)}
                        onChange={() => props.onUpdateFilter(opt)}
                    />
                    <label htmlFor={`filter-option-${field}-${opt}`}>{opt}</label>
                </div>
            )}
        </div>
    );
}
