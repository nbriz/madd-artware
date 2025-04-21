window.menu.Code['New Code File'] = function () {
  if (document.querySelector('#editor')) {
    window.alert('You are already working on code, you must restart the app if you want to start over')
    return
  }
  setupCodeMenu('new-code')
}
