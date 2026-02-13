import * as cheerio from "cheerio";

interface ExtractionResult {
  text: string;
  title: string;
  links: string[];
}

const MAX_TEXT_LENGTH = 15000;

const REMOVE_SELECTORS = [
  "script",
  "style",
  "noscript",
  "iframe",
  "svg",
  "nav",
  "footer",
  "header",
  "[role='navigation']",
  "[role='banner']",
  "[role='contentinfo']",
  ".cookie-banner",
  ".cookie-consent",
  ".ad",
  ".ads",
  ".advertisement",
  ".social-share",
  ".sidebar",
  "#sidebar",
  ".newsletter-signup",
  ".popup",
  ".modal",
];

/**
 * Extracts cleaned text content from HTML for LLM processing.
 * Strips scripts, styles, nav, footer, ads, etc.
 * Optionally narrows to a CSS selector.
 * Caps output at ~15,000 chars (~4K tokens).
 */
export function extractContentFromHtml(
  html: string,
  contentSelector?: string
): ExtractionResult {
  const $ = cheerio.load(html);

  // Extract page title
  const title = $("title").first().text().trim();

  // Remove unwanted elements
  for (const selector of REMOVE_SELECTORS) {
    $(selector).remove();
  }

  // Narrow to content selector if provided
  let $scope = contentSelector ? $(contentSelector) : $("body");
  if (contentSelector && $scope.length === 0) {
    // Fallback to body if selector not found
    $scope = $("body");
  }

  // Extract links (useful for event detail pages)
  const links: string[] = [];
  $scope.find("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (href && href.startsWith("http")) {
      links.push(href);
    }
  });
  // Dedupe and cap at 50
  const uniqueLinks = [...new Set(links)].slice(0, 50);

  // Get text content with some structure preservation
  // Replace block elements with newlines for readability
  $scope.find("br").replaceWith("\n");
  $scope.find("p, div, li, h1, h2, h3, h4, h5, h6, tr").each((_, el) => {
    $(el).prepend("\n");
  });

  let text = $scope.text();

  // Clean up whitespace
  text = text
    .replace(/[ \t]+/g, " ") // collapse horizontal whitespace
    .replace(/\n\s*\n/g, "\n\n") // collapse multiple blank lines
    .replace(/\n{3,}/g, "\n\n") // max 2 consecutive newlines
    .trim();

  // Truncate to budget
  if (text.length > MAX_TEXT_LENGTH) {
    text = text.slice(0, MAX_TEXT_LENGTH) + "\n\n[Content truncated...]";
  }

  return { text, title, links: uniqueLinks };
}
