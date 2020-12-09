"use strict";

const money = (num) => "$" + num.toFixed(2);

const NumericRangeFilter = (props) =>
    <div>
        <h4>{props.title}</h4>
        <input type="text" onChange={e => props.onUpdateFilter(props.category, e)}></input>
    </div>;

const ItemSelectionFilters = (props) =>
    <div id="filters-box">
        <h2>Filters</h2>
        <h4>Price</h4>
        <input type="text"></input>
        {Object.keys(props.filters).map(category => 
            <div key={category} className="filter-category">
                <h4>{category}</h4>
                {Array.from(props.filters[category].all).map(opt =>
                    <div className="filter-option" key={opt}>
                        <input type="checkbox" id={`filter-option-${category}-${opt}`}
                                checked={props.filters[category].selected.has(opt)}
                                onChange={() => props.onUpdateFilter(category, opt)}/>
                        <label htmlFor={`filter-option-${category}-${opt}`}>{opt}</label>
                    </div>
                )}
            </div>
        )}
    </div>;

// default value of select field if no option is selected
const NO_SELECTION = "-- select an option --";

class ItemSelectionRow extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            selections: props.fields.reduce(
                (obj, f) => Object.assign(obj,
                    {[f]: Array.isArray(props.item[f]) ? NO_SELECTION : props.item[f]}),
                {}),
        }
    }

    // function that properly displays option text
    display(x) {
        return x && x.type && x.extra ? `${x.type} (+${money(x.extra)})` : x;
    }

    handleSelectionChange(event, field) {
        const val = this.props.item[field].find(x => this.display(x) == event.target.value);
        this.setState(currState => {
            let newSelections = {
                ...currState.selections,
                [field]: val
            };
            return {selections: newSelections}
        });
    }

    renderTableData(field) {
        // the actual data of this item
        const options = this.props.item[field];

        // the currently selected value of this field
        const selected = this.display(this.state.selections[field]);

        return !Array.isArray(options) ?
            options || <p style={{color: "gray"}}>N/A</p> :
            <select value={selected} onChange={e => this.handleSelectionChange(e, field)}>
                {[NO_SELECTION].concat(options).map(x => {
                    const displayed = this.display(x);
                    return <option key={displayed} value={displayed}>{displayed}</option>
                })}
            </select>;
    }

    render() {
        const item = this.props.item;
        return (
            <tr className="select-item-row">
                <td className="item-name-cell">
                    <a className="item-link" href={item["Link"]} target="_blank">
                        <span className="item-image-container">
                            <img src={item["Image"]} alt={item["Name"]} />
                        </span>
                        <span className="item-name">{item["Name"]}</span>
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

class ItemSelection extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            items: null,
            filters: {}
        };

        this.handleUpdateFilter = this.handleUpdateFilter.bind(this);
    }

    componentDidMount() {
        fetch("resources/items/" + this.props.itemType.toLowerCase() + ".json")
            .then(response => response.json())
            .then(items => this.loadItems(items));
    }

    loadItems(items) {
        for (const field of this.props.extraFields) {
            const options = new Set();
            
            for (const item of items) {
                const itemOptions = item[field];
                if (Array.isArray(itemOptions)) {
                    for (const itemOption of itemOptions) {
                        options.add(itemOption.type || itemOption);
                    }
                } else if (itemOptions !== undefined) {
                    options.add(item[field]);
                }
            }

            this.state.filters[field] = {
                all: Array.from(options).sort(),
                selected: new Set()
            };
        }
        
        this.setState({items: items.sort((x, y) => x["Name"].localeCompare(y["Name"]))});
    }

    handleUpdateFilter(category, option) {
        this.setState(currState => {
            let newFilters = {...currState.filters};

            const selected = newFilters[category].selected;
            if (selected.has(option)) {
                selected.delete(option);
            } else {
                selected.add(option);
            }
            
            return {filters: newFilters};
        });
    }

    render() {
        if (this.state.items == null) {
            return null;
        }

        const filters = this.state.filters;
        const extraFields = this.props.extraFields;

        // first field blank because it represents image; not really necessary to show
        const allFields = ["Name", "Base Price"].concat(extraFields);

        // only render rows that match selected filters
        const itemsMatchingFilters = this.state.items.filter(item =>
            extraFields.every(f => {
                // if no options are selected for this filter then it is fine
                if (filters[f].selected.size == 0) {
                    return true;
                }

                const options = item[f];
                // if there are several options make sure that one of them passes filter
                if (Array.isArray(options)) {
                    return options.some(option => filters[f].selected.has(option.type || option));
                } else {
                    return filters[f].selected.has(options);
                }
            })
        );


        // TODO compatibility:
        // Supported layouts: bar left of arrow keys for 65%, split spacebar, stepped caps, split backspace, etc
        // All varieties:
        // 60%: Standard; 5 1u left of spacebar, WKL


        // Not super important for now but may be handy with rendering
        // Possibly available to all layouts:
        // split spacebar
        // stepped caps
        // split left shift
        // split backspace
        // ISO enter, | key
        // split RShift (not 65%)

        // Add
        // XD87
        // Kits from KBDFans
        return (
            <div>
                <ItemSelectionFilters
                    filters={filters}
                    onUpdateFilter={this.handleUpdateFilter} />

                <div style={{margin: "10px 30px 10px 250px"}}>
                    {itemsMatchingFilters.length == 0 && <h3>No Items Found To Match Filters</h3> ||
                        <table id="select-item-table">
                            <thead>
                                <tr>{allFields.map(f => <th key={f}>{f}</th>)}</tr>
                            </thead>
                            <tbody>
                                {itemsMatchingFilters.map(item =>
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
            selectingItem: null,
            selectedItems: ["Kit"].concat(ALL_PARTS).reduce((obj, item) => {
                obj[item] = null;
                return obj;
            }, {}),
            partsInKit: []
        };

        this.handleBrowseItem = this.handleBrowseItem.bind(this);
        this.handleSelectItem = this.handleSelectItem.bind(this);
        this.handleRemoveItem = this.handleRemoveItem.bind(this);
    }

    handleBrowseItem(itemType) {
        this.setState({selectingItem: itemType});
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
            return {selectingItem: null, selectedItems: newSelected, partsInKit};
        });

        return true;
    }

    handleRemoveItem(itemType) {
        if (itemType == "Kit") {
            this.setState({partsInKit: []})
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
        //const compatabilityFilters = this.state.partsInKit.length == 0 ? 
        if (this.state.selectingItem) {
            const extraFields = this.getExtraFields(this.state.selectingItem);
            const howToRender = {

            }

            return <ItemSelection
                itemType={this.state.selectingItem}
                extraFields={this.getExtraFields(this.state.selectingItem)}
                onSelect={this.handleSelectItem} />
        }

        return <SelectedItemTable
            selectedItems={this.state.selectedItems}
            partsInKit={this.state.partsInKit}
            onSelect={this.handleBrowseItem}
            onDelete={this.handleRemoveItem} />;
    }
}

const SelectedItemTable = (props) => (
    <table id="selected-item-table">
        <thead>
            <tr className="selected-item-row">
                <th className="item-select-cell">Item</th>
                <th className="item-image-cell"></th>
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
                        <td className="item-image-cell">{(item && !partInKit) &&
                            <div className="item-image-container">
                                <img src={item["Image"]} alt={item["Name"]} />
                            </div>}
                        </td>
                        <td className="item-name-cell">
                            {partInKit ? "Included in kit" : (item && item["Name"])}</td>
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