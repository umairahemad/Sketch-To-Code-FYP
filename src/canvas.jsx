import { useLayoutEffect, useRef, useState } from 'react'
import {
  Tldraw,
  useEditor,
  useValue,
  useColorMode,
  approximately,
} from 'tldraw'
import 'tldraw/tldraw.css'

const THEME = {
  paper: '#f6f3ec',
  paperRaised: '#efe9db',
  ink: '#1e2129',
  inkSoft: '#585d6b',
  inkFaint: '#8a8f9c',
  line: 'rgba(30, 33, 41, 0.14)',
  lineSoft: 'rgba(30, 33, 41, 0.07)',
  accent: '#d9662b',
  blue: '#2454c7',
  codeBg: '#1e2129',
  codeDark: '#17191f',
  codeText: '#f6f3ec',
}

// ------------------------------------------------------
// CUSTOM CANVAS GRID
// ------------------------------------------------------

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

    const minorColor = isDarkMode
      ? 'rgba(246, 243, 236, 0.10)'
      : 'rgba(30, 33, 41, 0.07)'

    const majorColor = isDarkMode
      ? 'rgba(246, 243, 236, 0.20)'
      : 'rgba(30, 33, 41, 0.14)'

    for (let row = 0; row <= rows; row++) {
      const pageY = startY + row * size
      const canvasY =
        (pageY + camera.y) * camera.z * devicePixelRatio

      const major = approximately(pageY % (size * 5), 0)

      ctx.strokeStyle = major ? majorColor : minorColor

      drawLine(
        ctx,
        0,
        canvasY,
        canvasW,
        canvasY,
        major ? 1.5 : 0.7
      )
    }

    for (let col = 0; col <= cols; col++) {
      const pageX = startX + col * size
      const canvasX =
        (pageX + camera.x) * camera.z * devicePixelRatio

      const major = approximately(pageX % (size * 5), 0)

      ctx.strokeStyle = major ? majorColor : minorColor

      drawLine(
        ctx,
        canvasX,
        0,
        canvasX,
        canvasH,
        major ? 1.5 : 0.7
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

// ------------------------------------------------------
// SELECTED SHAPE PROPERTIES PANEL
// ------------------------------------------------------

function PropertiesPanel({ selectedShape }) {
  if (!selectedShape) return null

  const props = selectedShape.props || {}

  const shapeType = props.geo || selectedShape.type || 'Unknown'

  const width = props.w ? Math.round(props.w) : null
  const height = props.h ? Math.round(props.h) : null

  const color = props.color || null
  const fill = props.fill || null

  const text =
    props.richText?.content
      ?.map((block) =>
        block.content?.map((c) => c.text).join('')
      )
      .join(' ') || props.text || ''

  return (
    <div
      style={{
        position: 'absolute',
        top: 72,
        right: 16,
        width: 250,
        maxWidth: 'calc(100% - 32px)',
        background: THEME.paper,
        border: `1px solid ${THEME.line}`,
        borderRadius: 0,
        margin: 0,
        padding: '18px',
        zIndex: 1000,
        boxShadow: '0 8px 24px rgba(30, 33, 41, 0.08)',
        fontFamily: "'Inter', sans-serif",
        color: THEME.ink,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          paddingBottom: 12,
          borderBottom: `1px solid ${THEME.line}`,
        }}
      >
        <h3
          style={{
            margin: 0,
            fontFamily: "'Fraunces', Georgia, serif",
            fontSize: 19,
            fontWeight: 600,
            color: THEME.ink,
          }}
        >
          Properties
        </h3>

        <span
          style={{
            color: THEME.accent,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          Selected
        </span>
      </div>

      <PropertyRow label="Type" value={shapeType} />
      <PropertyRow label="X" value={Math.round(selectedShape.x)} />
      <PropertyRow label="Y" value={Math.round(selectedShape.y)} />

      {width !== null && (
        <PropertyRow label="Width" value={width} />
      )}

      {height !== null && (
        <PropertyRow label="Height" value={height} />
      )}

      {color && <PropertyRow label="Color" value={color} />}
      {fill && <PropertyRow label="Fill" value={fill} />}

      {props.size && (
        <PropertyRow label="Size" value={props.size} />
      )}

      {props.font && (
        <PropertyRow label="Font" value={props.font} />
      )}

      {text && (
        <div
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: `1px solid ${THEME.line}`,
          }}
        >
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              color: THEME.inkSoft,
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            Text
          </div>

          <div
            style={{
              fontSize: 13,
              lineHeight: 1.5,
              color: THEME.ink,
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
        gap: 12,
        padding: '8px 0',
        borderBottom: `1px solid ${THEME.lineSoft}`,
      }}
    >
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          color: THEME.inkSoft,
        }}
      >
        {label}
      </span>

      <span
        style={{
          fontSize: 12,
          color: THEME.ink,
          fontWeight: 500,
          textAlign: 'right',
          maxWidth: 145,
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

// ------------------------------------------------------
// MAIN CANVAS WORKSPACE
// ------------------------------------------------------

function GridWrapper() {
  const [selectedShape, setSelectedShape] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [generatedData, setGeneratedData] = useState({
    html: '',
    css: '',
  })

  // Generate HTML and CSS using the existing backend.
  const handleGenerateClick = async () => {
    if (!window.editor) {
      alert('Canvas is not ready. Please try again.')
      return
    }

    const shapes = window.editor.getCurrentPageShapes()

    if (shapes.length === 0) {
      alert('Please draw your UI layout first!')
      return
    }

    const sketchData = shapes.map((shape) => ({
      type: shape.type,
      shapeType: shape.props?.geo || null,
      x: Math.round(shape.x),
      y: Math.round(shape.y),
      width: Math.round(shape.props?.w || 0),
      height: Math.round(shape.props?.h || 0),
      text:
        shape.props?.text ||
        shape.props?.richText?.content
          ?.map((block) =>
            block.content?.map((c) => c.text).join('')
          )
          .join(' ') ||
        '',
    }))

    setIsGenerating(true)

    try {
      const response = await fetch(
        'http://localhost:8000/api/generate-code',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sketch_data: sketchData,
          }),
        }
      )

      if (!response.ok) {
        let message = `Request failed (${response.status})`

        try {
          const errorData = await response.json()
          message =
            errorData.detail ||
            errorData.message ||
            message
        } catch {
          // Keep the HTTP status message if the response isn't JSON.
        }

        throw new Error(message)
      }

      const result = await response.json()

      const html = result.data?.html
      const css = result.data?.css

      if (typeof html !== 'string' || typeof css !== 'string') {
        throw new Error(
          'The backend response did not contain valid HTML and CSS.'
        )
      }

      setGeneratedData({ html, css })
      setIsPanelOpen(true)
    } catch (error) {
      console.error('Generation failed:', error)

      alert(
        `Code generation failed: ${
          error.message || 'Please check your backend connection.'
        }`
      )
    } finally {
      setIsGenerating(false)
    }
  }

  const handleHtmlChange = (e) => {
    setGeneratedData((prev) => ({
      ...prev,
      html: e.target.value,
    }))
  }

  const handleCssChange = (e) => {
    setGeneratedData((prev) => ({
      ...prev,
      css: e.target.value,
    }))
  }

  const copyToClipboard = async () => {
    const combinedCode =
      `<style>\n${generatedData.css}\n</style>\n\n` +
      generatedData.html

    try {
      await navigator.clipboard.writeText(combinedCode)
      alert('Code copied to clipboard!')
    } catch (error) {
      console.error('Clipboard copy failed:', error)
      alert(
        'Could not copy automatically. Please select and copy the code manually.'
      )
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
        background: THEME.paper,
        color: THEME.ink,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* LEFT: CANVAS */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          position: 'relative',
          overflow: 'hidden',
          background: THEME.paper,
        }}
      >
        <PropertiesPanel selectedShape={selectedShape} />

        {/* Generate button */}
        <button
          type="button"
          onClick={handleGenerateClick}
          disabled={isGenerating}
          style={{
            position: 'absolute',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 9,
            padding: '12px 24px',
            backgroundColor: isGenerating
              ? THEME.inkSoft
              : THEME.ink,
            color: THEME.paper,
            border: `1px solid ${THEME.accent}`,
            borderRadius: 0,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: 0.4,
            cursor: isGenerating ? 'wait' : 'pointer',
            boxShadow: '0 4px 12px rgba(30, 33, 41, 0.12)',
            transition: 'background-color 0.2s ease',
            fontFamily: "'JetBrains Mono', monospace",
            opacity: isGenerating ? 0.85 : 1,
          }}
        >
          {isGenerating
            ? '⏳ PROCESSING...'
            : '✦ GENERATE CODE'}
        </button>

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
              const selected = editor.getSelectedShapes()

              setSelectedShape(
                selected.length > 0 ? selected[0] : null
              )
            }

            updateSelection()

            const cleanup = editor.store.listen(
              updateSelection,
              { scope: 'document' }
            )

            return cleanup
          }}
        />
      </div>

      {/* RIGHT: GENERATED CODE WORKSPACE */}
      {isPanelOpen && (
        <div
          style={{
            width: '45%',
            minWidth: 420,
            maxWidth: 760,
            height: '100%',
            minHeight: 0,
            backgroundColor: THEME.codeBg,
            borderLeft: `1px solid ${THEME.line}`,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '-8px 0 24px rgba(30, 33, 41, 0.10)',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {/* Panel header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
              padding: '16px 20px',
              backgroundColor: '#292c35',
              borderBottom: '1px solid rgba(246, 243, 236, 0.16)',
            }}
          >
            <div>
              <div
                style={{
                  color: THEME.paper,
                  fontFamily: "'Fraunces', Georgia, serif",
                  fontSize: 19,
                  fontWeight: 600,
                }}
              >
                Developer Environment
              </div>

              <div
                style={{
                  marginTop: 4,
                  color: '#a6a8b0',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  letterSpacing: 0.7,
                  textTransform: 'uppercase',
                }}
              >
                HTML / CSS · Live Preview
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={copyToClipboard}
                style={{
                  padding: '8px 12px',
                  backgroundColor: THEME.accent,
                  color: '#ffffff',
                  border: `1px solid ${THEME.accent}`,
                  borderRadius: 0,
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                COPY CODE
              </button>

              <button
                type="button"
                onClick={() => setIsPanelOpen(false)}
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'transparent',
                  color: THEME.paper,
                  border: '1px solid #585d6b',
                  borderRadius: 0,
                  cursor: 'pointer',
                  fontSize: 11,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                CLOSE
              </button>
            </div>
          </div>

          {/* Live preview */}
          <div
            style={{
              flex: '0 0 43%',
              minHeight: 150,
              backgroundColor: '#ffffff',
              position: 'relative',
              borderBottom:
                '1px solid rgba(246, 243, 236, 0.16)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 10,
                left: 12,
                backgroundColor: THEME.ink,
                color: THEME.paper,
                padding: '5px 9px',
                borderLeft: `2px solid ${THEME.accent}`,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                letterSpacing: 0.5,
                zIndex: 10,
              }}
            >
              LIVE PREVIEW
            </div>

            <iframe
              title="Generated UI Live Preview"
              sandbox="allow-scripts"
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                background: '#ffffff',
              }}
              srcDoc={`
                <!DOCTYPE html>
                <html lang="en">
                  <head>
                    <meta charset="UTF-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                    <style>
                      * { box-sizing: border-box; }
                      html, body { margin: 0; min-height: 100%; }
                      body { background: #ffffff; }
                      ${generatedData.css}
                    </style>
                  </head>
                  <body>
                    ${generatedData.html}
                  </body>
                </html>
              `}
            />
          </div>

          {/* HTML and CSS editors */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              padding: 14,
              gap: 14,
              backgroundColor: THEME.codeDark,
            }}
          >
            {/* HTML editor */}
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <label
                style={{
                  color: '#7fa3ff',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  fontWeight: 600,
                  marginBottom: 9,
                  letterSpacing: 1,
                }}
              >
                HTML
              </label>

              <textarea
                aria-label="Generated HTML"
                value={generatedData.html}
                onChange={handleHtmlChange}
                spellCheck={false}
                style={{
                  flex: 1,
                  width: '100%',
                  minHeight: 100,
                  backgroundColor: THEME.codeBg,
                  color: THEME.codeText,
                  padding: 12,
                  borderRadius: 0,
                  border: '1px solid rgba(246, 243, 236, 0.16)',
                  borderTop: '2px solid #7fa3ff',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12,
                  resize: 'none',
                  outline: 'none',
                  lineHeight: 1.65,
                  tabSize: 2,
                }}
              />
            </div>

            {/* CSS editor */}
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <label
                style={{
                  color: '#e8a86c',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  fontWeight: 600,
                  marginBottom: 9,
                  letterSpacing: 1,
                }}
              >
                CSS
              </label>

              <textarea
                aria-label="Generated CSS"
                value={generatedData.css}
                onChange={handleCssChange}
                spellCheck={false}
                style={{
                  flex: 1,
                  width: '100%',
                  minHeight: 100,
                  backgroundColor: THEME.codeBg,
                  color: THEME.codeText,
                  padding: 12,
                  borderRadius: 0,
                  border: '1px solid rgba(246, 243, 236, 0.16)',
                  borderTop: '2px solid #e8a86c',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12,
                  resize: 'none',
                  outline: 'none',
                  lineHeight: 1.65,
                  tabSize: 2,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------
// APP ENTRY
// ------------------------------------------------------

export default function App() {
  return (
    <div
      style={{
        height: '100vh',
        width: '100%',
        overflow: 'hidden',
        backgroundColor: THEME.paper,
      }}
    >
      <GridWrapper />
    </div>
  )
}