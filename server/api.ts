import express from "express";
import cors from "cors";
import path from "path";
import db from "./db";
import infoRoutes from "./routes/info";
import itemsRoutes from "./routes/items";

const app = express();

app.use(cors());

app.use((req, res, next) => {
    try {
        decodeURIComponent(req.path);
    } catch (e) {
        res.status(400).send({ message: "URL must be properly encoded" });
    }
    next();
});

app.use(express.static(path.resolve(__dirname, "../client/dist")));

app.use("/info", infoRoutes);
app.use("/items", itemsRoutes);

app.get("/activeGroupBuys", async (req, res) => {
    const { rows } = await db.query("SELECT * FROM groupbuys ORDER BY end_date");
    res.send(rows);
});

app.get("/models/:modelPath(*)", (req, res) => {
    const { modelPath } = req.params;
    res.sendFile(path.resolve(__dirname, `resources/models/${modelPath}.json`));
});

app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "../client/dist", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
