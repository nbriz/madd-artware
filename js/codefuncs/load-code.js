window.menu.Code['Load Code File'] = async function () {
  if (document.querySelector('#editor')) {
    window.alert('You are already working on code, you must restart the app if you want to start over')
    return
  }
  const file = await openCustomFilePicker()
  setupCodeMenu('load-code', JSON.parse(file))
}
