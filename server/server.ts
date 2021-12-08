import express from "express";
import cors from "cors";
import path from "path";
import db from "./db";
import infoRoutes from "./routes/info";
import itemsRoutes from "./routes/items";
import modelsRoutes from "./routes/models";

const filePath = (relative: string) => path.resolve(__dirname, ".." /* built js will be in 'dist' folder */, relative);

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

app.use(express.static(filePath("../client/dist")));

app.use("/info", infoRoutes);
app.use("/items", itemsRoutes);
app.use("/models", modelsRoutes);

app.get("/activeGroupBuys", async (req, res) => {
    const { rows } = await db.query("SELECT * FROM groupbuys ORDER BY end_date");
    res.send(rows);
});

app.get("*", (req, res) => {
    res.sendFile(filePath("../client/dist/index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
