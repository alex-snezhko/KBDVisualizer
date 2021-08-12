import React, { useState, useEffect } from "react";

import { fetchFilterRanges } from "../../apiInteraction";

import "./ItemSelectionFilters.scss";

export function ItemSelectionFilters({ itemType, onUpdateFilters }) {
    const [filters, setFilters] = useState([]);

    useEffect(async () => {
        const filterRanges = await fetchFilterRanges(itemType);

        // indicate that all selection options are unselected
        const filters = filterRanges.map(filter => {
            switch (filter.type) {
            case "selectionOneOf":
                return { ...filter, value: filter.value.map(option => ({ option, selected: true })) };
            case "selectionAllOf":
                return { ...filter, value: filter.value.map(option => ({ option, selected: false })) };
            default:
                return filter;
            }
        });
        setFilters(filters);
    }, []);

    function handleUpdateNumericFilter(fieldName, low, high) {
        const newFilters = [...filters];
        const numericFilter = newFilters.find(filter => filter.fieldName === fieldName);
        numericFilter.low = low;
        numericFilter.high = high;
        setFilters(newFilters);
    }

    function handleUpdateSelectionFilter(fieldName, option) {
        const newFilters = [...filters];
        const selectionFilter = newFilters.find(filter => filter.fieldName === fieldName);

        const selections = [...selectionFilter.value];
        const selection = selections.find(opt => opt === option);
        selection.selected = !selection.selected;
        newFilters.value = selections;
        
        setFilters(newFilters);
    }

    return (
        <div id="filters-box">
            <h2>Filters</h2>

            {filters.map(filter =>
                filter.type === "numeric" ?
                    <NumericRangeFilter key={filter.fieldName} filter={filter} onUpdateNumericFilter={handleUpdateNumericFilter} /> :
                    <SelectionFilter key={filter.fieldName} filter={filter} onUpdateFilter={handleUpdateSelectionFilter} />
            )}

            <button onClick={() => onUpdateFilters(filters)}>Filter By Selections</button>
        </div>
    );
}

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
            <h4>{fieldName}</h4>
            <input type="text" value={low} onChange={handleChangeLow} />
            -
            <input type="text" value={high} onChange={handleChangeHigh} />
        </div>
    );
}

function SelectionFilter({ filter, onUpdateFilter }) {
    const { fieldName, type, value: options } = filter;

    return (
        <div>
            <h4>{fieldName} <em>({type === "selectionAllOf" ? "Match all" : "Match any"})</em></h4>
            {options.map(opt =>
                <div key={opt}>
                    <input
                        type="checkbox"
                        id={`filter-option-${fieldName}-${opt}`}
                        checked={opt.selected}
                        onChange={() => onUpdateFilter(opt)}
                    />
                    <label htmlFor={`filter-option-${fieldName}-${opt}`}>{opt}</label>
                </div>
            )}
        </div>
    );
}
