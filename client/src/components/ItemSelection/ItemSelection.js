import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

import { ItemSelectionFilters } from "../ItemSelectionFilters";
import { ItemSelectionTable } from "../ItemSelectionTable";

import { NumRangeFilterObj } from "../../utils/shared";
import "./ItemSelection.scss";
import { fetchFilterRanges, fetchItems } from "../../apiInteraction";

export function ItemSelection(props) {
    const [items, setItems] = useState(null);
    const [filters, setFilters] = useState([]);
    const [sortBy, setSortBy] = useState("alpha");

    const { itemType } = useParams();

    useEffect(async () => {
        if (!filters) {
            const filterRanges = await fetchFilterRanges();
            setFilters(filterRanges);
        }

        const items = await fetchItems(itemType, filters);
        
        const filts = [
            new NumRangeFilterObj("Base Price", Math.min(...prices), Math.max(...prices),
                x => <span className="numeric-range-input">${x /* TODO add Base Price to extraFields */}</span>)
        ].concat(props.extraFieldInfo.map(f => f.generateFilter(f.name, shownItems.map(item => item[f.name]))));
        
        setItems(shownItems);
        setFilters(filts);
    }, [filters, sortBy]);

    if (items === null) {
        return null;
    }

    function handleUpdateFilters(field, data) {
        const newFilters = [...filters];
        newFilters.find(filter => filter.field === field).updateData(data);
        setFilters(newFilters);
    }
    
    return (
        <React.Fragment>
            <ItemSelectionFilters itemType={itemType} onUpdateFilters={handleUpdateFilters} />

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
