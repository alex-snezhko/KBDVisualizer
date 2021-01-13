import React from "react";
import { Link } from "react-router-dom";

import groupBuyItems from "@resources/groupbuys.json";
import { money } from "../../utils/shared";
import "./GroupBuys.scss";

export function GroupBuys({ onSelectItem }) {
    return (
        <React.Fragment>
            <h1>Ongoing Group Buys</h1>
            <div id="group-buys-listing">
                {groupBuyItems.map(item => (
                    <GroupBuyItem
                        key={item.name}
                        item={item}
                        onSelectItem={onSelectItem}
                    />
                ))}
            </div>
        </React.Fragment>
    );
}

function GroupBuyItem({ item, onSelectItem }) {
    const hoursDiff = Math.floor((Date.parse(item.endDate) - Date.now()) / (60 * 60 * 1000));
    if (hoursDiff < 0) {
        return null;
    }
    const daysLeft = Math.floor(hoursDiff / 24);
    const hoursLeft = Math.floor(hoursDiff % 24);

    const format = (num, str) => `${num} ${str}${num > 1 ? "s" : ""}`;

    return (
        <div className="group-buy-item">
            <a href={item.link}>
                <div className="image-container">
                    <img src={item.image} alt={item.name} />
                </div>
                <h3>{item.name}</h3>
            </a>
            <hr />
            <ul className="gb-info">
                <li><b>Item type:</b> {item.partType}</li>
                <li><b>Base price:</b> {money(item.price)}</li>
                <li><b>Start date:</b> {item.startDate}</li>
                <li><b>End date:</b> {item.endDate}</li>
                <li><b>Time left:</b> {daysLeft > 0 && format(daysLeft, "day")} {format(hoursLeft, "hour")}</li>
            </ul>
            <Link to="/">
                <button onClick={() => {
                    import(`@resources/items/${item.partType.toLowerCase()}.json`)
                        .then(({ default: items }) => items.find(item => item["Name"] === item.name))
                        .then(item => onSelectItem(item.partType, item));
                }}>Try Now!</button>
            </Link>
        </div>
    );
}
