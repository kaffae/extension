// Use backgorund instead of content scirpt.
// Chrome API provides a way to access the current active tab in active window.
// It's easier to check if the user has stayed on that page for a certain duration that to manage that from the individual page's loaded js script (easier to coordinate from this highup script).

// COMMENT:
// Permission with tabs in manifest.json is required for this to work. The script needs to get url of the current tab which is not returned without this permission.

const token = '94eca02d-287b-40ab-82e0-04774beaf80e';

let isUserLoggedin = false;

function checkUrlMatch(url) {
  // URL check to make sure it is individual article.
  // Check for the last bit of url path. Ex) https://www.technologyreview.com/s/612276/your-genome-on-demand/
  // Conditions:
  // 1. Hyphen separated words consist of more than 3 words.
  // 2. Only for Wikipedia, allow any kind of article page since many articles can be a single title.

  // Remove hash (comes after query, ?), and query.
  const noHash = url.includes('#') ? url.slice(0, url.indexOf('#')) : url;
  const urlOnly = noHash.includes('?') ? noHash.slice(0, noHash.indexOf('?')) : noHash;
  const paths = urlOnly.split('/');

  // Check if it's domain only site.
  if (paths.length === 1) {
    return false;
  }

  const lastPath = paths[paths.length - 1].length === 0 ? paths[paths.length - 2] : paths[paths.length - 1];

  // Only skip wikipedia specific catalogue page like Category or Portal.
  if (url.indexOf('https://en.wikipedia.org/wiki') === 0) {
    if (lastPath.match(/:/)) {
      return false;
    }
    return true;
  }

  // Ex) https://www.technologyreview.com/s/612021/advanced-tech-but-growth-slow-and-unequal-paradoxes-and-policies/?set=535821
  if (lastPath.split('-').length < 3) {
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


  return fetch(`https://app.kaffae.com/analytics/article?token=${token}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    method: 'POST',
    body: JSON.stringify(data),
  })
  .then(resp => resp.json())
  .then(resp => {
    sending = false;

    if (resp && resp.data && resp.data.status === 'success') {
      chrome.browserAction.setBadgeBackgroundColor({ color: 'rgba(0,0,0,0)' });
      chrome.browserAction.setBadgeText({text: `sav`});
    }

    return {};
  })
  .catch(err => {
    // Proceed to the next regardless.
    sending = false;
  });
}

function renewTab(url) {

  if (!url) {
    // Reset all previous urls first.
    Object.keys(tabCount).forEach(key => {
      delete tabCount[key];
    });
    return;
  }

  if (tabCount[url]) {
    tabCount[url] += 1;
    return;
  }

  Object.keys(tabCount).forEach(key => {
    delete tabCount[key];
  });
  tabCount[url] = 1;
}

// Check reading every 5 seconds.
const timeInterval = 5000;
const tabCount = {};
setInterval(() => {
  if (!isUserLoggedin) return;

  chrome.tabs.query({ active: true, currentWindow: true, audible: false }, tabs => {
    if (!tabs || !tabs.length || tabs[0].status !== 'complete') {
      renewTab(null);
      return;
    }

    const url = tabs[0].url;
    // url is undefined unless extension permission is set properly.
    if (!url || !checkUrlMatch(url)) {
      chrome.browserAction.setBadgeText({text: ``});
      renewTab(null);
      return;
    }

    // Need to access window to cehck the user is actually on the page, not on other apps.
    // Put the check inside tab query to reset url timer (window has no access to url).
    chrome.windows.getCurrent(null, (wind) => {
      if (!wind || !wind.focused) {
        return;
      }

      // Check the active tab's url has changed.
      const tabUrl = Object.keys(tabCount)[0];
      if (!tabUrl || tabUrl !== url) {
        chrome.browserAction.setBadgeText({text: ``});
        renewTab(url);
        return;
      }

      // Number times timeInterval is the time required for the window to be active before being saved.
      const durationRequiredToSave = 5;
      if (tabCount[tabUrl] !== 5) {
        // Keep counting up.
        renewTab(url);
        return;
      }

      saveUrl(url);

      renewTab(url);
    });
  });

}, timeInterval);

function getUser() {
  return fetch(`https://app.kaffae.com/user?token=${token}`, {
    credentials: 'include',
    method: 'GET',
  })
  .then(resp => resp.json())
  .then(resp => {
    const user = resp.data;
    if (!user.id) return null;

    return user;
  })
  .catch(err => {
    console.log('err', err);
    return null;
  });
}

function isLoggedIn() {
  return getUser()
  .then(user => {
    if (!user) return false;

    return true;
  });
}

function notifyUserToLogin() {
  return isLoggedIn()
  .then(loggedIn => {
    if (!loggedIn) {
      // Display warning badge.
      chrome.browserAction.setBadgeBackgroundColor({ color: '#F00' });
      chrome.browserAction.setBadgeText({ text: '!' });

      isUserLoggedin = false;
      return;
    }
    isUserLoggedin = true;

    chrome.browserAction.setBadgeBackgroundColor({ color: 'rgba(0,0,0,0)' });
    chrome.browserAction.setBadgeText({ text: '' });

  })
  .catch(err => {
    console.log('Error checking user login status');
  });
}
notifyUserToLogin();

// Check user status every 10 minutes.
const userCheckInterval = 10 * 60 * 1000;
setInterval(() => {
  notifyUserToLogin();
}, userCheckInterval);

// Keep this listener so background script stays active. Chrome extension needs at least one listener.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
});

// Reset the badge every time tab is navigated to a different page.
chrome.tabs.onActivated.addListener(function(activeInfo) {
  if (!isUserLoggedin) return;

  chrome.browserAction.setBadgeText({text: ``});
});

// Open web page for the first time.
chrome.runtime.onInstalled.addListener(object => {
  if (object.reason === 'install') {
    // COMMENT: No popup without proper landing page. The site asks the user to install the extension agian and it's not helpful.
    // chrome.tabs.create({url: "https://kaffae.com"}, () => {
    //     console.log("New tab launched with https://kaffae.com");
    // });

    return notifyUserToLogin();
  }
});