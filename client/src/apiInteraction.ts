import { FilterRange, GroupBuyItem, Item, KeyboardInfo, KeycapsInfo, ObjectModel, SelectedItems } from "./types";

const apiBaseUrl = process.env.NODE_ENV === "development" ?
    "http://localhost:3000" :
    "https://kbd-visualizer.herokuapp.com";

async function fetchJson<T>(route: string, urlParams?: Record<string, string>): Promise<T> {
    const res = await fetch(apiBaseUrl + route + new URLSearchParams(urlParams).toString());
    if (!res.ok) {
        throw new Error(`Failed to execute fetch to URL ${apiBaseUrl}${route}. ${res.status}: ${res.statusText}`);
    }
    return await (res.json() as Promise<T>);
}


export const fetchKeyboardInfo = (name: string) => fetchJson<KeyboardInfo>(`/info/keyboardInfo/${encodeURIComponent(name)}`);
export const fetchKeycapsInfo = (name: string) => fetchJson<KeycapsInfo>(`/info/keycapsInfo/${encodeURIComponent(name)}`);

export const fetchFilterRanges = (partType: string) => fetchJson<FilterRange[]>(`/items/${partType}/filterRanges`);
export const fetchItems = (partType: string, urlParams: Record<string, string>) => fetchJson<Item[]>(`/items/${partType.toLowerCase()}/find`, urlParams);
export const fetchItem = (partType: string, name: string) => fetchJson<Item>(`/items/${partType.toLowerCase()}/byname/${name}`);
export const fetchRandomItemConfig = () => fetchJson<SelectedItems>("/items/randomConfig");

export const fetchActiveGroupBuys = () => fetchJson<GroupBuyItem[]>("/activeGroupBuys");

export const fetchCaseModel = (caseName: string) => fetchJson<ObjectModel>(`/models/cases/${caseName}`);
export const fetchKeycapModel = (keycapProfile: string, keycapName: string) => fetchJson<ObjectModel>(`/models/keycaps/${keycapProfile}/${keycapName}`);
export const fetchSwitchModel = () => fetchJson<ObjectModel>("/models/switch");
export const fetchStabilizerModel = () => fetchJson<ObjectModel>("/models/stabilizer");
