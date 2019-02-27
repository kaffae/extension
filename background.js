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
  // 1. Hyphen separated words consist of more than 3 words. Use that as a marker for blog/news site.
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

  // Only skip the url test on wikipedia domain.
  if (url.indexOf('https://en.wikipedia.org/wiki') === 0) {
    // Ignore wikipedia specific catalogue page like Category or Portal that is separated by colon.
    if (lastPath.match(/:/)) {
      return false;
    }
    return true;
  }

  // Ex url) https://www.technologyreview.com/s/612021/advanced-tech-but-growth-slow-and-unequal-paradoxes-and-policies
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

    // Response depends on the conditions:
    // 1. URL is not accessible publicly.
    // 2. Not eonugh paragraphs/text is extracted from the HTML.
    // 3. Genuine server error.
    if (resp && resp.data && resp.data.status === 'success') {
      chrome.browserAction.setBadgeBackgroundColor({ color: 'rgba(0,0,0,0)' });
      chrome.browserAction.setBadgeText({text: `sav`});
    }

    return {};
  })
  .catch(err => {
    // Proceed to the next regardless without handling the error in the frontend.
    sending = false;

    return {};
  });
}

let sending2 = false;
function saveActive(url) {
  const data = {
    url,
  };

  if (sending2) return;
  sending2 = true;

  return fetch(`https://app.kaffae.com/analytics/article/active?token=${token}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    method: 'PUT',
    body: JSON.stringify(data),
  })
  .then(resp => resp.json())
  .then(resp => {
    sending2 = false;

    return {};
  })
  .catch(err => {
    // Proceed to the next regardless without handling the error in the frontend.
    sending2 = false;

    return {};
  });
}

// tabCount checks how long the current url is being active for.
const tabCount = {};

// renewTab tracks which site is currently active and for how long.
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
  lastScrollPostion = -1;
}

// lastScrollPostion is used to check for the user's page activity.
let lastScrollPostion = -1;

function getPageOffset(tabId, cb) {
  if (!tabId) return -1;
  if (!cb) return -1;

  // Execute script returns whatever expression is evaluated. There is no need to return explicitly.
  // Also, this window object must be referenced on the website's window. You can still reference window from background script, but that would be the encapsulated separate version.
  chrome.tabs.executeScript(tabId, {
    code:  `window.pageYOffset`,
  },
  (pageOffset) => {
    // Catch run time error before it bubbles up to the extension. A common case for the error is "Unchecked runtime.lastError: The tab was closed."
    if(chrome.runtime.lastError) return;

    if (!pageOffset || !Array.isArray(pageOffset) || pageOffset.length < 1) {
      cb(-1);
      return;
    }

    cb(pageOffset[0]);
  });
}

// Check the status of user window every 5 seconds to determine if the reading is happening.
const timeInterval = 5000;
setInterval(() => {
  if (!isUserLoggedin) return;

  chrome.tabs.query({ active: true, currentWindow: true, audible: false }, tabs => {
    if (!tabs || !tabs.length || tabs[0].status !== 'complete') {
      renewTab(null);
      return;
    }

    const tabId = tabs[0].id;
    const url = tabs[0].url;
    // url is undefined unless extension permission is set properly.
    if (!url || !checkUrlMatch(url)) {
      chrome.browserAction.setBadgeText({text: ``});
      renewTab(null);
      return;
    }

    // Need to access window to cehck the user is actually on the Chrome page, not on other apps.
    // Put the check inside tab query to reset url timer (Chrome windows has no access to url).
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

      // durationRequiredToSave is the number requirement for the window to be active before prompting to save.
      const durationRequiredToSave = 4;
      if (tabCount[tabUrl] < durationRequiredToSave) {
        // Keep counting up.
        renewTab(url);
        return;
      }

      if (tabCount[tabUrl] === durationRequiredToSave) {
        // Only save url when the page has been moved at least once.
        // For simplicity, check the position 0 at the point of save. It will save anytime the user moves in the next time interval.
        // If 0, it will stop the counting process altogether and the process will be stuck here unless scrolling happens or the tab (url) changes.
        getPageOffset(tabId, pageOffset => {
          if (pageOffset === 0) return;

          lastScrollPostion = pageOffset;

          saveUrl(url);
          renewTab(url);
        });

        return;
      }

      getPageOffset(tabId, pageOffset => {
        // 1. Check if the offset is the same value as last.
        // 2. Save active state if position is different from the previous.
        if (lastScrollPostion === pageOffset) return;

        // Save
        saveActive(url);

        // Update the last positoin
        lastScrollPostion = pageOffset;
      });

      // Even after url has been saved, count up.
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

// Reset the badge every time tab is navigated to a different page.
chrome.tabs.onActivated.addListener(function(activeInfo) {
  // If user is not logged in, keep that notification badge.
  if (!isUserLoggedin) return;

  chrome.browserAction.setBadgeText({text: ``});
});

// Ask user to signup or login when the extension is installed the first time. Ignore the update.
chrome.runtime.onInstalled.addListener(object => {
  if (object.reason === 'install') {

    return notifyUserToLogin();
  }
});