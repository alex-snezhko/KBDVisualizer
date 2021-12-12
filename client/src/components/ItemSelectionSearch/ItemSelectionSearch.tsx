import React, { useState } from "react";
import { IconContext } from "react-icons";
import { FaSearch } from "react-icons/fa";
import useUpdateEffect from "../../hooks/useUpdateEffect";

import "./ItemSelectionSearch.scss";

interface ItemSelectionSearchProps {
    onSearch: (query: string) => void;
}

export function ItemSelectionSearch({ onSearch }: ItemSelectionSearchProps) {
    // this is not necessarily the same value as ItemSelection's searchQuery; this value gets
    // updated immediately but searchQuery is only modified after time interval
    const [value, setValue] = useState("");

    useUpdateEffect(() => {
        const timeout = window.setTimeout(() => {
            onSearch(value);
        }, 750);

        return () => {
            window.clearTimeout(timeout);
        };
    }, [value, onSearch]);

    return (
        <div className="search-items">
            <IconContext.Provider value={{ className: "text-input-icon" }}><FaSearch /></IconContext.Provider>
            <input type="text" width="40" placeholder="Search items" value={value} onChange={e => setValue(e.target.value)} />
        </div>
    );
}