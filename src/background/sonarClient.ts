import { Framing } from '../types/gptTypes';

const SONAR_KEY = process.env.VITE_SONAR_KEY;

export async function fetchBalanced(text: string, framing: Framing) {
  const prompt = `
I just read content about "${text.slice(0, 100)}" that felt very ${framing.toLowerCase()}.
Give me three balanced or contrasting articles/videos on the same topic.
Format: TITLE | URL | one‑line summary.`;
  const body = { model: "sonar-pro", messages: [{ role: "user", content: prompt }] };

  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SONAR_KEY}`
    },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  const recommendations = data.choices[0].message.content
    .split('\n')
    .filter((line: string) => line.includes('|'))
    .map((line: string) => {
      const [title, url, summary] = line.split('|').map(s => s.trim());
      return { title, url, summary };
    });

  return recommendations;
}
