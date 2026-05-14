import { scrapeContent } from "../services/scrapeContent.js";
const articleUrl = "https://timesofindia.indiatimes.com/india/10-days-of-manthan-for-keralas-simhasanam-why-congress-picked-vd-satheesan-over-kc-venugopal/articleshow/131099193.cms";
async function main() {
    const article = await scrapeContent({
        title: "How Vijay's anti-liquor push mirrors his Master arc",
        normalizedTitle: "how vijays anti liquor push mirrors his master arc",
        content: "",
        summary: "",
        source: {
            name: "India Today",
            type: "rss",
            homepage: "https://www.indiatoday.in",
        },
        url: articleUrl,
        topic: "general",
        normalizedTopic: "general",
        keywords: [],
        sentiment: "neutral",
        publishedAt: new Date("2026-05-14T00:00:00.000Z"),
    });
    console.log("Title:\n", article.title);
    console.log("\nContent identified:\n");
    console.log(article.content);
}
main()
    .catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
//# sourceMappingURL=articleContentExtraction.test.js.map