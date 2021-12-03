import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

import { ItemSelectionTable } from "../ItemSelectionTable/ItemSelectionTable";
import { ItemSelectionFilters } from "../ItemSelectionFilters/ItemSelectionFilters";

import { fetchItems, fetchFilterRanges } from "../../apiInteraction";

import "./ItemSelection.scss";
import { Filter, Item, ItemType, NumRangeFilter, SelectFilter } from "../../types";
import { ALL_PARTS } from "../../utils/shared";

interface ItemSelectionProps {
    onSelect: (item: Item, selections: Record<string, string>, itemType: ItemType) => boolean;
}

const isItemType = (s: string): s is ItemType => (ALL_PARTS as string[]).includes(s);

export function ItemSelection({ onSelect }: ItemSelectionProps) {
    const { itemType } = useParams();
    if (itemType === undefined || !isItemType(itemType)) {
        return null;
    }

    const [items, setItems] = useState<Item[]>([]);
    const [filters, setFilters] = useState<Filter[]>([]);
    const [sortBy, setSortBy] = useState("alpha");

    function handleUpdateNumericFilter(fieldName: string, low: number, high: number) {
        const newFilters = [...filters];
        const numericFilter = newFilters.find((f): f is NumRangeFilter => f.filterType === "numeric" && f.fieldName === fieldName)!;

        numericFilter.value.low = low;
        numericFilter.value.high = high;
        setFilters(newFilters);
    }

    function handleUpdateSelectionFilter(fieldName: string, option: string) {
        const newFilters = [...filters];
        const selectionFilter = newFilters.find((f): f is SelectFilter =>
            (f.filterType === "selectionAllOf" || f.filterType === "selectionOneOf") && f.fieldName === fieldName
        )!;
        const selections = [...selectionFilter.value];
        const selection = selections.find(opt => opt.option === option)!;
        selection.selected = !selection.selected;
        selectionFilter.value = selections;
        
        setFilters(newFilters);
    }

    // get filter values
    useEffect(() => {
        (async () => {
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
        })();
    }, []);

    // update items
    useEffect(() => {
        (async () => {
            // TODO make this cleaner
            if (!filters) {
                return;
            }

            const urlParams: Record<string, string> = { sortBy };
            for (const filter of filters) {
                if (filter.filterType === "numeric") {
                    urlParams[filter.fieldName] = `${filter.value.low},${filter.value.high}`;
                } else {
                    urlParams[filter.fieldName] = filter.value.filter(opt => opt.selected).map(selected => selected.option).join(",");
                }
            }

            const fetchedItems = await fetchItems(itemType, urlParams);
            setItems(fetchedItems);
        })();
    }, [filters, sortBy]);

    if (items.length === 0) {
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
                {/* TODO {props.compatibilityFilters.length !== 0 &&
                    <h4 className="compatibility-message">Note: Only items compatible with currently selected parts are shown</h4>} */}

                <div className="sort-by">
                    Sort By:
                    <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
                        <option value="alpha">Name (Alphabetical)</option>
                        <option value="low-high">Price (Low to High)</option>
                        <option value="high-low">Price (High to Low)</option>
                    </select>
                </div>

                <ItemSelectionTable itemType={itemType} displayedItems={items} onSelect={onSelect} />
            </div>
        </React.Fragment>
    );
}