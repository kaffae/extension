function checkUrlMatch(url) {
  const urlSupported = ['https://www.technologyreview.com'];
  // if (!urlSupported.some(supported => url.indexOf(supported) === 0)) return false;

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

    // Don't do user auth check here. Just drop it if user is not authed in the backend as unidentified user.
    // TODO: Check 20 seconds to make sure user is reading it actually. Bounce is useless.
    // Also, do the checking for url. It's only MIT for now.

    // if (sending) return;

    const url = tab.url;
    if (checkUrlMatch(url)) {
      return;
    }

    console.log('saving url');
    return saveUrl(url);

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