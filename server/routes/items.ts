import express from "express";
import db from "../db";

const router = express.Router();

type ItemType = "kit" | "case" | "keycaps" | "pcb" | "plate" | "stabilizers" | "switches";

const tableNameMap: Record<ItemType, string> = {
    "kit": "keyboad_kits",
    "case": "cases",
    "keycaps": "keycap_sets",
    "pcb": "pcbs",
    "plate": "plates",
    "stabilizers": "stabilizers",
    "switches": "switches"
};

interface ItemFilters {
    fieldName: string;
    filterType: "numeric" | "selectionOneOf" | "selectionAllOf";
}

const itemFiltersMap: Record<ItemType, ItemFilters[]> = {
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

interface CollectionData {
    tableName: string;
    fieldName: string;
}

// used for "all of" filters for determining where in the database a certain piece of data will reside
// example: will indicate case_colors.color is where to look if a case's color options are requested
const collectionDataMap: Record<string, Record<string, CollectionData>> = {
    "case": {
        "color": { tableName: "case_colors", fieldName: "color" }
    },
    "keycaps": {
        "color": { tableName: "keycap_colors", fieldName: "color" }
    }
};

for (const itemType of ["case", "keycaps", "pcb", "plate", "stabilizers", "switches"] as ItemType[]) {
    const tableName = tableNameMap[itemType];
    const itemFilters = itemFiltersMap[itemType];
    const collectionData = collectionDataMap[itemType];

    router.get(`/${itemType}/filterRanges`, async (req, res) => {
        const filterRanges = [];
        for (const { fieldName, filterType } of itemFilters) {
            let value;
            if (filterType === "numeric") {
                const { rows } = await db.query(`SELECT MIN(${fieldName}) AS low, MAX(${fieldName}) AS high FROM ${tableName}`);
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
        const extraCollectionsNeeded = [];
        const { sortBy, ...filterArgs } = req.query as Record<string, string>;
        for (const [fieldName, filterValue] of Object.entries(filterArgs)) {
            const filterValueArr = filterValue.split(",");
            const filterType = itemFilters.find(x => x.fieldName === fieldName)!.filterType;

            const beginQueryParamNum = filterQueryParams.length + 1;
            if (filterType === "numeric") {
                const filterValueNums = filterValueArr.map(x => Number(x));
                filterValueNums.sort((a, b) => a - b);
                const [low, high] = filterValueNums;
                let boundsToCheck = [];
                if (low !== Number.NEGATIVE_INFINITY) {
                    boundsToCheck.push(`${fieldName} >= $${beginQueryParamNum}`);
                    filterQueryParams.push(low);
                }
                if (high !== Number.POSITIVE_INFINITY) {
                    boundsToCheck.push(`${fieldName} <= $${filterQueryParams.length + 1}`);
                    filterQueryParams.push(high);
                }
                
                if (boundsToCheck.length !== 0) {
                    filterTexts.push(`(${boundsToCheck.join(" AND ")})`);
                }
            } else if (filterType === "selectionOneOf") {
                const inNumbers = filterValueArr.map((x, i) => "$" + (beginQueryParamNum + i)).join(", ");
                filterTexts.push(`(${fieldName} IN (${inNumbers}))`);
                filterQueryParams.push(...filterValueArr);
            } else if (filterType === "selectionAllOf" && filterValue.length > 0) {
                const { tableName: collectionTableName, fieldName: collectionFieldName } = collectionData[fieldName];
                const inNumbers = filterValueArr.map((x, i) => "$" + (beginQueryParamNum + i)).join(", ");
                filterTexts.push(`(${tableName}.id IN
                    (SELECT ${collectionTableName}.item_id FROM ${collectionTableName}
                     WHERE ${collectionTableName}.item_id = ${tableName}.id AND ${collectionTableName}.${collectionFieldName} IN (${inNumbers})))`);
                filterQueryParams.push(...filterValueArr);
                
                extraCollectionsNeeded.push({ collectionTableName, collectionFieldName });
            }
        }
        
        const orderByString = {
            "low-high": "price",
            "high-low": "price DESC"
        }[sortBy] || "name";

        const { rows } = await db.query(
            `SELECT * FROM ${tableName}
             ${filterTexts.length ? ("WHERE " + filterTexts.join(" AND ")) : ""}
             ORDER BY ${orderByString}`, filterQueryParams);
        
        // TODO make this more efficient
        for (const { collectionTableName, collectionFieldName } of extraCollectionsNeeded) {
            for (const row of rows) {
                const { rows: vals } = await db.query(
                    `SELECT ${collectionFieldName}
                     FROM ${collectionTableName}
                     WHERE ${collectionTableName}.item_id = $1`, [row.id]);
                row[collectionFieldName] = vals.map(x => x[collectionFieldName]);
            }
        }
        res.send(rows);
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
