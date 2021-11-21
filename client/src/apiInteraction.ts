const apiBaseUrl = process.env.NODE_ENV === "development" ?
    "http://localhost:3000" :
    "https://kbd-visualizer.herokuapp.com";

function fetchJson(route: string, urlParams?: Record<string, string>) {
    return fetch(apiBaseUrl + route + new URLSearchParams(urlParams).toString())
        .catch(err => console.error(`Error fetching resource at url ${apiBaseUrl}${route}: ${err}`))
        .then(res => res.json());
}

export const fetchInfo = (infoType: string, name: string) => fetchJson(`/info/${infoType}/${encodeURIComponent(name)}`);
export const fetchFilterRanges = (partType: string) => fetchJson(`/items/${partType}/filterRanges`);
export const fetchItems = (partType: string, urlParams: Record<string, string>) => fetchJson(`/items/${partType.toLowerCase()}/find`, urlParams);
export const fetchItem = (partType: string, name: string) => fetchJson(`/items/${partType.toLowerCase()}/byname/${name}`);
export const fetchActiveGroupBuys = () => fetchJson("/activeGroupBuys");
export const fetchCaseModel = (caseName: string) => fetchJson(`/models/cases/${caseName}`);
export const fetchKeycapModel = (keycapProfile: string, keycapName: string) => fetchJson(`/models/keycaps/${keycapProfile}/${keycapName}`);
export const fetchSwitchModel = () => fetchJson("/models/switch");
export const fetchStabilizerModel = () => fetchJson("/models/stabilizer");
export const fetchRandomItemConfig = () => fetchJson("/items/randomConfig");
