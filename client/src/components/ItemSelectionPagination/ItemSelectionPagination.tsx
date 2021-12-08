import React from "react";
import { Link } from "react-router-dom";

import "./ItemSelectionPagination.scss";

interface ItemSelectionPaginationProps {
    currPage: number;
    itemsPerPage: number;
    numAllItems: number;
    onSetItemsPerPage: (numItems: number) => void;
    onSwitchPages: (switchTo: number) => void;
}

export function ItemSelectionPagination({ currPage, itemsPerPage, numAllItems, onSetItemsPerPage, onSwitchPages }: ItemSelectionPaginationProps) {
    const numPages = Math.ceil(numAllItems / itemsPerPage);
    const pageRange = [...Array(numPages).keys()].map(x => x + 1);

    return (
        <div id="item-selection-pagination">
            <div id="items-per-page">
                <label htmlFor="page-num-items">Items Per Page</label>
                <select name="page-num-items" onChange={e => onSetItemsPerPage(parseInt(e.target.value))}>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                </select>
            </div>

            <div id="page-buttons">
                <PageSwitchButton currPage={currPage} value={"prev"} enabled={currPage > 1} onSwitchPages={onSwitchPages} />
                {pageRange.map(pageNum =>
                    <PageSwitchButton key={pageNum} currPage={currPage} value={pageNum} enabled onSwitchPages={onSwitchPages} />
                )}
                <PageSwitchButton currPage={currPage} value={"next"} enabled={currPage < numPages} onSwitchPages={onSwitchPages} />
            </div>
        </div>
    );
}

interface PageSwitchButtonProps {
    currPage: number;
    value: number | "next" | "prev";
    enabled: boolean;
    onSwitchPages: (switchTo: number) => void;
}

function PageSwitchButton({ currPage, value, enabled, onSwitchPages }: PageSwitchButtonProps) {
    let switchTo: number;
    let displayed: string;
    if (typeof value === "number") {
        switchTo = value;
        displayed = value.toString();
    } else if (value === "next") {
        switchTo = currPage + 1;
        displayed = "Next ❯";
    } else {
        switchTo = currPage - 1;
        displayed = "❮ Previous";
    }

    const linkClasses = ["page-button", switchTo === currPage ? "selected-page" : (switchTo < currPage ? "left-of-current" : "right-of-current")].join(" ");

    return enabled
        ? (
            <Link
                to="#" // TODO
                className={linkClasses}
                onClick={() => onSwitchPages(switchTo)}
            >
                {displayed}
            </Link>
        )
        : (
            <div className="page-button disabled-arrow">{displayed}</div>
        );
}