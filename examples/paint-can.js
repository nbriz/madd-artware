let random = (min, max) => min + Math.random() * (max - min)

let drip = (x, y, count, color) => {
  if (count > 10) return
  canvas.circle(x, y, 2)
  count++
  y++
  setTimeout(drip, 100, x, y, count, color)
}

if (canvas.mouseDown) {
  canvas.strokeColor = canvas.fillColor
  let i = 0;
  while (i < 15) {
    let x = canvas.mouseX + random(-20, 20)
    let y = canvas.mouseY + random(-20, 20)
    let radius = random(2, 10)
    canvas.circle(x, y, radius)
    drip(x, y, 0)
    i++
  }
}
