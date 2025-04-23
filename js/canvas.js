class Canvas {
  constructor (parentSelector) {
    this.element = document.createElement('canvas')
    this.parent = document.querySelector(parentSelector)
    if (!this.parent) {
      throw new Error(`Canvas constructor expects a valid selector, but '${parentSelector}' didn’t match anything`)
    }
    this.parent.appendChild(this.element)
    this.ctx = this.element.getContext('2d')
    this.element.width = this.parent.offsetWidth
    this.element.height = this.parent.offsetHeight

    this.mouseDown = false
    this.mouseX = 0
    this.mouseY = 0

    window.addEventListener('mousemove', e => {
      const box = this.element.getBoundingClientRect()
      this.mouseX = e.x - box.left
      this.mouseY = e.y - box.top
    })
    window.addEventListener('mousedown', () => {
      this.mouseDown = true
    })
    window.addEventListener('mouseup', () => {
      this.mouseDown = false
    })
  }

  resize (width, height) {
    if (typeof width !== 'number' || typeof height !== 'number') {
      throw new Error(`canvas.resize() expects two numbers, for example canvas.resize(640, 480) but you passed ${typeof width} and ${typeof height}`)
    }
    const oldCanvas = document.createElement('canvas')
    oldCanvas.width = this.element.width
    oldCanvas.height = this.element.height
    oldCanvas.getContext('2d').drawImage(this.element, 0, 0)
    const oldFill = this.fillColor
    const oldStroke = this.strokeColor

    this.element.width = width
    this.element.height = height

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
    if (typeof val !== 'string') {
      throw new Error(`canvas.fillColor must be a CSS color string, for example canvas.fillColor = 'red' but you passed a ${typeof val}`)
    }
    this.ctx.fillStyle = val
  }

  get strokeColor () {
    return this.ctx.strokeStyle
  }

  set strokeColor (val) {
    if (typeof val !== 'string') {
      throw new Error(`canvas.strokeColor must be a CSS color string, for example canvas.strokeColor = 'blue' but you passed a ${typeof val}`)
    }
    this.ctx.strokeStyle = val
  }

  get lineWidth () {
    return this.ctx.lineWidth
  }

  set lineWidth (size) {
    if (typeof size !== 'number') {
      throw new Error(`lineWidth is expecting a number, for example canvas.lineWidth = 5 but you passed a ${typeof size}`)
    }
    this.ctx.lineWidth = size
  }

  get lineCap () {
    return this.ctx.lineCap
  }

  set lineCap (style) {
    if (typeof style !== 'string') {
      throw new Error(`lineCap is expecting a string, for example canvas.lineCap = 'round' but you passed a ${typeof style}`)
    }
    this.ctx.lineCap = style
  }

  get lineJoin () {
    return this.ctx.lineJoin
  }

  set lineJoin (style) {
    if (typeof style !== 'string') {
      throw new Error(`lineJoin is expecting a string, for example canvas.lineJoin = 'miter' but you passed a ${typeof style}`)
    }
    this.ctx.lineJoin = style
  }

  get font () {
    return this.ctx.font
  }

  set font (str) {
    if (typeof str !== 'string') {
      throw new Error(`canvas.font is expecting a CSS font string, for example canvas.font = '16px sans-serif' but you passed a ${typeof str}`)
    }
    this.ctx.font = str
  }

  get textAlign () {
    return this.ctx.textAlign
  }

  set textAlign (align) {
    if (typeof align !== 'string') {
      throw new Error(`canvas.textAlign is expecting a string, for example canvas.textAlign = 'center' but you passed a ${typeof align}`)
    }
    this.ctx.textAlign = align
  }

  get textBaseline () {
    return this.ctx.textBaseline
  }

  set textBaseline (baseline) {
    if (typeof baseline !== 'string') {
      throw new Error(`canvas.textBaseline is expecting a string, for example canvas.textBaseline = 'middle' but you passed a ${typeof baseline}`)
    }
    this.ctx.textBaseline = baseline
  }

  get blendMode () {
    return this.ctx.globalCompositeOperation
  }

  set blendMode (mode) {
    if (typeof mode !== 'string') {
      throw new Error(`canvas.blendMode expects a string, for example canvas.blendMode = 'multiply' but you passed ${typeof mode}`)
    }
    this.ctx.globalCompositeOperation = mode
  }

  // -----------------
  // ----------------------------------
  // ---------------------------------------------------
  // ---------------------------------------------------------------------------

  getPixelData (x = 0, y = 0, w, h) {
    if (typeof x !== 'number' || typeof y !== 'number') {
      throw new Error('canvas.getPixelData() x and y must be numbers, for example canvas.getPixelData(0, 0)')
    }
    w = w || this.width
    h = h || this.height
    if (typeof w !== 'number' || typeof h !== 'number') {
      throw new Error('canvas.getPixelData() width and height must be numbers, for example canvas.getPixelData(0, 0, 100, 100)')
    }
    const imageData = this.ctx.getImageData(x, y, w, h)
    return imageData.data
  }

  getPixels () {
    const data = this.getPixelData()
    const pixels = []
    for (let i = 0; i < data.length; i += 4) {
      pixels.push({
        r: data[i],
        g: data[i + 1],
        b: data[i + 2],
        a: data[i + 3]
      })
    }
    return pixels
  }

  setPixels (pixels, x = 0, y = 0, w, h) {
    if (!Array.isArray(pixels)) {
      throw new Error(`canvas.setPixels() expects an array of pixel objects, but you passed a ${typeof pixels}`)
    }
    w = w || this.width
    h = h || this.height
    if (typeof x !== 'number' || typeof y !== 'number' || typeof w !== 'number' || typeof h !== 'number') {
      throw new Error('canvas.setPixels() x, y, width, height must be numbers, for example canvas.setPixels(pixels, 0, 0, 100, 100)')
    }
    const imageData = this.ctx.getImageData(x, y, w, h)
    const data = imageData.data
    for (let i = 0; i < data.length; i += 4) {
      const idx = Math.floor(i / 4)
      const px = pixels[idx]
      if (
        !px ||
        typeof px.r !== 'number' ||
        typeof px.g !== 'number' ||
        typeof px.b !== 'number' ||
        typeof px.a !== 'number'
      ) {
        throw new Error(`canvas.setPixels() pixel at index ${idx} is invalid; each pixel needs numeric r, g, b, a properties`)
      }
      data[i] = px.r
      data[i + 1] = px.g
      data[i + 2] = px.b
      data[i + 3] = px.a
    }
    this.ctx.putImageData(imageData, 0, 0)
  }

  // ---------------------------------------------------------------------------
  // ---------------------------------------------------
  // ----------------------------------
  // -----------------

  clear (x, y, w, h) {
    if (!x) {
      this.ctx.clearRect(0, 0, this.width, this.height)
    } else if ([x, y, w, h].some(v => typeof v !== 'number')) {
      throw new Error('canvas.clear() expects numbers, for example canvas.clear(50, 50, 25, 15)')
    } else {
      this.ctx.clearRect(x, y, w, h)
    }
  }

  ellipse (x, y, w, h) {
    if ([x, y, w].some(v => typeof v !== 'number')) {
      throw new Error('canvas.ellipse() expects numbers, for example canvas.ellipse(50, 50, 25, 15)')
    }
    this.ctx.beginPath()
    this.ctx.ellipse(x, y, w, h || w, 0, 2 * Math.PI, false)
    this.ctx.closePath()
    this.ctx.fill()
    this.ctx.stroke()
  }

  circle (x, y, s) {
    if ([x, y, s].some(v => typeof v !== 'number')) {
      throw new Error('canvas.circle() expects numbers, for example canvas.circle(50, 50, 100)')
    }
    this.ellipse(x, y, s, s)
  }

  rect (x, y, w, h) {
    if ([x, y, w, h].some(v => typeof v !== 'number')) {
      throw new Error('canvas.rect() expects numbers, for example canvas.rect(10, 10, 100, 50)')
    }
    this.ctx.beginPath()
    this.ctx.rect(x, y, w, h)
    this.ctx.closePath()
    this.ctx.fill()
    this.ctx.stroke()
  }

  line (x1, y1, x2, y2) {
    if ([x1, y1, x2, y2].some(v => typeof v !== 'number')) {
      throw new Error('canvas.line() expects numbers, for example canvas.line(0, 0, 100, 100)')
    }
    this.ctx.beginPath()
    this.ctx.moveTo(x1, y1)
    this.ctx.lineTo(x2, y2)
    this.ctx.closePath()
    this.ctx.stroke()
  }

  triangle (x1, y1, x2, y2, x3, y3) {
    if ([x1, y1, x2, y2, x3, y3].some(v => typeof v !== 'number')) {
      throw new Error('canvas.triangle() expects numbers, for example canvas.triangle(0,0, 50,100, 100,0)')
    }
    this.ctx.beginPath()
    this.ctx.moveTo(x1, y1)
    this.ctx.lineTo(x2, y2)
    this.ctx.lineTo(x3, y3)
    this.ctx.closePath()
    this.ctx.fill()
    this.ctx.stroke()
  }

  text (str, x, y, type) {
    if (typeof str !== 'string') {
      throw new Error('canvas.text() expects first argument to be a string, for example canvas.text("hello", 10, 20)')
    }
    if (typeof x !== 'number' || typeof y !== 'number') {
      throw new Error('canvas.text() x and y must be numbers, for example canvas.text("hello", 10, 20)')
    }
    type = type || 'fill'
    if (type !== 'fill' && type !== 'stroke') {
      throw new Error(`canvas.text() type must be 'fill' or 'stroke', but you passed '${type}'`)
    }
    if (type === 'stroke') {
      this.ctx.strokeText(str, x, y)
    } else {
      this.ctx.fillText(str, x, y)
    }
  }

  save () {
    if (arguments.length) {
      throw new Error('canvas.save() does not take any arguments')
    }
    this.ctx.save()
  }

  restore () {
    if (arguments.length) {
      throw new Error('canvas.restore() does not take any arguments')
    }
    this.ctx.restore()
  }

  scale (x, y) {
    if (typeof x !== 'number' || typeof y !== 'number') {
      throw new Error('canvas.scale() expects two numbers, for example scale(2, 2)')
    }
    this.ctx.scale(x, y)
  }

  rotate (angle) {
    if (typeof angle !== 'number') {
      throw new Error('canvas.rotate() expects a number in radians, for example canvas.rotate(Math.PI / 4)')
    }
    this.ctx.rotate(angle)
  }

  translate (x, y) {
    if (typeof x !== 'number' || typeof y !== 'number') {
      throw new Error('canvas.translate() expects two numbers, for example canvas.translate(10, 20)')
    }
    this.ctx.translate(x, y)
  }

  transform (m11, m12, m21, m22, dx, dy) {
    if ([m11, m12, m21, m22, dx, dy].some(v => typeof v !== 'number')) {
      throw new Error('canvas.transform() expects six numbers, for example canvas.transform(1, 0, 0, 1, 0, 0)')
    }
    this.ctx.transform(m11, m12, m21, m22, dx, dy)
  }

  setTransform (m11, m12, m21, m22, dx, dy) {
    if ([m11, m12, m21, m22, dx, dy].some(v => typeof v !== 'number')) {
      throw new Error('canvas.setTransform() expects six numbers, for example canvas.setTransform(1, 0, 0, 1, 0, 0)')
    }
    this.ctx.setTransform(m11, m12, m21, m22, dx, dy)
  }
}

window.Canvas = Canvas
