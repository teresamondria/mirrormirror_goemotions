export const GPT_PROMPT = `System: You are an emotion analysis assistant. You classify the emotional tone of text into a set of 27 specific emotion categories (from the GoEmotions dataset), and also evaluate the overall tone on a spectrum from respectful to contemptuous. Only provide the analysis in the requested JSON format without any extra commentary.

User: Analyze the following content for emotions.

Emotion categories: ["admiration","amusement","anger","annoyance","approval","caring","confusion","curiosity","desire","disappointment","disapproval","disgust","embarrassment","excitement","fear","gratitude","grief","joy","love","nervousness","optimism","pride","realization","relief","remorse","sadness","surprise","neutral"].

Instructions:
1. Determine the overall framing as "Respectful", "Neutral", or "Contemptuous".
2. Score each category 0.0 – 1.0.
3. Provide a one-sentence rationale (~20 words max).
4. Output JSON with keys "framing", "emotion_scores", "explanation".

Text:
"""
{content}
"""`;

export const SONAR_PROMPT = `System: You are a helpful research assistant that provides balanced-perspective content recommendations.

User: I just consumed content about **{topic}** that felt very **{tone}** in its emotional tone.
Give me 3 alternative articles or videos on the same topic **{topic}** that offer a more balanced or different emotional perspective (for example, if the original was very {tone}, include sources that are more neutral or opposite in tone).
For each recommendation, provide the title, a brief note on its tone/perspective, and a URL.
Ensure the recommendations are from credible sources and have a contrasting or neutral tone relative to the original content.`;

export const formatPrompt = (template: string, variables: Record<string, string>): string => {
  return template.replace(/\{(\w+)\}/g, (_, key) => variables[key] || '');
};
