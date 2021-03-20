let pdfUrl = 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf'
let once = false
let pdfFactory = undefined
let pdfViewer = undefined
let coordinates = []

let __x_1 = 0
let __y_1 = 0
let doSquare = true
let setStatus = function (value) {
  document.getElementById("statusLine").innerHTML = " " + value + " "

  document.getElementById("annotationCount").innerHTML = " " + (pdfFactory.getAnnotationCount() + 1) + " "
}

let updateCoordinates = function () {
  let _str = coordinates.map((x) => Math.round(x)).join(",")
  document.getElementById("coords").innerHTML = _str
}

let getParameters = function () {
  let x = coordinates[0]
  let y = coordinates[1]

  return [x, y, "", ""]
}

let selectionCoordinates = function () {
  let rec = window.getSelection().getRangeAt(0).getBoundingClientRect()
  let ost = computePageOffset()
  let x_1 = rec.x - ost.left
  let y_1 = rec.y - ost.top
  let x_2 = x_1 + rec.width
  let y_2 = y_1 + rec.height

  let x_1_y_1 = pdfViewer._pages[pdfViewer.currentPageNumber - 1].viewport.convertToPdfPoint(x_1, y_1)
  x_1 = x_1_y_1[0]
  y_1 = x_1_y_1[1]
  let x_2_y_2 = pdfViewer._pages[pdfViewer.currentPageNumber - 1].viewport.convertToPdfPoint(x_2, y_2)
  x_2 = x_2_y_2[0]
  y_2 = x_2_y_2[1]
  return [x_1, y_1, x_2, y_2]
}

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@2.0.943/build/pdf.worker.min.js'

document.querySelector('#clear').addEventListener('click', (evt) => {
  coordinates = []
  document.querySelector(".blockCanvas").remove()
  updateCoordinates()
})

document.querySelector('#download').addEventListener('click', (evt) => {
  setStatus("Download")
  pdfFactory.download()
})

let computePageOffset = function () {
  let pageId = "page" + pdfViewer.currentPageNumber
  let pg = document.getElementById(pageId)

  var rect = pg.getBoundingClientRect(), bodyElt = document.body;
  return {
    top: rect.top + bodyElt .scrollTop,
    left: rect.left + bodyElt .scrollLeft
  }
}

window.onload =  function(){
  let pdfContainer = document.getElementById('viewerContainer')

  pdfViewer = new pdfjsViewer.PDFViewer({
    container : pdfContainer
  })

  pdfContainer.addEventListener('click', (evt) => {
    let ost = computePageOffset()
    let x = evt.pageX - ost.left
    let y = evt.pageY - ost.top

    let x_y = pdfViewer._pages[pdfViewer.currentPageNumber - 1].viewport.convertToPdfPoint(x, y)
    x = x_y[0]
    y = x_y[1]

    captureSquareCoord(evt.pageX, evt.pageY)
    coordinates.push(x)
    coordinates.push(y)

    updateCoordinates()

    if (doSquare) {
      setStatus("Select the second point")

      if (coordinates.length == 4) {
        setStatus("Added square annotation")
        let parameters = getParameters()
        let black = { r: 10, g: 10, b: 10 }
        pdfFactory.createSquareAnnotation(pdfViewer.currentPageNumber - 1, coordinates.slice(), "", "", black, black)

        coordinates = []
      }
    }
  })

  let loadingTask = pdfjsLib.getDocument({
    url : pdfUrl
  })
  loadingTask.promise.then((pdfDocument) => {
    pdfDocument.getData().then((data) => {
      pdfFactory = new pdfAnnotate.AnnotationFactory(data)
    })
    pdfViewer.setDocument(pdfDocument)
    setTimeout(() => {
      pdfViewer.currentScaleValue = 'page-width'
    }, 1500)
  })

  let captureSquareCoord = function(x, y) {
    if (window.newSquare) {
      window.newSquare.topRight = { x: x, y: y }
      renderSquare()
    } else {
      window.newSquare = { bottomLeft: { x: x, y: y } }
    }
  }

  let renderSquare = function() {
    let height = newSquare.bottomLeft.y - newSquare.topRight.y
    let width = newSquare.topRight.x - newSquare.bottomLeft.x
    newSquare.topLeft = { x: newSquare.bottomLeft.x, y: newSquare.topRight.y }
    newSquare.bottomRight = { x: newSquare.topRight.x, y: newSquare.bottomLeft.y }

    var canvas = document.createElement('canvas'); //Create a canvas element
    canvas.className = "blockCanvas"

    //Set canvas width/height
    canvas.style.width = width;
    canvas.style.height = height;
    canvas.width = width;
    canvas.height = height;

    //Position canvas
    canvas.style.position = 'absolute';
    canvas.style.left = newSquare.topLeft.x;
    canvas.style.top = newSquare.topLeft.y;
    canvas.style.zIndex = 100000;
    document.body.appendChild(canvas); //Append canvas to body element
    var context = canvas.getContext('2d');

    //Draw rectangle
    context.rect(0, 0, canvas.width, canvas.height);
    context.fillStyle = 'black';
    context.fill();

    //canvas.addEventListener('click', (evt) => {
    //  canvas.remove()
    //})

    window.newSquare = null;
  }
}
