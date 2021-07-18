const cron = require("node-cron");
const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const path = require("path");
const fs = require("fs");

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

module.exports = () => {
    cron.schedule("0 0 * * *", async () => {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        const MECHGB_URL = "https://www.mechgroupbuys.com";
        await page.goto(MECHGB_URL);
        await new Promise(resolve => setTimeout(resolve, 3000));
        const data = await page.content();
        
        const groupBuyItems = getActiveGroupBuys(data);
        fs.writeFileSync(path.resolve(__dirname, "resources/groupbuys.json"), JSON.stringify(groupBuyItems, null, 4));
        await browser.close();
    });
};
