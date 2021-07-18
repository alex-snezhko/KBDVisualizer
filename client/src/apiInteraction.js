const apiBaseUrl = process.env.NODE_ENV === "development" ?
    "http://localhost:3000" :
    "https://kbd-visualizer.herokuapp.com/";

const fetchJson = route => fetch(`${apiBaseUrl}${route}`)
    .catch(err => console.error(`Error fetching resource at url ${apiBaseUrl}${route}: ${err}`))
    .then(res => res.json())
    .catch(err => console.error(`Error converting response at url ${apiBaseUrl}${route} to JSON: ${err}`));

export const fetchInfo = (infoType, name) => fetchJson(`/info/${infoType}/${encodeURIComponent(name)}`);
export const fetchItems = itemType => fetchJson(`/items/${itemType.toLowerCase()}`);
export const fetchItem = (partType, name) => fetchJson(`/item/${partType}/${name}`);
export const fetchActiveGroupBuys = () => fetchJson("/activeGroupBuys");
export const fetchCaseModel = caseName => fetchJson(`/models/cases/${caseName}`);
export const fetchKeycapModel = (keycapProfile, keycapName) => fetchJson(`/models/keycaps/${keycapProfile}/${keycapName}`);
export const fetchSwitchModel = () => fetchJson("/models/switch");
export const fetchStabilizerModel = () => fetchJson("/models/stabilizer");
