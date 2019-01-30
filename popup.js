
// Check if the user is logged in.

const token = '94eca02d-287b-40ab-82e0-04774beaf80e';

let sending = false;

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

updatePageByUserStatus();
function updatePageByUserStatus() {
  isLoggedIn()
  .then(loggedIn => {
    const contentBody = document.getElementsByClassName('content-body')[0];
    if (contentBody) {
      contentBody.style = 'display:block;';
    }

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
  // For the first time, user is not logged in.
  chrome.browserAction.setBadgeBackgroundColor({ color: 'rgba(0,0,0,0)' });
  chrome.browserAction.setBadgeText({ text: '' });

  updatePageByUserStatus();
}

function successfulRegister() {
  document.getElementById('not-loggedin').style = 'display:none;';
  document.getElementById('registered').style = 'display:block;';
}

// For any communication with the user.
const warningMessage = document.getElementById('warning-message');

const fbLoginBtn = document.getElementById('facebook-login');
fbLoginBtn.onclick = () => {
  warningMessage.style = 'display:none;';

  // Open new window for oauth.
  const successUrl = chrome.runtime.getURL('oauth_success.html');
  const loginWindow = window.open(`https://app.kaffae.com/auth/facebook?redirect=${successUrl}`, "facebook-login","status=1,width=600,height=700,top=100,left="+(screen.width/2-300));
  // Attach callback to refresh the site with user state.
  loginWindow.successfulLogin = successfulLogin;
}

// SIGN IN

const signinBtn = document.getElementById('email-signin-btn');
signinBtn.onclick = () => {
  document.getElementById('login-email').style = 'display:block;';
  document.getElementById('login-intro').style = 'display:none;';
}

const loginEmailBtn = document.getElementById('login-email-btn');
loginEmailBtn.onclick = () => {
  warningMessage.style = 'display:none;';

  const email = document.getElementById('email-input').value;
  const password = document.getElementById('password-input').value;

  if (!email || email.length < 10 || !email.includes('@')) {
     warnUser('Email looks strange. Will you type that again?');
    return;
  }

  if (!password || password.length < 8) {
    warnUser('Password must be longer than 8');
    return;
  }

  return fetch(`https://app.kaffae.com/users?email=${email}&password=${password}&token=${token}`, {
    credentials: 'include',
    method: 'GET',
  })
  .then(resp => resp.json())
  .then(resp => {
    const user = resp.data;
    if (!user.id) {
      const errorSignup = 'Something went wrong. Please contact masa@kaffae.com';
      warnUser(errorSignup);
      return;
    }

    successfulLogin();
  })
  .catch(err => {
    console.log('err', err);
    const errorSignup = 'Could not find the user with the email and password';
    warnUser(errorSignup);
    return null;
  });
};

// REGISTERING

const goRegisterEmail = document.getElementById('go-email-register');
goRegisterEmail.onclick = () => {
  warningMessage.style = 'display:none;';

  document.getElementById('register-email').style = 'display:block;';
  document.getElementById('login-email').style = 'display:none;';
};

const joinEmailBtn = document.getElementById('register-email-btn');
joinEmailBtn.onclick = () => {
  warningMessage.style = 'display:none;';

  const name = document.getElementById('name').value;
  const email = document.getElementById('email-input-register').value;
  const password = document.getElementById('password-input-register').value;
  if (!name) {
    warnUser('Name is required.');
    return;
  }

  if (!email || email.length < 10 || !email.includes('@')) {
    warnUser('Email looks strange. Will you type that again?');
    return;
  }
  if (!password || password.length < 8) {
    warnUser('Password must be longer than 8');
    return;
  }

  const data = {
    name,
    email,
    password,
  };

  if (sending) return;
  sending = true;

  return fetch(`https://app.kaffae.com/users?token=${token}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: JSON.stringify(data),
  })
  .then(resp => resp.json())
  .then(resp => {

    sending = false;

    if (resp.data.status === 'EMAIL_EXISTS') {
      const errorSignup = 'That email exists already. Try signing in.';
      warnUser(errorSignup);
      return;
    }

    if (!resp.data.id) {
      const errorSignup = 'Something went wrong. Please contact masa@kaffae.com';
      warnUser(errorSignup);
      return;
    };

    successfulRegister();
  })
  .catch(err => {
    sending = false;

    console.log('err', err);
    const errorSignup = 'Something went wrong. Please contact masa@kaffae.com';
    warnUser(errorSignup);
    return null;
  });
};

function warnUser(message) {
  warningMessage.innerHTML = message;
  warningMessage.style = 'display:block;';
}
