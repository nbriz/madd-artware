class Canvas {
  constructor (parentSelector) {
    this.element = document.createElement('canvas')
    this.parent = document.querySelector(parentSelector)
    this.parent.appendChild(this.element)
    this.ctx = this.element.getContext('2d')
    this.element.width = this.parent.offsetWidth
    this.element.height = this.parent.offsetHeight

    this.mouseDown = false
    this.mouseX = 0
    this.mouseY = 0

    window.addEventListener('mousemove', (e) => {
      const box = this.element.getBoundingClientRect()
      this.mouseX = e.x - box.left
      this.mouseY = e.y - box.top
    })
    window.addEventListener('mousedown', (e) => {
      this.mouseDown = true
    })
    window.addEventListener('mouseup', (e) => {
      this.mouseDown = false
    })
  }

  resize (width, height) {
    const oldCanvas = document.createElement('canvas')
    oldCanvas.width = this.element.width
    oldCanvas.height = this.element.height
    oldCanvas.getContext('2d').drawImage(this.element, 0, 0)
    const oldFill = this.fillColor
    const oldStroke = this.strokeColor
    // Resize the canvas
    this.element.width = width
    this.element.height = height
    // Redraw saved contents
    this.fillColor = oldFill
    this.strokeColor = oldStroke
    this.ctx.drawImage(oldCanvas, 0, 0)
  }

  get width () {
    return this.element.width
  }

  set width (val) {
    console.error('canvas.width can not be edited')
  }

  get height () {
    return this.element.height
  }

  set height (val) {
    console.error('canvas.height can not be edited')
  }

  get fillColor () {
    return this.ctx.fillStyle
  }

  set fillColor (val) {
    this.ctx.fillStyle = val
  }

  get strokeColor () {
    return this.ctx.strokeStyle
  }

  set strokeColor (val) {
    this.ctx.strokeStyle = val
  }

  getPixelData (x = 0, y = 0, w, h) {
    w = w || this.width
    h = h || this.height
    const imageData = this.ctx.getImageData(x, y, w, h)
    return imageData.data
  }

  getPixels () {
    const data = this.getPixelData()
    const pixels = []
    for (let i = 0; i < data.length; i += 4) {
      const pixel = {
        r: data[i],
        g: data[i + 1],
        b: data[i + 2],
        a: data[i + 3]
      }
      pixels.push(pixel)
    }
    return pixels
  }

  setPixels (pixels, x = 0, y = 0, w, h) {
    w = w || this.width
    h = h || this.height
    const imageData = this.ctx.getImageData(x, y, w, h)
    const data = imageData.data
    for (let i = 0; i < data.length; i += 4) {
      const idx = Math.floor(i / 4)
      data[i] = pixels[idx].r
      data[i + 1] = pixels[idx].g
      data[i + 2] = pixels[idx].b
      data[i + 3] = pixels[idx].a
    }
    this.ctx.putImageData(imageData, 0, 0)
  }

  ellipse (x, y, w, h) {
    this.ctx.beginPath()
    this.ctx.ellipse(x, y, w, h || w, 0, 2 * Math.PI, false)
    this.ctx.closePath()
    this.ctx.fill()
    this.ctx.stroke()
  }

  rect (x, y, w, h) {
    this.ctx.beginPath()
    this.ctx.rect(x, y, w, h)
    this.ctx.closePath()
    this.ctx.fill()
    this.ctx.stroke()
  }

  line (x1, y1, x2, y2) {
    this.ctx.beginPath()
    this.ctx.moveTo(x1, y1)
    this.ctx.lineTo(x2, y2)
    this.ctx.closePath()
    this.ctx.stroke()
  }
}

window.Canvas = Canvas
