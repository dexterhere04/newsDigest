import Parser from "rss-parser";
import { normalizeText } from "../utils/normalizeText.js";
import Article from "../models/article.model.js";
import { RSS_SOURCES } from "../config/newsSources.js";
import { scrapeContent } from "./scrapeContent.js";
import { generateSummary } from "./summarizeContent.js";
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

    return feed.items.slice(0, 10).map((item) => {

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

async function fetchArticlesFromAllSources(): Promise<NormalizedArticle[]> {
    const feeds = await Promise.all(
        RSS_SOURCES.map((source) => fetchRSSFeed(source))
    );

    const queue: NormalizedArticle[] = [];
    const seenUrls = new Set<string>();

    for (const feed of feeds) {
        for (const article of feed) {
            const normalizedUrl = article.url.trim();

            if (!normalizedUrl || seenUrls.has(normalizedUrl)) {
                continue;
            }

            seenUrls.add(normalizedUrl);
            queue.push({
                ...article,
                url: normalizedUrl,
            });
        }
    }

    return queue;
}

async function filterExistingArticles(
    articles: NormalizedArticle[]
): Promise<NormalizedArticle[]> {
    const urls = articles.map((article) => article.url);

    if (urls.length === 0) {
        return [];
    }

    const existingArticles = await Article.find({
        url: { $in: urls },
    })
        .select({ url: 1 })
        .lean();

    const existingUrls = new Set(
        existingArticles.map((article) => article.url)
    );

    return articles.filter((article) => !existingUrls.has(article.url));
}

async function updateContentSummary(rssFeed: NormalizedArticle[]) {
    for (const article of rssFeed) {
        const scrapedArticle = await scrapeContent(article);
        article.content = scrapedArticle.content || article.content;
        article.summary = await generateSummary(
            article.title,
            article.content,
            article.summary
        );
    }
    return rssFeed;
}

async function saveArticles(articles: NormalizedArticle[]) {
    for (const article of articles) {
        await Article.create(article);
    }
}

export async function fetchNews() {

    try {

        console.log(
            "Fetching news..."
        );

        const queuedArticles = await fetchArticlesFromAllSources();
        const newArticles = await filterExistingArticles(queuedArticles);

        console.log(
            `Queued ${queuedArticles.length} unique articles from ${RSS_SOURCES.length} sources`
        );
        console.log(
            `Skipping ${queuedArticles.length - newArticles.length} already-saved articles`
        );

        const processedArticles = await updateContentSummary(newArticles);

        console.log(
            JSON.stringify(
                processedArticles,
                null,
                2
            )
        );

        await saveArticles(
            processedArticles
        );

        console.log(
            `Saved ${processedArticles.length} new articles`
        );

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