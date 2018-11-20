// Close itself with a callback.
if (opener) {
  if (opener.successfulLogin) {
    opener.successfulLogin();
  }

  window.close();
} else {
  document.body.innerHTML = 'Successful Login. Close the window now.';
}
