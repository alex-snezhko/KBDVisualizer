const apiBaseUrl = process.env.NODE_ENV === "development" ?
    "http://localhost:3000" :
    "https://kbd-visualizer.herokuapp.com/";

export const fetchInfo = (infoType, name) => fetch(`${apiBaseUrl}/${infoType}/${encodeURIComponent(name)}`);
export const fetchItems = itemType => fetch(`${apiBaseUrl}/items/${itemType.toLowerCase()}`);
export const fetchItem = (partType, name) => fetch(`${apiBaseUrl}/item/${partType}/${name}`);
export const fetchActiveGroupBuys = () => fetch(`${apiBaseUrl}/activeGroupBuys`);