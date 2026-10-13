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
      const canvasY = (pageY + camera.y) * camera.z * devicePixelRatio
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
      const canvasX = (pageX + camera.x) * camera.z * devicePixelRatio
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
  }, [screenBounds, camera, size, devicePixelRatio, editor, isDarkMode])

  return (
    <canvas
      ref={canvasRef}
      className="tl-grid"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
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

      <div style={{ flex: 1 }} />

      <button
        onClick={onGenerate}
        disabled={isGenerating}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 16px',
          background: isGenerating ? '#4b5563' : '#6366f1',
          color: '#ffffff',
          border: 'none',
          borderRadius: 5,
          fontSize: 13,
          fontWeight: 600,
          cursor: isGenerating ? 'wait' : 'pointer',
          fontFamily: 'inherit',
        }}
      >
        {isGenerating ? 'Generating...' : 'Generate Code'}
      </button>
    </div>
  )
}

function ToolbarIconButton({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 10px',
        background: 'transparent',
        border: 'none',
        borderRadius: 4,
        color: '#d1d5db',
        fontSize: 13,
        fontFamily: 'inherit',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#2d2d2d'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
      }}
    >
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span>{label}</span>
    </button>
  )
}


// ============================================================
// DRAGGABLE PROPERTIES PANEL
// ============================================================

function PropertiesPanel({ shapeId }) {
  const [shape, setShape] = useState(null)
  const [pos, setPos] = useState({ x: 16, y: 16 })
  const dragRef = useRef(null)

  useLayoutEffect(() => {
    if (!shapeId || !window.editor) {
      setShape(null)
      return
    }
    const update = () => {
      const s = window.editor.getShape(shapeId)
      setShape(s || null)
    }
    update()
    const cleanup = window.editor.store.listen(update, { scope: 'document' })
    return cleanup
  }, [shapeId])

  const handleDragStart = (e) => {
    e.preventDefault()
    e.stopPropagation()
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
    }
    const handleMouseMove = (ev) => {
      if (!dragRef.current) return
      const dx = ev.clientX - dragRef.current.startX
      const dy = ev.clientY - dragRef.current.startY
      setPos({
        x: Math.max(0, dragRef.current.origX + dx),
        y: Math.max(0, dragRef.current.origY + dy),
      })
    }
    const handleMouseUp = () => {
      dragRef.current = null
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  if (!shape) return null

  const props = shape.props || {}
  const shapeType = props.geo || shape.type || 'Unknown'
  const width = props.w ? Math.round(props.w) : null
  const height = props.h ? Math.round(props.h) : null
  const color = props.color || null
  const fill = props.fill || null
  const elementType = shape.meta?.elementType || null
  const elementText = shape.meta?.elementText || null

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

      <div style={{ padding: '12px 14px' }}>
        <PropertyRow label="Type" value={shapeType} />
        {elementType && <PropertyRow label="Element" value={elementType} />}
        {elementText && <PropertyRow label="Text" value={elementText} />}
        <PropertyRow label="X" value={Math.round(shape.x)} />
        <PropertyRow label="Y" value={Math.round(shape.y)} />
        {width !== null && <PropertyRow label="Width" value={width} />}
        {height !== null && <PropertyRow label="Height" value={height} />}
        {color && <PropertyRow label="Color" value={color} />}
        {fill && <PropertyRow label="Fill" value={fill} />}

        {text && !elementText && (
          <div
            style={{
              fontSize: 13,
              lineHeight: 1.5,
              color: THEME.ink,
              wordBreak: 'break-word',
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: '#6b7280',
                marginBottom: 4,
                textTransform: 'uppercase',
              }}
            >
              Canvas Text
            </div>
            <div
              style={{
                fontSize: 13,
                color: '#111827',
                wordBreak: 'break-word',
              }}
            >
              {text}
            </div>
          </div>
        )}
      </div>
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
      <span style={{ fontSize: 12, color: '#6b7280' }}>{label}</span>
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

  const hasButtonInCategory = ELEMENT_TYPES[activeCategory].some((el) =>
    BUTTON_TYPES.includes(el.id)
  )

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

      <div style={{ display: 'flex', minHeight: 250 }}>
        <div
          style={{
            width: 175,
            padding: 8,
            background: '#f9fafb',
            borderRight: '1px solid #e5e7eb',
          }}
        >
          {Object.keys(ELEMENT_TYPES).map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              style={{
                width: '100%',
                padding: '8px',
                marginBottom: 4,
                border: 'none',
                borderRadius: 5,
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: activeCategory === category ? 600 : 400,
                color: activeCategory === category ? '#4f46e5' : '#374151',
                background:
                  activeCategory === category ? '#eef2ff' : 'transparent',
                fontFamily: 'inherit',
              }}
            >
              {category}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, padding: 10, background: '#ffffff' }}>
          {ELEMENT_TYPES[activeCategory].map((element) => (
            <button
              key={element.id}
              onClick={() => onSelect(element, innerText)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                marginBottom: 2,
                border: 'none',
                borderRadius: 5,
                background: 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f3f4f6'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <span style={{ fontSize: 16, width: 22 }}>{element.icon}</span>
              <span style={{ fontSize: 13, color: '#111827' }}>
                {element.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}


// ============================================================
// CONTEXT MENU
// ============================================================

function ContextMenu({
  x,
  y,
  onClose,
  onAssignType,
  onClearType,
  elementType,
}) {
  const menuRef = useRef(null)

  useLayoutEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: y,
        left: x,
        width: 220,
        background: '#ffffff',
        border: '1px solid #d1d5db',
        borderRadius: 6,
        boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
        zIndex: 9999,
        padding: 4,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <button
        onClick={onAssignType}
        style={{
          width: '100%',
          padding: '9px 12px',
          border: 'none',
          borderRadius: 4,
          background: 'transparent',
          cursor: 'pointer',
          textAlign: 'left',
          fontSize: 13,
          color: '#111827',
          fontFamily: 'inherit',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#f3f4f6'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent'
        }}
      >
        🏷️ Assign Element Type
        {elementType ? ` (${elementType})` : ''}
      </button>

      {elementType && (
        <button
          onClick={onClearType}
          style={{
            width: '100%',
            padding: '9px 12px',
            border: 'none',
            borderRadius: 4,
            background: 'transparent',
            cursor: 'pointer',
            textAlign: 'left',
            fontSize: 13,
            color: '#dc2626',
            fontFamily: 'inherit',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#fef2f2'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
          }}
        >
          ✕ Clear Element Type
        </button>
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
      <div
        style={{
          height: 56,
          background: '#1e1e1e',
          borderBottom: '1px solid #2d2d2d',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: '#e5e7eb',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          <span style={{ fontSize: 18 }}>👁️</span>
          <span>Full Screen Preview</span>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ color: '#9ca3af', fontSize: 12 }}>
            Press ESC to close
          </span>
          <button
            onClick={onClose}
            style={{
              padding: '7px 16px',
              background: '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            ✕ Close
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', background: '#ffffff' }}>
        <iframe
          title="Full Screen Preview"
          style={{ width: '100%', height: '100%', border: 'none' }}
          srcDoc={`
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <style>
                  * { box-sizing: border-box; }
                  html, body {
                    margin: 0;
                    padding: 0;
                    width: 100%;
                    min-height: 100vh;
                    background: #ffffff;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    -webkit-font-smoothing: antialiased;
                    overflow-x: hidden;
                  }
                  /* ✅ Full page — no card look */
                  .canvas-root {
                    width: 100% !important;
                    min-height: 100vh !important;
                    margin: 0 !important;
                    padding: 20px !important;
                  }
                  ${css}
                </style>
              </head>
              <body>
                ${html}
              </body>
            </html>
          `}
        />
      </div>
    </div>
  )
}


// ============================================================
// MAIN GRID WRAPPER
// ============================================================

function GridWrapper() {
  const [selectedShapeId, setSelectedShapeId] = useState(null)
  const [contextMenu, setContextMenu] = useState(null)
  const [elementTypeMenu, setElementTypeMenu] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [generatedData, setGeneratedData] = useState({ html: '', css: '' })


  const assignElementType = (element, innerText = '') => {
    if (!window.editor) return
    const selected = window.editor.getSelectedShapes()
    if (selected.length === 0) return

    const shape = selected[0]
    const isButton = BUTTON_TYPES.includes(element.id)

    console.log(
      `🎯 Assigning: ${shape.id} | type: ${element.id}` +
        (isButton ? ` | text: "${innerText}"` : '')
    )

    window.editor.updateShapes([
      {
        id: shape.id,
        type: shape.type,
        meta: {
          ...(shape.meta || {}),
          elementType: element.id,
          elementText: isButton ? innerText || null : null,
        },
      },
    ])

    setElementTypeMenu(null)
    setContextMenu(null)
  }


  const clearElementType = () => {
    if (!window.editor) return
    const selected = window.editor.getSelectedShapes()
    if (selected.length === 0) return
    const shape = selected[0]

    const newMeta = {}
    if (shape.meta) {
      for (const key of Object.keys(shape.meta)) {
        if (key !== 'elementType' && key !== 'elementText') {
          newMeta[key] = shape.meta[key]
        }
      }
    }
    newMeta.elementType = null
    newMeta.elementText = null

    window.editor.updateShapes([
      { id: shape.id, type: shape.type, meta: newMeta },
    ])
    setContextMenu(null)
  }


  const handleCanvasContextMenu = (event) => {
    if (!window.editor) return
    const point = window.editor.screenToPage({
      x: event.clientX,
      y: event.clientY,
    })

    let shapeAtPoint = null
    try {
      shapeAtPoint = window.editor.getShapeAtPoint(point, {
        hitInside: true,
        hitLocked: false,
        hitLabels: true,
        margin: 8,
      })
    } catch (err) {}

    if (!shapeAtPoint && selectedShapeId) {
      const selectedShape = window.editor.getShape(selectedShapeId)
      if (selectedShape) {
        const bounds = window.editor.getShapePageBounds(selectedShapeId)
        if (bounds && bounds.containsPoint(point)) {
          shapeAtPoint = selectedShape
        }
      }
    }

    if (!shapeAtPoint) {
      setContextMenu(null)
      setElementTypeMenu(null)
      return
    }

    event.preventDefault()
    event.stopPropagation()

    window.editor.setSelectedShapes([shapeAtPoint.id])
    setSelectedShapeId(shapeAtPoint.id)
    setElementTypeMenu(null)
    setContextMenu({ x: event.clientX, y: event.clientY })
  }


  const handleSaveToFile = () => {
    if (!window.editor) return
    try {
      const snapshot = window.editor.getSnapshot()
      const shapes = window.editor.getCurrentPageShapes()
      const metaMap = {}

      for (const shape of shapes) {
        if (shape.meta && Object.keys(shape.meta).length > 0) {
          const cleanedMeta = {}
          for (const [k, v] of Object.entries(shape.meta)) {
            if (v !== null && v !== undefined && v !== '') {
              cleanedMeta[k] = v
            }
          }
          if (Object.keys(cleanedMeta).length > 0) {
            metaMap[shape.id] = cleanedMeta
          }
        }
      }

      console.log('💾 Saving', Object.keys(metaMap).length, 'meta entries')

      const fullData = {
        version: 2,
        savedAt: new Date().toISOString(),
        snapshot,
        meta: metaMap,
      }

      const json = JSON.stringify(fullData, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `sketch-${Date.now()}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Save error:', err)
      alert('Save failed: ' + err.message)
    }
  }


  const handleLoadFromFile = () => {
    if (!window.editor) return
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'
    input.onchange = async (event) => {
      const file = event.target.files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const parsed = JSON.parse(text)

        let snapshot, metaMap
        if (parsed.snapshot && parsed.meta) {
          snapshot = parsed.snapshot
          metaMap = parsed.meta
          console.log('📦 Loading v2 format (with meta)')
        } else {
          snapshot = parsed
          metaMap = null
          console.log('📦 Loading v1 format')
        }

        window.editor.loadSnapshot(snapshot)
        window.editor.zoomToFit()

        if (metaMap && Object.keys(metaMap).length > 0) {
          console.log('🔧 Restoring meta for', Object.keys(metaMap).length, 'shapes')
          setTimeout(() => {
            const updates = []
            for (const [shapeId, meta] of Object.entries(metaMap)) {
              const shape = window.editor.getShape(shapeId)
              if (shape) {
                updates.push({ id: shapeId, type: shape.type, meta })
              }
            }
            if (updates.length > 0) {
              window.editor.updateShapes(updates)
              console.log('✅ Restored meta for', updates.length, 'shapes')
            }
          }, 150)
        }

        setSelectedShapeId(null)
        setContextMenu(null)
        setElementTypeMenu(null)
      } catch (err) {
        console.error('Load error:', err)
        alert('Load failed: ' + err.message)
      }
    }
    input.click()
  }


  const handleNewSketch = () => {
    if (!window.editor) return
    const confirmed = window.confirm(
      'Clear the canvas and start a new sketch? Unsaved changes will be lost.'
    )
    if (!confirmed) return
    const shapeIds = window.editor.getCurrentPageShapeIds()
    window.editor.deleteShapes([...shapeIds])
    setSelectedShapeId(null)
    setContextMenu(null)
    setElementTypeMenu(null)
    setGeneratedData({ html: '', css: '' })
    setIsPanelOpen(false)
  }


  const handleGenerateClick = async () => {
    if (!window.editor) return
    const shapes = window.editor.getCurrentPageShapes()
    if (shapes.length === 0) {
      alert('Please draw your UI layout first!')
      return
    }

    setIsGenerating(true)

    const getShapeText = (shape) => {
      if (shape.props?.text) return String(shape.props.text)
      return (
        shape.props?.richText?.content
          ?.map((b) => b.content?.map((c) => c.text).join(''))
          .join(' ') || ''
      )
    }

    const pageRootShape = shapes.find(
      (s) => s.meta?.elementType === 'page-root'
    )

    const includedShapes = shapes.filter(
      (s) => s.meta?.elementType !== 'page-root'
    )

    const sketchData = []
    for (const shape of includedShapes) {
      const w = Math.round(shape.props?.w || 0)
      const h = Math.round(shape.props?.h || 0)
      const elementType = shape.meta?.elementType || null
      const isButton = elementType && BUTTON_TYPES.includes(elementType)

      let finalText = ''
      if (isButton) {
        finalText = (shape.meta?.elementText || '').trim()
      } else {
        finalText = getShapeText(shape).trim()
      }

      sketchData.push({
        id: shape.id,
        type: shape.type,
        shapeType: shape.props?.geo || (shape.type === 'text' ? 'text' : null),
        x: Math.round(shape.x),
        y: Math.round(shape.y),
        width: w,
        height: h,
        color: shape.props?.color || 'black',
        fill: shape.props?.fill || 'none',
        text: finalText,
        elementType,
      })
    }

    let canvasBounds
    if (pageRootShape) {
      canvasBounds = {
        minX: Math.round(pageRootShape.x),
        minY: Math.round(pageRootShape.y),
        maxX: Math.round(pageRootShape.x + (pageRootShape.props?.w || 0)),
        maxY: Math.round(pageRootShape.y + (pageRootShape.props?.h || 0)),
        width: Math.round(pageRootShape.props?.w || 0),
        height: Math.round(pageRootShape.props?.h || 0),
        hasPageRoot: true,
        pageRootId: pageRootShape.id,
        pageRootColor: pageRootShape.props?.color || 'black',
        pageRootFill: pageRootShape.props?.fill || 'none',
      }
    } else {
      let minX = Infinity, minY = Infinity
      let maxX = -Infinity, maxY = -Infinity
      for (const shape of shapes) {
        const w = shape.props?.w || 0
        const h = shape.props?.h || 0
        minX = Math.min(minX, shape.x)
        minY = Math.min(minY, shape.y)
        maxX = Math.max(maxX, shape.x + w)
        maxY = Math.max(maxY, shape.y + h)
      }
      canvasBounds = {
        minX: Math.round(minX),
        minY: Math.round(minY),
        maxX: Math.round(maxX),
        maxY: Math.round(maxY),
        width: Math.round(maxX - minX),
        height: Math.round(maxY - minY),
        hasPageRoot: false,
      }
    }

    console.log('📤 Sketch data:', sketchData)
    console.log('📐 Canvas bounds:', canvasBounds)

    try {
      const response = await fetch(
        'http://localhost:8000/api/generate-code',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sketch_data: sketchData,
            canvas_bounds: canvasBounds,
          }),
        }
      )

      if (!response.ok) throw new Error('Backend connection failed')
      const result = await response.json()
      if (result.status === 'error') {
        throw new Error(result.message || 'Generation failed')
      }

      setGeneratedData({
        html: result.data.html,
        css: result.data.css,
      })
      setIsPanelOpen(true)
    } catch (error) {
      console.error('Generation failed:', error)
      alert('Real Error: ' + error.message)
    } finally {
      setIsGenerating(false)
    }
  }


  const handleHtmlChange = (e) =>
    setGeneratedData((prev) => ({ ...prev, html: e.target.value }))

  const handleCssChange = (e) =>
    setGeneratedData((prev) => ({ ...prev, css: e.target.value }))

  const copyToClipboard = () => {
    const combined = `<style>\n${generatedData.css}\n</style>\n\n${generatedData.html}`
    navigator.clipboard.writeText(combined)
    alert('Code copied to clipboard!')
  }


  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <TopToolbar
        onSave={handleSaveToFile}
        onLoad={handleLoadFromFile}
        onNew={handleNewSketch}
        onGenerate={handleGenerateClick}
        isGenerating={isGenerating}
      />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* CANVAS */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
          }}
          onContextMenu={handleCanvasContextMenu}
        >
          <PropertiesPanel shapeId={selectedShapeId} />

          <Tldraw
            persistenceKey="sketch-to-code-canvas"
            components={{ Grid: CustomGrid }}
            onMount={(editor) => {
              window.editor = editor
              console.log('✅ Editor mounted')
              editor.updateInstanceState({ isGridMode: true })

              const updateSelection = () => {
                const selected = editor.getSelectedShapes()
                if (selected.length > 0) {
                  setSelectedShapeId(selected[0].id)
                } else {
                  setSelectedShapeId(null)
                  setContextMenu(null)
                  setElementTypeMenu(null)
                }
              }
              updateSelection()
              const cleanup = editor.store.listen(updateSelection, {
                scope: 'document',
              })
              return cleanup
            }}
          />

          {contextMenu && selectedShapeId && (
            <ContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              onClose={() => setContextMenu(null)}
              onAssignType={() => {
                const currentShape = window.editor?.getShape(selectedShapeId)
                setElementTypeMenu({
                  x: contextMenu.x + 235,
                  y: contextMenu.y,
                  currentText: currentShape?.meta?.elementText || '',
                })
                setContextMenu(null)
              }}
              onClearType={clearElementType}
              elementType={
                window.editor?.getShape(selectedShapeId)?.meta
                  ?.elementType || null
              }
            />
          )}

          {elementTypeMenu && (
            <ElementTypeMenu
              x={elementTypeMenu.x}
              y={elementTypeMenu.y}
              currentText={elementTypeMenu.currentText}
              onClose={() => setElementTypeMenu(null)}
              onSelect={assignElementType}
            />
          )}

          {!selectedShapeId && (
            <div
              style={{
                position: 'absolute',
                bottom: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.75)',
                color: 'white',
                padding: '8px 16px',
                borderRadius: 6,
                fontSize: 12,
                zIndex: 100,
                pointerEvents: 'none',
              }}
            >
              💡 Tip: Draw a big rectangle first and assign it as "Page Root"
            </div>
          )}
        </div>

        {/* IDE PANEL */}
        {isPanelOpen && (
          <div
            style={{
              width: '45vw',
              minWidth: '500px',
              height: '100%',
              backgroundColor: '#1e1e1e',
              borderLeft: '1px solid #2d2d2d',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 16px',
                backgroundColor: '#252526',
                borderBottom: '1px solid #2d2d2d',
              }}
            >
              <h2
                style={{
                  margin: 0,
                  color: '#e5e7eb',
                  fontSize: 13,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}
              >
                Developer Environment
              </h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setIsFullscreen(true)}
                  style={{
                    padding: '5px 12px',
                    backgroundColor: '#3b82f6',
                    color: '#ffffff',
                    border: '1px solid #2563eb',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: 12,
                    fontFamily: 'inherit',
                    fontWeight: 600,
                  }}
                >
                  👁️ Fullscreen
                </button>
                <button
                  onClick={copyToClipboard}
                  style={{
                    padding: '5px 12px',
                    backgroundColor: '#2d2d2d',
                    color: '#e5e7eb',
                    border: '1px solid #3d3d3d',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: 12,
                    fontFamily: 'inherit',
                  }}
                >
                  Copy
                </button>
                <button
                  onClick={() => setIsPanelOpen(false)}
                  style={{
                    padding: '5px 12px',
                    backgroundColor: 'transparent',
                    color: '#9ca3af',
                    border: '1px solid #3d3d3d',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: 12,
                    fontFamily: 'inherit',
                  }}
                >
                  Close
                </button>
              </div>
            </div>

            {/* LIVE PREVIEW — FULL PAGE */}
            <div
              style={{
                flex: '0 0 45%',
                backgroundColor: '#ffffff',
                position: 'relative',
                borderBottom: '1px solid #2d2d2d',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 6,
                  left: 10,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  color: '#ffffff',
                  padding: '2px 8px',
                  borderRadius: 3,
                  fontSize: 11,
                  zIndex: 10,
                  fontFamily: 'inherit',
                }}
              >
                Live Preview
              </div>

              <iframe
                title="Live Preview"
                style={{ width: '100%', height: '100%', border: 'none' }}
                srcDoc={`
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <meta charset="UTF-8" />
                      <style>
                        * { box-sizing: border-box; }
                        html, body {
                          margin: 0;
                          padding: 0;
                          width: 100%;
                          min-height: 100vh;
                          background: #ffffff;
                          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                          overflow: auto;
                        }
                        /* ✅ Full page — no card look */
                        .canvas-root {
                          width: 100% !important;
                          min-height: 100vh !important;
                          margin: 0 !important;
                          padding: 20px !important;
                        }
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

            <div
              style={{
                flex: 1,
                display: 'flex',
                padding: 12,
                gap: 12,
                backgroundColor: '#1e1e1e',
                minHeight: 0,
              }}
            >
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 0,
                }}
              >
                <label
                  style={{
                    color: '#38bdf8',
                    fontSize: 11,
                    fontWeight: 700,
                    marginBottom: 6,
                    textTransform: 'uppercase',
                  }}
                >
                  HTML
                </label>
                <textarea
                  value={generatedData.html}
                  onChange={handleHtmlChange}
                  spellCheck="false"
                  style={{
                    flex: 1,
                    backgroundColor: '#252526',
                    color: '#e2e8f0',
                    padding: 12,
                    borderRadius: 4,
                    border: '1px solid #3d3d3d',
                    fontFamily:
                      'Menlo, Monaco, Consolas, "Courier New", monospace',
                    fontSize: 12,
                    resize: 'none',
                    outline: 'none',
                    lineHeight: 1.5,
                  }}
                />
              </div>

              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 0,
                }}
              >
                <label
                  style={{
                    color: '#a78bfa',
                    fontSize: 11,
                    fontWeight: 700,
                    marginBottom: 6,
                    textTransform: 'uppercase',
                  }}
                >
                  CSS
                </label>
                <textarea
                  value={generatedData.css}
                  onChange={handleCssChange}
                  spellCheck="false"
                  style={{
                    flex: 1,
                    backgroundColor: '#252526',
                    color: '#e2e8f0',
                    padding: 12,
                    borderRadius: 4,
                    border: '1px solid #3d3d3d',
                    fontFamily:
                      'Menlo, Monaco, Consolas, "Courier New", monospace',
                    fontSize: 12,
                    resize: 'none',
                    outline: 'none',
                    lineHeight: 1.5,
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FULLSCREEN PREVIEW MODAL */}
      {isFullscreen && (
        <FullscreenPreview
          html={generatedData.html}
          css={generatedData.css}
          onClose={() => setIsFullscreen(false)}
        />
      )}
    </div>
  )
}


// ============================================================
// APP
// ============================================================

export default function App() {
  return (
    <div style={{ height: '100vh', width: '100%', margin: 0 }}>
      <GridWrapper />
    </div>
  )
}