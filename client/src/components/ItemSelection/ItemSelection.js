import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

import { ItemSelectionFilters } from "../ItemSelectionFilters";
import { ItemSelectionTable } from "../ItemSelectionTable";

import { NumRangeFilterObj } from "../../utils/shared";
import "./ItemSelection.scss";
import { fetchItems } from "../../apiInteraction";

const sorters = {
    "low-high": xs => [...xs].sort((x, y) => x["Base Price"] - y["Base Price"]),
    "high-low": xs => [...xs].sort((x, y) => y["Base Price"] - x["Base Price"]),
    "alpha": xs => xs
};

export function ItemSelection(props) {
    const [items, setItems] = useState(null);
    const [filters, setFilters] = useState([]);
    const [sortBy, setSortBy] = useState("alpha");

    const { itemType } = useParams();

    useEffect(async () => {
        const response = await fetchItems(itemType);
        const items = await response.json();
        
        // discard all items that do not pass initial compatibility checks
        const shownItems = items.filter(item => props.compatibilityFilters.every(f => f.passes(item)));

        // generate filters from each field
        const prices = shownItems.map(item => item["Base Price"]);
        const filts = [
            new NumRangeFilterObj("Base Price", Math.min(...prices), Math.max(...prices),
                x => <span className="numeric-range-input">${x /* TODO add Base Price to extraFields */}</span>)
        ].concat(props.extraFieldInfo.map(f => f.generateFilter(f.name, shownItems.map(item => item[f.name]))));
        
        shownItems.sort((x, y) => x["Name"].localeCompare(y["Name"]));
        setItems(shownItems);
        setFilters(filts);
    }, []);

    if (items === null) {
        return null;
    }

    function handleUpdateFilter(field, data) {
        const newFilters = [...filters];
        newFilters.find(filter => filter.field === field).updateData(data);
        setFilters(newFilters);
    }

    // only render rows that match selected filters
    const filteredItems = items.filter(item => filters.every(filter => filter.passes(item)));
    const displayedItems = sorters[sortBy](filteredItems);
    
    return (
        <React.Fragment>
            <ItemSelectionFilters filters={filters} onUpdateFilter={handleUpdateFilter} />

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

                <ItemSelectionTable itemType={itemType} displayedItems={displayedItems} {...props} />
            </div>
        </React.Fragment>
    );
}
