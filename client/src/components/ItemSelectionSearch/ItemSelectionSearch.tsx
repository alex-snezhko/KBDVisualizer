import React, { useEffect, useState } from "react";

interface ItemSelectionSearchProps {
    onSearch: (query: string) => void;
}

export function ItemSelectionSearch({ onSearch }: ItemSelectionSearchProps) {
    // this is not necessarily the same value as ItemSelection's searchQuery; this value gets
    // updated immediately but searchQuery is only modified after time interval
    const [value, setValue] = useState("");

    // TODO probably wrong
    useEffect(() => {
        const timeout = window.setTimeout(() => {
            onSearch(value);
        }, 750);

        return () => {
            window.clearTimeout(timeout);
        };
    });

    return (
        <input type="text" width="40" placeholder="Search items" value={value} onChange={e => setValue(e.target.value)} />
    );
}