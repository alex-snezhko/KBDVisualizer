import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

import { ItemSelectionTable } from "../ItemSelectionTable";
import { ItemSelectionFilters } from "../ItemSelectionFilters";

import "./ItemSelection.scss";
import { fetchItems, fetchFilterRanges } from "../../apiInteraction";

export function ItemSelection(props) {
    const [items, setItems] = useState(null);
    const [filters, setFilters] = useState(null);
    const [sortBy, setSortBy] = useState("alpha");

    const { itemType } = useParams();

    function handleUpdateNumericFilter(fieldName, low, high) {
        const newFilters = [...filters];
        const numericFilter = newFilters.find(filter => filter.fieldName === fieldName);
        numericFilter.value.low = low;
        numericFilter.value.high = high;
        setFilters(newFilters);
    }

    function handleUpdateSelectionFilter(fieldName, option) {
        const newFilters = [...filters];
        const selectionFilter = newFilters.find(filter => filter.fieldName === fieldName);

        const selections = [...selectionFilter.value];
        const selection = selections.find(opt => opt.option === option);
        selection.selected = !selection.selected;
        newFilters.value = selections;
        
        setFilters(newFilters);
    }

    // get filter values
    useEffect(async () => {
        const filterRanges = await fetchFilterRanges(itemType);

        // indicate that all selection options are unselected
        const filters = filterRanges.map(filter => {
            switch (filter.filterType) {
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

    // update items
    useEffect(async () => {
        if (!filters) {
            return;
        }

        const filterParams = {};
        for (const filter of filters) {
            if (filter.filterType === "numeric") {
                filterParams[filter.fieldName] = [
                    filter.value.low === "" ? Number.NEGATIVE_INFINITY : Number(filter.value.low),
                    filter.value.high === "" ? Number.POSITIVE_INFINITY : Number(filter.value.high)
                ];
            } else {
                filterParams[filter.fieldName] = filter.value.filter(opt => opt.selected).map(({ option }) => option);
            }
        }
        const urlParams = { ...filterParams, sortBy };

        const fetchedItems = await fetchItems(itemType, urlParams);
        setItems(fetchedItems);
    }, [filters, sortBy]);

    if (items === null) {
        return null;
    }
    
    return (
        <React.Fragment>
            <ItemSelectionFilters
                filters={filters}
                onUpdateNumericFilter={handleUpdateNumericFilter}
                onUpdateSelectionFilter={handleUpdateSelectionFilter}
            />

            <div id="item-listing">
                {props.compatibilityFilters.length !== 0 &&
                    <h4 className="compatibility-message">Note: Only items compatible with currently selected parts are shown</h4>}

                <div className="sort-by">
                    Sort By:
                    <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
                        <option value="alpha">Name (Alphabetical)</option>
                        <option value="low-high">Price (Low to High)</option>
                        <option value="high-low">Price (High to Low)</option>
                    </select>
                </div>

                <ItemSelectionTable itemType={itemType} displayedItems={items} {...props} />
            </div>
        </React.Fragment>
    );
}
