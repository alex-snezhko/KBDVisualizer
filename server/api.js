"use strict";
const express = require("express");
const cron = require("node-cron");
const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

cron.schedule("0 0 * * *", async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const MECHGB_URL = "https://www.mechgroupbuys.com";
    await page.goto(MECHGB_URL);
    await new Promise(resolve => setTimeout(resolve, 3000));
    const data = await page.content();
    
    const groupBuyItems = getActiveGroupBuys(data);
    fs.writeFileSync("resources/groupbuys.json", JSON.stringify(groupBuyItems, null, 4));
    await browser.close();
});

function getActiveGroupBuys(data) {
    const $ = cheerio.load(data);

    const groupBuyItems = [];

    const $items = $("div.gMJRj").children();
    $items.each(function() {
        const $item = $(this);
        const $info = $item.find("ul.kNKLJw").children("li");
        function getInfo(searchFor) {
            const $infoItem = $info.filter(function() {
                const infoType = $(this).children(".hctKJM").text().trim();
                return infoType == searchFor;
            });
            return $infoItem.children(".jxQFAb").text().trim();
        }

        const name = $item.find(".cqDPIl").text();
        const image = $item.find("img.enYpte").attr("src");
        const link = "https://www.mechgroupbuys.com" + $item.find(".gSVBBi").children("a").attr("href");
        const partType = $item.find(".gLiaon").text();
        const startDate = getInfo("Start date:");
        const endDate = getInfo("End date:");
        // TODO handle other currencies
        const price = parseFloat(getInfo("Base price:").replace(/[^\d.]/g, ""));

        const item = { name, image, link, partType, startDate, endDate, price };
        groupBuyItems.push(item);
    });

    return groupBuyItems;
}

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

const findInfo = itemType => (req, res) => {
    const { name } = req.params;
    console.log(__dirname);
    const json = JSON.parse(fs.readFileSync(path.resolve(__dirname, `resources/${itemType}.json`)));
    const object = json[name];
    res.send(object);
};

for (const itemType of ["keyboardInfo", "keycapsInfo"]) {
    app.get(`/${itemType}/:name`, findInfo(itemType));
}

const findItem = itemType => (req, res) => {
    const { name } = req.params;
    const jsonItems = JSON.parse(fs.readFileSync(path.resolve(__dirname, `resources/items/${itemType}.json`)));
    const item = jsonItems.find(item => item["Name"] === name);
    res.send(item);
};

const getItems = itemType => (req, res) => {
    const jsonItems = JSON.parse(fs.readFileSync(path.resolve(__dirname, `resources/items/${itemType}.json`)));
    res.send(jsonItems);
};

app.get("/activeGroupBuys", (req, res) => {
    const json = fs.readFileSync(path.resolve(__dirname, "resources/groupbuys.json"));
    res.send(json);
});

for (const itemType of ["case", "keycaps", "kit", "pcb", "plate", "stabilizers", "switches"]) {
    app.get(`/item/${itemType}/:name`, findItem(itemType));
    app.get(`/items/${itemType}`, getItems(itemType));
}

// TODO idea: image processing to detect colors of keys

app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "../client/dist", "index.html"));
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
