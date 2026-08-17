import { useLayoutEffect, useRef, useState } from 'react'
import {
  Tldraw,
  useEditor,
  useValue,
  useColorMode,
  approximately,
} from 'tldraw'
import 'tldraw/tldraw.css'

function CustomGrid({ size, ...camera }) {
  const editor = useEditor()

  const screenBounds = useValue(
    'screenBounds',
    () => editor.getViewportScreenBounds(),
    []
  )

  const devicePixelRatio = useValue(
    'dpr',
    () => editor.getInstanceState().devicePixelRatio,
    []
  )

  const isDarkMode = useColorMode() === 'dark'

  const canvasRef = useRef(null)

  useLayoutEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current

    const canvasW = screenBounds.w * devicePixelRatio
    const canvasH = screenBounds.h * devicePixelRatio

    canvas.width = canvasW
    canvas.height = canvasH

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvasW, canvasH)

    const pageBounds = editor.getViewportPageBounds()

    const startX = Math.ceil(pageBounds.minX / size) * size
    const startY = Math.ceil(pageBounds.minY / size) * size
    const endX = Math.floor(pageBounds.maxX / size) * size
    const endY = Math.floor(pageBounds.maxY / size) * size

    const rows = Math.round((endY - startY) / size)
    const cols = Math.round((endX - startX) / size)

    ctx.strokeStyle = isDarkMode ? '#555' : '#d0d7de'

    for (let row = 0; row <= rows; row++) {
      const pageY = startY + row * size
      const canvasY = (pageY + camera.y) * camera.z * devicePixelRatio

      const major = approximately(pageY % (size * 5), 0)

      drawLine(
        ctx,
        0,
        canvasY,
        canvasW,
        canvasY,
        major ? 2 : 1
      )
    }

    for (let col = 0; col <= cols; col++) {
      const pageX = startX + col * size
      const canvasX = (pageX + camera.x) * camera.z * devicePixelRatio

      const major = approximately(pageX % (size * 5), 0)

      drawLine(
        ctx,
        canvasX,
        0,
        canvasX,
        canvasH,
        major ? 2 : 1
      )
    }
  }, [
    screenBounds,
    camera,
    size,
    devicePixelRatio,
    editor,
    isDarkMode,
  ])

  return (
    <canvas
      ref={canvasRef}
      className="tl-grid"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
      }}
    />
  )
}

function drawLine(ctx, x1, y1, x2, y2, width) {
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.lineWidth = width
  ctx.stroke()
}

function GridWrapper() {
  const [jsonOutput, setJsonOutput] = useState('')

  async function analyzeSketch() {
  const shapes = window.editor.getCurrentPageShapes()

  const jsonData = shapes.map((shape) => ({
    id: shape.id,

    type: shape.type,

    shapeType: shape.props?.geo || null,

    x: Math.round(shape.x),
    y: Math.round(shape.y),

    width: Math.round(shape.props?.w || 0),
    height: Math.round(shape.props?.h || 0),

    rotation: shape.rotation || 0,

    color: shape.props?.color || null,
    fill: shape.props?.fill || null,
    dash: shape.props?.dash || null,
    size: shape.props?.size || null,

    font: shape.props?.font || null,
    align: shape.props?.align || null,
    verticalAlign: shape.props?.verticalAlign || null,

    url: shape.props?.url || null,

    text:
      shape.props?.richText?.content
        ?.map((block) =>
          block.content
            ?.map((c) => c.text)
            .join('')
        )
        .join(' ') || '',

    isClosed: shape.props?.isClosed || false,

    points: shape.props?.segments || null,
  }))

  const jsonString = JSON.stringify(jsonData, null, 2)

  setJsonOutput(jsonString)

  console.log(jsonString)

  // Download JSON

  const jsonBlob = new Blob(
    [jsonString],
    { type: 'application/json' }
  )

  const jsonUrl = URL.createObjectURL(jsonBlob)

  const jsonLink = document.createElement('a')

  jsonLink.href = jsonUrl
  jsonLink.download = 'layout.json'

  document.body.appendChild(jsonLink)

  jsonLink.click()

  document.body.removeChild(jsonLink)

  URL.revokeObjectURL(jsonUrl)

  // Download PNG

  const result = await window.editor.toImage(
    window.editor.getCurrentPageShapes(),
    {
      format: 'png',
      background: true,
    }
  )

  const pngUrl = URL.createObjectURL(result.blob)

  const pngLink = document.createElement('a')

  pngLink.href = pngUrl
  pngLink.download = 'canvas.png'

  document.body.appendChild(pngLink)

  pngLink.click()

  document.body.removeChild(pngLink)

  URL.revokeObjectURL(pngUrl)
}
  return (
    <>
      <button
        onClick={analyzeSketch}
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          zIndex: 1000,
          padding: '10px 16px',
          borderRadius: '8px',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        Analyze Sketch
      </button>

      <pre
        style={{
          position: 'absolute',
          top: 60,
          right: 10,
          width: '350px',
          maxHeight: '400px',
          overflow: 'auto',
          background: '#111',
          color: '#00ff88',
          padding: '10px',
          borderRadius: '8px',
          zIndex: 1000,
          fontSize: '12px',
          whiteSpace: 'pre-wrap',
        }}
      >
        {jsonOutput || 'JSON will appear here...'}
      </pre>

      <Tldraw
        components={{
          Grid: CustomGrid,
        }}
        onMount={(editor) => {
          window.editor = editor

          editor.updateInstanceState({
            isGridMode: true,
          })
        }}
      />
    </>
  )
}

export default function App() {
  return (
    <div style={{ height: '100vh' }}>
      <GridWrapper />
    </div>
  )
}