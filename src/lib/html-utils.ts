const HTML_ENTITIES: Record<string, string> = {
  "&quot;": '"',
  "&amp;": "&",
  "&#39;": "'",
  "&nbsp;": " ",
  "&lt;": "<",
  "&gt;": ">",
};

export function decodeEntities(text: string): string {
  return text.replace(/&[a-z#0-9]+;/gi, (m) => HTML_ENTITIES[m] ?? m);
}

export function stripTags(html: string): string {
  return html.replace(/<\/?[^>]+>/g, "");
}

export function looksLikeHtml(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text);
}
