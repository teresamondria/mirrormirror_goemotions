// 1️⃣ Detect URL changes inside YouTube SPA
let lastVideoId = "";
const observer = new MutationObserver(() => checkVideo());
observer.observe(document, { subtree: true, childList: true });

async function checkVideo() {
  const vid = new URLSearchParams(location.search).get('v');
  if (!vid || vid === lastVideoId) return;
  lastVideoId = vid;

  // Inject the panel container and script only on YouTube watch pages
  injectYouTubePanelScript();

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

// 3️⃣ Inject a <script> tag to load the React panel bundle
function injectYouTubePanelScript() {
  const PANEL_ID = 'mirrormirror-youtube-panel';
  const SCRIPT_ID = 'mirrormirror-panel-script';
  if (document.getElementById(SCRIPT_ID)) return; // Already injected

  // Create the panel container if not present
  let panel = document.getElementById(PANEL_ID);
  if (!panel) {
    const secondary = document.getElementById('secondary');
    if (!secondary) return;
    panel = document.createElement('div');
    panel.id = PANEL_ID;
    secondary.prepend(panel);
  }

  // Inject the script tag to load the bundled React panel
  const script = document.createElement('script');
  script.id = SCRIPT_ID;
  script.type = 'module';
  // The path here must match the output location of injectPanel.js in your build
  script.src = chrome.runtime.getURL('ui/injectPanel.js');
  document.body.appendChild(script);
}
