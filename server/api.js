"use strict";
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const setupGroupBuyScraper = require("./scrapeGroupBuys");

setupGroupBuyScraper();

const sqlClient = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

sqlClient.connect();

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

for (const itemType of ["keyboardInfo", "keycapsInfo"]) {
    app.get(`/info/${itemType}/:name`, (req, res) => {
        const { name } = req.params;
        const json = JSON.parse(fs.readFileSync(path.resolve(__dirname, `resources/${itemType}.json`)));
        const object = json[name];
        res.send(object);
    });
}

app.get("/activeGroupBuys", (req, res) => {
    const json = fs.readFileSync(path.resolve(__dirname, "resources/groupbuys.json"));
    res.send(json);
});

for (const itemType of ["case", "keycaps", "kit", "pcb", "plate", "stabilizers", "switches"]) {
    app.get(`/item/${itemType}/:name`, (req, res) => {
        const { name } = req.params;
        const jsonItems = JSON.parse(fs.readFileSync(path.resolve(__dirname, `resources/items/${itemType}.json`)));
        const item = jsonItems.find(item => item["Name"] === name);
        res.send(item);
    });

    app.get(`/items/${itemType}`, (req, res) => {
        sqlClient.query("SELECT * FROM ", (res, err) => {
            if (err) {
                throw err;
            }
            for (const row of res.rows) {
                console.log(JSON.stringify(row));
            }
            client.end();
        })
        const jsonItems = JSON.parse(fs.readFileSync(path.resolve(__dirname, `resources/items/${itemType}.json`)));
        res.send(jsonItems);
    });
}

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
