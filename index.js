"use strict";

const money = (num) => "$" + num.toFixed(2);

function NumericRangeFilterComponent(props) {
    const { field, low, high } = props.filter;

    const toMoney = (val, backup) =>
        !isNaN(val) && String(val).length < Number(val).toFixed(2).length ? val : backup;

    return (
        <div>
            <h4>{field}</h4>
            $<input type="text" className="numeric-range-input" value={low}
                onChange={e => props.onUpdateFilter([toMoney(e.target.value, low), high])} />
            -
            $<input type="text" className="numeric-range-input" value={high}
                onChange={e => props.onUpdateFilter([low, toMoney(e.target.value, high)])} />
        </div>
    );
}

function SelectionFilterComponent(props) {
    const { field, passAll, all, selected } = props.filter;

    // TODO add 'alternate' field to items to describe a more general (say, color)
    // TODO do 2 options for checkbox: must contain and can contain: maybe shift-click for other

    return (
        <div>
            <h4>{field} {passAll && <em>(Match all)</em>}</h4>
            {Array.from(all).map(opt =>
                <div className="filter-option" key={opt}>
                    <input
                        type="checkbox"
                        id={`filter-option-${field}-${opt}`}
                        className={"match-" + (passAll ? "all" : "some") + "-chosen-checkbox"}
                        checked={selected.has(opt)}
                        onChange={() => props.onUpdateFilter(opt)}
                    />
                    <label htmlFor={`filter-option-${field}-${opt}`}>{opt}</label>
                </div>
            )}
        </div>
    );
}

const ItemSelectionFilters = (props) => (
    <div id="filters-box">
        <h2>Filters</h2>

        {props.filters.map(filter => {
            const propsToPass = {
                filter,
                onUpdateFilter: val => props.onUpdateFilter(filter.field, val)
            };

            return filter instanceof SelectionFilter ?
                <SelectionFilterComponent key={filter.field} {...propsToPass} /> :
                <NumericRangeFilterComponent key={filter.field} {...propsToPass} />;
        })}
    </div>
);

// default value of select field if no option is selected
const NO_SELECTION = "-- select an option --";

class ItemSelectionRow extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            selections: props.fields.reduce((obj, f) => {
                const data = props.item[f];
                obj[f] = data && data.type == "selection" ?
                    NO_SELECTION :
                    data;
                return obj;
            }, {})
        }
    }

    // function that properly displays option text
    display(x) {
        return x && x.type && x.extra ? `${x.type} (+${money(x.extra)})` : x;
    }

    handleSelectionChange(event, field) {
        const val = this.props.item[field].options.find(x => this.display(x) == event.target.value);
        this.setState(currState => {
            let newSelections = {
                ...currState.selections,
                [field]: val
            };
            return { selections: newSelections }
        });
    }

    renderTableData(field) {
        // the actual data of this item
        const data = this.props.item[field];

        // the currently selected value of this field
        const selected = this.display(this.state.selections[field]);

        if (data === undefined) {
            return <p style={{ color: "gray" }}>N/A</p>
        } else if (Array.isArray(data)) {
            return data.join(", ");
        } else if (data.type == "selection") {
            return (
                <select value={selected} onChange={e => this.handleSelectionChange(e, field)}>
                    {[NO_SELECTION].concat(data.options).map(x => {
                        const displayed = this.display(x);
                        return <option key={displayed} value={displayed}>{displayed}</option>
                    })}
                </select>
            );
        } else {
            return data;
        }
    }

    render() {
        const item = this.props.item;
        return (
            <tr className="select-item-row">
                <td className="item-name-cell">
                    <a className="item-link" href={item["Link"]} target="_blank">
                        <div className="item-image-container">
                            <img src={item["Image"]} alt={item["Name"]} />
                        </div>
                        <div className="item-name">{item["Name"]}</div>
                    </a>
                </td>
                <td className="item-price-cell">{money(item["Base Price"])}</td>

                {Object.keys(this.state.selections).map(f => 
                    <td key={f}>{this.renderTableData(f)}</td>
                )}

                <td className="item-select-cell">
                    <button className="select-item-button" onClick={() => {
                        const allGood = this.props.onSelect(item, this.state.selections, this.props.itemType);
                        if (!allGood) {
                            alert("Please select all relevant values");
                        }
                    }}>
                        Select
                    </button>
                </td>
            </tr>
        );
    }
}

class SelectionFilter {
    constructor(field, allOptions, passAll) {
        this.field = field;
        this.all = allOptions;
        this.selected = new Set();
        this.passAll = passAll;
    }

    updateData(option) {
        if (this.selected.has(option)) {
            this.selected.delete(option);
        } else {
            this.selected.add(option);
        }
    }

    passes(item) {
        // if no options are selected for this filter then it is fine
        if (this.selected.size == 0) {
            return true;
        }
    
        const fieldData = item[this.field];
        if (this.passAll) { // ensure that the item meets at least one selected filter option
            return Array.from(this.selected).every(selection => fieldData.includes(selection));
        } else { // ensure that the item meets every selected filter option
            // if there are several options make sure that one of them passes filter
            return fieldData.type == "selection" ?
                fieldData.options.some(option => this.selected.has(option.type || option)) :
                this.selected.has(fieldData);
        }
        
    }
}

class NumRangeFilter {
    constructor(field, low, high) {
        this.field = field;
        this.low = low;
        this.high = high;
    }

    updateData([low, high]) {
        this.low = low;
        this.high = high;
    }

    passes(item) {
        const fieldData = item[this.field];
        const low = this.low === "" ? 0 : Number(this.low);
        const high = this.high === "" ? Infinity : Number(this.high)
        return fieldData >= low && fieldData <= high;
    }
}

class ItemSelection extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            items: null,
            filters: [],
            sortBy: "alpha"
        };

        this.handleUpdateFilter = this.handleUpdateFilter.bind(this);
    }

    componentDidMount() {
        fetch("resources/items/" + this.props.itemType.toLowerCase() + ".json")
        .then(response => response.json())
        .then(items => this.loadItems(items));
    }

    loadItems(items) {
        const filters = [];
        // generate filters from each field
        for (const field of ["Base Price"].concat(this.props.extraFields)) {
            // separate all data for this field
            const fieldData = items.map(item => item[field]);

            if (typeof fieldData[0] == "number") { // if items are numbers then generate high/low bound filter
                const low = fieldData.reduce((min, x) => Math.min(min, x), Number.MAX_VALUE);
                const high = fieldData.reduce((max, x) => Math.max(max, x), Number.MIN_VALUE);
                filters.push(new NumRangeFilter(field, low, high));
            } else { // otherwise generate filter matching selections
                const options = new Set();

                // determine if this is a field with many options or just one
                const hasManyValues = Array.isArray(fieldData[0]);

                // generate set of all options for this field
                for (const data of fieldData) {
                    if (data !== undefined) {
                        if (hasManyValues) {
                            data.forEach(val => options.add(val));
                        } else {
                            if (data.type == "selection") {
                                data.options.forEach(x => options.add(x.type || x));
                            } else {
                                options.add(data);
                            }
                        }
                    }
                }

                // create filter out of set of options; filter will match all selections if this field
                //   contained arrays (meaning there are several values for the field for each item)
                //   or at least one selection otherwise (meaning there is an option for some fields for some items)
                filters.push(new SelectionFilter(
                    field,
                    Array.from(options).sort(),
                    hasManyValues
                ));
            }
        }
        
        items.sort((x, y) => x["Name"].localeCompare(y["Name"]));
        this.setState({ items, filters });
    }

    handleUpdateFilter(field, data) {
        this.setState(currState => {
            let newFilters = [...currState.filters];
            newFilters.find(filter => filter.field == field).updateData(data);
            return { filters: newFilters };
        })
    }

    render() {
        const { items, filters, sortBy } = this.state;
        const extraFields = this.props.extraFields;
        // first field blank because it represents image; not really necessary to show
        const allFields = ["Name", "Base Price"].concat(extraFields);

        if (items == null) {
            return null;
        }

        // only render rows that match selected filters
        const itemsMatchingFilters = items.filter(item =>
            filters.every(filter => filter.passes(item))
        );

        const sortItems =
            sortBy == "low-high" ? xs => [...xs].sort((x, y) => x["Base Price"] - y["Base Price"]) :
            sortBy == "high-low" ? xs => [...xs].sort((x, y) => y["Base Price"] - x["Base Price"]) :
                                   xs => xs;
        const itemsToDisplay = sortItems(itemsMatchingFilters);
        
        return (
            <div>
                <ItemSelectionFilters
                    filters={filters}
                    onUpdateFilter={this.handleUpdateFilter} />

                
                <div style={{margin: "10px 30px 10px 250px"}}>
                    <div className="sort-by">
                        Sort By:
                        <select value={sortBy} onChange={e => this.setState({ sortBy: e.target.value })}>
                            <option value="alpha">Name (alphabetical)</option>
                            <option value="low-high">Price (low to high)</option>
                            <option value="high-low">Price (high to low)</option>
                        </select>
                    </div>

                    {itemsToDisplay.length == 0 && <h3>No Items Found To Match Filters</h3> ||
                        <table id="select-item-table">
                            <thead>
                                <tr>{allFields.map(f => <th key={f}>{f}</th>)}</tr>
                            </thead>
                            <tbody>
                                {itemsToDisplay.map(item =>
                                    <ItemSelectionRow
                                        key={item["Name"]}
                                        item={item}
                                        fields={extraFields}
                                        itemType={this.props.itemType}
                                        onSelect={this.props.onSelect}
                                    />
                                )}
                            </tbody>
                        </table>
                    }
                </div>
            </div>
        );
    }
}

const ALL_PARTS = ["Case", "Plate", "PCB", "Switches", "Keycaps", "Stabilizers"];

class ItemManager extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            selectedItems: ["Kit"].concat(ALL_PARTS).reduce((obj, item) => {
                obj[item] = null;
                return obj;
            }, {}),
            selectingItem: null,
            partsInKit: []
        };

        this.handleBrowseItem = this.handleBrowseItem.bind(this);
        this.handleSelectItem = this.handleSelectItem.bind(this);
        this.handleRemoveItem = this.handleRemoveItem.bind(this);



        // this.state.selectedItems = {
        //     "Kit": null,
        //     "Case": {
        //         "Name": "60% Bamboo Case",
        //         "Image": "https://cdn.shopify.com/s/files/1/1473/3902/products/1_09f45ed2-421b-47a6-9b76-856a6609a280_1800x1800.jpg?v=1584436781",
        //         "Link": "https://kbdfans.com/collections/case/products/60-bamboo-case",
        //         "Base Price": 58,
        //         "Form Factor": "60%",
        //         "Mount Method": "Tray Mount",
        //         "Material": "Bamboo",
        //         "Primary Color": "Wood",
        //         price: 1
        //     },
        //     "Plate": {
        //         "Name": "KBDPad MKII Brass Plate",
        //         "Image": "https://cdn.shopify.com/s/files/1/1473/3902/products/8_d0a22ed5-026f-4709-b469-2cb6d618abb1_1800x1800.jpg?v=1601098440",
        //         "Link": "https://kbdfans.com/collections/plate/products/kbdpad-mkii-brass-plate",
        //         "Base Price": 18,
        //         "Form Factor": "Numpad",
        //         "Material": "Brass",
        //         price: 1
        //     },
        //     "PCB": {
        //         "Name": "DZ60 Rev 3.0 PCB",
        //         "Image": "https://cdn.shopify.com/s/files/1/1473/3902/products/c_1_1800x1800.jpg?v=1584436582",
        //         "Link": "https://kbdfans.com/collections/pcb/products/dz60-60-pcb",
        //         "Base Price": 38,
        //         "Form Factor": "60%",
        //         "Hot-swap": "No",
        //         "Backlight": "RGB Underglow",
        //         price: 1
        //     },
        //     "Switches": {
        //         "Name": "Cherry MX Red",
        //         "Image": "https://www.cherrymx.de/_Resources/Persistent/d4e5d661da4d28eb2c5d6321289c29ac2d6cbd56/img-productstage-mxRed%402x_100-368x368.png",
        //         "Link": "https://www.cherrymx.de/en/mx-original/mx-red.html",
        //         "Base Price": 1,
        //         "Tactility": "Linear",
        //         "Spring Weight": "46g",
        //         "Actuation Distance": "2.0 mm",
        //         "Bottom-out Distance": "4.0 mm",
        //         price: 1
        //     },
        //     "Keycaps": {
        //         "Name": "GMK White DarkGrey",
        //         "Image": "https://matrixzj.github.io/assets/images/gmk-keycaps/whitedark-grey/kits_pics/base.png",
        //         "Link": "https://geekhack.org/index.php?topic=48798.0",
        //         "Base Price": 120,
        //         "Colors": [
        //             "Black",
        //             "White"
        //         ],
        //         "Material": "ABS",
        //         "Legends": "Doubleshot",
        //         price: 1
        //     },
        //     "Stabilizers": {
        //         "Name": "GMK Screw-in Stabilizers",
        //         "Image": "https://cdn.shopify.com/s/files/1/1473/3902/products/O1CN01MtwenC1amQ9FHFKxo__134583372_1800x1800.jpg?v=1598932169",
        //         "Link": "https://kbdfans.com/collections/keyboard-stabilizer/products/gmk-screw-in-stabilizers",
        //         "Base Price": 19,
        //         "Mount Method": "PCB Screw-in",
        //         price: 1
        //     }
        // }
    }

    handleBrowseItem(itemType) {
        this.setState({ selectingItem: itemType });
    }

    handleSelectItem(item, selections, itemType) {
        const selectedValues = Object.values(selections).filter(x => x !== undefined);
        if (selectedValues.some(val => val == NO_SELECTION)) {
            return false;
        }

        this.setState(currState => {
            // a part which does not have an undefined value is considered part of the kit
            const partsInKit = itemType == "Kit" ?
                ALL_PARTS.filter(part => selections[part]) :
                currState.partsInKit;

            // TODO actually look up and get references to items if this is a kit
            
            // if (itemType == "Case" || itemType == "Plate" || itemType == "PCB") {
            //     // TODO handle compatability
            // }
            
            const newSelected = {
                ...currState.selectedItems,
                [itemType]: {
                    ...item,
                    price: item["Base Price"] + selectedValues.reduce(
                        (extra, val) => extra + (val.extra || 0),
                        0)
                }
            };
            return { selectingItem: null, selectedItems: newSelected, partsInKit };
        });

        return true;
    }

    handleRemoveItem(itemType) {
        if (itemType == "Kit") {
            this.setState({ partsInKit: [] })
        }
        this.setState(currState => ({
            selectedItems: {
                ...currState.selectedItems,
                [itemType]: null
            }
        }));
    }

    getExtraFields(itemType) {
        return {
            "Kit": ["Form Factor"].concat(ALL_PARTS),
            "Case": ["Form Factor", "Material", "Primary Color", "Mount Method"],
            "Plate": ["Form Factor", "Material"],
            "Switches": ["Tactility", "Spring Weight", "Actuation Distance", "Bottom-out Distance"],
            "PCB": ["Form Factor", "Hot-swap", "Backlight"],
            "Keycaps": ["Colors", "Material", "Legends"],
            "Stabilizers": ["Mount Method"]
        }[itemType] || [];
    }

    render() {
        const { selectedItems, selectingItem, partsInKit } = this.state;
        //const compatabilityFilters = this.state.partsInKit.length == 0 ? 
        return selectingItem ?
            <ItemSelection
                itemType={selectingItem}
                extraFields={this.getExtraFields(selectingItem)}
                onSelect={this.handleSelectItem}
            /> :
            <SelectedItems
                selectedItems={selectedItems}
                partsInKit={partsInKit}
                onSelect={this.handleBrowseItem}
                onDelete={this.handleRemoveItem}
            />;
    }
}

const SelectedItems = (props) => (
    <React.Fragment>
        <SelectedItemTable {...props} />
        <KeyboardRender selectedItems={props.selectedItems} />
    </React.Fragment>
);

const SelectedItemTable = (props) => (
    <table id="selected-item-table">
        <thead>
            <tr className="selected-item-row">
                <th className="item-select-cell">Item</th>
                <th className="item-name-cell">Selected</th>
                <th className="item-price-cell">Price</th>
                <th></th>
            </tr>
        </thead>
        <tbody>
            {["Kit"].concat(ALL_PARTS).map(itemType => {
                const item = props.selectedItems[itemType];
                const partInKit = props.partsInKit.includes(itemType);
                return (
                    <tr key={itemType} className={partInKit ? "part-in-kit" : undefined}>
                        <td className="item-select-cell">
                            <button className="select-item-button" disabled={partInKit}
                                    onClick={() => props.onSelect(itemType)}>
                                {itemType}
                            </button>
                        </td>
                        <td className="item-name-cell">
                            {partInKit ? "Included in kit" :
                                item &&
                                <a className="item-link" href={item["Link"]} target="_blank">
                                    <div className="item-image-container">
                                        <img src={item["Image"]} alt={item["Name"]} />
                                    </div>
                                    <span className="item-name">{item["Name"]}</span>
                                </a>
                            }
                        </td>
                        <td className="item-price-cell">{item && money(item.price)}</td>
                        <td>{item &&
                            <button className="delete-button" onClick={() => props.onDelete(itemType)}>
                                &#10006;
                            </button>}
                        </td>
                    </tr>
                );
            })}
        </tbody>
    </table>
);

function KeyboardRender(props) {
    const selected = props.selectedItems;
    const canRender = ALL_PARTS.every(part => selected[part]);

    return !canRender ? "Select all parts to view keyboard render" :
        <div onLoad={loadModels("tofu65"/*selected["Case"]["Name"]*/,
                "cherry"/*selected["Keycaps"].profile*/, "modern dolch light"/*selected["Keycaps"]["Name"]*/)}>
            <canvas id="webGLCanvas"></canvas>
        </div>;
}

class ImportExport extends React.Component {
    render() {
        return null;
    }
}

class App extends React.Component {
    render() {
        return (
            <React.Fragment>
                <header>
                    <div id="header-inner">
                        <img src="resources/keyboard.png" width="60" height="60" />
                        <h1>KBD<span id="header-part">PART</span>PICKER</h1>
                    </div>
                </header>
                <ItemManager />
                <ImportExport />
            </React.Fragment>
        );
    }
}

ReactDOM.render(<App />, document.getElementById("root"));

// To-do list
// implement in-stock/vendor tracking