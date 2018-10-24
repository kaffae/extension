
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

// const emailSubmitBtn = document.getElementById('email-button');
// emailSubmitBtn.addEventListener('click', emailSubmit);
const emailForm = document.getElementById('email-form');
emailForm.addEventListener('submit', e => {
  e.preventDefault();
  emailSubmit();
});

const codeForm = document.getElementById('code-form');
codeForm.addEventListener('submit', e => {
  e.preventDefault();
  codeSubmit();
});

isLoggedIn()
.then(loggedIn => {
  if (loggedIn) {
    document.getElementById('logged-in').style = 'display:block;';
    document.getElementById('email-form').style = 'display:none;';
  } else {
    document.getElementById('logged-in').style = 'display:none;';
    document.getElementById('email-form').style = 'display:block;';
  }
});

let sending = false;
function emailSubmit() {
  const text = document.getElementById('email').value;
  if (text.length < 6) {
    return;
  }
  if (sending) {
    return;
  }

  const data = {
    email: text,
  };
  sending = true;
  // Send it to the server.
  fetch(`https://app.teazuk.com/signin/email?token=${token}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    method: 'PUT',
    body: JSON.stringify(data),
  })
  .then(resp => resp.json())
  .then(resp => {
    sending = false;
  })
  .catch(err => {
    // Proceed to the next regardless.
    sending = false;
  });

  // Show the code input.
  document.getElementById('email-form').style = 'display:none;';
  document.getElementById('code-form').style = 'display:block;';
}

function codeSubmit() {
  const code = document.getElementById('code').value;
  if (code.length !== 6) {
    return;
  }
  if (sending) {
    return;
  }

  sending = true;

  const data = {
    code,
  };

  // Send it to the server.
  fetch(`https://app.teazuk.com/signin/code?token=${token}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    method: 'PUT',
    body: JSON.stringify(data),
  })
  .then(resp => resp.json())
  .then(resp => {
    sending = false;

    document.getElementById('logged-in').style = 'display:block;';
    document.getElementById('code-form').style = 'display:none;';
  })
  .catch(err => {
    sending = false;
    alert(`${err}`);
    // Show error page.
    document.getElementById('email-form').style = 'display:block;';
    document.getElementById('code-form').style = 'display:none;';
  });
}
