const express = require("express");
const db = require("../db");

const router = express.Router();

router.get("/keyboardInfo/:name", async (req, res) => {
    const { name } = req.params;
    const { rows } = await db.query("SELECT data FROM keyboard_info WHERE name = $1", [name]);
    res.send(rows[0].data);
});

router.get("/keycapsInfo/:name", async (req, res) => {
    const { name } = req.params;
    const { rows } = await db.query("SELECT data FROM keycaps_info WHERE name = $1", [name]);
    res.send(rows[0].data);
});

module.exports = router;
