function openCustomFilePicker () {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.tool,.filter'
    input.style.display = 'none'
    input.addEventListener('change', function () {
      if (input.files.length > 0) {
        const file = input.files[0]
        const reader = new window.FileReader()
        reader.onload = function () { resolve(reader.result) }
        reader.onerror = function () { reject(new Error('Failed to read file')) }
        reader.readAsText(file)
      } else reject(new Error('No file selected'))
      input.remove()
    })
    document.body.appendChild(input)
    input.click()
  })
}

window.menu.Code['Load Code File'] = async function () {
  if (document.querySelector('#editor')) {
    window.alert('You are already working on code, you must restart the app if you want to start over')
    return
  }
  const file = await openCustomFilePicker()
  setupCodeMenu('load-code', JSON.parse(file))
}
