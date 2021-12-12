import express from "express";
import path from "path";

const router = express.Router();

const getModel = (modelPath: string) => path.resolve(__dirname, "..", `../assets/models/${modelPath}.json`);

router.get("/cases/:caseName", (req, res) => {
    const { caseName } = req.params;
    res.sendFile(getModel(`cases/${caseName}`));
});

router.get("/keycaps/:keycapProfile/:keycapName", (req, res) => {
    const { keycapProfile, keycapName } = req.params;
    res.sendFile(getModel(`keycaps/${keycapProfile}/${keycapName}`));
});

router.get("/switch", (req, res) => {
    res.sendFile(getModel("switch"));
});

router.get("/stabilizer", (req, res) => {
    res.sendFile(getModel("stabilizer"));
});

export default router;
