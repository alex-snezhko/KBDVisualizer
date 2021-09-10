// const db = require("./db");
// const fs = require('fs');
// const path = require('path');

// const f = fs.readFileSync(path.resolve(__dirname, "resources/keycapsInfo.json"));
// const json = JSON.parse(f);

// async function q(item) {
//     // await db.query(`INSERT into pcbs (name, image, link, price, form_factor, hot_swap, backlight)
//     // values ($1, $2, $3, $4, $5, $6, $7)`, [item["Name"], item["Image"], item["Link"], item["Base Price"], item["Form Factor"], item["Hot-swap"], item["Backlight"]]);
//     // console.log(item["Name"]);

//     // await db.query(`INSERT into stabilizers (name, image, link, price, mount_method, color_arr)
//     // values ($1, $2, $3, $4, $5, $6)`, [item["Name"], item["Image"], item["Link"], item["Base Price"], item["Mount Method"], item["color"]]);
//     // console.log(item["Name"]);

//     // await db.query(`INSERT into plates (name, image, link, price, form_factor, material)
//     // values ($1, $2, $3, $4, $5, $6)`, [item["Name"], item["Image"], item["Link"], item["Base Price"], item["Form Factor"], item["Material"]]);
//     // console.log(item["Name"]);

//     // await db.query(`INSERT into switches (name, image, link, price, tactility, spring_weight, act_dist, bot_dist, color_arr)
//     // values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [item["Name"], item["Image"], item["Link"], item["Base Price"], item["Tactility"], item["Spring Weight"], item["Actuation Distance"], item["Bottom-out Distance"], item["casingColor"]]);
//     // console.log(item["Name"]);

//     // await db.query(`INSERT into cases (name, image, link, price, form_factor, mount_method, material)
//     // values ($1, $2, $3, $4, $5, $6, $7)`, [item["Name"], item["Image"], item["Link"], item["Base Price"], item["Form Factor"], item["Mount Method"], item["Material"]]);
//     // console.log(item["Name"]);

    
// }

// // async function qq() {
// //     const { rows } = await db.query("SELECT * FROM cases");
// //     for (const row of rows) {
// //         const item = json.find(x => x["Name"] === row.name);
// //         const color = item["Primary Color"];
// //         if (color.type === "selection") {
// //             const options = color.options;
// //             for (const option of options) {
// //                 if (option.type && option.extra) {
// //                     await db.query(`INSERT INTO case_colors (item_id, color, color_arr, extra_price)
// //                     VALUES ($1, $2, $3, $4)`, [row.id, option.type, [0, 0, 0, 1], option.extra]);
// //                 } else {
// //                     await db.query(`INSERT INTO case_colors (item_id, color, color_arr, extra_price)
// //                     VALUES ($1, $2, $3, $4)`, [row.id, option, [0, 0, 0, 1], 0]);
// //                 }
// //             }
// //         } else {
// //             await db.query(`INSERT INTO case_colors (item_id, color, color_arr, extra_price)
// //                     VALUES ($1, $2, $3, $4)`, [row.id, color, [0, 0, 0, 1], 0]);
// //         }
// //     }
// // }

// async function qq() {
//     for (const [name, info] of Object.entries(json)) {
//         await db.query("INSERT INTO keycaps_info (name, data) VALUES ($1, $2)", [name, JSON.stringify(info)]);
//     }
// }

// // for (const item of json) {
// //     (async() => {
// //         await q(item);
// //     })();
// // }

// (async() => {
//     await qq();
// })();

// // (async() => {
// //     await q(json);
// // })();