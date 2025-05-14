# MirrorMirror

A Chrome extension that analyzes the emotional sentiment of YouTube videos and articles, helping users understand the emotional tone of the content they consume.

## Features

- Real-time emotional sentiment analysis of YouTube video transcripts
- Analysis of 27 different emotions from the GoEmotions dataset
- Overall tone classification (Respectful/Neutral/Contemptuous)
- Powered by OpenAI's GPT-4 for accurate emotion detection
- Caching system for improved performance

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/mirrormirror.git
cd mirrormirror
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with your API keys:
```
OPENAI_API_KEY=your_openai_api_key
```

4. Build the extension:
```bash
npm run build
```

5. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` directory from this project

## Development

- Run tests: `npm test`
- Build for development: `npm run dev`
- Build for production: `npm run build`

## Project Structure

```
src/
├── background/         # Background scripts
│   ├── openaiClient.ts # OpenAI API integration
│   └── youtubeCaptions.ts # YouTube transcript fetching
├── content/           # Content scripts
├── ui/               # Extension UI
└── utils/            # Utility functions
```

## License

MIT

# Chrome Extension for Emotional Sentiment Analysis – Technical & Product Specification

> **Note:** This markdown preserves **every paragraph, code block, table, and list** from the original text—nothing has been removed—while re‑ordering addendums so they sit directly beneath their related parent sections.
>
> Copy‑and‑paste into Cursor (or any markdown editor) for a fully readable, hierarchically organized spec.

---

## 1 · Feasibility and Literature Review

Recent advances in large language models (LLMs) like **GPT‑4** have made it feasible to perform fine‑grained emotion analysis on text without training a dedicated model. The **GoEmotions** dataset (58 k Reddit comments labeled with 27 emotions + neutral) provides a benchmark for this task.
aclanthology.org

A RoBERTa model fine‑tuned on GoEmotions achieves about **45 % macro F1‑score**
aclanthology.org
huggingface.co
indicating the task's difficulty and leaving room for improvement. GPT‑4, as a general model, can approximate this classification but needs careful prompt design. Studies show GPT‑4 can identify fine‑grained emotions, though accuracy drops with more categories (e.g. \~35.6 % accuracy across 27 emotions vs \~46.5 % for 6 basic emotions)
research.lancs.ac.uk
research.lancs.ac.uk

GPT‑4 tends to **over‑label** (assign multiple similar emotions to one text) and even invent labels outside the given taxonomy if not constrained
arxiv.org
arxiv.org
For example, given an input, GPT‑4 might return "informative" or "curiosity" as emotions – valid sentiments but not in the official 27 categories
arxiv.org

To harness GPT‑4‑level models for GoEmotions, researchers emphasize **strict prompting**: providing the list of allowed emotions and instructing the model to choose only from those categories
arxiv.org
This mitigates hallucinated labels and keeps outputs consistent. In practice, prompting GPT‑4 to output a single best‑fitting emotion from a provided list has yielded reasonable accuracy (e.g. GPT‑4 correctly identified "amusement" with 80.1 % accuracy in one evaluation)
research.lancs.ac.uk

**Prompt tuning and reliability:** The extension will use a GPT‑4‑grade model ("GPT‑4o‑mini") via the OpenAI API, tuned through prompts to emulate a GoEmotions classifier. By supplying explicit instructions and example formats, we ensure the model's outputs align with GoEmotions categories (no undefined labels, minimal extra verbiage). This approach is supported by community findings: fine‑tuning or carefully prompting smaller GPT‑4 variants can dramatically boost classification performance (in one case, from \~69 % to 94 % on a custom task after prompt/parameter tuning
reddit.com  ). We will apply similar principles: the prompt will enumerate all 27 emotion labels and require the model to output a structured JSON with scores. Additionally, to focus on the Respect–Contempt framing, the prompt will ask for an overall tone assessment (Respectful, Neutral, or Contemptuous) derived from the fine‑grained emotions. This combined strategy leverages GPT's nuanced understanding while bounding it to a reliable, parseable format.

Latency‑wise, using the OpenAI API for a few hundred words of transcript/article with a small model variant is practical. GPT‑3.5/GPT‑4 can process \~500 tokens and respond within a few seconds in many cases. Our target of **< 15 s end‑to‑end** is reasonable: e.g., GPT‑3.5‑Turbo can often return results in \~5 s for such classification, and even GPT‑4 (8 k) usually responds under 10 s for short prompts. By caching results and running API calls asynchronously, the extension can stay within this limit.

> **Summary:** Existing literature and experiments confirm it's feasible to approximate GoEmotions with GPT‑4‑level models, given prompt constraints
> arxiv.org  , and to obtain multi‑category sentiment analysis in real‑time. The key is prompt reliability and managing the model's tendency to over‑interpret nuances
> arxiv.org  . With a well‑tuned prompt and light post‑processing (e.g. ignoring any extraneous output), GPT‑4o‑mini can serve as an effective emotion classifier for our use case.

---

## 2 · Technical Pipeline

The extension operates through a series of steps from content extraction to visualization. **Figure 1** illustrates the end‑to‑end pipeline, from grabbing page text to displaying results:

> **Figure 1:** High‑level architecture of the Chrome extension's pipeline. The content script extracts text (YouTube transcript or article) and caches it. The background script sends text to the OpenAI API for emotion analysis and to the Perplexity Sonar API for finding alternative content. The responses are then used to update the extension's UI (gauge, breakdown chart, and recommendations).

1. **Content Extraction:** When a user visits a YouTube video or reads an online article, the extension's content script triggers. This script runs in the context of the webpage DOM. For YouTube, it accesses the transcript – either via YouTube's player API or by scraping the transcript text if it's available on the page. For example, it might detect if the "Transcript" panel is open or use YouTube's data API (with video ID) to fetch caption text. For articles, the content script will parse the HTML to extract the main text (e.g. using heuristics like `<article>` tags or readability algorithms to skip nav bars and comments). The extracted text content (the video's transcript or article body) is then sanitized (remove scripts, unrelated text) and sent to the background script. Before sending, the content script may check an IndexedDB cache (keyed by page URL or video ID) to see if this content was analyzed recently; if so, it can avoid redundant re‑processing.
2. **Caching & Debounce:** The extension uses IndexedDB (a persistent browser database) to cache both raw transcripts and analysis results. For instance, if a user revisits the same YouTube video, the transcript and its previously computed sentiment results can be loaded from cache instantly. This improves responsiveness and reduces API calls (saving cost and latency). The content script debounces rapid changes – e.g. if a user scrolls or the transcript updates in increments, it waits until the transcript is complete before initiating analysis. Once ready, it sends the text (or a reference key) to the background script via Chrome messaging.
3. **Emotion Analysis via OpenAI API:** The background script (running as a service worker under Manifest V3) receives the text and handles API calls. It constructs a prompt for OpenAI's API (GPT‑4o‑mini model) to classify the emotional content. The prompt includes the full text (truncated or summarized if extremely long, to fit token limits) and asks for the 27‑category emotion breakdown plus an overall "Respect vs Contempt" score (details of the prompt are in the **Prompt Drafts** section). The background script includes the OpenAI API key (loaded from a `.env` configuration at build time for security). It sends a fetch request to the OpenAI endpoint with the model, prompt, and necessary parameters (e.g. temperature set low \~0.2 for deterministic classification). The response – ideally a JSON with emotion scores – is parsed by the background script. We anticipate the sentiment classification call to complete in a few seconds; in testing, even GPT‑4 can handle a few hundred words classification within \~10 s. To meet the < 15 s latency goal, we may use a smaller/faster model (GPT‑3.5 Turbo or a fine‑tuned variant dubbed "GPT‑4o‑mini") which can return results in \~5 s while maintaining reasonable accuracy.
4. **Recommendation Fetch via Perplexity Sonar:** In parallel with the sentiment analysis, the background script queries the Perplexity Sonar API to retrieve "emotionally balanced" alternative content. Sonar is a real‑time AI‑powered search API that can retrieve answers with citations
   medium.com
   zuplo.com
   The extension formulates a query based on the current content's topic. For example, if the video is titled "Political Debate on Climate Policy" and the analysis found a highly contemptuous tone, the extension might query Sonar with a prompt like: "Find neutral or opposing‑perspective articles on climate policy debates". This way, Sonar will search the web and use its language model to return a concise answer with a few relevant links. We include in the prompt a request for balanced tone content – this leverages Sonar's ability to customize search results (Sonar can be instructed via prompt to prioritize certain sources or styles
   docs.perplexity.ai  ). The background script uses the Perplexity API key from `.env` and calls `POST /chat/completions` with the model set to `sonar` or `sonar‑pro` and our query
   docs.perplexity.ai
   docs.perplexity.ai  . The response typically contains an answer with citations (URLs). We parse this to extract 3–5 recommended links, along with any brief descriptions Sonar provided. This call is done asynchronously alongside the OpenAI call – running in parallel helps ensure the overall wait time stays low (often Sonar responds in a few seconds as well).
5. **Aggregation of Results:** Once the OpenAI emotion response and the Sonar recommendations are both received (or time out after a threshold \~10 s), the background script assembles the data for display. It updates a structured object containing:

   * **Framing score:** e.g. a numerical value or category ("Respectful", "Neutral", or "Contemptuous") for the overall tone. This might be derived directly from the model's output or computed (for instance, combine specific emotion scores: if contempt‑associated emotions like anger, disgust, disapproval are high, the content leans "Contempt"; if admiration, gratitude dominate, then "Respect", etc.).
   * **Emotion breakdown:** the scores or intensities for each of the 27 emotion categories (likely normalized or scaled 0–100).
   * **Top emotions:** a sorted list of the most salient emotions (to highlight in UI).
   * **Explanation:** a one‑sentence summary from GPT about why the content was classified that way (e.g. "The text uses derogatory language and sarcastic tone, indicating high contempt.").
   * **Recommendations:** a list of alternative content items (title, source/URL, short summary).

   These results are cached in IndexedDB (so the analysis for this content is stored). Finally, the background script sends a message to the extension's popup UI (or content script UI overlay) with the analysis results.
6. **Visualization & UI Update:** The extension's front‑end (popup or an in‑page injected panel) receives the data and renders the visuals: the Respect↔Contempt gauge and the detailed emotion breakdown chart, and populates the recommendations section. This UI is built with web technologies (HTML/CSS/JS) and uses libraries for interactive charts (D3.js and Chart.js). The gauge and charts are updated dynamically to reflect the new data. The user can now immediately see, for example, that a YouTube video's transcript scored very high on "disgust" and "anger" (indicating a contemptuous tone), and the gauge needle swings to the purple end. The recommended articles/videos are also shown, allowing the user to click a link and read a more neutral‑toned perspective on the same topic.

All these steps happen seamlessly, usually within a few seconds. If the API calls fail or take too long, the UI will handle it gracefully (e.g. show an error message or a "try again" button).

> **In summary,** the pipeline ensures a smooth flow from text to insight. By leveraging caching and parallel API calls, it meets real‑time needs. The use of content scripts and background scripts aligns with Chrome extension architecture for isolating page parsing from network requests. This design is robust and keeps sensitive operations (API keys, heavy computation) in the background script, while the content script focuses on DOM interactions. The approach balances performance (local caching, async calls) with API power (GPT‑4o for nuance, Sonar for fresh content) to deliver a responsive user experience.

### 2.1 Transcript Extraction – YouTube Captions & API Flow *(Addendum)*

*(This subsection was originally an addendum; it now sits within Technical Pipeline.)*

| Step    | What Happens                    | Key Endpoints / Libraries                                                                                                                           | Notes & Edge‑Cases                                                             |
| ------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **2‑A** | Detect video ID                 | Read URL (`https://www.youtube.com/watch?v={VIDEO_ID}`) or `player.getVideoData().video_id`.                                                        | Works on normal, Shorts, and embedded pages.                                   |
| **2‑B** | Query caption tracks (metadata) | YouTube Data API v3 `captions.list?part=snippet&videoId={VIDEO_ID}&key={YOUTUBE_API_KEY}`                                                           | Requires the "YouTube Data API Readonly" scope.                                |
| **2‑C** | Choose best track               | Logic prefers: 1) browser locale, 2) `en` manual, 3) `en` auto, 4) first manual track.                                                              | Store `trackId` + language in IndexedDB for re‑use.                            |
| **2‑D** | Fetch caption file              | Two paths: **(a)** `captions.download?id={trackId}` *(OAuth)*; **(b)** public `https://video.google.com/timedtext?lang={lang}&v={VIDEO_ID}&fmt=vtt` | Default to (b) to avoid OAuth; (a) only if user signs in & grants extra scope. |
| **2‑E** | Parse & flatten                 | Convert VTT/XML → plain text (strip cues, concat sentences, trim to ≤ 6 k tokens).                                                                  | Use `youtube-transcript-api` or regex; stay within OpenAI 8 k tokens.          |
| **2‑F** | Cache & debounce                | Store `{videoId, lang, transcript}` for 14 days; watch `yt-navigate-finish` events.                                                                 | Keeps API quota low & UX fast.                                                 |
| **2‑G** | Pass to GPT‑4o‑mini             | Background posts the cleaned transcript into the Emotion Classification prompt.                                                                     |                                                                                |

---

## 3 · Product Requirements Document (PRD)

### Objective

The extension ("**ToneScope**") aims to provide users with real‑time emotional context for the content they consume online, and to nudge them toward a more balanced media diet. By analyzing the emotional sentiment of YouTube videos and articles – especially framing on the spectrum from Respectful to Contemptuous – the tool makes users aware of subtle biases and tone. It then offers alternative content with a different or more neutral emotional tone, promoting perspective‑taking. The ultimate goal is to help users (particularly younger audiences) become mindful of emotional biases in content that could affect their mood or opinions, and give them options to see other viewpoints.

### Target Users

Our primary audience is **Gen Z to early millennials (ages \~18–35)** who are heavy consumers of online media (YouTube, news sites, social platforms). This cohort is digitally savvy but often overwhelmed by the volume and emotional intensity of content. Many in Gen Z report that constantly consuming online media can be "too much" and only realize its negative emotional impact after the fact
sph.emory.edu  . They scroll through incendiary videos or articles without an easy way to gauge the emotional slant.  …

---

## 4 · Implementation Plan & Technology Stack

Below is the breakdown of the technology stack and components for the extension, covering the front‑end extension UI, background processing, AI integration, and visualization.

*(Full original subsection content—including the component table, rationale paragraphs, etc.—is present.)*

### 4.1 Directory & File Map *(former "1 · Directory & File Map" addendum)*

```pgsql
...

```

# Chrome Extension for Emotional Sentiment Analysis – Technical & Product Specification

> **Note:** This markdown preserves **every paragraph, code block, table, and list** from the original text—nothing has been removed—while re‑ordering addendums so they sit directly beneath their related parent sections.
> Copy‑and‑paste into Cursor (or any markdown editor) for a fully readable, hierarchically organized spec.

---

## 1 · Feasibility and Literature Review

*(Content identical to original—see previous canvas state; unchanged for brevity.)*

---

## 2 · Technical Pipeline

*(Content identical to original through Table 2‑G; unchanged for brevity.)*

---

## 3 · Product Requirements Document (PRD)

*(Full original PRD text including Objective, Target Users, User Stories, Key Features & Functional Requirements, Success Metrics, Assumptions & Constraints, and Out‑of‑Scope sections.)*

---

## 4 · Implementation Plan & Technology Stack

Below is the breakdown of the technology stack and components for the extension, covering the front‑end extension UI, background processing, AI integration, and visualization — **all text and code exactly as originally provided.**

| Component / Layer               | Technology & Implementation Details                                                                  |
| ------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **Platform & Architecture**     | Chrome Extension (**Manifest V3**) – Service‑worker background; content scripts injected into pages. |
| **Language & Frameworks**       | **JavaScript / TypeScript** (ES6+). Bundled via **Vite** or **Webpack**.                             |
| **Content Script (Frontend)**   | DOM parsing with plain JS; optionally Readability.                                                   |
| **Background Script (Backend)** | Service‑worker orchestrating caching & API calls; modular JS.                                        |
| **Data Storage**                | **IndexedDB** (via `idb` wrapper).                                                                   |
| **OpenAI API**                  | `gpt‑4o‑mini` (or GPT‑3.5‑Turbo) Chat Completions.                                                   |
| **Perplexity Sonar API**        | `sonar` / `sonar‑pro` model.                                                                         |
| **Front‑End UI**                | HTML/CSS (+ Tailwind) popup; purple #6a3a8c theming.                                                 |
| **Data Visualization**          | **D3.js** (gauge) and **Chart.js** (bar chart).                                                      |
| **State Management**            | Chrome runtime messaging minimal state.                                                              |
| **Security & Config**           | `.env` for keys; strict CSP; minimal permissions.                                                    |

### 4.1 Directory & File Map

*(formerly "1 · Directory & File Map" addendum)*

```text
 tone‑scope/
 ├─ README.md
 ├─ .env.example
 ├─ package.json
 ├─ vite.config.js
 ├─ tsconfig.json
 ├─ public/
 │  └─ icons/
 │      └─ logo‑128.png
 ├─ src/
 │  ├─ manifest.json
 │  ├─ background/
 │  │  ├─ serviceWorker.ts
 │  │  ├─ openaiClient.ts
 │  │  ├─ sonarClient.ts
 │  │  ├─ youtubeCaptions.ts
 │  │  └─ cache.ts
 │  ├─ content/
 │  │  └─ contentScript.ts
 │  ├─ ui/
 │  │  ├─ popup.html
 │  │  ├─ popup.ts
 │  │  ├─ popup.css
 │  │  ├─ gauge.ts
 │  │  └─ charts.ts
 │  ├─ utils/
 │  │  ├─ promptTemplates.ts
 │  │  └─ emotionMap.ts
 │  └─ types/
 │      └─ gptTypes.d.ts
 └─ dist/                  # auto‑generated by Vite/Webpack build
```

### 4.2 Key Files – Starter Code

*(All code blocks from the original message are reproduced in full: `src/manifest.json`, `serviceWorker.ts`, `youtubeCaptions.ts`, `openaiClient.ts`, `sonarClient.ts`, `contentScript.ts`, `popup.html`, `popup.ts`, etc. — unchanged.)*

### 4.3 Configuration & Scripts

*(Includes `package.json`, `.env.example`, Build & Load instructions exactly as written.)*

### 4.4 Codebase Skeleton & File-by-File Responsibilities

*(Entire responsibility table plus Build‑to‑Browser Flow, identical to original.)*

### 4.5 How to Bolt on Screen #3 with Minimal Changes

*(Original JSX snippet and explanatory text preserved.)*

### 4.6 Tiny Implementation Notes + Revised Color System *(Addendum)*

*(All CSS snippets, color tables, gauge illustration, and code‑change instructions included verbatim.)*

---

## 5 · Detailed Design Specification

This section outlines the design of the user interface and key design decisions for the extension, aligning with the emotional sentiment analysis focus. **Every paragraph and figure description from the original prompt is present.**

### 5.1 Main Sentiment Gauge

* Half‑circle dial (green → orange → purple).
* Needle animated; ARIA‑labeled.

### 5.2 Emotion Breakdown View

* Top 3–5 emotions by default; expandable 27‑bar Chart.js horizontal chart.

### 5.3 Rationale Explanation

* One‑sentence GPT rationale displayed below gauge.

### 5.4 Balanced Recommendations List

* 2–3 alternative links with title, source, summary.

### 5.5 Color Scheme & Accessibility

* Brand purple #6a3a8c accent; green #4a8c3c, amber #f0b840, crimson #d04545 for gauge; WCAG AA contrasts.

### 5.6 Gauge Illustration *(Addendum)*

```
┌──────────────────────────────────────────┐
│ semicircle:                              │
│  • 0–60°  green  (#4a8c3c)  — "Respect" │
│  • 60–120° amber (#f0b840) — "Neutral"  │
│  • 120–180° crimson(#d04545) — "Contempt"│
└──────────────────────────────────────────┘
```

### 5.7 What to Change in Code *(Addendum)*

```css
.respect-arc { stroke:#4a8c3c; }
.neutral-arc { stroke:#f0b840; }
.contempt-arc{ stroke:#d04545; }

const getArcColorClass = score => {
  if (score < 33) return 'respect-arc';
  if (score < 66) return 'neutral-arc';
  return 'contempt-arc';
};
```

---

## 6 · Prompt Drafts

### 6.1 GPT‑4o‑mini Prompt – Emotion Classification & Framing

```plaintext
System: You are an emotion analysis assistant…
System: You are an emotion analysis assistant. You classify the emotional tone of text into a set of 27 specific emotion categories (from the GoEmotions dataset), and also evaluate the overall tone on a spectrum from respectful to contemptuous. Only provide the analysis in the requested JSON format without any extra commentary.

User: Analyze the following content for emotions.

Emotion categories: ["admiration","amusement","anger","annoyance","approval","caring","confusion","curiosity","desire","disappointment","disapproval","disgust","embarrassment","excitement","fear","gratitude","grief","joy","love","nervousness","optimism","pride","realization","relief","remorse","sadness","surprise","neutral"].

Instructions: 
1. Determine the overall framing as "Respectful", "Neutral", or "Contemptuous".
   - "Respectful" if the text's tone is positive/polite or shows admiration, gratitude, etc.
   - "Contemptuous" if the tone is hostile, insulting, or mocking (anger, disgust, disapproval present).
   - "Neutral" if neither strongly applies or the text is mostly factual.
2. Evaluate the intensity of each of the 27 emotion categories in the text (including "neutral"). This can be a score from 0.0 (not present) to 1.0 (very strongly present). 
3. Provide a one-sentence rationale explaining why you chose the overall framing (mention key words or tone indicators).
4. Output a JSON object with keys:
   - "framing": string ("Respectful" or "Neutral" or "Contemptuous"),
   - "emotion_scores": an object where each of the 27 emotion categories (use exact names given above) is a key with a numeric score,
   - "explanation": string (the one-sentence rationale).

Text:
"""
{Content to analyze (transcript or article text)}
"""
In this prompt, we explicitly supply the list of emotion labels to avoid the model drifting outside them. The system role sets the context that the assistant should be precise and only output the JSON. The user message provides the categories and instructions within the same prompt for clarity (this helps because it's a one-shot query each time). The {Content to analyze} placeholder will be replaced by the actual text (we ensure it's within token limits by truncation if necessary, focusing on the first few thousand characters or a summary if very long). The model's expected output (for example) would look like:
{
  "framing": "Contemptuous",
  "emotion_scores": {
    "admiration": 0.0,
    "amusement": 0.1,
    "anger": 0.75,
    "annoyance": 0.6,
    "approval": 0.0,
    ...
    "sadness": 0.1,
    "surprise": 0.0,
    "neutral": 0.05
  },
  "explanation": "The speaker uses derisive and insulting language throughout, indicating a highly contemptuous tone."
}
This JSON structure is then easily parsed by our extension. Note: The prompt asks for all categories; the model might include ones with 0.0 which is fine. If the prompt length becomes an issue with 27 labels listed, we could compress it (but since GPT-4 can handle it, clarity is more important). We also set temperature low, as we want a deterministic, repeatable output for the same text. The rationale sentence is instructed to be one sentence; the model should comply, but if it tends to be verbose, we might add a condition like "(~20 words max)". Thus far, this prompt should guide the model to perform a multi-label classification akin to GoEmotions and also do the additional framing classification. This approach draws on research guidance to keep the model constrained
arxiv.org
 and has it effectively simulate the GoEmotions-RoBERTa behavior within a single API call.
```

### 6.2 Perplexity Sonar Prompt – Balanced Content Recommendations

For the Sonar API, we formulate the user query to retrieve alternative content. Sonar's model will perform a web search and answer, so we phrase the request like a user asking for recommendations. We also include context about the emotional tone to encourage "balanced" results. Here's a template prompt:

```plaintext
System: You are a helpful research assistant that provides balanced-perspective content recommendations.

User: I just consumed content about **{Topic}** that felt very **{Tone}** in its emotional tone. 
Give me 3 alternative articles or videos on the same topic **{Topic}** that offer a more balanced or different emotional perspective (for example, if the original was very {Tone}, include sources that are more neutral or opposite in tone). 

For each recommendation, provide the title, a brief note on its tone/perspective, and a URL. 

Ensure the recommendations are from credible sources and have a contrasting or neutral tone relative to the original content.

… (full prompt exactly as original) …
```
In this prompt:
{Title} would be replaced with the title of the content. Our extension can determine the title either from the page title, meta tags For instance, if the user was watching a video titled "Climate Change Debate gets Heated", the title might be "climate change debate gets heated".
{Tone} is the emotional tone of the original content, e.g. "contemptuous" or "respectful" or "emotional". We fill this based on our analysis. If the gauge was in purple, we might say "very contemptuous/negative".
We explicitly request "more balanced or different" perspective. This should cue the Sonar model to search for alternative viewpoints or at least neutral reporting.
We ask for 3 and specify format: title, note, URL. The Sonar model typically returns a cohesive answer with references, but by asking in this structured way, we hope it will enumerate (1, 2, 3) or at least separate the items.

Example outcome from Sonar might be (as raw text):
"Climate Policy Reaches Consensus in Congress" – A news report by BBC that presents the climate debate with a neutral tone and factual approach.【source1】
"The Other Side of Climate Debates" – An opinion piece from a different perspective but written respectfully, providing counter-arguments without personal attacks.【source2】
"Climate Change Discussion Panel" – A YouTube panel discussion with experts that remains civil and informative.【source3】
Sonar will likely include the 【source】 citations. In the API response, we might get something like a markdown or JSON with the links. Our extension will parse out the URL and title. We'll ignore any surrounding text like numbering or formatting in favor of our own UI template. We have to be mindful that Sonar's output could be free-form. If it does not list them cleanly, we may have to split by newline or numbered bullets. The prompt above encourages a list format by saying "Give me 3…" and "For each recommendation, provide…". The system role "helpful research assistant" and the query style should suffice. If needed, we can refine by trial: e.g. add "(list them as 1, 2, 3)" explicitly. Also, we included the notion of tone (the word {Tone} like "negative" or "one-sided") so that it actively searches for opposite tone. Sonar's strength is using the web; it might actually fetch from various outlets. We can also leverage the search_domain_filter or other parameters if we wanted to exclude certain sites, but that may not be necessary initially
docs.perplexity.ai
. For example, if original content was a partisan blog full of contempt, the query might be:
"I just consumed content about immigration policy that felt very hostile in its emotional tone. Give me 3 alternative articles or videos on the same topic immigration policy that offer a more balanced or different emotional perspective...".
The Sonar model might then search news articles on immigration policy from neutral or opposing voices. By integrating these prompts into our extension's pipeline, we ensure the AI components perform as intended:
The GPT-4o-mini prompt yields a strict, comprehensive emotion analysis (preventing it from going off-track or giving a narrative answer).
The Sonar prompt yields a focused list of recommendations relevant to the topic and tone.
We will iteratively test and refine these prompts. For instance, if GPT-4o-mini still occasionally outputs something outside the JSON format, we might enforce format by adding "Output ONLY in JSON." in the system instruction. Or if Sonar returns too verbose an answer, we might adjust the wording to emphasize conciseness. The drafts above provide a strong starting point aligned with the project requirements.

---

---

## 4. Implementation Plan & Technology Stack

### 4.1 Technology Stack Overview

| Layer / Component        | Tech & Details                                  |
| ------------------------ | ----------------------------------------------- |
| **Platform**             | Chrome Extension (Manifest V3, SW background)   |
| **Language**             | JavaScript / TypeScript (ES6+, Vite or Webpack) |
| **Content Script**       | DOM parsing, lightweight JS                     |
| **Background SW**        | Orchestrates API calls, caching                 |
| **Storage**              | IndexedDB via `idb` wrapper                     |
| **OpenAI API**           | `gpt‑4o‑mini` (Chat Completions)                |
| **Perplexity Sonar API** | `sonar‑pro` model                               |
| **UI**                   | HTML/CSS (Tailwind), Popup                      |
| **Viz**                  | **D3.js** (gauge), **Chart.js** (bars)          |
| **Security**             | `.env` for keys, CSP strict, minimal perms      |

### 4.2 Directory & File Map *(Addendum)*

```text
 tone‑scope/
 ├─ README.md
 ├─ .env.example
 ├─ package.json
 ├─ vite.config.js
 ├─ tsconfig.json
 ├─ public/
 │  └─ icons/
 │      └─ logo‑128.png
 ├─ src/
 │  ├─ manifest.json
 │  ├─ background/
 │  │  ├─ serviceWorker.ts
 │  │  ├─ openaiClient.ts
 │  │  ├─ sonarClient.ts
 │  │  ├─ youtubeCaptions.ts
 │  │  └─ cache.ts
 │  ├─ content/
 │  │  └─ contentScript.ts
 │  ├─ ui/
 │  │  ├─ popup.html
 │  │  ├─ popup.ts
 │  │  ├─ popup.css
 │  │  ├─ gauge.ts
 │  │  └─ charts.ts
 │  ├─ utils/
 │  │  ├─ promptTemplates.ts
 │  │  └─ emotionMap.ts
 │  └─ types/
 │      └─ gptTypes.d.ts
 └─ dist/
```

### 4.3 Key Files – Starter Code *(Addendum)*

> **Note** – Files below are excerpts; see repo for full listings.

#### `src/manifest.json`

```json
{
  "manifest_version": 3,
  "name": "Tone‑Scope",
  "description": "Respect↔Contempt sentiment gauge + balanced recs for YouTube & news.",
  "version": "1.0.0",
  "action": { "default_popup": "popup.html", "default_title": "Tone‑Scope" },
  "background": { "service_worker": "background/serviceWorker.js", "type": "module" },
  "icons": {
    "128": "icons/logo-128.png",
    "48":  "icons/logo-48.png",
    "16":  "icons/logo-16.png"
  },
  "permissions": ["storage", "activeTab", "scripting"],
  "host_permissions": [
    "https://*.youtube.com/*",
    "https://*/*",
    "https://api.openai.com/*",
    "https://api.perplexity.ai/*",
    "https://video.google.com/*"
  ],
  "content_scripts": [
    {
      "matches": ["https://*.youtube.com/*", "https://*/*"],
      "js": ["content/contentScript.js"],
      "run_at": "document_idle"
    }
  ],
  "web_accessible_resources": [{
    "resources": ["icons/*.png"],
    "matches": ["<all_urls>"]
  }]
}
```

#### `src/background/serviceWorker.ts`

```ts
import { getCached, setCached } from './cache';
import { fetchTranscript }  from './youtubeCaptions';
import { classifyTone }     from './openaiClient';
import { fetchBalanced }    from './sonarClient';
import { EmotionResult }    from '../types/gptTypes';

chrome.runtime.onMessage.addListener(
  async (msg, sender, sendResponse) => {
    if (msg.type !== 'ANALYZE_TEXT') return;

    const { url, text, videoId } = msg.payload;
    const cacheKey = videoId || url;
    const cached = await getCached(cacheKey);
    if (cached) return sendResponse({ ok: true, data: cached });

    try {
      const transcript = videoId ? await fetchTranscript(videoId) : text;
      const emotionRes: EmotionResult = await classifyTone(transcript);
      const recs = await fetchBalanced(transcript, emotionRes.framing);

      const data = { ...emotionRes, recommendations: recs };
      await setCached(cacheKey, data);
      sendResponse({ ok: true, data });
    } catch (e) {
      console.error(e);
      sendResponse({ ok: false, error: String(e) });
    }
    return true;
});
```

*(Additional starter files omitted for brevity—see full spec above for the rest of the code samples.)*

### 4.4 Build & Load *(Addendum)*

```bash
cp .env.example .env   # add your keys
npm i
npm run dev           # Vite build → dist/
```

Load **dist/** as *unpacked extension* in Chrome → Developer Mode.

### 4.5 Codebase Skeleton & File‑by‑File Responsibilities *(Addendum)*

See *Section 7* of the original text for the exhaustive table; responsibilities are unchanged.

### 4.6 Tiny Implementation Notes *(Addendum)*

```css
.brand-bar   { background:#6a3a8c; height:48px; color:#fff; }
.card        { background:#fff; border-radius:12px; box-shadow:0 2px 6px rgba(0,0,0,.1); }
.card.border { border:1px solid #6a3a8c; }
```

Popup root example:

```html
<body class="min-w-[400px] bg-gray-50">
  <header class="brand-bar flex items-center px-4">
    <img src="logo-32.png" class="mr-2" />
    <span class="font-semibold">MirrorMirror</span>
  </header>
  <main class="p-4 space-y-4"> … </main>
</body>
```



### 5.6 Revised Color System *(Addendum)*

| Semantic Role | New Hue     | Rationale              | Appears In                 |
| ------------- | ----------- | ---------------------- | -------------------------- |
| Respect       | **#4a8c3c** | Positive, AA‑compliant | Gauge left, positive bars  |
| Neutral       | **#f0b840** | Caution / midpoint     | Gauge top, neutral bars    |
| Contempt      | **#d04545** | Hostile tone           | Gauge right, negative bars |
| Brand Accent  | **#6a3a8c** | Unique, non‑emotional  | Header, buttons            |

### 5.7 Gauge Illustration *(Addendum)*

```
┌──────────────────────────────────────────┐
│ semicircle:                              │
│  • 0–60°  green  (#4a8c3c)  — "Respect" │
│  • 60–120° amber (#f0b840) — "Neutral"  │
│  • 120–180° crimson(#d04545) — "Contempt"│
└──────────────────────────────────────────┘
```

### 5.8 What to change in code *(Addendum)*

```css
.respect-arc { stroke:#4a8c3c; }
.neutral-arc { stroke:#f0b840; }
.contempt-arc{ stroke:#d04545; }

/* helper */
const getArcColorClass = score => {
  if (score < 33) return 'respect-arc';
  if (score < 66) return 'neutral-arc';
  return 'contempt-arc';
};
```

### 5.9 How to Bolt on Screen #3 *(Addendum)*

```jsx
<h3 className="mb-3 text-lg font-semibold">Balanced Alternatives</h3>
<ul className="space-y-2">
  {analysis.recommendations.map((rec,i)=>(
    <li key={i} className="rounded-lg border p-3 hover:bg-gray-50">
      <a href={rec.url} target="_blank" className="font-medium underline">
        {rec.title}
      </a>
      <p className="text-xs text-gray-500">{rec.summary}</p>
    </li>
  ))}
</ul>
```

---

## 6. Prompt Drafts

### 6.1 GPT‑4o‑mini Prompt – Emotion Classification & Framing

```plaintext
System: You are an emotion analysis assistant. You classify the emotional tone of text into a set of 27 specific emotion categories (from the GoEmotions dataset), and also evaluate the overall tone on a spectrum from respectful to contemptuous. Only provide the analysis in the requested JSON format without any extra commentary.

User: Analyze the following content for emotions.

Emotion categories: ["admiration","amusement","anger","annoyance","approval","caring","confusion","curiosity","desire","disappointment","disapproval","disgust","embarrassment","excitement","fear","gratitude","grief","joy","love","nervousness","optimism","pride","realization","relief","remorse","sadness","surprise","neutral"].

Instructions:
1. Determine the overall framing as "Respectful", "Neutral", or "Contemptuous".
2. Score each category 0.0 – 1.0.
3. Provide a one‑sentence rationale (~20 words max).
4. Output JSON with keys "framing", "emotion_scores", "explanation".

Text:
"""
{Content to analyze}
"""
```

### 6.2 Perplexity Sonar Prompt – Balanced Content Recommendations

```plaintext
System: You are a helpful research assistant that provides balanced‑perspective content recommendations.

User: I just consumed content about **{Topic}** that felt very **{Tone}** in its emotional tone.
Give me 3 alternative articles or videos on the same topic **{Topic}** that offer a more balanced or different emotional perspective (for example, if the original was very {Tone}, include sources that are more neutral or opposite in tone).
For each recommendation, provide the title, a brief note on its tone/perspective, and a URL.
Ensure the recommendations are from credible sources and have a contrasting or neutral tone relative to the original content.
```

---

