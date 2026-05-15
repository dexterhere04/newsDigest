import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { fetchNews } from "./services/fetchNews.service.js";
import cron from "node-cron";
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

    // run initial fetch once on startup
    await fetchNews();

    const schedule = process.env.CRON_SCHEDULE || "*/15 * * * *";
    try {
        cron.schedule(schedule, async () => {
            console.log(`Running scheduled fetchNews() - ${new Date().toISOString()}`);
            try {
                await fetchNews();
            } catch (err) {
                console.error("Scheduled fetchNews failed:", err);
            }
        });
        console.log(`Scheduled fetchNews with CRON '${schedule}'`);
    } catch (err) {
        console.error("Failed to schedule fetchNews:", err);
    }

    app.listen(PORT, () => {
        console.log(
            `Server running on port ${PORT}`
        );
    });
}

startServer();