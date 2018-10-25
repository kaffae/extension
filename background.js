

function checkUrlMatch(url) {
  const urlSupported = ['https://www.technologyreview.com'];
  if (!urlSupported.some(supported => url.indexOf(supported) === 0)) return false;

  // URL check to make sure it is individual article.
  // Check for the last bit of url path. Ex) https://www.technologyreview.com/s/612276/your-genome-on-demand/
  // Conditions:
  // 1. Hyphen separated words consist of more than 3 words.

  const urlOnly = url.includes('?') ? url.slice(url.indexOf('?')) : url;
  const paths = urlOnly.split('/');
  const lastPath = paths[paths.length - 1].length === 0 ? paths[paths.length - 2] : paths[paths.length - 1];

  if (lastPath.split('-').length < 3) {
    return false;
  }

  return true;
}

function saveUrl(url) {
  const data = {
    url,
  };

  // let sending = true;
  const token = '94eca02d-287b-40ab-82e0-04774beaf80e';
  return fetch(`https://app.teazuk.com/analytics/article?token=${token}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    method: 'POST',
    body: JSON.stringify(data),
  })
  .then(resp => resp.json())
  .then(resp => {
    console.log('resp', resp);
    // sending = false;
    return {};
  })
  .catch(err => {
    // Proceed to the next regardless.
    // sending = false;
    console.log('err', err);
  });
}

// tabUrl holds tab id and url it represents.
// When the tab is first activated, it has no url.
// This holds tab id and url match. collect the url and timestamp. Then loop through to check it's opened for at least 30 seconds before the next one is opened.
const tabUrl = {};

// activeTab holds the id of the currently active tab with the time it has beocme active.
// Key: tabId
// Value: timestamp
let activeTab = {};

chrome.runtime.onInstalled.addListener(function() {
  console.log('installed');

  // onActivated is called every time user moves around the tab they are on.
  chrome.tabs.onActivated.addListener((activeInfo) =>  {
    console.log('activeInfo.tabId', activeInfo.tabId);
    const tabId = activeInfo.tabId;

    // Reset all previous urls first.
    Object.keys(activeTab).forEach(key => {
      delete activeTab[key];
    });

    // Set the timestamp when the new tab has become active.
    activeTab[tabId] = new Date();

    // The check should be here. Use addListener for getting the url onnly.

    // Check for 30 seconds to make sure the user is actually reading it.
    const it = setInterval(() => {
      // Cancel when new url comes into play.
      if (!activeTab[tabId]) {
        clearInterval(it);
        return;
      }

      // Check if 30 seconsd has passed.
      const thirtySeconds = new Date();
      thirtySeconds.setSeconds(thirtySeconds.getSeconds() - 30);
      if (activeTab[tabId] > thirtySeconds) return;

      // Check if url has not been fetched. It's been 30 seconds. If not, give up.
      if (!tabUrl[tabId]) {
        clearInterval(it);
        return
      }

      // Check the matching url only at this last step since url might not be available when the tab becomes first active.
      if (!checkUrlMatch(tabUrl[tabId])) {
        clearInterval(it);
        return;
      }

      // Also, do the checking for url. It's only MIT for now.
      clearInterval(it);
      saveUrl(tabUrl[tabId]);
    }, 1000);
  });

  chrome.tabs.onRemoved.addListener(tabId => {
    delete tabUrl[tabId];
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (!tabId || changeInfo.status !== 'complete') return;
    if (tab.audible) return;
    if (!tab.url) return;

    const url = tab.url;

    // Store it so that activeTab listener can use this.
    tabUrl[tabId] = url;

    // chrome.pageCapture.saveAsMHTML({ tabId, }, function(mhtml) {
    //   const fileReader = new FileReader();
    //   fileReader.readAsText(mhtml);

    //   fileReader.onload = function(e) {
    //     const mthmlStr = e.target.result;
    //     // console.log('mthmlStr', mthmlStr);
    //   };
    // });
  });
});