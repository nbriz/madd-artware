/* global canvas */
window.menu.File['Open Image'] = function () {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'

  input.addEventListener('change', event => {
    const file = event.target.files[0]
    if (!file) return

    const reader = new window.FileReader()

    reader.onload = function (e) {
      const img = new window.Image()
      img.onload = function () {
        canvas.clear(0, 0, canvas.width, canvas.height)
        canvas.ctx.drawImage(img, 0, 0)
      }
      img.src = e.target.result
    }

    reader.readAsDataURL(file)
  })

  input.click()
}
