const express = require("express");
const db = require("../db");

const router = express.Router();

const tableNameMap = {
    "kit": "keyboad_kits",
    "case": "cases",
    "keycaps": "keycap_sets",
    "pcb": "pcbs",
    "plate": "plates",
    "stabilizers": "stabilizers",
    "switches": "switches"
};

const itemFiltersMap = {
    "kit": [
        { fieldName: "price", filterType: "numeric" },
        { fieldName: "form_factor", filterType: "selectionOneOf" },
        // TODO
    ],
    "case": [
        { fieldName: "price", filterType: "numeric" },
        { fieldName: "form_factor", filterType: "selectionOneOf" },
        { fieldName: "mount_method", filterType: "selectionOneOf" },
        { fieldName: "material", filterType: "selectionOneOf" },
        { fieldName: "color", filterType: "selectionAllOf" }
    ],
    "keycaps": [
        { fieldName: "price", filterType: "numeric" },
        { fieldName: "legends", filterType: "selectionOneOf" },
        { fieldName: "material", filterType: "selectionOneOf" },
        { fieldName: "color", filterType: "selectionAllOf" }
    ],
    "pcb": [
        { fieldName: "price", filterType: "numeric" },
        { fieldName: "form_factor", filterType: "selectionOneOf" },
        { fieldName: "hot_swap", filterType: "selectionOneOf" },
        { fieldName: "backlight", filterType: "selectionOneOf" }
    ],
    "plate": [
        { fieldName: "price", filterType: "numeric" },
        { fieldName: "form_factor", filterType: "selectionOneOf" },
        { fieldName: "material", filterType: "selectionOneOf" }
    ],
    "stabilizers": [
        { fieldName: "price", filterType: "numeric" },
        { fieldName: "mount_method", filterType: "selectionOneOf" }
    ],
    "switches": [
        { fieldName: "price", filterType: "numeric" },
        { fieldName: "tactility", filterType: "selectionOneOf" },
        { fieldName: "spring_weight", filterType: "numeric" },
        { fieldName: "act_dist", filterType: "numeric" },
        { fieldName: "bot_dist", filterType: "numeric" }
    ]
};

// used for "all of" filters for determining where in the database a certain piece of data will reside
// example: will indicate case_colors.color is where to look if a case's color options are requested
const collectionDataMap = {
    "case": {
        "color": { tableName: "case_colors", fieldName: "color" }
    },
    "keycaps": {
        "color": { tableName: "keycap_colors", fieldName: "color" }
    }
};

for (const itemType of ["case", "keycaps", "pcb", "plate", "stabilizers", "switches"]) {
    const tableName = tableNameMap[itemType];
    const itemFilters = itemFiltersMap[itemType];
    const collectionData = collectionDataMap[itemType];

    router.get(`/${itemType}/filterRanges`, async (req, res) => {
        const filterRanges = [];
        for (const { fieldName, filterType } of itemFilters) {
            let value;
            if (filterType === "numeric") {
                const { rows } = await db.query(`SELECT MIN(${fieldName}) AS smallest, MAX(${fieldName}) AS largest FROM ${tableName}`);
                value = rows[0];
            } else if (filterType === "selectionOneOf") {
                const { rows } = await db.query(`SELECT DISTINCT ${fieldName} FROM ${tableName}`);
                value = rows.map(x => x[fieldName]);
            } else if (filterType === "selectionAllOf") {
                const { tableName: collectionTableName, fieldName: collectionFieldName } = collectionData[fieldName];
                const { rows } = await db.query(`SELECT DISTINCT ${collectionFieldName} FROM ${collectionTableName}`);
                value = rows.map(x => x[collectionFieldName]);
            }
            filterRanges.push({ fieldName, filterType, value });
        }
        res.json(filterRanges);
    });

    router.get(`/${itemType}/find`, async (req, res) => {
        const filterQueryParams = [];
        const filterTexts = [];
        const { sortBy, ...filterArgs } = req.query;
        for (const [fieldName, filterValue] of Object.entries(filterArgs)) {
            const filterType = itemFilters.find(x => x.fieldName === fieldName).filterType;

            const beginQueryParamNum = filterQueryParams.length + 1;
            if (filterType === "numeric") {
                filterValue.sort();
                const [low, high] = filterValue;
                filterTexts.push(`(${fieldName} BETWEEN $${beginQueryParamNum} AND $${beginQueryParamNum + 1})`);
                filterQueryParams.push(low, high);
            } else if (filterType === "selectionOneOf") {
                filterTexts.push(`(${fieldName} IN $${beginQueryParamNum})`);
                filterQueryParams.push(`(${filterValue.join(", ")})`);
            } else if (filterType === "selectionAllOf") {
                const { tableName: collectionTableName, fieldName: collectionFieldName } = collectionData[fieldName];
                filterTexts.push(`(${tableName}.id = ALL
                    (SELECT ${collectionTableName}.item_id FROM ${collectionTableName}
                    WHERE ${collectionTableName}.${collectionFieldName} IN $${beginQueryParamNum}))`);
                filterQueryParams.push(`(${filterValue.join(", ")})`);
            }
        }
        
        const orderByString = "" + {
            "low-high": "price",
            "high-low": "price DESC"
        }[sortBy] || "name";
        await db.query(`SELECT * FROM ${tableName} WHERE ${filterTexts.join(" AND ")} ORDER BY ${orderByString}`, filterQueryParams);
    });

    router.get(`/${itemType}/byname/:name`, async (req, res) => {
        const { name } = req.params;
        const { rows } = await db.query(`SELECT * FROM ${tableName} WHERE name = $1`, [name]);
        res.send(rows[0]);
    });

    router.get(`/${itemType}/all`, async (req, res) => {
        const { rows } = await db.query(`SELECT * FROM ${tableName}`);
        res.send(rows);
    });
}

router.get("/switches/byname/:name", async (req, res) => {
    const { name } = req.params;
    const { rows } = await db.query("SELECT TOP 1 * FROM switches WHERE name = $1", [name]);
    res.send(rows[0]);
});

router.get("/cases/byname/:name", async (req, res) => {
    const { name } = req.params;
    const { rows } = await db.query("SELECT TOP 1 * FROM cases WHERE name = $1", [name]);
    const kbdCase = rows[0];
    const { rows: colors } = await db.query("SELECT * FROM case_colors WHERE case_id = $1", [kbdCase.id]);
    kbdCase.colors = colors;
    res.send(rows[0]);
});

module.exports = router;
