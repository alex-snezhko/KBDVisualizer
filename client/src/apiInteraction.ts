import { FilterRange, GroupBuyItem, Item, Items } from "./types";

const apiBaseUrl = process.env.NODE_ENV === "development" ?
    "http://localhost:3000" :
    "https://kbd-visualizer.herokuapp.com";

function fetchJson<T>(route: string, urlParams?: Record<string, string>): Promise<T> {
    return fetch(apiBaseUrl + route + new URLSearchParams(urlParams).toString())
        .then(res => {
            if (res.ok) {
                throw new Error(res.statusText);
            }
            return res.json() as Promise<T>;
        });
}


// TODO type these
export const fetchInfo = (infoType: string, name: string) => fetchJson(`/info/${infoType}/${encodeURIComponent(name)}`);
export const fetchFilterRanges = (partType: string) => fetchJson<FilterRange[]>(`/items/${partType}/filterRanges`);
export const fetchItems = (partType: string, urlParams: Record<string, string>) => fetchJson<Item[]>(`/items/${partType.toLowerCase()}/find`, urlParams);
export const fetchItem = (partType: string, name: string) => fetchJson<Item>(`/items/${partType.toLowerCase()}/byname/${name}`);
export const fetchActiveGroupBuys = () => fetchJson<GroupBuyItem[]>("/activeGroupBuys");
export const fetchCaseModel = (caseName: string) => fetchJson(`/models/cases/${caseName}`);
export const fetchKeycapModel = (keycapProfile: string, keycapName: string) => fetchJson(`/models/keycaps/${keycapProfile}/${keycapName}`);
export const fetchSwitchModel = () => fetchJson("/models/switch");
export const fetchStabilizerModel = () => fetchJson("/models/stabilizer");
export const fetchRandomItemConfig = () => fetchJson<Items>("/items/randomConfig");
