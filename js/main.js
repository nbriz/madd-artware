/* global nn, Canvas, Netitor */
var canvas, ne, iconmaker
window.menu = { File: {}, Filter: {}, Learn: {}, Code: {} }

const modules = {
  filefuncs: ['new', 'open', 'save', 'restart'],
  filters: ['invert'],
  learn: ['artware', 'docs'],
  tools: ['fill', 'pencil'],
  codefuncs: ['new-file', 'load-code']
}

const state = {
  colors: ['#000000', '#7a7a7a', '#7c000a', '#7a7920', '#007b1d', '#007a7a', '#000f78', '#7c0079', '#7a7b42', '#003c3c', '#007efa', '#003e79', '#3b24f9', '#7b3913', '#ffffff', '#bbbbbb', '#ff001e', '#fffd43', '#00ff3d', '#00fffe', '#0025f8', '#ff00fa', '#fffe85', '#00ff83', '#75fffe', '#7a7dfa', '#ff007b', '#ff7446'],
  colorSelType: 'fill', // or 'stroke'
  needToLoad: Object.values(modules).reduce((sum, arr) => sum + arr.length, 0),
  loaded: 0,
  icon: null, // data for user's icon
  userCode: null, // state of the user's code
  clickOnly: false, // whether to execute tool only on click or on every mousemove
  toolCode: null // currently selected tool's code
}

// ~ * ~ . _ . ~ * ~ . _ . ~ * ~ . _ . ~ * ~ . _ . ~ * ~ . _ . ~ * ~ . _ . ~ * ~
// ~ * ~ . _ . ~ * ~ . _ . ~ * ~ . _ . ~ * ~ . _ . ~ * ~ . _       FUNCTIONS
// ~ * ~ . _ . ~ * ~ . _ . ~ * ~ . _ . ~ * ~ . _ . ~ * ~ . _ . ~ * ~ . _ . ~ * ~

// for use in the student code...
window.rgba = function (r = 0, g = 0, b = 0, a = 1) {
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

window.hsla = function (h = 0, s = 100, l = 50, a = 1) {
  return `hsla(${h}, ${s}%, ${l}%, ${a})`
}

window.log = function (...args) {
  netitorReset()
  const nnlnk = '<a href="https://netnet.studio" target="_blank" id="nn-link">(◠ . ◠)</a> ⮕ '
  const output = args
    .map(arg => typeof arg === 'object'
      ? JSON.stringify(arg)
      : String(arg))
    .join(', ')
  nn.get('#tool-info').content(nnlnk + output).css('color', 'black')
  if (nn.get('#editor').style.display === 'block') ne.spotlight('clear')
}

// .....................

function loading (type, name) {
  state.loaded++
  const frac = state.loaded / state.needToLoad
  const totalBlocks = 10
  const filled = Math.floor(frac * totalBlocks)
  const empty = totalBlocks - filled
  const str = 'loading ' + '■  '.repeat(filled) + '□  '.repeat(empty)
  nn.get('#loader').content(`<span>${str}</span>`)
  if (frac === 1) {
    setTimeout(() => {
      nn.get('#loader').css('opacity', 0)
      setTimeout(() => {
        nn.get('#loader').css('display', 'none')
      }, 1000)
    }, 250)
  }
}

function loadMenuModule (type, name) {
  if (type === 'tools' || type === 'filters') {
    const ext = type === 'tools' ? 'tool' : 'filter'
    return window.fetch(`js/${type}/${name}.${ext}`).then(response => {
      if (!response.ok) throw new Error(`Failed to fetch module: ${type}/${name}`)
      return response.text()
    }).then(data => {
      loading(type, name)
      const obj = JSON.parse(data)
      if (type === 'tools') loadTool(obj.icon, obj.function, obj.click)
      else if (type === 'filters') {
        window.menu.Filter[obj.name] = function () { runCode(obj.function) }
      }
    })
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `js/${type}/${name}.js`
    script.onload = () => { loading(type, name); resolve() }
    script.onerror = () => reject(new Error(`Failed to load module: ${type}/${name}`))
    document.body.appendChild(script)
  })
}

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

function updateColorSelectType (type) {
  nn.get('.old-sch-clr__fillStyle').css({ zIndex: type === 'fill' ? 1 : 0 })
  nn.get('.old-sch-clr__strokeStyle').css({ zIndex: type === 'fill' ? 0 : 1 })
  state.colorSelType = type
}

function updateSelectedColor (color) {
  if (state.colorSelType === 'fill') {
    nn.get('.old-sch-clr__fillStyle').css({ background: color })
    canvas.fillColor = color
  } else if (state.colorSelType === 'stroke') {
    nn.get('.old-sch-clr__strokeStyle').css({ background: color })
    canvas.strokeColor = color
  }
}

function updateCursorIcon (base64) {
  const img = new window.Image()
  img.onload = function () {
    const scaledCanvas = document.createElement('canvas')
    const ctx = scaledCanvas.getContext('2d')
    scaledCanvas.width = 32
    scaledCanvas.height = 32
    ctx.drawImage(img, 0, 0, scaledCanvas.width, scaledCanvas.height)
    const b64 = scaledCanvas.toDataURL('image/png')
    nn.get('#draw-area > canvas').css('cursor', `url(${b64}) 0 0, auto`)
  }
  img.src = base64
}

function loadTool (icon, func, clickOnly) {
  nn.create('img')
    .set({ src: icon, alt: clickOnly ? 'click-only' : '' })
    .addTo('#tool-bar')
    .on('click', (e) => {
      state.toolCode = func
      state.clickOnly = clickOnly
      updateCursorIcon(icon)
    })
    .on('mousedown', (e) => e.target.classList.add('clicked'))
    .on('mouseup', (e) => e.target.classList.remove('clicked'))
}

function openIconMaker () {
  const tool = nn.get('#code-type-select').value === 'tool'
  if (!tool) return
  iconmaker = window.open('tool-icon-maker.html', 'Icon Maker', 'width=324,height=380,resizable=no')
  window.addEventListener('message', event => {
    const d = event.data
    // console.log('Message from popup:', d.data)
    if (d.type === 'ready') iconmaker.postMessage({ type: 'init', data: state.icon }, '*')
    else if (d.type === 'new-icon') {
      state.icon = d.data
      // updateCursorIcon(d.data)
      nn.get('#icon-button').set('src', state.icon)
    }
  })
}

function netitorReset () {
  const nnlnk = '<a href="https://netnet.studio" target="_blank" id="nn-link">(◕ ◞ ◕)</a>'
  nn.get('#tool-info').content(nnlnk).css('color', 'black')
  if (nn.get('#editor').style.display === 'block') ne.spotlight('clear')
}

function markErrors (eve) {
  const explainError = (err, cnslErr) => {
    if (nn.get('#editor').style.display === 'block') ne.spotlight(err.line)
    const nnlnk = cnslErr
      ? '<a href="https://netnet.studio" target="_blank" id="nn-link" style="font-weight: bold; color: #d72020;">(✖﹏✖)</a>'
      : '<a href="https://netnet.studio" target="_blank" id="nn-link">(◕ ◞ ◕)</a>'
    const s = `${nnlnk} ${err.friendly || err.message}`
    nn.get('#tool-info').content(s)
    if (cnslErr) nn.get('#tool-info').css('color', '#d72020')
    else nn.get('#tool-info').css('color', 'black')
  }

  ne.marker(null)
  const lines = []
  if (eve.length === 0) netitorReset()
  eve.filter(e => {
    // filter out specific errors
    const skip = [
      "'canvas' is not defined.",
      "'log' is not defined.",
      "'rgba' is not defined.",
      "'hsla' is not defined."
    ]
    if (!skip.includes(e.message)) return e
  }).forEach(e => {
    if (lines.includes(e.line)) return
    lines.push(e.line)

    const clk = () => explainError(e)
    if (e.type === 'warning') ne.marker(e.line, 'yellow', clk)
    else ne.marker(e.line, 'red', clk)

    if (e.language === 'js-cnsl') explainError(e, true)
    else netitorReset()
  })
}

function runCode (code) {
  try {
    window.eval(code)
  } catch (err) {
    const message = err.message || 'Unknown error'
    const stack = err.stack || ''
    const lineMatch = stack.match(/eval:(\d+)/)
    const line = lineMatch ? parseInt(lineMatch[1]) : null
    markErrors([{ type: 'error', language: 'js-cnsl', message: message, line: line }])
  }
}

function downloadCode () {
  const tool = nn.get('#code-type-select').value === 'tool'
  const name = nn.get('#code-file-name').value.trim()
  const code = state.userCode
  const icon = state.icon
  const clickOnly = nn.get('#tool-click-only').checked

  // Basic validation
  if (!name) {
    window.alert('Please enter a file name.')
    return
  }

  if (!code || typeof code !== 'string' || code.trim() === '') {
    window.alert('Code cannot be empty.')
    return
  }

  if (tool && (!icon || icon === '' || icon === window.blankIcon)) {
    window.alert('Tool icon is missing.')
    return
  }

  const data = {
    name,
    type: tool ? 'tool' : 'filter',
    function: code
  }

  if (tool) {
    data.icon = icon
    data.click = clickOnly
  }

  const json = JSON.stringify(data, null, 2)
  const blob = new window.Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `${name}.${tool ? 'tool' : 'filter'}`
  a.style.display = 'none'

  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)

  URL.revokeObjectURL(url)
}

function resizeAreas (opt) {
  const code = nn.get('#code-new-tool').style.display === 'block'
  const tw = 76
  const cw = code ? 200 : 20
  const dw = nn.width - tw - cw
  const br = 8 // #paint-app border
  const dh = nn.get('#tool-info').height +
    nn.get('#tool-options').height +
    nn.get('#main-menu').height +
    nn.get('header').height + br

  const height = nn.height - dh
  nn.get('#tool-bar').css({ width: tw, height })
  nn.get('#draw-area').css({ width: dw, height })
  nn.get('#code-menu').css({ width: cw, height })

  const h = nn.get('#draw-area').height
  canvas.resize(dw - br, h - br)
}

// ~ * ~ . _ . ~ * ~ . _ . ~ * ~ . _ . ~ * ~ . _ . ~ * ~ . _ . ~ * ~ . _ . ~ * ~
// ~ * ~ . _ . ~ * ~ . _ . ~ * ~ . _ . ~ * ~ . _ . ~ * ~ . _   SETUP CODE MENU
// ~ * ~ . _ . ~ * ~ . _ . ~ * ~ . _ . ~ * ~ . _ . ~ * ~ . _ . ~ * ~ . _ . ~ * ~
// called in /js/codefuncs files
function setupCodeMenu (display, data) {
  nn.create('div').set('id', 'editor').addTo('#draw-area')
  const load = display.includes('load')

  const updateCodeView = () => {
    const tool = nn.get('#code-type-select').value === 'tool'
    if (tool) {
      nn.get('#icon-opts').css('opacity', 1)
      nn.get('#filt-opts').css('opacity', 0.25)
    } else {
      nn.get('#icon-opts').css('opacity', 0.25)
      nn.get('#filt-opts').css('opacity', 1)
    }
    const ph = `name your ${tool ? 'tool' : 'filter'}`
    nn.get('#code-file-name').set('placeholder', ph)
  }

  ne = new Netitor({
    ele: '#editor',
    background: false,
    language: 'javascript',
    autoUpdate: false,
    hint: false
  })

  ne.on('code-update', () => { state.toolCode = state.userCode = ne.code })
  ne.on('lint-error', (e) => markErrors(e))
  ne.on('cursor-activity', netitorReset)

  if (load) {
    state.icon = data.icon
    state.userCode = ne.code = data.function
    nn.get('#code-file-name').value = data.name
    nn.get('#code-type-select').value = data.type
    nn.get('#tool-click-only').checked = data.click
    nn.get('#icon-button').set('src', data.icon)
    // loadTool(data.icon, data.function, data.click)
    updateCodeView()
  } else {
    nn.get('#code-file-name').value = ''
    // TODO: loade template ne.code = ...
    // ne.code = '/* global canvas */'
    updateCodeView()
  }

  nn.get('#show-editor').checked = true
  nn.get('#show-editor').on('change', (e) => {
    if (e.target.checked) {
      nn.get('#editor').css('display', 'block')
      runCode(state.userCode)
    } else nn.get('#editor').css('display', 'none')
  })

  nn.get('#code-type-select').on('change', updateCodeView)

  nn.get('#apply-filter').on('click', () => {
    const tool = nn.get('#code-type-select').value === 'tool'
    if (tool) return
    runCode(state.userCode)
  })

  nn.get('#tool-click-only').on('input', (e) => {
    state.clickOnly = e.target.checked
  })

  nn.get('#icon-button')
    .on('mousedown', (e) => e.target.classList.add('clicked'))
    .on('mouseup', (e) => e.target.classList.remove('clicked'))
    .on('click', (e) => {
      const tool = nn.get('#code-type-select').value === 'tool'
      if (!tool) return
      state.toolCode = state.userCode
      state.clickOnly = nn.get('#tool-click-only').checked
      updateCursorIcon(nn.get('#icon-button').src)
    })

  nn.get('#open-icon-maker').on('click', openIconMaker)

  nn.get('#download-code').on('click', downloadCode)

  nn.get('#code-new-tool').css('display', 'block')
  resizeAreas()
}

// ~ * ~ . _ . ~ * ~ . _ . ~ * ~ . _ . ~ * ~ . _ . ~ * ~ . _ . ~ * ~ . _ . ~ * ~
// ~ * ~ . _ . ~ * ~ . _ . ~ * ~ . _ . ~ * ~ . _ . ~ * ~ .     MAIN  SETUP
// ~ * ~ . _ . ~ * ~ . _ . ~ * ~ . _ . ~ * ~ . _ . ~ * ~ . _ . ~ * ~ . _ . ~ * ~

async function setup () {
  nn.on('resize', resizeAreas)

  // setup canvas
  // -------------------------
  canvas = new Canvas('#draw-area')
  setTimeout(() => { // HACK
    canvas.element.width = canvas.width - 8
    canvas.element.height = canvas.height - 8
    canvas.fillColor = '#bbbbbb'
    canvas.strokeColor = '#000000'
  }, 100)
  canvas.element.addEventListener('click', (e) => {
    // console.log(canvas.mouseDown, e.x, e.y);
    if (state.toolCode && state.clickOnly) runCode(state.toolCode)
  })
  canvas.element.addEventListener('mousemove', (e) => {
    // console.log(canvas.mouseDown, e.x, e.y);
    if (state.toolCode && !state.clickOnly) runCode(state.toolCode)
  })

  // setup color swatches
  // -------------------------
  nn.get('.old-sch-clr__fillStyle')
    .css({ background: '#bbbbbb' })
    .on('click', () => updateColorSelectType('fill'))
  nn.get('.old-sch-clr__strokeStyle')
    .css({ background: '#000000' })
    .on('click', () => updateColorSelectType('stroke'))
  state.colors.forEach(color => {
    nn.create('span')
      .set('class', 'old-sch-clr__swatch')
      .css({ background: color })
      .on('click', () => updateSelectedColor(color))
      .addTo('.old-sch-clr__swatches')
  })

  // load moduls
  // ------------------------
  for (const type in modules) {
    for (let i = 0; i < modules[type].length; i++) {
      const name = modules[type][i]
      await loadMenuModule(type, name)
    }
  }

  // setup menu && tool bar
  // -------------------------
  for (const sub in window.menu) {
    // create the element for each menu item (File, Edit, etc)
    const menuItem = nn.create('div').set('class', 'menu-item').content(sub).addTo('#main-menu')
    menuItem.on('click', () => {
      nn.getAll('.sub-menu').forEach(sm => sm.css({ display: 'none' }))
      subMenu.css({ left: menuItem.x, top: menuItem.y + menuItem.height, display: 'block' })
    })
    // create the drop-down-menu element for each item
    const subMenu = nn.create('div')
      .set({ class: 'sub-menu', name: sub })
      .css({ position: 'absolute', zIndex: 10, display: 'none' })
      .addTo('#main-menu')
    for (const item in window.menu[sub]) { // add items to drow-down menu
      nn.create('div').content(item).addTo(subMenu).on('click', () => window.menu[sub][item]())
    }
  }

  nn.on('click', (e) => { // close menus
    if (e.target.classList.contains('menu-item')) return
    nn.getAll('.sub-menu').forEach(sm => sm.css({ display: 'none' }))
  })

  resizeAreas()
  setTimeout(resizeAreas, 500)
}

nn.on('load', setup)

nn.on('beforeunload', function (e) {
  e.preventDefault()
  e.returnValue = ''
  if (iconmaker) iconmaker.close()
  if (window.about) window.about.close()
  if (window.docs) window.docs.close()
  if (window.colors) window.colors.close()
})
