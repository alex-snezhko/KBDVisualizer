"use strict";
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const db = require("./db");
const infoRoutes = require("./routes/info");
const itemsRoutes = require("./routes/items");
const setupGroupBuyScraper = require("./scrapeGroupBuys");

setupGroupBuyScraper();

const app = express();

app.use(cors());

app.use((req, res, next) => {
    try {
        decodeURIComponent(req.path);
    } catch (e) {
        console.log(e, req.url);
        res.status(400).send({ message: "URL must be properly encoded" });
    }
    next();
});

app.use(express.static(path.resolve(__dirname, "../client/dist")));

app.use("/info", infoRoutes);
app.use("/items", itemsRoutes);

app.get("/activeGroupBuys", async (req, res) => {
    const { rows } = await db.query("SELECT * FROM groupbuys");
    console.log(rows);
    res.send(rows);
});

app.get("/models/:modelPath(*)", (req, res) => {
    const { modelPath } = req.params;
    console.log(path.resolve(__dirname, `resources/models/${modelPath}.json`));
    res.sendFile(path.resolve(__dirname, `resources/models/${modelPath}.json`));
});

app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "../client/dist", "index.html"));
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
