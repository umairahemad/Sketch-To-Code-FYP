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
      const canvasY =
        (pageY + camera.y) * camera.z * devicePixelRatio

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
      const canvasX =
        (pageX + camera.x) * camera.z * devicePixelRatio

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

function PropertiesPanel({ selectedShape }) {
  if (!selectedShape) return null
  
  const props = selectedShape.props || {}

  const shapeType =
    props.geo ||
    selectedShape.type ||
    'Unknown'

  const width = props.w
    ? Math.round(props.w)
    : null

  const height = props.h
    ? Math.round(props.h)
    : null

  const color = props.color || null
  const fill = props.fill || null

  const text =
    props.richText?.content
      ?.map((block) =>
        block.content
          ?.map((c) => c.text)
          .join('')
      )
      .join(' ') || ''

  return (
    <div
      style={{
        position: 'absolute',
        top: 8,
        right: 170,
        width: 260,
        background: '#FCFCFC',
        border: '1px solid #e5e7eb',
        borderRadius: '9px',
        margin: '8px',
        padding: '18px',
        zIndex: 1000,
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <h3
        style={{
          margin: '0 0 18px',
          fontSize: '16px',
          color: '#111827',
        }}
      >
        Properties
      </h3>

      <PropertyRow
        label="Type"
        value={shapeType}
      />

      <PropertyRow
        label="X"
        value={Math.round(selectedShape.x)}
      />

      <PropertyRow
        label="Y"
        value={Math.round(selectedShape.y)}
      />

      {width !== null && (
        <PropertyRow
          label="Width"
          value={width}
        />
      )}

      {height !== null && (
        <PropertyRow
          label="Height"
          value={height}
        />
      )}

      {color && (
        <PropertyRow
          label="Color"
          value={color}
        />
      )}

      {fill && (
        <PropertyRow
          label="Fill"
          value={fill}
        />
      )}

      {props.size && (
        <PropertyRow
          label="Size"
          value={props.size}
        />
      )}

      {props.font && (
        <PropertyRow
          label="Font"
          value={props.font}
        />
      )}

      {text && (
        <div
          style={{
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: '1px solid #f0f0f0',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              color: '#6b7280',
              marginBottom: '5px',
            }}
          >
            Text
          </div>

          <div
            style={{
              fontSize: '14px',
              color: '#111827',
              wordBreak: 'break-word',
            }}
          >
            {text}
          </div>
        </div>
      )}
    </div>
  )
}

function PropertyRow({ label, value }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: '12px',
        padding: '7px 0',
        borderBottom: '1px solid #f3f4f6',
      }}
    >
      <span
        style={{
          fontSize: '13px',
          color: '#6b7280',
        }}
      >
        {label}
      </span>

      <span
        style={{
          fontSize: '13px',
          color: '#111827',
          fontWeight: 500,
          textAlign: 'right',
          maxWidth: '150px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {String(value)}
      </span>
    </div>
  )
}

function GridWrapper() {
  const [selectedShape, setSelectedShape] = useState(null)

  function analyzeSketch() {
    if (!window.editor) return

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

    console.log('Sketch JSON:', jsonData)
  }

  return (
    <>
      <PropertiesPanel
        selectedShape={selectedShape}
      />

      <Tldraw
        components={{
          Grid: CustomGrid,
        }}
        onMount={(editor) => {
          window.editor = editor

          editor.updateInstanceState({
            isGridMode: true,
          })

          const updateSelection = () => {
            const selected =
              editor.getSelectedShapes()

            if (selected.length > 0) {
              setSelectedShape(selected[0])
            } else {
              setSelectedShape(null)
            }
          }

          updateSelection()

          const cleanup = editor.store.listen(
            updateSelection,
            {
              scope: 'document',
            }
          )

          return cleanup
        }}
      />
    </>
  )
}

export default function App() {
  return (
    <div
      style={{
        height: '100vh',
        width: '100%',
      }}
    >
      <GridWrapper />
    </div>
  )
}