"use strict";

const Router = window.ReactRouter;
const { RouteHandler, Route, DefaultRoute } = Router;

const money = (num) => "$" + num.toFixed(2);

function NumericRangeFilterComponent(props) {
    const { field, low, high, display } = props.filter;

    return (
        <div>
            <h4>{field}</h4>
            {display(<input type="text" value={low}
                onChange={e => {
                    if (!isNaN(e.target.value)) {
                        props.onUpdateFilter([e.target.value, high])
                    }
                }} />)}
            -
            {display(<input type="text" value={high}
                onChange={e => {
                    if (!isNaN(e.target.value)) {
                        props.onUpdateFilter([low, e.target.value])
                    }
                }} />)}
        </div>
    );
}

function SelectionFilterComponent(props) {
    const { field, passAll, all, selected } = props.filter;

    // TODO add 'alternate' field to items to describe a more general (say, color)

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
            selections: props.extraFieldInfo.reduce((obj, fieldInfo) => {
                const fieldName = fieldInfo.name;
                const fieldData = props.item[fieldName];
                obj[fieldName] = fieldData && fieldData.type == "selection" ? NO_SELECTION : fieldData;
                return obj;
            }, {})
        }
    }

    // function that properly displays option text
    displayOption(x) {
        return x && x.type && x.extra ? `${x.type} (+${money(x.extra)})` : x;
    }

    handleSelectionChange(event, field) {
        const val = this.props.item[field].options.find(x => this.displayOption(x) == event.target.value);
        this.setState(currState => ({ selections: { ...currState.selections, [field]: val } }));
    }

    renderTableData(fieldInfo) {
        const fieldName = fieldInfo.name;

        // the actual data of this item
        const data = this.props.item[fieldName];

        if (data === undefined) {
            return null;
        } else if (Array.isArray(data)) {
            return data.join(", ");
        } else if (data.type == "selection") {
            // the currently selected value of this field
            const selected = this.displayOption(fieldInfo.display(this.state.selections[fieldName]));
            return (
                <select value={selected} onChange={e => this.handleSelectionChange(e, fieldName)}>
                    {[NO_SELECTION].concat(data.options.map(opt => fieldInfo.display(opt))).map(opt => {
                        const displayed = this.displayOption(opt);
                        return <option key={displayed} value={displayed}>{displayed}</option>
                    })}
                </select>
            );
        } else {
            return fieldInfo.display(data);
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

                {this.props.extraFieldInfo.map(f => <td key={f.name}>{this.renderTableData(f)}</td>)}

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

class CompatibilityFilter {
    constructor(field, origin, accepts) {
        this.field = field;
        this.origin = origin;
        this.accepts = accepts;
    }

    passes(item) {
        const fieldData = item[this.field];
        return fieldData.type == "selection" ?
                fieldData.options.some(option => this.accepts.includes(option.type || option)) :
                this.accepts.includes(fieldData);
    }
}

class NumRangeFilter {
    constructor(field, low, high, display) {
        this.field = field;
        this.low = low;
        this.high = high;
        this.display = display;
    }

    updateData([low, high]) {
        this.low = low;
        this.high = high;
    }

    passes(item) {
        const fieldData = item[this.field];
        const low = this.low === "" ? 0 : Number(this.low);
        const high = this.high === "" ? Infinity : Number(this.high)
        return fieldData.type == "selection" ?
            fieldData.options.some(option => option >= low && option <= high) :
            fieldData >= low && fieldData <= high;
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
        if (this.passAll) { // ensure that the item meets every selected filter option
            return Array.from(this.selected).every(selection => fieldData.includes(selection));
        } else { // ensure that the item meets at least one selected filter option
            // if there are several options make sure that one of them passes filter
            return fieldData.type == "selection" ?
                fieldData.options.some(option => this.selected.has(option.type || option)) :
                this.selected.has(fieldData);
        }
        
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
        // discard all items that do not pass initial compatibility checks
        const shownItems = items.filter(item => this.props.compatibilityFilters.every(f => f.passes(item)));

        // generate filters from each field
        const prices = shownItems.map(item => item["Base Price"]);
        const filters = [new NumRangeFilter("Base Price", Math.min(...prices), Math.max(...prices), x => <span className="numeric-range-input">${x /* TODO add Base Price to extraFields */}</span>)];
        for (const fieldInfo of this.props.extraFieldInfo) {
            const fieldName = fieldInfo.name;
            // separate all data for this field
            const fieldData = shownItems.map(item => item[fieldName]);
            filters.push(fieldInfo.generateFilter(fieldName, fieldData));
        }
        
        shownItems.sort((x, y) => x["Name"].localeCompare(y["Name"]));
        this.setState({ items: shownItems, filters });
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
        const { extraFieldInfo, compatibilityFilters, itemType } = this.props;

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
                    <button className="return-button" onClick={this.props.onReturn}>Return</button>
                    <div className="sort-by">
                        Sort By:
                        <select value={sortBy} onChange={e => this.setState({ sortBy: e.target.value })}>
                            <option value="alpha">Name (alphabetical)</option>
                            <option value="low-high">Price (low to high)</option>
                            <option value="high-low">Price (high to low)</option>
                        </select>
                    </div>

                    {compatibilityFilters.length != 0 &&
                        <h4 style={{ color: "red" }}>Note: only items compatible with currently selected parts are shown</h4>}

                    {itemsToDisplay.length == 0 ? <h3>No Items Found To Match Filters</h3> : (
                        <table id="select-item-table">
                            <thead>
                                <tr>{["Name", "Base Price"].concat(extraFieldInfo.map(fieldInfo => fieldInfo.name)).map(f => <th key={f}>{f}</th>)}</tr>
                            </thead>
                            <tbody>
                                {itemsToDisplay.map(item =>
                                    <ItemSelectionRow
                                        key={item["Name"]}
                                        item={item}
                                        extraFieldInfo={extraFieldInfo}
                                        itemType={itemType}
                                        onSelect={this.props.onSelect}
                                    />
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        );
    }
}

const ALL_PARTS = ["Case", "Plate", "PCB", "Stabilizers", "Switches", "Keycaps"];

class ItemManager extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            selectedItems: ["Kit"].concat(ALL_PARTS).reduce((obj, item) => {
                obj[item] = null;
                return obj;
            }, {}),
            selectingItem: null,
            partsInKit: [],
            compatibilityFilters: ALL_PARTS.reduce((obj, item) => {
                obj[item] = [];
                return obj;
            }, {})
        };

        this.handleBrowseItem = this.handleBrowseItem.bind(this);
        this.handleSelectItem = this.handleSelectItem.bind(this);
        this.handleRemoveItem = this.handleRemoveItem.bind(this);



        this.state.selectedItems = {
            "Kit": null,
            "Case": {
                "Name": "Tofu 65% Aluminum",
                "Image": "https://cdn.shopify.com/s/files/1/1473/3902/products/8b9cc7c9808a81fc8db0eaf67a4d79d7_b3abc1fb-7837-45dd-bbca-f1b4202bc9e2_1800x1800.jpg?v=1584436794",
                "Link": "https://kbdfans.com/collections/65-layout-case/products/in-stocktofu-65-aluminum-case",
                "Base Price": 125,
                "Form Factor": "65%",
                "Mount Method": "Tray Mount",
                "Material": "Aluminum",
                "Primary Color": {"type": "selection", "options": ["Silver", "Grey", "Black", "Chocolate", "Burgundy", "Purple", "Ink Blue", {"type": "E-White", "extra": 4}]},
                price: 1
            },
            "Plate": {
                "Name": "KBDPad MKII Brass Plate",
                "Image": "https://cdn.shopify.com/s/files/1/1473/3902/products/8_d0a22ed5-026f-4709-b469-2cb6d618abb1_1800x1800.jpg?v=1601098440",
                "Link": "https://kbdfans.com/collections/plate/products/kbdpad-mkii-brass-plate",
                "Base Price": 18,
                "Form Factor": "Numpad",
                "Material": "Brass",
                price: 1
            },
            "PCB": {
                "Name": "DZ60 Rev 3.0 PCB",
                "Image": "https://cdn.shopify.com/s/files/1/1473/3902/products/c_1_1800x1800.jpg?v=1584436582",
                "Link": "https://kbdfans.com/collections/pcb/products/dz60-60-pcb",
                "Base Price": 38,
                "Form Factor": "60%",
                "Hot-swap": "No",
                "Backlight": "RGB Underglow",
                price: 1
            },
            "Switches": {
                "Name": "Cherry MX Red",
                "Image": "https://www.cherrymx.de/_Resources/Persistent/d4e5d661da4d28eb2c5d6321289c29ac2d6cbd56/img-productstage-mxRed%402x_100-368x368.png",
                "Link": "https://www.cherrymx.de/en/mx-original/mx-red.html",
                "Base Price": 1,
                "Tactility": "Linear",
                "Spring Weight": "46g",
                "Actuation Distance": "2.0 mm",
                "Bottom-out Distance": "4.0 mm",
                price: 1,
                casingColor: [0.05, 0.05, 0.05]
            },
            "Keycaps": {
                "Name": "GMK Modern Dolch",
                "Image": "https://matrixzj.github.io/assets/images/gmk-keycaps/Hanami-Dango/kits_pics/base.jpg",
                "Link": "https://geekhack.org/index.php?topic=110049.0",
                "Base Price": 134.99,
                "Colors": [
                    "Beige",
                    "Green",
                    "Red"
                ],
                "Material": "ABS",
                "Legends": "Doubleshot",
                price: 1,
                profile: "cherry"
            },
            "Stabilizers": {
                "Name": "GMK Screw-in Stabilizers",
                "Image": "https://cdn.shopify.com/s/files/1/1473/3902/products/O1CN01MtwenC1amQ9FHFKxo__134583372_1800x1800.jpg?v=1598932169",
                "Link": "https://kbdfans.com/collections/keyboard-stabilizer/products/gmk-screw-in-stabilizers",
                "Base Price": 19,
                "Mount Method": "PCB Screw-in",
                "color": [0.05, 0.05, 0.05, 0],
                price: 1
            }
        }
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
            //     // TODO handle compatibility
            // }

            let compatibility = currState.compatibilityFilters;
            const ff = new CompatibilityFilter("Form Factor", itemType, [selections["Form Factor"]]);
            if (itemType == "Case") {
                compatibility["PCB"].push(ff);
                compatibility["Plate"].push(ff);
            } else if (itemType == "Plate") {
                compatibility["Case"].push(ff);
                compatibility["PCB"].push(ff);
            } else if (itemType == "PCB") {
                compatibility["Case"].push(ff);
                compatibility["Plate"].push(ff);
            }

            const price = item["Base Price"] + selectedValues.reduce((extra, val) => extra + (val.extra || 0), 0);

            return {
                selectingItem: null,
                selectedItems: { ...currState.selectedItems, [itemType]: { ...item, price } },
                partsInKit,
                compatibilityFilters: compatibility
            };
        });

        return true;
    }

    handleRemoveItem(itemType) {
        if (itemType == "Kit") {
            this.setState({ partsInKit: [] })
        }
        
        this.setState(currState => {
            const filters = { ...currState.compatibilityFilters };
            for (const field in filters) {
                filters[field] = filters[field].filter(f => f.origin != itemType);
            }

            return {
                selectedItems: { ...currState.selectedItems, [itemType]: null },
                compatibilityFilters: filters
            };
        });
    }

    getExtraFieldInfo(itemType) {
        const generateNumericFilter = (display) => function(fieldName, fieldData) {
            // function that returns the smallest or largest value if there are multiple options for this field
            const getMinOrMax = (operation, data) => data.type == "selection" ? operation(...data.options) : data;

            const low = Math.min(...fieldData.map(x => getMinOrMax(Math.min, x)));
            const high = Math.max(...fieldData.map(x => getMinOrMax(Math.max, x)));
            return new NumRangeFilter(fieldName, low, high, display);
        };

        function generateSelectionFilter(fieldName, fieldData) {
            const options = new Set();

            // determine if this is a field with many options or just one
            const hasManyValues = Array.isArray(fieldData[0]);

            // generate set of all options for this field
            for (const data of fieldData) {
                if (data !== undefined) {
                    if (hasManyValues) {
                        data.forEach(val => options.add(this.display(val)));
                    } else {
                        if (data.type == "selection") {
                            data.options.forEach(x => options.add(this.display(x.type || x)));
                        } else {
                            options.add(this.display(data));
                        }
                    }
                }
            }

            // create filter out of set of options; filter will match all selections if this field
            //   contained arrays (meaning there are several values for the field for each item)
            //   or at least one selection otherwise (meaning there is an option for some fields for some items)
            return new SelectionFilter(fieldName, Array.from(options).sort(), hasManyValues);
        }

        const std = (name) => ({ name, display: x => x, generateFilter: generateSelectionFilter });

        // TODO maybe change display to a field of NumRangeFilter
        return {
            "Kit": [std("Form Factor")].concat(ALL_PARTS.map(part => std(part))),
            "Case": [std("Form Factor"), std("Material"), std("Primary Color"), std("Mount Method")],
            "Plate": [std("Form Factor"), std("Material")],
            "PCB": [std("Form Factor"), std("Hot-swap"), std("Backlight")],
            "Stabilizers": [std("Mount Method")],
            "Switches": [std("Tactility"), { name: "Spring Weight", display: x => x + "g", generateFilter: generateNumericFilter(x => <span className="numeric-range-input">{x}g</span>) },
                { name: "Actuation Distance", display: x => x.toFixed(1) + " mm", generateFilter: generateNumericFilter(x => <span className="numeric-range-input">{x}mm</span>) },
                { name: "Bottom-out Distance", display: x => x.toFixed(1) + " mm", generateFilter: generateNumericFilter(x => <span className="numeric-range-input">{x}mm</span>) }],
            "Keycaps": [std("Colors"), std("Material"), std("Legends")]
        }[itemType] || [];
    }

    render() {
        const { selectedItems, selectingItem, partsInKit, compatibilityFilters } = this.state;

        //const compatibilityFilters = this.state.partsInKit.length == 0 ? 
        return selectingItem != null ?
            <ItemSelection
                itemType={selectingItem}
                compatibilityFilters={compatibilityFilters[selectingItem]}
                extraFieldInfo={this.getExtraFieldInfo(selectingItem)}
                onSelect={this.handleSelectItem}
                onReturn={() => this.setState({ selectingItem: null })}
            /> :
            <SelectedItems
                selectedItems={selectedItems}
                partsInKit={partsInKit}
                onSelect={this.handleBrowseItem}
                onDelete={this.handleRemoveItem}
            />;
    }
}

function CollapseSelectedItems(props) {
    return (
        <div id="collapse-selected-items">
            <div className="vertical-line"></div>
            <div id="show-hide-arrow-container" onClick={props.onClick}>
                {props.collapsed ?
                    <React.Fragment>
                        <div id="vertical-show">Show</div>
                        <div id="arrow">&#x3009;</div>
                    </React.Fragment> :
                    <React.Fragment>
                        <div id="arrow">&#x3008;</div>
                        <div id="vertical-hide">Hide</div>
                    </React.Fragment>
                }
            </div>
            <div className="vertical-line"></div>
        </div>
    );
}

class SelectedItems extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            selectedItemsCollapsed: false
        };

        this.handleCollapseItems = this.handleCollapseItems.bind(this);
    }
    
    handleCollapseItems() {
        this.setState(currState => ({ selectedItemsCollapsed: !currState.selectedItemsCollapsed }));
    }

    componentDidUpdate(_, prevState) {
        // if (prevState.selectedItemsCollapsed != this.state.selectedItemsCollapsed) {
        //     resizeCanvas();
        // }
    }

    render() {
        const selected = this.props.selectedItems;
        const collapsed = this.state.selectedItemsCollapsed;

        const allPartsSelected = ALL_PARTS.every(part => selected[part]);
        const totalPrice = ALL_PARTS.reduce((total, part) => total + selected[part].price || 0, 0);

        return (
            <div id="selected-items-container">
                {!collapsed && (
                    <div>
                        <SelectedItemTable {...this.props} />
                        <div>Total Price: {money(totalPrice)}</div>
                    </div>
                )}
                <CollapseSelectedItems collapsed={collapsed} onClick={this.handleCollapseItems} />
                <div id="rightmost">
                    <div id="render-container">
                        {allPartsSelected ? <KeyboardRender selectedItems={this.props.selectedItems} /> :
                            <h3>Select all parts to view keyboard render</h3>}
                    </div>
                </div>
            </div>
        );
    }
}

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
                            <button className={"select-item-button" + (itemType == "Kit" ? " kit-item-button" : "")}
                                    disabled={partInKit} onClick={() => props.onSelect(itemType)}>
                                {itemType}
                            </button>
                        </td>
                        <td className="item-name-cell">
                            {partInKit ? "Included in kit" :
                                item &&
                                <a className="item-link" href={item["Link"]} target="_blank">
                                    <div className="item-image-container selected-item-image-container">
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

class ImportExport extends React.Component {
    render() {
        return null;
    }
}

class App extends React.Component {
    render() {
        return (
            <Router>
                <header>
                    <div id="header-inner">
                        <img src="resources/keyboard.png" width="60" height="60" />
                        <h1>KBD<span id="header-part">PART</span>PICKER</h1>
                    </div>
                </header>
                <ItemManager />
                <ImportExport />
            </Router>
        );
    }
}

ReactDOM.render(<App />, document.getElementById("root"));
