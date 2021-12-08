import axios from "axios";

import { FilterRange, GroupBuyItem, Item, KeyboardInfo, KeycapsInfo, ObjectModel, SelectedItems } from "./types";

const isDevelopment = process.env.NODE_ENV !== "production";
const apiBaseUrl = isDevelopment
    ? "http://localhost:3000"
    : "https://kbd-visualizer.herokuapp.com";

async function fetchJson<T>(route: string, urlParams?: Record<string, string>): Promise<T> {
    const res = await axios.get<T>(route, {
        baseURL: apiBaseUrl,
        params: urlParams,
        timeout: isDevelopment ? undefined : 1500
    });
    if (res.status !== 200) {
        throw new Error(`Fetch to URL ${apiBaseUrl}${route} unsuccessful. ${res.status}: ${res.statusText}`);
    }
    return res.data;
}


export const fetchKeyboardInfo = (name: string) => fetchJson<KeyboardInfo>(`/info/keyboardInfo/${encodeURIComponent(name)}`);
export const fetchKeycapsInfo = (name: string) => fetchJson<KeycapsInfo>(`/info/keycapsInfo/${encodeURIComponent(name)}`);

export const fetchItemQuantity = (itemType: string) => fetchJson<{ quantity: number }>(`/items/${itemType}/quantity`).then(x => x.quantity);
export const fetchFilterRanges = (itemType: string) => fetchJson<FilterRange[]>(`/items/${itemType}/filterRanges`);
export const fetchItems = (itemType: string, searchQuery: string, sortBy: string, filters: Record<string, string>, itemsPerPage: number, pageNum: number) =>
    fetchJson<Item[]>(`/items/${itemType.toLowerCase()}/find`, { sortBy, searchQuery, ...filters, itemsPerPage: itemsPerPage.toString(), pageNum: pageNum.toString() });
export const fetchItem = (itemType: string, name: string) => fetchJson<Item>(`/items/${itemType.toLowerCase()}/byname/${name}`);
export const fetchRandomItemConfig = () => fetchJson<SelectedItems>("/items/randomConfig");

export const fetchActiveGroupBuys = () => fetchJson<GroupBuyItem[]>("/activeGroupBuys");

export const fetchCaseModel = (caseName: string) => fetchJson<ObjectModel>(`/models/cases/${caseName}`);
export const fetchKeycapModel = (keycapProfile: string, keycapName: string) => fetchJson<ObjectModel>(`/models/keycaps/${keycapProfile}/${keycapName}`);
export const fetchSwitchModel = () => fetchJson<ObjectModel>("/models/switch");
export const fetchStabilizerModel = () => fetchJson<ObjectModel>("/models/stabilizer");
