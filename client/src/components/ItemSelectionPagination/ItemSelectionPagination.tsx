import React from "react";

import "./ItemSelectionPagination.scss";

interface ItemSelectionPaginationProps {
    currPage: number;
    itemsPerPage: number;
    numAllItems: number;
    onSwitchPages: (switchTo: number) => void;
}

export function ItemSelectionPagination({ currPage, itemsPerPage, numAllItems, onSwitchPages }: ItemSelectionPaginationProps) {
    const numPages = Math.ceil(numAllItems / itemsPerPage);
    const pageRange = [...Array(numPages).keys()].map(x => x + 1);

    return (
        <div id="item-selection-pagination">
            {currPage > 1 && <PageSwitchButton currPage={currPage} value={"prev"} onSwitchPages={onSwitchPages} />}
            {pageRange.map(pageNum =>
                <PageSwitchButton key={pageNum} currPage={currPage} value={pageNum} onSwitchPages={onSwitchPages} />
            )}
            {currPage < numPages && <PageSwitchButton currPage={currPage} value={"next"} onSwitchPages={onSwitchPages} />}
        </div>
    );
}

interface PageSwitchButtonProps {
    currPage: number;
    value: number | "next" | "prev";
    onSwitchPages: (switchTo: number) => void;
}

function PageSwitchButton({ currPage, value, onSwitchPages }: PageSwitchButtonProps) {
    let switchTo: number;
    let displayed: string;
    if (typeof value === "number") {
        switchTo = value;
        displayed = value.toString();
    } else if (value === "next") {
        switchTo = currPage + 1;
        displayed = ">";
    } else {
        switchTo = currPage - 1;
        displayed = "<";
    }

    return (
        <button
            className={currPage === switchTo ? "selected-page-button" : ""}
            onClick={() => onSwitchPages(switchTo)}
        >
            {displayed}
        </button>
    );
}