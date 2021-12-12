import React, { useEffect, useState } from "react";
import { IconContext } from "react-icons";
import { FaDollarSign, FaRegCalendarMinus, FaRegCalendarPlus, FaRegClock, FaRegKeyboard } from "react-icons/fa";
import { Link } from "react-router-dom";

import { fetchActiveGroupBuys, fetchInterestChecks, fetchItem } from "../../apiInteraction";
import { Item, ItemType, GroupBuyItem, ActiveGroupBuyItem } from "../../types";
import { money } from "../../utils/shared";

import "./GroupBuys.scss";

interface ActiveGroupBuysProps {
    onSelectItem: (a: ItemType, item: Item) => void;
}

export function ActiveGroupBuys({ onSelectItem }: ActiveGroupBuysProps) {
    const [groupBuyItems, setGroupBuyItems] = useState<ActiveGroupBuyItem[]>();
    
    useEffect(() => {
        fetchActiveGroupBuys()
            // .then(setGroupBuyItems);
            .then(items => {
                // TODO
                // items[0].name = "ASDFASFASDASDASDASDASDASDASDASDASDASDASDASDASD";
                items.forEach(x => x.end_date = "12/15/2021");
                setGroupBuyItems(items);
            });
    }, []);

    if (groupBuyItems === undefined) {
        return null;
    }

    return (
        <React.Fragment>
            <Link to="/group-buys" className="gb-ic-link active-page-link">Active Group Buys</Link>
            <Link to="/interest-checks" className="gb-ic-link">Interest Checks</Link>
            <div id="group-buys-listing">
                {groupBuyItems.map(item => (
                    <ActiveGBItem
                        key={item.name}
                        item={item}
                        onSelectItem={onSelectItem}
                    />
                ))}
            </div>
        </React.Fragment>
    );
}

interface ActiveGBItemProps {
    item: ActiveGroupBuyItem;
    onSelectItem: (a: ItemType, item: Item) => void;
}

function ActiveGBItem({ item, onSelectItem }: ActiveGBItemProps) {
    const hoursDiff = Math.floor((Date.parse(item["end_date"]) - Date.now()) / (60 * 60 * 1000));
    if (hoursDiff < 0) {
        return null;
    }
    const daysLeft = Math.floor(hoursDiff / 24);
    const hoursLeft = Math.floor(hoursDiff % 24);

    const startDate = new Date(item["start_date"]).toLocaleDateString("en-US");
    const endDate = new Date(item["end_date"]).toLocaleDateString("en-US");

    const format = (num: number, str: string) => `${num} ${str}${num > 1 ? "s" : ""}`;

    return (
        <GBItem
            item={item}
            extraInfo={[
                { icon: <FaDollarSign />, name: "Base Price:", value: money(item.price) },
                { icon: <FaRegCalendarPlus />, name: "Start date:", value: startDate },
                { icon: <FaRegCalendarMinus />, name: "End date:", value: endDate },
                { icon: <FaRegClock />, name: "Time left:", value: `${daysLeft > 0 && format(daysLeft, "day")} ${format(hoursLeft, "hour")}` }
            ]}
            onSelectItem={onSelectItem}
        />
    );
}

interface InterestChecksProps {
    onSelectItem: (a: ItemType, item: Item) => void;
}

export function InterestChecks({ onSelectItem }: InterestChecksProps) {
    const [interestCheckItems, setInterestCheckItems] = useState<GroupBuyItem[]>();
    
    useEffect(() => {
        fetchInterestChecks()
            .then(setInterestCheckItems);
    }, []);

    if (interestCheckItems === undefined) {
        return null;
    }

    return (
        <React.Fragment>
            <Link to="/group-buys" className="gb-ic-link">Active Group Buys</Link>
            <Link to="/interest-checks" className="gb-ic-link active-page-link">Interest Checks</Link>
            <div id="group-buys-listing">
                {interestCheckItems.map(item => (
                    <GBItem
                        key={item.name}
                        item={item}
                        extraInfo={[]}
                        onSelectItem={onSelectItem}
                    />
                ))}
            </div>
        </React.Fragment>
    );
}

interface GBItemProps {
    item: GroupBuyItem;
    extraInfo: { icon: React.ReactElement, name: string, value: string }[];
    onSelectItem: (a: ItemType, item: Item) => void;
}

function GBItem({ item, extraInfo, onSelectItem }: GBItemProps) {
    async function handleSelectItem() {
        const chosenItem = await fetchItem(item["item_type"], item.name);
        // TODO
        onSelectItem(item["item_type"] as ItemType, chosenItem);
    }

    return (
        <div className="group-buy-item">
            <div className="gb-name-and-select">
                <a href={item.link}><h3 className="gb-item-name">{item.name}</h3></a>
                <Link to="/">
                    <button onClick={handleSelectItem}>Try Now!</button>
                </Link>
            </div>
            <hr />
            <div className="gb-image-and-info">
                <a href={item.link} className="gb-image-container">
                    <img src={item.image} alt={item.name} />
                </a>
                <ul className="gb-info">
                    <li>
                        <b>
                            <IconContext.Provider value={{ className: "info-icon" }}><FaRegKeyboard /></IconContext.Provider>
                            Item type:
                        </b>
                        {item["item_type"]}
                    </li>
                    {extraInfo.map(({ icon, name, value }) => (
                        <li key={name}>
                            <b>
                                <IconContext.Provider value={{ className: "info-icon" }}>{icon}</IconContext.Provider>
                                {name}
                            </b>
                            {value}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
