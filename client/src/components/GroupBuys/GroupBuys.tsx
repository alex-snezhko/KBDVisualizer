import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchActiveGroupBuys, fetchItem } from "../../apiInteraction";

import { money } from "../../utils/shared";
import "./GroupBuys.scss";

interface GroupBuyItem {
    name: string,
    link: string,
    image: string,
    partType: string, // TODO partType
    price: number,
    startDate: Date,
    endDate: Date // TODO change from end_date and start_date
}

interface GroupBuysProps {
    onSelectItem: any // TODO
}

export function GroupBuys({ onSelectItem }: GroupBuysProps) {
    const [groupBuyItems, setGroupBuyItems] = useState<GroupBuyItem[]>([]);
    
    useEffect(() => {
        fetchActiveGroupBuys()
        .then(gbs => setGroupBuyItems(gbs));
    }, []);

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

interface GroupBuyItemProps {
    item: GroupBuyItem, // TODO
    onSelectItem: any
}

function GroupBuyItem({ item, onSelectItem }: GroupBuyItemProps) {
    const hoursDiff = Math.floor((Date.parse(item["end_date"]) - Date.now()) / (60 * 60 * 1000));
    if (hoursDiff < 0) {
        return null;
    }
    const daysLeft = Math.floor(hoursDiff / 24);
    const hoursLeft = Math.floor(hoursDiff % 24);

    async function handleSelectItem() {
        const partType = item.partType.toLowerCase();
        const name = item.name;

        const item = await fetchItem(partType, name);
        onSelectItem(item.partType, item);
    }

    const startDate = new Date(item["start_date"]).toLocaleDateString("en-US");
    const endDate = new Date(item["end_date"]).toLocaleDateString("en-US");

    const format = (num: number, str: string) => `${num} ${str}${num > 1 ? "s" : ""}`;

    return (
        <div className="group-buy-item">
            <a href={item.link}>
                <div className="gb-image-container">
                    <img src={item.image} alt={item.name} />
                </div>
                <h3 className="gb-item-name">{item.name}</h3>
            </a>
            <hr />
            <ul className="gb-info">
                <li><b>Item type:</b> {item["part_type"]}</li>
                <li><b>Base price:</b> {money(item.price)}</li>
                <li><b>Start date:</b> {startDate}</li>
                <li><b>End date:</b> {endDate}</li>
                <li><b>Time left:</b> {daysLeft > 0 && format(daysLeft, "day")} {format(hoursLeft, "hour")}</li>
            </ul>
            <Link to="/">
                <button onClick={handleSelectItem}>Try Now!</button>
            </Link>
        </div>
    );
}
