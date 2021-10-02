const apiBaseUrl = process.env.NODE_ENV === "development" ?
    "http://localhost:3000" :
    "https://kbd-visualizer.herokuapp.com";

function fetchJson(route, urlParams) {
    const url = new URL(route, apiBaseUrl);
    url.search = new URLSearchParams(urlParams);
    return fetch(url)
        .catch(err => console.error(`Error fetching resource at url ${apiBaseUrl}${route}: ${err}`))
        .then(res => res.json());
}

export const fetchInfo = (infoType, name) => fetchJson(`/info/${infoType}/${encodeURIComponent(name)}`);
export const fetchFilterRanges = partType => fetchJson(`/items/${partType}/filterRanges`);
export const fetchItems = (partType, urlParams) => fetchJson(`/items/${partType.toLowerCase()}/find`, urlParams);
export const fetchItem = (partType, name) => fetchJson(`/items/${partType.toLowerCase()}/byname/${name}`);
export const fetchActiveGroupBuys = () => fetchJson("/activeGroupBuys");
export const fetchCaseModel = caseName => fetchJson(`/models/cases/${caseName}`);
export const fetchKeycapModel = (keycapProfile, keycapName) => fetchJson(`/models/keycaps/${keycapProfile}/${keycapName}`);
export const fetchSwitchModel = () => fetchJson("/models/switch");
export const fetchStabilizerModel = () => fetchJson("/models/stabilizer");
export const fetchRandomItemConfig = () => fetchJson("/items/randomConfig");
