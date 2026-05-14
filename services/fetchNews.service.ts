import Parser from "rss-parser";
import { normalizeText } from "../utils/normalizeText.js";
import Article from "../models/article.model.js";
import { RSS_SOURCES } from "../config/newsSources.js";
import { scrapeContent } from "./scrapeContent.js";
export type NormalizedArticle = {
    title: string;
    normalizedTitle: string;

    content: string;

    summary: string;

    source: {
        name: string;
        type: "rss" | "api";
        homepage: string;
    };

    url: string;

    topic: string;
    normalizedTopic: string;

    keywords: string[];

    sentiment: "positive" | "neutral" | "negative";

    publishedAt: Date;
};

const parser = new  Parser();

async function fetchRSSFeed(
    source: typeof RSS_SOURCES[number]
): Promise<NormalizedArticle[]> {

    const feed = await parser.parseURL(source.feed);

    return feed.items.map((item) => {

        const title =item.title || "";

        const content =item.contentSnippet || "";

        return {
            title,
            normalizedTitle: normalizeText(title),
            content,
            summary: content.split(". ").slice(0, 2).join(". "),
            source: {
                name: source.name,

                type: "rss",

                homepage: source.homepage
            },

            url: item.link || "",

            topic: "general",

            normalizedTopic:
                "general",

            keywords: [],

            sentiment: "neutral",

            publishedAt:
                item.pubDate
                    ? new Date(item.pubDate)
                    : new Date()
        };
    });
}

async function updateContentSummary(rssFeed: NormalizedArticle[]){
    for (const article of rssFeed){
        const scrapedArticle = await scrapeContent(article);
        article.content = scrapedArticle.content;
    }
}

async function saveArticles(articles: NormalizedArticle[]){
    for (const article of articles) {

        const exists = await Article.findOne({
            url: article.url
        }).exec();

        if (exists) {
            continue;
        }

        await Article.create(article);
    }
}

export async function fetchNews() {

    try {

        console.log(
            "Fetching news..."
        );

        for (const source of RSS_SOURCES) {

            console.log(
                `Fetching from ${source.name}`
            );

            const articles = await fetchRSSFeed(source);
            await updateContentSummary(articles);
            console.log(
                JSON.stringify(
                    articles,
                    null,
                    2
                )
            );
            await saveArticles(
                articles
            );

            console.log(
                `Saved ${articles.length} articles from ${source.name}`
            );
        }

        console.log(
            "News fetching complete"
        );

    }
    catch (error) {

        console.error(
            "News fetching failed:",
            error
        );
    }
}