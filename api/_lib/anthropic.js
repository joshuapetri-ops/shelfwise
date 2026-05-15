const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';

const LANGUAGE_NAMES = {
  en: 'English', es: 'Spanish', fr: 'French', de: 'German', pt: 'Portuguese',
  it: 'Italian', ja: 'Japanese', zh: 'Chinese', ko: 'Korean', ru: 'Russian',
  ar: 'Arabic', hi: 'Hindi', nl: 'Dutch', sv: 'Swedish', pl: 'Polish',
};

function authHeaders() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured');
  return {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
  };
}

async function callAnthropic(body) {
  const resp = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    const err = new Error(`Anthropic ${resp.status} ${resp.statusText}${text ? ` — ${text}` : ''}`);
    err.status = resp.status;
    throw err;
  }
  return resp.json();
}

function extractText(data) {
  const block = data.content?.find((b) => b.type === 'text');
  return block?.text ?? '';
}

function parseJsonArray(text) {
  const clean = text.replace(/```json|```/g, '').trim();
  try {
    const parsed = JSON.parse(clean);
    if (Array.isArray(parsed)) return parsed;
  } catch { /* fall through */ }
  const match = clean.match(/\[[\s\S]*\]/);
  if (match) return JSON.parse(match[0]);
  throw new Error('Response did not contain a JSON array');
}

async function recommendations({ prompt, books = [], language = 'en' }) {
  const libraryDescription = books.length > 0
    ? books.map((b) => `- "${b.title}" by ${b.author}`).join('\n')
    : 'The user has no books in their library yet.';

  const systemPrompt = [
    'You are a knowledgeable book recommendation assistant.',
    'The user will share their current library and a request.',
    'Respond ONLY with a valid JSON array of recommended books.',
    'Each element must have: title (string), author (string), reason (string).',
    'Return between 1 and 10 recommendations. Do not include any text outside the JSON array.',
  ].join(' ');

  let userMessage = [
    'Here is my current library:',
    libraryDescription,
    '',
    `My request: ${prompt}`,
  ].join('\n');

  if (language && language !== 'en') {
    const languageName = LANGUAGE_NAMES[language] || language;
    userMessage += `\nPrefer books available in ${languageName}. If suggesting translated works, mention the translator.`;
  }

  const data = await callAnthropic({
    model: MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  return parseJsonArray(extractText(data));
}

async function search({ query, limit = 5 }) {
  const data = await callAnthropic({
    model: MODEL,
    max_tokens: 800,
    messages: [{
      role: 'user',
      content: `Find real published books that closely match this exact search: "${query}"

Rules:
- The title must closely match the search query
- If the query includes an author name, the results MUST be by that author
- If you don't know of any books that closely match, return an empty array []
- Do NOT return loosely related books with similar words in the title
- Only return books you are confident actually exist

Return up to ${limit} books as a JSON array. Each object: title, author, year, isbn (ISBN-13 or null). If no close matches exist, return []. No markdown fences, just the raw JSON array.`,
    }],
  });

  try {
    return parseJsonArray(extractText(data));
  } catch {
    return [];
  }
}

async function searchWeb({ query }) {
  const userPrompt = `Search the web for the book "${query}". Tell me its exact title, author, publication year, and ISBN-13 number.`;

  const step1 = await callAnthropic({
    model: MODEL,
    max_tokens: 1000,
    tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    messages: [{ role: 'user', content: userPrompt }],
  });

  await new Promise((resolve) => setTimeout(resolve, 2000));

  const step2Body = {
    model: MODEL,
    max_tokens: 500,
    messages: [
      { role: 'user', content: userPrompt },
      { role: 'assistant', content: step1.content },
      { role: 'user', content: 'Now return ONLY a JSON array containing one object with: title, author, year, isbn. No markdown fences, no explanation, just the raw JSON array.' },
    ],
  };

  let step2;
  try {
    step2 = await callAnthropic(step2Body);
  } catch (err) {
    if (err.status === 429) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      step2 = await callAnthropic(step2Body);
    } else {
      throw err;
    }
  }

  try {
    const text = extractText(step2);
    const clean = text.replace(/```json|```/g, '').trim();
    const match = clean.match(/\[[\s\S]*\]/);
    const parsed = JSON.parse(match ? match[0] : clean);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

export const anthropic = { recommendations, search, searchWeb };
