const loaded = new Date();

function isUrlSupported(url) {
  const urlSupported = ['https://www.technologyreview.com', 'https://www.reuters.com', 'https://www.economist.com'];
  if (!urlSupported.some(supported => url.indexOf(supported) === 0)) return false;

  // URL check to make sure it is individual article.
  // Check for the last bit of url path. Ex) https://www.technologyreview.com/s/612276/your-genome-on-demand/
  // Conditions:
  // 1. Hyphen separated words consist of more than 3 words.

  const urlOnly = url.includes('?') ? url.slice(0, url.indexOf('?')) : url;
  const paths = urlOnly.split('/');
  const lastPath = paths[paths.length - 1].length === 0 ? paths[paths.length - 2] : paths[paths.length - 1];
  // https://www.technologyreview.com/s/612021/advanced-tech-but-growth-slow-and-unequal-paradoxes-and-policies/?set=535821
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
    // console.log('resp', resp);
    // sending = false;
    return {};
  })
  .catch(err => {
    // Proceed to the next regardless.
    // sending = false;
    // console.log('err', err);
  });
}

function handleUrl(url) {

  // Check if 30 seconsd has passed.
  const twentySeconds = new Date();
  twentySeconds.setSeconds(twentySeconds.getSeconds() - 20);
  if (loaded > twentySeconds) {
    setTimeout(() => {handleUrl(url)}, 4000);
    return;
  }

  // Also, do the checking for url. It's only MIT for now.
  saveUrl(url);
}

function reload() {
  // Include interactive state since it can take more than 5 seconds (ex: developer.chrome.com). CSS and images may not be loaded but html will be there.
  if (document.readyState !== 'complete' && document.readyState !== 'interactive') {
    setTimeout(reload, 100);
    return;
  }
  // // COMMENT: Now, use bacgkround to get this. I need to know user is on the webpage instead of when the url has just opened.
  // return;

  const url = window.location.href;

  // console.log('checking url');
  // Check the matching url only at this last step since url might not be available when the tab becomes first active.
  if (!isUrlSupported(url)) {
    // console.log('url unsupproted');
    return;
  }

  handleUrl(url);
}

// if ("onhashchange" in window) {
//     //not effective in history change like in Economist.
//     console.log("The browser supports the hashchange event!");
// }


window.onhashchange = () => {
  // console.log('onhashchange', location.href);
}
// alert(window.location.href);
console.log('CONTENT SCRIPT', new Date());
console.log('CONTENT SCRIPT', window.location.href);
setInterval(() => {

}, 5000);

reload();

