import React from "react";

import { displayName } from "../../utils/shared";
import { Filter, NumRangeFilter, SelectFilter } from "../../types";

import "./ItemSelectionFilters.scss";

interface ItemSelectionFiltersProps {
    filters: Filter[];
    onUpdateNumericFilter: (fieldName: string, low: number, high: number) => void;
    onUpdateSelectionFilter: (fieldName: string, option: string) => void;
}

export const ItemSelectionFilters = ({ filters, onUpdateNumericFilter, onUpdateSelectionFilter }: ItemSelectionFiltersProps) => (
    <div id="filters-box">
        <h2>Filters</h2>

        {filters.map(filter => filter.filterType === "numeric"
            ? <NumericRangeFilter key={filter.fieldName} filter={filter} onUpdateFilter={onUpdateNumericFilter} />
            : <SelectionFilter key={filter.fieldName} filter={filter} onUpdateFilter={onUpdateSelectionFilter} />
        )}
    </div>
);

interface NumericRangeFilterProps {
    filter: NumRangeFilter;
    onUpdateFilter: (fieldName: string, low: number, high: number) => void;
}

function NumericRangeFilter({ filter, onUpdateFilter }: NumericRangeFilterProps) {
    const { fieldName, value: { low, high } } = filter;

    function handleChangeLow(event: React.ChangeEvent<HTMLInputElement>) {
        const val = event.target.value;
        if (val === "") {
            onUpdateFilter(fieldName, Number.NEGATIVE_INFINITY, high);
        }

        if (!isNaN(Number(val))) {
            onUpdateFilter(fieldName, Number(val), high);
        }
    }

    function handleChangeHigh(event: React.ChangeEvent<HTMLInputElement>) {
        const val = event.target.value;
        if (val === "") {
            onUpdateFilter(fieldName, low, Number.POSITIVE_INFINITY);
        }

        if (!isNaN(Number(val))) {
            onUpdateFilter(fieldName, low, Number(val));
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

interface SelectionFilterProps {
    filter: SelectFilter;
    onUpdateFilter: (fieldName: string, option: string) => void;
}

function SelectionFilter({ filter, onUpdateFilter }: SelectionFilterProps) {
    const { fieldName, filterType, value } = filter;

    return (
        <div>
            <h4>{displayName(fieldName)} {filterType === "selectionAllOf" && <em>Match all</em>}</h4>
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