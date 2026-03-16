const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 1024;

/**
 * Get book recommendations from Claude based on a user's library and prompt.
 *
 * @param {string} prompt - The user's request or preference description.
 * @param {Array<{title: string, author: string}>} books - The user's current library.
 * @returns {Promise<Array<{title: string, author: string, reason: string}>>} Recommended books.
 */
export async function getRecommendations(prompt, books = []) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Missing VITE_ANTHROPIC_API_KEY. Set it in your .env file."
    );
  }

  const libraryDescription =
    books.length > 0
      ? books.map((b) => `- "${b.title}" by ${b.author}`).join("\n")
      : "The user has no books in their library yet.";

  const systemPrompt = [
    "You are a knowledgeable book recommendation assistant.",
    "The user will share their current library and a request.",
    "Respond ONLY with a valid JSON array of recommended books.",
    "Each element must have: title (string), author (string), reason (string).",
    "Return between 1 and 10 recommendations. Do not include any text outside the JSON array.",
  ].join(" ");

  const userMessage = [
    "Here is my current library:",
    libraryDescription,
    "",
    `My request: ${prompt}`,
  ].join("\n");

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `Anthropic API request failed: ${response.status} ${response.statusText}${
        errorBody ? ` — ${errorBody}` : ""
      }`
    );
  }

  const data = await response.json();

  const textBlock = data.content?.find((block) => block.type === "text");

  if (!textBlock || !textBlock.text) {
    throw new Error("No text content in Anthropic API response");
  }

  try {
    const recommendations = JSON.parse(textBlock.text.trim());

    if (!Array.isArray(recommendations)) {
      throw new Error("Response is not a JSON array");
    }

    return recommendations;
  } catch (parseError) {
    // Try to extract a JSON array from the response in case there is surrounding text.
    const match = textBlock.text.match(/\[[\s\S]*\]/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error(
      `Failed to parse recommendations from response: ${parseError.message}`
    );
  }
}
