// previousUrl is used for checking how long the tab has been opened for.
// Whne the url is opened first, collect the url and timestamp. Then loop through to check it's opened for at least 30 seconds before the next one is opened.
// Key: url
// Value: timestamp
const previousUrl = {};

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

chrome.runtime.onInstalled.addListener(function() {
  console.log('installed');
  // chrome.storage.sync.set({color: '#3aa757'}, function() {
  //   console.log("The color is green.");
  // });

  // I think signup check should be here.

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (!tabId || changeInfo.status !== 'complete') return;
    if (tab.audible) return;
    if (!tab.url) return;

    console.log('tab', tab.url);
    const url = tab.url;

    // Don't do user auth check here. Just drop it if user is not authed in the backend as unidentified user.
    // Also, do the checking for url. It's only MIT for now.

    // Check if the same page is reloaded.
    if (previousUrl[url]) return;

    // Reset all previous urls first.
    Object.keys(previousUrl).forEach(key => {
      delete previousUrl[key];
    });

    // Set the timestamp when the new url has come in.
    previousUrl[url] = new Date();

    // You want to check url after renewing the previous url to make sure different tabs are not opened.
    if (!checkUrlMatch(url)) {
      return;
    }

    // Check for 30 seconds to make sure the user is actually reading it.
    const it = setInterval(() => {
      // Cancel when new url comes into play.
      if (!previousUrl[url]) {
        console.log('new url came in. canceling interval for', url);
        clearInterval(it);
        return;
      }

      // Check if 30 seconsd has passed.
      const thirtySeconds = new Date();
      thirtySeconds.setSeconds(thirtySeconds.getSeconds() - 30);

      if (new Date(previousUrl[url]) > thirtySeconds) return;

      saveUrl(url);
      clearInterval(it);
    }, 1000);

    // chrome.pageCapture.saveAsMHTML({ tabId, }, function(mhtml) {
    //   const fileReader = new FileReader();
    //   fileReader.readAsText(mhtml);

    //   fileReader.onload = function(e) {
    //     // console.log('e', e);
    //     const mthmlStr = e.target.result;
    //     // console.log('mthmlStr', mthmlStr);
    //   };
    // });
  });
});