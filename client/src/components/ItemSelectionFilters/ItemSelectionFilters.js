import React from "react";

import { displayName } from "../../utils/shared";

import "./ItemSelectionFilters.scss";

export const ItemSelectionFilters = ({ filters, onUpdateNumericFilter, onUpdateSelectionFilter }) => (
    <div id="filters-box">
        <h2>Filters</h2>

        {filters.map(filter =>
            filter.filterType === "numeric"
                ? <NumericRangeFilter key={filter.fieldName} filter={filter} onUpdateFilter={onUpdateNumericFilter} />
                : <SelectionFilter key={filter.fieldName} filter={filter} onUpdateFilter={onUpdateSelectionFilter} />
        )}
    </div>
);

function NumericRangeFilter({ filter, onUpdateFilter }) {
    const { fieldName, value: { low, high } } = filter;

    function handleChangeLow(event) {
        const val = event.target.value;
        if (!isNaN(val)) {
            onUpdateFilter(fieldName, val, high);
        }
    }

    function handleChangeHigh(event) {
        const val = event.target.value;
        if (!isNaN(val)) {
            onUpdateFilter(fieldName, low, val);
        }
    }

    return (
        <div>
            <h4>{displayName(fieldName)}</h4>
            <span className="numeric-range-input"><input type="text" value={low} onChange={handleChangeLow} /></span>
            -
            <span className="numeric-range-input"><input type="text" value={high} onChange={handleChangeHigh} /></span>
        </div>
    );
}

function SelectionFilter({ filter, onUpdateFilter }) {
    const { fieldName, filterType, value } = filter;

    return (
        <div>
            <h4>{displayName(fieldName)} <em>({filterType === "selectionAllOf" ? "Match all" : "Match any"})</em></h4>
            {value.map(({ option, selected }) =>
                <div key={option}>
                    <input
                        type="checkbox"
                        id={`filter-option-${fieldName}-${option}`}
                        checked={selected}
                        onChange={() => onUpdateFilter(fieldName, option)}
                    />
                    <label htmlFor={`filter-option-${fieldName}-${option}`}>{option}</label>
                </div>
            )}
        </div>
    );
}