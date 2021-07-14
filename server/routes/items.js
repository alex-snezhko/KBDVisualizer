const fs = require("fs");

const findItem = itemType => (req, res) => {
    const { name } = req.params;
    const jsonItems = JSON.parse(fs.readFileSync(`./resources/items/${itemType}.json`));
    const item = jsonItems.find(item => item["Name"] === name);
    res.send(item);
};

const getItems = itemType => (req, res) => {
    const jsonItems = JSON.parse(fs.readFileSync(`./resources/items/${itemType}.json`));
    res.send(jsonItems);
};