import express from "express";
import db from "../db";

const router = express.Router();

router.get("/keyboardInfo/:name", async (req, res) => {
    const { name } = req.params;
    try {
        const { rows: [{ data }] } = await db.query<{ data: string }, [string]>("SELECT data FROM keyboard_info WHERE name = $1", [name]);
        res.json(JSON.parse(data));
    } catch (e) {
        res.sendStatus(404);
    }
});

router.get("/keycapsInfo/:name", async (req, res) => {
    const { name } = req.params;
    try {
        const { rows: [{ data }] } = await db.query<{ data: string }, [string]>("SELECT data FROM keycaps_info WHERE name = $1", [name]);
        res.json(JSON.parse(data));
    } catch (e) {
        res.sendStatus(404);
    }
});

export default router;
