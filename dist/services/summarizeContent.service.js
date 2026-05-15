import axios from "axios";
function cleanSummary(text) {
    const compact = text.replace(/\s+/g, " ").trim();
    return compact.slice(0, 500);
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
export async function generateSummary(title, content, fallbackSummary) {
    const baseUrl = process.env.AIBASE_URL;
    const apiKey = process.env.AIAPI_KEY;
    if (!baseUrl || !apiKey || !content.trim()) {
        return cleanSummary(fallbackSummary);
    }
    const model = process.env.AI_MODEL || "abacusai/dracarys-llama-3.1-70b-instruct";
    try {
        const response = await axios.post(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
            model,
            messages: [
                {
                    role: "system",
                    content: "You create concise, factual, and reliable summaries for news articles.",
                },
                {
                    role: "user",
                    content: buildSummaryPrompt(title, content),
                },
            ],
            temperature: 0.2,
            top_p: 0.9,
            max_tokens: 220,
            stream: false,
        }, {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            timeout: 20000,
        });
        const aiText = response.data.choices?.[0]?.message?.content || "";
        if (!aiText.trim()) {
            return cleanSummary(fallbackSummary);
        }
        return cleanSummary(aiText);
    }
    catch {
        return cleanSummary(fallbackSummary);
    }
}
//# sourceMappingURL=summarizeContent.service.js.map