import puppeteer from "puppeteer";
import cheerio from "cheerio";
import db from "./db";

interface GroupBuyItem {
    name: string;
    image: string;
    link: string;
    partType: string;
    startDate: string;
    endDate: string;
    price: number;
}

function getActiveGroupBuys(data: string) {
    const $ = cheerio.load(data);

    const groupBuyItems: GroupBuyItem[] = [];

    const $items = $("div.gMJRj").children();
    $items.each(function() {
        const $item = $(this);
        const $info = $item.find("ul.kNKLJw").children("li");
        function getInfo(searchFor: string) {
            const $infoItem = $info.filter(function() {
                const infoType = $(this).children(".hctKJM").text().trim();
                return infoType === searchFor;
            });
            return $infoItem.children(".jxQFAb").text().trim();
        }

        const name = $item.find(".cqDPIl").text();
        const image = $item.find("img.enYpte").attr("src")!;
        const link = "https://www.mechgroupbuys.com" + $item.find(".gSVBBi").children("a").attr("href");
        let partType = $item.find(".gLiaon").text();
        if (partType === "keyboards") {
            partType = "keyboard";
        }
        partType = partType.charAt(0).toUpperCase() + partType.slice(1);
        const startDate = getInfo("Start date:");
        const endDate = getInfo("End date:");
        // TODO handle other currencies
        const price = parseFloat(getInfo("Base price:").replace(/[^\d.]/g, ""));

        const item = { name, image, link, partType, startDate, endDate, price };
        groupBuyItems.push(item);
    });

    return groupBuyItems;
}

async function scrapeGroupBuys() {
    await db.query("DELETE FROM groupbuys WHERE end_date > CURRENT_DATE");

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const MECHGB_URL = "https://www.mechgroupbuys.com";
    await page.goto(MECHGB_URL);
    await new Promise(resolve => setTimeout(resolve, 3000));
    const data = await page.content();
    
    const groupBuyItems = getActiveGroupBuys(data);
    for (const item of groupBuyItems) {
        const { rows } = await db.query("SELECT name FROM groupbuys WHERE name = $1", [item.name]);
        if (rows.length === 0) {
            await db.query(
                "INSERT INTO groupbuys (name, image, link, part_type, start_date, end_date, price) VALUES ($1, $2, $3, $4, $5, $6, $7)",
                [item.name, item.image, item.link, item.partType, item.startDate, item.endDate, item.price]
            );
        }
    }

    await browser.close();
}

scrapeGroupBuys();
