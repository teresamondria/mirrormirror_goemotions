// 1️⃣ Detect URL changes inside YouTube SPA
let lastVideoId = "";
const observer = new MutationObserver(() => checkVideo());
observer.observe(document, { subtree: true, childList: true });

async function checkVideo() {
  const vid = new URLSearchParams(location.search).get('v');
  if (!vid || vid === lastVideoId) return;
  lastVideoId = vid;

  chrome.runtime.sendMessage({
    type: 'ANALYZE_TEXT',
    payload: { videoId: vid, url: location.href }
  });
}

// 2️⃣ For generic articles
if (!location.hostname.includes('youtube.com')) {
  const articleText = document.body.innerText;              // TODO: refine with Readability
  chrome.runtime.sendMessage({
    type: 'ANALYZE_TEXT',
    payload: { text: articleText, url: location.href }
  });
}
