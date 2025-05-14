import { renderGauge }   from './gauge';
import { renderBars }    from './charts';

chrome.runtime.sendMessage({ type: 'GET_LAST' }, (_ignored, res) => {
  if (!res?.data) return;

  const { framing, emotion_scores, explanation, recommendations } = res.data;
  renderGauge(framing);
  (document.getElementById('rationale')!).textContent = explanation;

  const bars = Object.entries(emotion_scores)
      .map(([k,v]) => ({ label: k, value: v }))
      .sort((a,b) => b.value - a.value);
  renderBars(bars);

  const recUl = document.getElementById('recs')!;
  recommendations.forEach((rec: any) => {
    const li = document.createElement('li');
    li.innerHTML = `<a href="${rec.url}" target="_blank" class="underline">${rec.title}</a> — ${rec.summary}`;
    recUl.appendChild(li);
  });
});

<body class="min-w-[400px] bg-gray-50">
  <header class="brand-bar flex items-center px-4">
    <img src="logo-32.png" class="mr-2" />
    <span class="font-semibold">MirrorMirror</span>
  </header>
  <main class="p-4 space-y-4">
    <!-- gauge card, top emotions, rec list … -->
  </main>
</body>

