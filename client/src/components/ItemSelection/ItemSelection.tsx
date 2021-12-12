import React, { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";

import { ItemSelectionTable } from "../ItemSelectionTable/ItemSelectionTable";
import { ItemSelectionFilters } from "../ItemSelectionFilters/ItemSelectionFilters";
import { ItemSelectionPagination } from "../ItemSelectionPagination/ItemSelectionPagination";
import { ItemSelectionSearch } from "../ItemSelectionSearch/ItemSelectionSearch";

import { fetchItems } from "../../apiInteraction";
import { FieldInfo, Filter, Item, ItemType, ValidSelectionPropertyOption } from "../../types";
import { ALL_ITEM_TYPES } from "../../utils/shared";
import useFilters from "../../hooks/useFilters";

import "./ItemSelection.scss";

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
    const std = (name: string): FieldInfo => ({ name, display: (x: string) => x, type: "single" });
    const mult = (name: string): FieldInfo => ({ name, display: (x: string) => x, type: "multiple" });
    const mm = (name: string): FieldInfo => ({ name, display: (x: string) => parseInt(x).toFixed(1) + " mm", type: "single" });
    const g = (name: string): FieldInfo => ({ name, display: (x: string) => x + "g", type: "single" });

    return {
        "Kit": ["form_factor", ...ALL_ITEM_TYPES].map(std),
        "Case": ["form_factor", "material", "color", "mount_method"].map(std),
        "Plate": ["form_factor", "material"].map(std),
        "PCB": ["form_factor", "hot_swap", "backlight"].map(std),
        "Stabilizers": [std("mount_method")],
        "Switches": [std("tactility"), g("spring_weight"), mm("act_dist"), mm("bot_dist")],
        "Keycaps": [mult("color"), std("material"), std("legends")]
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
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [pageNum, setPageNum] = useState(1);

    // update items
    useEffect(() => {
        // TODO figure out why sometimes not rendering
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
        <div id="item-selection">
            <div>
                <Link to="/" id="back-button">&larr; Go Back</Link>

                <ItemSelectionFilters
                    filters={filters!}
                    onUpdateNumericFilter={setNumericFilter}
                    onUpdateSelectionFilter={setSelectionFilter}
                />
            </div>

            <div id="item-listing">
                {/* TODO {props.compatibilityFilters.length !== 0 &&
                    <h4 className="compatibility-message">Note: Only items compatible with currently selected items are shown</h4>} */}

                <div id="items-top-bar">
                    <div className="sort-by">
                        Sort By
                        <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
                            <option value="alpha">Name (Alphabetical)</option>
                            <option value="low-high">Price (Low to High)</option>
                            <option value="high-low">Price (High to Low)</option>
                        </select>
                    </div>

                    <div>
                        <ItemSelectionSearch onSearch={setSearchQuery} />
                    </div>
                </div>

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
                                itemType={itemType}
                                currPage={pageNum}
                                itemsPerPage={itemsPerPage}
                                onSetItemsPerPage={setItemsPerPage}
                                onSwitchPages={setPageNum}
                            />
                        </React.Fragment>
                    )}
            </div>
        </div>
    );
}
