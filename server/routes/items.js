const express = require("express");
const db = require("../db");

const router = express.Router();

const tableName = {
    "case": "cases",
    "keycaps": "keycap_sets",
    "kit": "keyboard_kits",
    "pcb": "pcbs",
    "plate": "plates",
    "stabilizers": "stabilizers",
    "switches": "switches"
};

for (const itemType of ["case", "keycaps", "kit", "pcb", "plate", "stabilizers", "switches"]) {
    router.get(`/${itemType}/byname/:name`, (req, res) => {
        const { name } = req.params;
        const { rows } = await db.query(`SELECT * FROM ${tableName[itemType]} WHERE name = $1`, [name]);
        const jsonItems = JSON.parse(fs.readFileSync(path.resolve(__dirname, `resources/items/${itemType}.json`)));
        const item = jsonItems.find(item => item["Name"] === name);
        res.send(item);
    });

    router.get(`/${itemType}/all`, (req, res) => {
        const { rows } = await db.query(`SELECT * FROM ${tableName[itemType]}`);
        res.send(rows);
    });
}

module.exports = router;
