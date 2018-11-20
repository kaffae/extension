// Close itself with a callback.
if (opener) {
  if (opener.successfulLogin) {
    opener.successfulLogin();
  }

  setTimeout(() => {
    window.close();
  }, 2000);


} else {
  document.body.innerHTML = 'Successful Login. Close the window now.';
}
