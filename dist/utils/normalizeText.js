export function normalizeText(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}
//# sourceMappingURL=normalizeText.js.map