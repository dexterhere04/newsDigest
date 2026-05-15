import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { fetchNews } from "./services/fetchNews.service.js";
import { connectDB } from "./config/database.js";
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.get("/", (_req, res) => {
    res.json({
        success: true,
        message: "News Digest API Running"
    });
});
const PORT = process.env.PORT || 3000;
async function startServer() {
    await connectDB();
    await fetchNews();
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}
startServer();
//# sourceMappingURL=app.js.map