import { Framing, EmotionScores } from '../types/gptTypes';

const SONAR_KEY = process.env.VITE_SONAR_KEY;

export async function fetchBalanced(
  text: string,
  framing: Framing,
  emotionScores: EmotionScores,
  opts?: { title?: string; summary?: string }
) {
  // Get top 3 emotions and their scores
  const topEmotions = Object.entries(emotionScores)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([emotion, score]) => `${emotion} (${(score * 100).toFixed(1)}%)`)
    .join(', ');

  const contextSnippet = text.slice(0, 1000);
  const titlePart = opts?.title ? `Title: "${opts.title}"\n` : '';
  const summaryPart = opts?.summary ? `Summary: ${opts.summary}\n` : '';

  const prompt = `
${titlePart}${summaryPart}Transcript excerpt:\n"${contextSnippet}"

The above is content that was analyzed for emotion and framing. The overall framing is: ${framing.toLowerCase()}.
The dominant emotions detected were: ${topEmotions}.

Please provide three balanced or contrasting perspectives on this topic that:
1. Address the emotional aspects (${topEmotions})
2. Offer alternative viewpoints or more neutral framing
3. Help provide a more complete understanding of the topic

Format each recommendation as:
TITLE | URL | one-line summary explaining how it balances or contrasts with the original content's emotional tone.

Example format:
"Understanding Climate Change: A Balanced View | https://example.com | A neutral analysis that addresses both concerns and solutions without emotional bias."

Please provide exactly three recommendations in this format.`;

  const body = { 
    model: "sonar", 
    messages: [{ role: "user", content: prompt }] 
  };

  try {
    console.log('Sending request to Sonar API...');
    console.log('Request body:', JSON.stringify(body, null, 2));
    
    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SONAR_KEY}`
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Sonar API Error Response:', {
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries()),
        body: errorText
      });
      throw new Error(`Sonar API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    console.log('Sonar API Response:', JSON.stringify(data, null, 2));
    
    if (!data.choices?.[0]?.message?.content) {
      console.error('Unexpected Sonar API response:', data);
      throw new Error('Invalid response format from Sonar API');
    }

    const content = data.choices[0].message.content;
    console.log('Sonar API Content:', content);

    // Improved parser: handle both pipe and markdown formats
    const recommendations: { title: string; url: string; summary: string }[] = [];
    const lines: string[] = content.split('\n').filter((line: string) => line.trim());
    for (const line of lines) {
      // Try pipe format first
      if (line.includes('|')) {
        const [title, url, summary]: string[] = line.split('|').map((s: string) => s.trim());
        if (title && url && summary) {
          recommendations.push({ title, url, summary });
          continue;
        }
      }
      // Try markdown-style (e.g. **1. Title | URL**  Summary)
      const mdMatch = line.match(/^\*\*\d+\. (.+?) \| (https?:\/\/[^*]+)\*\*\s*(.*)$/);
      if (mdMatch) {
        recommendations.push({
          title: mdMatch[1].trim(),
          url: mdMatch[2].trim(),
          summary: mdMatch[3].trim()
        });
      }
    }

    if (recommendations.length === 0) {
      console.error('No recommendations found in response:', content);
      throw new Error('No recommendations found in Sonar API response');
    }

    console.log('Parsed recommendations:', recommendations);
    return recommendations;
  } catch (error) {
    console.error('Error in fetchBalanced:', error);
    throw error;
  }
}
