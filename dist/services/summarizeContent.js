import axios from "axios";
function cleanSummary(text) {
    const compact = text.replace(/\s+/g, " ").trim();
    const MAX_SUMMARY_LENGTH = 500;
    if (compact.length <= MAX_SUMMARY_LENGTH) {
        return compact;
    }
    const truncated = compact.slice(0, MAX_SUMMARY_LENGTH);
    const lastSentenceEnd = Math.max(truncated.lastIndexOf(". "), truncated.lastIndexOf("! "), truncated.lastIndexOf("? "));
    if (lastSentenceEnd > 0) {
        return truncated.slice(0, lastSentenceEnd + 1).trim();
    }
    return `${truncated.trimEnd()}...`;
}
function buildSummaryPrompt(title, content) {
    return [
        "You are summarizing a news article for a digest feed.",
        "Return only the summary text. No headings, no bullet points, no markdown, no quotes.",
        "Summary requirements:",
        "1) 2 to 4 sentences.",
        "2) Mention the central event, key actors, and the most important outcome or implication.",
        "3) Keep a neutral journalistic tone.",
        "4) Avoid speculation and avoid adding facts not present in the article.",
        "5) Maximum 80 words.",
        "",
        "Article title:",
        title,
        "",
        "Article content:",
        content,
    ].join("\n");
}
const MAX_PROMPT_CONTENT_LENGTH = 8000;
const DEFAULT_GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite";
function getPromptContent(content) {
    const trimmed = content.trim();
    if (trimmed.length <= MAX_PROMPT_CONTENT_LENGTH) {
        return trimmed;
    }
    return trimmed.slice(0, MAX_PROMPT_CONTENT_LENGTH);
}
export async function generateSummary(title, content, fallbackSummary) {
    const baseUrl = process.env.GEMINI_BASE_URL || DEFAULT_GEMINI_BASE_URL;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!baseUrl || !apiKey || !content.trim()) {
        return cleanSummary(fallbackSummary);
    }
    const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
    const promptContent = getPromptContent(content);
    try {
        const response = await axios.post(`${baseUrl.replace(/\/$/, "")}/models/${model}:generateContent`, {
            systemInstruction: {
                parts: [
                    {
                        text: "You create concise, factual, and reliable summaries for news articles.",
                    },
                ],
            },
            contents: [
                {
                    role: "user",
                    parts: [
                        {
                            text: buildSummaryPrompt(title, promptContent),
                        },
                    ],
                },
            ],
            generationConfig: {
                temperature: 0.2,
                topP: 0.9,
                maxOutputTokens: 320,
            },
        }, {
            headers: {
                "X-goog-api-key": apiKey,
                "Content-Type": "application/json",
            },
            timeout: 30000,
        });
        const aiText = response.data.candidates?.[0]?.content?.parts
            ?.map((part) => part.text || "")
            .join("") || "";
        if (!aiText.trim()) {
            console.warn("AI summary returned empty content", {
                title,
                contentLength: promptContent.length,
                blockReason: response.data.promptFeedback?.blockReason,
                blockReasonMessage: response.data.promptFeedback?.blockReasonMessage,
            });
            return cleanSummary(fallbackSummary);
        }
        return cleanSummary(aiText);
    }
    catch (error) {
        const responseError = error;
        console.warn("AI summary request failed, using fallback", {
            title,
            contentLength: promptContent.length,
            message: responseError.message,
            status: responseError.response?.status,
            data: responseError.response?.data,
        });
        return cleanSummary(fallbackSummary);
    }
}
//# sourceMappingURL=summarizeContent.js.map