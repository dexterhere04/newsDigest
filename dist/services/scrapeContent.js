import axios from "axios";
import { load } from "cheerio";
const defaultPreset = {
    containerSelectors: [
        "article",
        "main",
        "[role='main']",
        ".article-content",
        ".post-content",
        ".entry-content",
        ".story-body",
    ],
    paragraphSelector: "p",
    blockedParagraphPatterns: [
        /^advertisement$/i,
        /^read more$/i,
    ],
};
const presetsByHost = {
    "timesofindia.indiatimes.com": {
        containerSelectors: [
            "[data-articlebody='1'] .z_eq3 .ihgno",
            "[data-articlebody='1'] .z_eq3",
            "[data-articlebody='1']",
            "article",
            "main",
        ],
        paragraphSelector: "p",
        useContainerTextWhenNoParagraphs: true,
        blockedParagraphPatterns: [
            /^advertisement$/i,
            /^read more$/i,
            /^track latest news live/i,
            /the toi news desk comprises/i,
        ],
    },
    "www.indiatoday.in": {
        containerSelectors: [
            "article",
            ".story__content",
            ".description",
            "main",
        ],
        paragraphSelector: "p",
        blockedParagraphPatterns: [
            /^advertisement$/i,
            /^read full story$/i,
            /^download app$/i,
        ],
    },
};
function cleanText(text) {
    return text
        .replace(/\s+/g, " ")
        .trim();
}
function pickPreset(articleUrl) {
    try {
        const hostname = new URL(articleUrl).hostname.toLowerCase();
        return presetsByHost[hostname] || defaultPreset;
    }
    catch {
        return defaultPreset;
    }
}
function shouldKeepParagraph(text, patterns) {
    if (!text) {
        return false;
    }
    return patterns.every((pattern) => !pattern.test(text));
}
function extractArticleBodyFromJsonLd($) {
    const jsonLdScripts = $("script[type='application/ld+json']").toArray();
    for (const node of jsonLdScripts) {
        const raw = cleanText($(node).html() || "");
        if (!raw) {
            continue;
        }
        try {
            const parsed = JSON.parse(raw);
            const entries = Array.isArray(parsed) ? parsed : [parsed];
            for (const entry of entries) {
                const type = Array.isArray(entry?.["@type"])
                    ? entry["@type"].join(" ")
                    : String(entry?.["@type"] || "");
                const body = cleanText(String(entry?.articleBody || ""));
                if (body.length > 200 &&
                    (type.includes("NewsArticle") || type.includes("Article"))) {
                    return body;
                }
            }
        }
        catch {
            continue;
        }
    }
    return "";
}
function shouldUseJsonLdFallback(content) {
    if (content.length < 600) {
        return true;
    }
    return /the toi news desk comprises/i.test(content);
}
function extractArticleText($, preset) {
    const pieces = [];
    for (const selector of preset.containerSelectors) {
        const container = $(selector).first();
        const nodes = container.find(preset.paragraphSelector).toArray();
        for (const node of nodes) {
            const text = cleanText($(node).text());
            if (shouldKeepParagraph(text, preset.blockedParagraphPatterns)) {
                pieces.push(text);
            }
        }
        if (pieces.length === 0 && preset.useContainerTextWhenNoParagraphs) {
            const containerText = cleanText(container.text());
            if (shouldKeepParagraph(containerText, preset.blockedParagraphPatterns)) {
                pieces.push(containerText);
            }
        }
        if (pieces.length > 0) {
            break;
        }
    }
    if (pieces.length === 0) {
        const nodes = $(preset.paragraphSelector).toArray();
        for (const node of nodes) {
            const text = cleanText($(node).text());
            if (shouldKeepParagraph(text, preset.blockedParagraphPatterns)) {
                pieces.push(text);
            }
        }
    }
    return cleanText(pieces.join("\n\n"));
}
export async function scrapeContent(article) {
    if (!article.url) {
        return article;
    }
    try {
        const response = await axios.get(article.url, {
            timeout: 15000,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
        });
        const $ = load(response.data);
        $("script, style, noscript, iframe, svg, canvas").remove();
        const preset = pickPreset(article.url);
        const title = cleanText($("article h1, main h1, h1").first().text());
        const metaDescription = cleanText($("meta[name='description']").attr("content") || "");
        const extractedContent = extractArticleText($, preset);
        const jsonLdContent = extractArticleBodyFromJsonLd($);
        const content = shouldUseJsonLdFallback(extractedContent)
            ? jsonLdContent || extractedContent
            : extractedContent;
        return {
            ...article,
            title: title || article.title,
            content: content || metaDescription || article.content,
        };
    }
    catch {
        return article;
    }
}
//# sourceMappingURL=scrapeContent.js.map