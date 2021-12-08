import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

import { ItemSelectionTable } from "../ItemSelectionTable/ItemSelectionTable";
import { ItemSelectionFilters } from "../ItemSelectionFilters/ItemSelectionFilters";

import { fetchFilterRanges, fetchItemQuantity, fetchItems } from "../../apiInteraction";

import "./ItemSelection.scss";
import { FieldInfo, Filter, Item, ItemType, NumRangeFilter, SelectFilter, ValidSelectionPropertyOption } from "../../types";
import { ALL_ITEM_TYPES } from "../../utils/shared";
import { ItemSelectionPagination } from "../ItemSelectionPagination/ItemSelectionPagination";
import { ItemSelectionSearch } from "../ItemSelectionSearch/ItemSelectionSearch";

const isItemType = (s: string): s is ItemType => (ALL_ITEM_TYPES as string[]).includes(s);

interface ItemSelectionProps {
    onSelectItem: (item: Item, selections: Record<string, ValidSelectionPropertyOption>, itemType: ItemType) => void;
}

export function ItemSelection(props: ItemSelectionProps) {
    const { itemType } = useParams();

    if (itemType === undefined || !isItemType(itemType)) {
        return null;
    }

    return <ItemSelectionValid itemType={itemType} {...props} />;
}

function getExtraFieldInfo(itemType: ItemType): FieldInfo[] {
    const std = (name: string) => ({ name, display: (x: string) => x });
    const mm = (name: string) => ({ name, display: (x: string) => parseInt(x).toFixed(1) + " mm" });
    const g = (name: string) => ({ name, display: (x: string) => x + "g" });

    return {
        "Kit": ["form_factor", ...ALL_ITEM_TYPES].map(std),
        "Case": [std("form_factor"), std("material"), std("color"), std("mount_method")],
        "Plate": [std("form_factor"), std("material")],
        "PCB": [std("form_factor"), std("hot_swap"), std("backlight")],
        "Stabilizers": [std("mount_method")],
        "Switches": [std("tactility"), g("spring_weight"), mm("act_dist"), mm("bot_dist")],
        "Keycaps": [std("color"), std("material"), std("legends")]
    }[itemType] || [];
}

function getFilterParams(filters: Filter[]) {
    const filterParams: Record<string, string> = {};
    for (const filter of filters) {
        if (filter.filterType === "numeric") {
            filterParams[filter.fieldName] = `${filter.value.low},${filter.value.high}`;
        } else {
            filterParams[filter.fieldName] = filter.value.filter(opt => opt.selected).map(selected => selected.option).join(",");
        }
    }
    return filterParams;
}

function useFilters(itemType: ItemType): [Filter[] | undefined, (fieldName: string, low: number, high: number) => void, (fieldName: string, option: string) => void] {
    const [filters, setFilters] = useState<Filter[]>();

    function handleUpdateNumericFilter(fieldName: string, low: number, high: number) {
        const newFilters = [...filters!];
        const numericFilter = newFilters.find((f): f is NumRangeFilter => f.filterType === "numeric" && f.fieldName === fieldName)!;

        numericFilter.value.low = low;
        numericFilter.value.high = high;
        setFilters(newFilters);
    }

    function handleUpdateSelectionFilter(fieldName: string, option: string) {
        const newFilters = [...filters!];
        const selectionFilter = newFilters.find((f): f is SelectFilter =>
            (f.filterType === "selectionAllOf" || f.filterType === "selectionOneOf") && f.fieldName === fieldName
        )!;
        const selections = [...selectionFilter.value];
        const selection = selections.find(opt => opt.option === option)!;
        selection.selected = !selection.selected;
        selectionFilter.value = selections;
        
        setFilters(newFilters);
    }

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
                    case "numeric":
                        return filter;
                }
            });
            setFilters(filters);
        })();
    }, [itemType]);

    return [filters, handleUpdateNumericFilter, handleUpdateSelectionFilter];
}


interface ItemSelectionValidProps {
    itemType: ItemType;
    onSelectItem: (item: Item, selections: Record<string, ValidSelectionPropertyOption>, itemType: ItemType) => void;
}

function ItemSelectionValid({ itemType, onSelectItem }: ItemSelectionValidProps) {
    const [displayedItems, setDisplayedItems] = useState<Item[]>();
    
    // const [filters, setFilters] = useState<Filter[]>();
    const [filters, setNumericFilter, setSelectionFilter] = useFilters(itemType);
    const [sortBy, setSortBy] = useState("alpha");
    const [searchQuery, setSearchQuery] = useState("");
    const [numAllItems, setNumAllItems] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [pageNum, setPageNum] = useState(1);

    useEffect(() => {
        fetchItemQuantity(itemType).then(setNumAllItems);
    }, [itemType]);

    // update items
    useEffect(() => {
        if (filters === undefined) {
            return;
        }

        const filterParams = getFilterParams(filters);
        fetchItems(itemType, searchQuery, sortBy, filterParams, itemsPerPage, pageNum)
            .then(setDisplayedItems);
    }, [itemType, searchQuery, filters, sortBy, itemsPerPage, pageNum]);

    if (displayedItems === undefined) {
        return null;
    }

    const extraFieldInfo = getExtraFieldInfo(itemType);
    
    return (
        <React.Fragment>
            <ItemSelectionFilters
                filters={filters!}
                onUpdateNumericFilter={setNumericFilter}
                onUpdateSelectionFilter={setSelectionFilter}
            />

            <div id="item-listing">
                {/* TODO {props.compatibilityFilters.length !== 0 &&
                    <h4 className="compatibility-message">Note: Only items compatible with currently selected items are shown</h4>} */}

                <div className="sort-by">
                    Sort By
                    <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
                        <option value="alpha">Name (Alphabetical)</option>
                        <option value="low-high">Price (Low to High)</option>
                        <option value="high-low">Price (High to Low)</option>
                    </select>
                </div>

                <ItemSelectionSearch onSearch={setSearchQuery} />

                {displayedItems.length === 0
                    ? <h3>No Items Found To Match Filters</h3>
                    : (
                        <React.Fragment>
                            <ItemSelectionTable
                                itemType={itemType}
                                displayedItems={displayedItems}
                                extraFieldInfo={extraFieldInfo}
                                onSelectItem={onSelectItem}
                            />
                            <ItemSelectionPagination
                                currPage={pageNum}
                                itemsPerPage={itemsPerPage}
                                numAllItems={numAllItems}
                                onSetItemsPerPage={setItemsPerPage}
                                onSwitchPages={setPageNum}
                            />
                        </React.Fragment>
                    )}
            </div>
        </React.Fragment>
    );
}
