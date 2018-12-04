

function checkUrlMatch(url) {
  // COMMENT: Open all domains.
  // const urlSupported = ['https://www.technologyreview.com', 'https://www.reuters.com', 'https://www.economist.com', 'https://www.nytimes.com', 'https://www.washingtontimes.com', 'https://www.theguardian.com', 'https://www.businessinsider.com', 'https://www.forbes.com', 'https://www.wired.com', 'https://mashable.com', 'https://www.dailymail.co.uk'];
  // if (!urlSupported.some(supported => url.indexOf(supported) === 0)) return false;

  // URL check to make sure it is individual article.
  // Check for the last bit of url path. Ex) https://www.technologyreview.com/s/612276/your-genome-on-demand/
  // Conditions:
  // 1. Hyphen separated words consist of more than 3 words.
  // 2. Only for Wikipedia, allow any kind of article page since many articles can be a single title.

  console.log('checking url', url);
  const urlOnly = url.includes('?') ? url.slice(0, url.indexOf('?')) : url;
  const paths = urlOnly.split('/');
  // Check if it's domain only site.
  if (paths.length === 1) {
    console.log('one path');
    return false;
  }

  const lastPath = paths[paths.length - 1].length === 0 ? paths[paths.length - 2] : paths[paths.length - 1];

  // Only skip wikipedia specific catalogue page like Category or Portal.
  if (url.indexOf('https://en.wikipedia.org/wiki') === 0) {
    console.log('Wikiedpai');
    if (lastPath.match(/:/)) {
      console.log('colon');
      return false;
    }
    return true;
  }

  // Ex) https://www.technologyreview.com/s/612021/advanced-tech-but-growth-slow-and-unequal-paradoxes-and-policies/?set=535821
  if (lastPath.split('-').length < 3) {
    console.log('length too short ');
    return false;
  }

  return true;
}

let sending = false;
function saveUrl(url) {
  const data = {
    url,
  };

  if (sending) return;

  sending = true;

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
    sending = false;
    return {};
  })
  .catch(err => {
    // Proceed to the next regardless.
    sending = false;
    // console.log('err', err);
  });
}

// tabUrl holds tab id and url it represents.
// When the tab is first activated, it has no url.
// This holds tab id and url match. collect the url and timestamp. Then loop through to check it's opened for at least 30 seconds before the next one is opened.
// One url is saved, remove it. Duplicate article is useless in analytics.
const tabUrl = {};

// activeTab holds the id of the currently active tab with the time it has beocme active.
// Key: tabId
// Value: timestamp
let activeTab = {};

function processActiveTab() {

  // Check for time passed to make sure the user is actually reading it.
  setTimeout(() => {
    // Cancel when new url comes into play.
    const tabId = Object.keys(activeTab)[0];
    if (!tabId) {
      processActiveTab();
      return;
    }


    // Check if enough time has passed since the active tab has been set.
    const twentySeconds = new Date();
    twentySeconds.setSeconds(twentySeconds.getSeconds() - 20);
    if (activeTab[tabId] > twentySeconds) {
      processActiveTab();
      return;
    }
    // Check if url has not been fetched. It's been 30 seconds. If not, give up.
    if (!tabUrl[tabId]) {
      processActiveTab();
      return
    }


    // Check the matching url only at this last step since url might not be available when the tab becomes first active.
    if (!checkUrlMatch(tabUrl[tabId])) {
      processActiveTab();
      return;
    }
    // console.log('saving url');

    saveUrl(tabUrl[tabId]);

    // Delete active tab to stop it from keep saving.
    delete activeTab[tabId];

    // Delete tab url as well to stop saving the same url again when user comes back and forth different tabs (activeTab gets activated regardless).
    delete tabUrl[tabId];

    processActiveTab();
  }, 5000);
}

function renewActiveTab(tabId) {
  if (!tabId) return;

  // Reset all previous urls first.
  Object.keys(activeTab).forEach(key => {
    delete activeTab[key];
  });

  activeTab[tabId] = new Date();
}

chrome.runtime.onInstalled.addListener(function() {
});

processActiveTab();

// onActivated is called every time user moves around the tab they are on.
chrome.tabs.onActivated.addListener((activeInfo) =>  {
  const tabId = activeInfo.tabId;


  // Set the timestamp when the new tab has become active.
  // Let process take care of the time management
  renewActiveTab(tabId);
});

chrome.tabs.onRemoved.addListener(tabId => {
  delete tabUrl[tabId];
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // console.log('tabs updated');
  if (!tabId || changeInfo.status !== 'complete') return;
  if (tab.audible) return;
  if (!tab.url) return;


  const url = tab.url;

  // Store it so that activeTab listener can use this.
  tabUrl[tabId] = url;

  // Renew active tab if the url change happened on the same tab.
  const activeTabId = Object.keys(activeTab)[0];
  if (activeTabId && activeTabId === tabId) {
    renewActiveTab(tabId);
  }

  // chrome.pageCapture.saveAsMHTML({ tabId, }, function(mhtml) {
  //   const fileReader = new FileReader();
  //   fileReader.readAsText(mhtml);

  //   fileReader.onload = function(e) {
  //     const mthmlStr = e.target.result;
      // console.log('mthmlStr', mthmlStr);
  //   };
  // });
});
