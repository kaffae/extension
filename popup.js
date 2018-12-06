
// Check if the user is logged in.

const token = '94eca02d-287b-40ab-82e0-04774beaf80e';

function getUser() {
  return fetch(`https://app.teazuk.com/user?token=${token}`, {
    credentials: 'include',
    method: 'GET',
  })
  .then(resp => resp.json())
  .then(resp => {
    const user = resp.data;
    alert(user.id)
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

updatePageByUserStatus();
function updatePageByUserStatus() {
  isLoggedIn()
  .then(loggedIn => {
    if (loggedIn) {
      document.getElementById('loggedin').style = 'display:block;';
      document.getElementById('not-loggedin').style = 'display:none;';
    } else {
      document.getElementById('loggedin').style = 'display:none;';
      document.getElementById('not-loggedin').style = 'display:block;';
    }
  })
  .catch(err => {
    console.log('err in updatePageByUserStatus', err);
    document.getElementById('loggedin').style = 'display:none;';
    document.getElementById('not-loggedin').style = 'display:block;';
  });
}

function successfulLogin() {
  updatePageByUserStatus();
}

const fbLoginBtn = document.getElementById('facebook-login');
fbLoginBtn.onclick = () => {
  // Open new window for oauth.
  const successUrl = chrome.runtime.getURL('oauth_success.html');
  const loginWindow = window.open(`https://app.teazuk.com/auth/facebook?redirect=${successUrl}`, "facebook-login","status=1,width=600,height=700,top=100,left="+(screen.width/2-300));
  // Attach callback to refresh the site with user state.
  loginWindow.successfulLogin = successfulLogin;
}
