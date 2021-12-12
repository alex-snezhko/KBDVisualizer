import express from "express";
import db from "../db";

const router = express.Router();

type ItemType = "kit" | "case" | "keycaps" | "pcb" | "plate" | "stabilizers" | "switches";

interface TableInfo {
    table: string;
    fields: ["name", "image", "link", "price", "status", ...string[]]
    itemFilters: {
        fieldName: string;
        filterType: "numeric" | "selectionOneOf" | "selectionAllOf";
    }[];
    // used for "all of" filters for determining where in the database a certain piece of data will reside
    // example: will indicate case_colors.color is where to look if a case's color options are requested
    collectionData: Record<string, {
        collectionTable: string;
        collectionFieldName: string;
        allCollectionFields: string[];
    }>
}

const defaultFields: ["name", "image", "link", "price", "status"] = ["name", "image", "link", "price", "status"];

const tablesInfo: Record<ItemType, TableInfo> = {
    "kit": {
        table: "keyboad_kits",
        fields: [...defaultFields, "form_factor"],
        itemFilters: [
            { fieldName: "price", filterType: "numeric" },
            { fieldName: "form_factor", filterType: "selectionOneOf" },
            // TODO
        ],
        collectionData: {}
    },
    "case": {
        table: "cases",
        fields: [...defaultFields, "form_factor", "mount_method", "material"],
        itemFilters: [
            { fieldName: "price", filterType: "numeric" },
            { fieldName: "form_factor", filterType: "selectionOneOf" },
            { fieldName: "mount_method", filterType: "selectionOneOf" },
            { fieldName: "material", filterType: "selectionOneOf" },
            { fieldName: "color", filterType: "selectionOneOf" }
        ],
        collectionData: {
            "color": {
                collectionTable: "case_colors",
                collectionFieldName: "color",
                allCollectionFields: ["color", "color_arr", "extra_price"]
            }
        }
    },
    "keycaps": {
        table: "keycap_sets",
        fields: [...defaultFields, "legends", "material"],
        itemFilters: [
            { fieldName: "price", filterType: "numeric" },
            { fieldName: "legends", filterType: "selectionOneOf" },
            { fieldName: "material", filterType: "selectionOneOf" },
            { fieldName: "color", filterType: "selectionAllOf" }
        ],
        collectionData: {
            "color": {
                collectionTable: "keycap_colors",
                collectionFieldName: "color",
                allCollectionFields: ["color"]
            }
        }
    },
    "pcb": {
        table: "pcbs",
        fields: [...defaultFields, "form_factor", "hot_swap", "backlight"],
        itemFilters: [
            { fieldName: "price", filterType: "numeric" },
            { fieldName: "form_factor", filterType: "selectionOneOf" },
            { fieldName: "hot_swap", filterType: "selectionOneOf" },
            { fieldName: "backlight", filterType: "selectionOneOf" }
        ],
        collectionData: {}
    },
    "plate": {
        table: "plates",
        fields: [...defaultFields, "form_factor", "material"],
        itemFilters: [
            { fieldName: "price", filterType: "numeric" },
            { fieldName: "form_factor", filterType: "selectionOneOf" },
            { fieldName: "material", filterType: "selectionOneOf" }
        ],
        collectionData: {}
    },
    "stabilizers": {
        table: "stabilizers",
        fields: [...defaultFields, "mount_method", "color_arr"],
        itemFilters: [
            { fieldName: "price", filterType: "numeric" },
            { fieldName: "mount_method", filterType: "selectionOneOf" }
        ],
        collectionData: {}
    },
    "switches": {
        table: "switches",
        fields: [...defaultFields, "tactility", "spring_weight", "act_dist", "bot_dist", "color_arr"],
        itemFilters: [
            { fieldName: "price", filterType: "numeric" },
            { fieldName: "tactility", filterType: "selectionOneOf" },
            { fieldName: "spring_weight", filterType: "numeric" },
            { fieldName: "act_dist", filterType: "numeric" },
            { fieldName: "bot_dist", filterType: "numeric" }
        ],
        collectionData: {}
    }
};

function constructWhereClause(searchQuery: string, filterArgs: Record<string, string>, tableInfo: TableInfo) {
    const { itemFilters, collectionData } = tableInfo;

    const filterTexts: string[] = [];
    const filterQueryParams = [];
    if (searchQuery !== "") {
        filterTexts.push("name LIKE $1");
        filterQueryParams.push(`%${searchQuery}%`);
    }

    for (const [fieldName, filterValue] of Object.entries(filterArgs)) {
        const filterValueArr = filterValue.split(",");
        const filter = itemFilters.find(x => x.fieldName === fieldName);
        if (filter === undefined) {
            return;
        }
        const filterType = filter.filterType;

        const beginQueryParamNum = filterQueryParams.length + 1;
        if (filterType === "numeric") {
            const filterValueNums = filterValueArr.map(Number);
            filterValueNums.sort((a, b) => a - b);
            const [low, high] = filterValueNums;

            const boundsToCheck = [];
            if (low !== Number.NEGATIVE_INFINITY) {
                boundsToCheck.push(`${fieldName} >= $${beginQueryParamNum}`);
                filterQueryParams.push(low);
            }
            if (high !== Number.POSITIVE_INFINITY) {
                boundsToCheck.push(`${fieldName} <= $${filterQueryParams.length + 1}`);
                filterQueryParams.push(high);
            }
            
            if (boundsToCheck.length !== 0) {
                filterTexts.push(boundsToCheck.join(" AND "));
            }
        } else if (filterType === "selectionOneOf") {
            const queryParamNumbers = filterValueArr.map((x, i) => `$${beginQueryParamNum + i}`).join(", ");
            filterTexts.push(`${fieldName} IN (${queryParamNumbers})`);
            filterQueryParams.push(...filterValueArr);
        } else if (filterType === "selectionAllOf" && filterValue.length > 0) {
            const { collectionFieldName } = collectionData[fieldName];
            const queryParamNumbers = filterValueArr.map((x, i) => `$${beginQueryParamNum + i}`).join(", ");
            filterTexts.push(`${collectionFieldName} IN (${queryParamNumbers})`);
            // filterTexts.push(`(id IN (
            //     SELECT c.item_id
            //     FROM ${collectionTable} c
            //     WHERE c.item_id = ${table}.id AND c.${collectionFieldName} IN (${queryParamNumbers})
            // ))`);
            filterQueryParams.push(...filterValueArr);
        }
    }

    const whereCondition = filterTexts.map(x => `(${x})`).join(" AND ");

    return { whereCondition, filterQueryParams };
}


for (const itemType of ["case", "keycaps", "pcb", "plate", "stabilizers", "switches"] as ItemType[]) {
    const tableInfo = tablesInfo[itemType];
    const { table, fields, itemFilters, collectionData } = tableInfo;

    // GET /items/{itemType}/filterRanges
    // Returns ranges of values of items for an item type to fill initial filter values
    //  - response: ranges for filters
    router.get(`/${itemType}/filterRanges`, async (req, res) => {
        const filterRanges = [];
        for (const { fieldName, filterType } of itemFilters) {
            let value;
            if (filterType === "numeric") {
                const { rows } = await db.query(`SELECT MIN(${fieldName}) AS low, MAX(${fieldName}) AS high FROM ${table}`);
                value = rows[0];
            } else if (filterType === "selectionOneOf") {
                const { rows } = await db.query(`SELECT DISTINCT ${fieldName} FROM ${table}`);
                value = rows.map(x => x[fieldName]);
            } else if (filterType === "selectionAllOf") {
                const { collectionTable, collectionFieldName } = collectionData[fieldName];
                const { rows } = await db.query(`SELECT DISTINCT ${collectionFieldName} FROM ${collectionTable}`);
                value = rows.map(x => x[collectionFieldName]);
            }

            filterRanges.push({ fieldName, filterType, value });
        }

        res.json(filterRanges);
    });

    // GET /items/{itemType}/quantity
    // Returns total item quantity for an item type
    //  - response: number of items
    router.get(`/${itemType}/quantity`, async (req, res) => {
        const { rows: [{ quantity }] } = await db.query(`SELECT COUNT(*) AS quantity FROM ${table}`);
        res.json({ quantity: parseInt(quantity) });
    });
    
    // GET /items/{itemType}/find
    // Finds items of certain type that match given filters
    //  - request:
    //    - query:
    //      - sortBy: what to sort by: price asc/desc or name by default
    //      - [filterArgs]: key: fieldName; value: range of acceptable values
    router.get(`/${itemType}/find`, async (req, res) => {
        const { searchQuery, sortBy, itemsPerPage, pageNum, ...filterArgs } = req.query as Record<string, string>;

        // const tablesToUse = [table, ...Object.values(collectionData).map(x => x.collectionTable)].join(", ");
        const collectionTableJoins = Object.values(collectionData).map(({ collectionTable }) => `JOIN ${collectionTable} ON item_id = id`);
        const tablesToUse = [table, ...collectionTableJoins].join(" ");

        const collectionFields = Object.entries(collectionData).map(([fieldName, { allCollectionFields }]) => {
            // create something like json_agg(json_build_object('col1', col1, 'col2', col2, ...)) as <fieldName>
            const jsonBuildObjectArgString = allCollectionFields.map(fieldName => `'${fieldName}', ${fieldName}`).join(", ");
            const jsonAgg = `json_agg(json_build_object(${jsonBuildObjectArgString})) AS ${fieldName}`;
            return jsonAgg;
        });
        const fieldsToUse = [...fields, ...collectionFields].join(", ");

        const where = constructWhereClause(searchQuery, filterArgs, tableInfo);
        if (where === undefined) {
            return res.status(400).send("Invalid filter type");
        }
        const { whereCondition, filterQueryParams } = where;
        
        const orderByString = {
            "low-high": "price",
            "high-low": "price DESC"
        }[sortBy] || "name";

        const limit = parseInt(itemsPerPage);
        const offset = limit * (parseInt(pageNum) - 1);
        const { rows } = await db.query(
           `SELECT ${fieldsToUse}
            FROM ${tablesToUse}
            WHERE ${whereCondition}
            GROUP BY ${fields.join(", ")}
            ORDER BY ${orderByString}
            LIMIT $${filterQueryParams.length + 1}
            OFFSET $${filterQueryParams.length + 2}`,
            [...filterQueryParams, limit, offset]
        );

        res.send(rows);
    });

    // GET /items/{itemType}/byname/{name}
    // Gets an item with a given name
    //  - request:
    //    - query:
    //      - name: name of item to get
    router.get(`/${itemType}/byname/:name`, async (req, res) => {
        const { name } = req.params;
        const { rows } = await db.query(`SELECT * FROM ${table} WHERE name = $1`, [name]);
        res.send(rows[0]);
    });

    // GET /items/{itemType}/all
    // Gets all items of then given item type
    //  - request:
    //    - query:
    //      - name: name of item to get
    router.get(`/${itemType}/all`, async (req, res) => {
        const { rows } = await db.query(`SELECT * FROM ${table}`);
        res.send(rows);
    });
}

// GET /items/randomConfig
// Gets a random configuration of items
router.get("/randomConfig", async (req, res) => {
    // TODO make case/plate/pcb random as well
    const { rows: [kbdCase] } = await db.query("SELECT * FROM cases WHERE name = 'Tofu 65% Aluminum'");
    const { rows: [plate] } = await db.query("SELECT * FROM plates WHERE name = '65% Brass Plate'");
    const { rows: [pcb] } = await db.query("SELECT * FROM pcbs WHERE name = 'KBD67 Rev2 PCB'");
    const { rows: [switches] } = await db.query("SELECT * FROM switches ORDER BY RANDOM() LIMIT 1");
    const { rows: [stabilizers] } = await db.query("SELECT * FROM stabilizers WHERE mount_method = 'PCB Screw-in' ORDER BY RANDOM() LIMIT 1");
    const { rows: [keycaps] } = await db.query("SELECT * FROM keycap_sets ORDER BY RANDOM() LIMIT 1");

    res.send({ "Kit": null, "Case": kbdCase, "Plate": plate, "PCB": pcb, "Switches": switches, "Stabilizers": stabilizers, "Keycaps": keycaps });
});

export default router;
