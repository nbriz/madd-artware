/* global canvas */
window.menu.File['Save Image'] = function () {
  const imageURL = canvas.element.toDataURL('image/png')
  const link = document.createElement('a')
  link.href = imageURL
  link.download = 'artware-app-image'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
