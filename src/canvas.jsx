import { useLayoutEffect, useRef, useState } from 'react'
import {
  Tldraw,
  useEditor,
  useValue,
  useColorMode,
  approximately,
} from 'tldraw'
import 'tldraw/tldraw.css'


// ============================================================
// ELEMENT TYPES
// ============================================================

const ELEMENT_TYPES = {
  'Input Controls': [
    { id: 'text-input', name: 'Text Input', icon: '📝' },
    { id: 'textarea', name: 'Textarea', icon: '📄' },
    { id: 'checkbox', name: 'Checkbox', icon: '☑️' },
    { id: 'radio', name: 'Radio Button', icon: '🔘' },
    { id: 'dropdown', name: 'Dropdown Menu', icon: '📋' },
    { id: 'toggle', name: 'Toggle Switch', icon: '🔀' },
    { id: 'slider', name: 'Slider', icon: '🎚️' },
    { id: 'date-picker', name: 'Date Picker', icon: '📅' },
    { id: 'file-upload', name: 'File Upload', icon: '📤' },
  ],

  'Buttons': [
    { id: 'primary-button', name: 'Primary Button', icon: '🔵' },
    { id: 'secondary-button', name: 'Secondary Button', icon: '⚪' },
    { id: 'icon-button', name: 'Icon Button', icon: '🔍' },
    { id: 'fab', name: 'Floating Action Button', icon: '➕' },
  ],

  'Navigation': [
    { id: 'navbar', name: 'Navigation Bar', icon: '🧭' },
    { id: 'tabs', name: 'Tabs', icon: '📑' },
    { id: 'breadcrumbs', name: 'Breadcrumbs', icon: '📍' },
    { id: 'pagination', name: 'Pagination', icon: '🔢' },
    { id: 'sidebar', name: 'Sidebar / Drawer', icon: '📱' },
  ],

  'Visual Elements': [
    { id: 'card', name: 'Card', icon: '🃏' },
    { id: 'avatar', name: 'Avatar', icon: '👤' },
    { id: 'badge', name: 'Badge / Chip', icon: '🏷️' },
    { id: 'accordion', name: 'Accordion', icon: '📚' },
    { id: 'tooltip', name: 'Tooltip', icon: '💬' },
    { id: 'progress-bar', name: 'Progress Bar', icon: '📊' },
    { id: 'modal', name: 'Modal / Dialog', icon: '🪟' },
    { id: 'toast', name: 'Toast / Snackbar', icon: '🔔' },
  ],
}


// ============================================================
// CUSTOM GRID
// ============================================================

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


// ============================================================
// PROPERTIES PANEL
// ============================================================

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

  // NEW: assigned semantic element type
  const elementType = selectedShape.meta?.elementType || null

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

      {/* NEW: Element Type */}
      {elementType && (
        <PropertyRow
          label="Element"
          value={elementType}
        />
      )}

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


// ============================================================
// PROPERTY ROW
// ============================================================

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


// ============================================================
// ELEMENT TYPE MENU
// ============================================================

function ElementTypeMenu({
  x,
  y,
  onClose,
  onSelect,
}) {
  const [activeCategory, setActiveCategory] = useState(
    Object.keys(ELEMENT_TYPES)[0]
  )

  const menuRef = useRef(null)

  useLayoutEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        onClose()
      }
    }

    document.addEventListener(
      'mousedown',
      handleClickOutside
    )

    return () => {
      document.removeEventListener(
        'mousedown',
        handleClickOutside
      )
    }
  }, [onClose])

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: y,
        left: x,
        width: 430,
        background: '#ffffff',
        border: '1px solid #d1d5db',
        borderRadius: 10,
        boxShadow: '0 12px 35px rgba(0,0,0,0.18)',
        zIndex: 10000,
        overflow: 'hidden',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      {/* Header */}

      <div
        style={{
          padding: '13px 16px',
          fontWeight: 600,
          fontSize: 14,
          color: '#111827',
          borderBottom: '1px solid #e5e7eb',
          background: '#f9fafb',
        }}
      >
        Assign Element Type
      </div>

      {/* Body */}

      <div
        style={{
          display: 'flex',
          minHeight: 250,
        }}
      >
        {/* Categories */}

        <div
          style={{
            width: 155,
            padding: 8,
            background: '#f9fafb',
            borderRight: '1px solid #e5e7eb',
          }}
        >
          {Object.keys(ELEMENT_TYPES).map(
            (category) => (
              <button
                key={category}
                onClick={() =>
                  setActiveCategory(category)
                }
                style={{
                  width: '100%',
                  padding: '9px 8px',
                  marginBottom: 4,
                  border: 'none',
                  borderRadius: 6,
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight:
                    activeCategory === category
                      ? 600
                      : 400,
                  color:
                    activeCategory === category
                      ? '#4f46e5'
                      : '#374151',
                  background:
                    activeCategory === category
                      ? '#eef2ff'
                      : 'transparent',
                }}
              >
                {category}
              </button>
            )
          )}
        </div>

        {/* Elements */}

        <div
          style={{
            flex: 1,
            padding: 10,
            background: '#ffffff',
          }}
        >
          {ELEMENT_TYPES[activeCategory].map(
            (element) => (
              <button
                key={element.id}
                onClick={() =>
                  onSelect(element)
                }
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 10px',
                  marginBottom: 4,
                  border: 'none',
                  borderRadius: 6,
                  background: 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background =
                    '#f3f4f6'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background =
                    'transparent'
                }}
              >
                <span
                  style={{
                    fontSize: 18,
                    width: 25,
                  }}
                >
                  {element.icon}
                </span>

                <span
                  style={{
                    fontSize: 13,
                    color: '#111827',
                  }}
                >
                  {element.name}
                </span>
              </button>
            )
          )}
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
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        onClose()
      }
    }

    document.addEventListener(
      'mousedown',
      handleClickOutside
    )

    return () => {
      document.removeEventListener(
        'mousedown',
        handleClickOutside
      )
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
        borderRadius: 8,
        boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
        zIndex: 9999,
        padding: 5,
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <button
        onClick={onAssignType}
        style={{
          width: '100%',
          padding: '10px 12px',
          border: 'none',
          borderRadius: 5,
          background: 'transparent',
          cursor: 'pointer',
          textAlign: 'left',
          fontSize: 13,
          color: '#111827',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background =
            '#f3f4f6'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background =
            'transparent'
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
            padding: '10px 12px',
            border: 'none',
            borderRadius: 5,
            background: 'transparent',
            cursor: 'pointer',
            textAlign: 'left',
            fontSize: 13,
            color: '#dc2626',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background =
              '#fef2f2'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background =
              'transparent'
          }}
        >
          ✕ Clear Element Type
        </button>
      )}
    </div>
  )
}


// ============================================================
// MAIN GRID WRAPPER
// ============================================================

function GridWrapper() {
  const [selectedShape, setSelectedShape] =
    useState(null)

  // NEW: Context menu state
  const [contextMenu, setContextMenu] =
    useState(null)

  // NEW: Element type menu state
  const [elementTypeMenu, setElementTypeMenu] =
    useState(null)

  // --- NEW AI GENERATION STATE ---

  const [isGenerating, setIsGenerating] =
    useState(false)

  const [isPanelOpen, setIsPanelOpen] =
    useState(false)

  const [generatedData, setGeneratedData] =
    useState({
      html: '',
      css: '',
    })


  // ==========================================================
  // ASSIGN ELEMENT TYPE
  // ==========================================================

  const assignElementType = (element) => {
    if (!window.editor || !selectedShape) {
      return
    }

    window.editor.updateShapes([
      {
        id: selectedShape.id,
        type: selectedShape.type,
        meta: {
          ...(selectedShape.meta || {}),
          elementType: element.id,
        },
      },
    ])

    // Refresh selected shape
    const updatedShape =
      window.editor.getShape(selectedShape.id)

    setSelectedShape(updatedShape)

    setElementTypeMenu(null)
    setContextMenu(null)
  }


  // ==========================================================
  // CLEAR ELEMENT TYPE
  // ==========================================================

  const clearElementType = () => {
    if (!window.editor || !selectedShape) {
      return
    }

    window.editor.updateShapes([
      {
        id: selectedShape.id,
        type: selectedShape.type,
        meta: {
          ...(selectedShape.meta || {}),
          elementType: undefined,
        },
      },
    ])

    const updatedShape =
      window.editor.getShape(selectedShape.id)

    setSelectedShape(updatedShape)

    setContextMenu(null)
  }


  // ==========================================================
  // RIGHT CLICK
  // ==========================================================

  const handleCanvasContextMenu = (event) => {
    // Only show our menu when a shape is selected.
    // This keeps normal Tldraw right-click behavior
    // when nothing is selected.

    if (!selectedShape) {
      return
    }

    event.preventDefault()
    event.stopPropagation()

    setElementTypeMenu(null)

    setContextMenu({
      x: event.clientX,
      y: event.clientY,
    })
  }


  // ==========================================================
  // GENERATE CODE
  // ==========================================================

  const handleGenerateClick = async () => {
    if (!window.editor) return

    // Get all shapes from canvas
    const shapes =
      window.editor.getCurrentPageShapes()

    if (shapes.length === 0) {
      alert(
        "Please draw your UI layout first!"
      )
      return
    }

    setIsGenerating(true)

    // Extract canvas information
    const sketchData = shapes.map((shape) => ({
      id: shape.id,

      type: shape.type,

      shapeType:
        shape.props?.geo || null,

      x: Math.round(shape.x),

      y: Math.round(shape.y),

      width:
        Math.round(
          shape.props?.w || 0
        ),

      height:
        Math.round(
          shape.props?.h || 0
        ),

      text:
        shape.props?.text ||
        shape.props?.richText?.content
          ?.map(
            (b) =>
              b.content
                ?.map((c) => c.text)
                .join('')
          )
          .join(' ') ||
        '',

      // ======================================================
      // NEW: SEND SEMANTIC ELEMENT TYPE
      // ======================================================

      elementType:
        shape.meta?.elementType || null,
    }))


    console.log(
      'Sketch data sent to backend:',
      sketchData
    )


    try {
      // Send data to FastAPI backend

      const response = await fetch(
        'http://localhost:8000/api/generate-code',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            sketch_data:
              sketchData,
          }),
        }
      )

      if (!response.ok) {
        throw new Error(
          "Backend connection failed"
        )
      }

      const result =
        await response.json()

      setGeneratedData({
        html: result.data.html,
        css: result.data.css,
      })

      setIsPanelOpen(true)

    } catch (error) {
      console.error(
        "Generation failed:",
        error
      )

      alert(
        "Real Error: " +
        error.message
      )

    } finally {
      setIsGenerating(false)
    }
  }


  // ==========================================================
  // HTML / CSS EDITORS
  // ==========================================================

  const handleHtmlChange = (e) =>
    setGeneratedData(
      (prev) => ({
        ...prev,
        html: e.target.value,
      })
    )

  const handleCssChange = (e) =>
    setGeneratedData(
      (prev) => ({
        ...prev,
        css: e.target.value,
      })
    )


  const copyToClipboard = () => {
    const combinedCode =
      `<style>\n${generatedData.css}\n</style>\n\n${generatedData.html}`

    navigator.clipboard.writeText(
      combinedCode
    )

    alert(
      "Code copied to clipboard!"
    )
  }


  // ==========================================================
  // ANALYZE SKETCH
  // ==========================================================

  function analyzeSketch() {
    if (!window.editor) return

    const shapes =
      window.editor.getCurrentPageShapes()

    const jsonData =
      shapes.map((shape) => ({
        id: shape.id,

        type: shape.type,

        shapeType:
          shape.props?.geo ||
          null,

        x: Math.round(shape.x),

        y: Math.round(shape.y),

        width:
          Math.round(
            shape.props?.w || 0
          ),

        height:
          Math.round(
            shape.props?.h || 0
          ),

        rotation:
          shape.rotation || 0,

        color:
          shape.props?.color ||
          null,

        fill:
          shape.props?.fill ||
          null,

        dash:
          shape.props?.dash ||
          null,

        size:
          shape.props?.size ||
          null,

        font:
          shape.props?.font ||
          null,

        align:
          shape.props?.align ||
          null,

        verticalAlign:
          shape.props?.verticalAlign ||
          null,

        url:
          shape.props?.url ||
          null,

        text:
          shape.props?.richText?.content
            ?.map((block) =>
              block.content
                ?.map((c) => c.text)
                .join('')
            )
            .join(' ') ||
          '',

        isClosed:
          shape.props?.isClosed ||
          false,

        points:
          shape.props?.segments ||
          null,

        // NEW
        elementType:
          shape.meta?.elementType ||
          null,
      }))

    console.log(
      'Sketch JSON:',
      jsonData
    )
  }


  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
      }}
    >

      {/* =====================================================
          LEFT SIDE: CANVAS
      ===================================================== */}

      <div
        style={{
          flex: 1,
          position: 'relative',
          transition:
            'all 0.3s ease',
        }}

        // NEW: RIGHT CLICK HANDLER
        onContextMenu={
          handleCanvasContextMenu
        }
      >

        {/* Properties Panel */}

        <PropertiesPanel
          selectedShape={
            selectedShape
          }
        />


        {/* Generate Button */}

        <button
          onClick={
            handleGenerateClick
          }
          disabled={isGenerating}
          style={{
            position: 'absolute',
            top: 16,
            left: '50%',
            transform:
              'translateX(-50%)',
            zIndex: 1000,

            display: 'flex',
            alignItems: 'center',
            gap: '8px',

            padding:
              '10px 24px',

            backgroundColor:
              isGenerating
                ? '#4b5563'
                : '#6366f1',

            color: 'white',

            border:
              '1px solid rgba(255,255,255,0.1)',

            borderRadius: '8px',

            fontSize: '0.95rem',

            fontWeight: '600',

            cursor:
              isGenerating
                ? 'wait'
                : 'pointer',

            boxShadow:
              '0 4px 12px rgba(0,0,0,0.2)',

            transition:
              'all 0.2s ease',

            fontFamily:
              'Arial, sans-serif',
          }}
        >
          {isGenerating
            ? '⏳ Processing...'
            : '✨ Generate Code'}
        </button>


        {/* =================================================
            TL DRAW
        ================================================= */}

        <Tldraw
          components={{
            Grid: CustomGrid,
          }}

          onMount={(editor) => {
            window.editor =
              editor

            editor.updateInstanceState({
              isGridMode: true,
            })


            // Update selected shape

            const updateSelection =
              () => {
                const selected =
                  editor.getSelectedShapes()

                if (
                  selected.length > 0
                ) {
                  setSelectedShape(
                    selected[0]
                  )
                } else {
                  setSelectedShape(
                    null
                  )

                  setContextMenu(
                    null
                  )

                  setElementTypeMenu(
                    null
                  )
                }
              }


            updateSelection()


            const cleanup =
              editor.store.listen(
                updateSelection,
                {
                  scope:
                    'document',
                }
              )

            return cleanup
          }}
        />


        {/* =================================================
            CUSTOM RIGHT-CLICK MENU
        ================================================= */}

        {contextMenu &&
          selectedShape && (
            <ContextMenu
              x={contextMenu.x}
              y={contextMenu.y}

              onClose={() =>
                setContextMenu(
                  null
                )
              }

              onAssignType={() => {
                setElementTypeMenu({
                  x:
                    contextMenu.x +
                    215,

                  y:
                    contextMenu.y,
                })

                setContextMenu(
                  null
                )
              }}

              onClearType={
                clearElementType
              }

              elementType={
                selectedShape.meta
                  ?.elementType ||
                null
              }
            />
          )}


        {/* =================================================
            ELEMENT TYPE SELECTOR
        ================================================= */}

        {elementTypeMenu &&
          selectedShape && (
            <ElementTypeMenu
              x={
                elementTypeMenu.x
              }

              y={
                elementTypeMenu.y
              }

              onClose={() =>
                setElementTypeMenu(
                  null
                )
              }

              onSelect={
                assignElementType
              }
            />
          )}

      </div>


      {/* =====================================================
          RIGHT SIDE: LIVE IDE PANEL
      ===================================================== */}

      {isPanelOpen && (
        <div
          style={{
            width: '45vw',
            minWidth: '500px',
            height: '100%',
            backgroundColor:
              '#0f172a',
            borderLeft:
              '1px solid #334155',
            display: 'flex',
            flexDirection:
              'column',
            boxShadow:
              '-10px 0 30px rgba(0,0,0,0.3)',
            fontFamily:
              'Arial, sans-serif',
          }}
        >

          {/* Panel Header */}

          <div
            style={{
              display: 'flex',
              justifyContent:
                'space-between',
              alignItems:
                'center',
              padding:
                '16px 24px',
              backgroundColor:
                '#1e293b',
              borderBottom:
                '1px solid #334155',
            }}
          >

            <h2
              style={{
                margin: 0,
                color:
                  '#f8fafc',
                fontSize:
                  '1.1rem',
                fontWeight:
                  '600',
              }}
            >
              Developer Environment
            </h2>

            <div
              style={{
                display: 'flex',
                gap: '12px',
              }}
            >

              <button
                onClick={
                  copyToClipboard
                }
                style={{
                  padding:
                    '6px 14px',
                  backgroundColor:
                    '#334155',
                  color:
                    '#f8fafc',
                  border:
                    '1px solid #475569',
                  borderRadius:
                    '6px',
                  cursor:
                    'pointer',
                  fontSize:
                    '0.85rem',
                }}
              >
                📋 Copy
              </button>

              <button
                onClick={() =>
                  setIsPanelOpen(
                    false
                  )
                }
                style={{
                  padding:
                    '6px 14px',
                  backgroundColor:
                    'transparent',
                  color:
                    '#94a3b8',
                  border:
                    '1px solid #475569',
                  borderRadius:
                    '6px',
                  cursor:
                    'pointer',
                  fontSize:
                    '0.85rem',
                }}
              >
                Close
              </button>

            </div>
          </div>


          {/* =================================================
              LIVE PREVIEW
          ================================================= */}

          <div
            style={{
              flex:
                '0 0 45%',
              backgroundColor:
                '#ffffff',
              position:
                'relative',
              borderBottom:
                '1px solid #334155',
            }}
          >

            <div
              style={{
                position:
                  'absolute',
                top: 8,
                left: 12,
                backgroundColor:
                  'rgba(0,0,0,0.5)',
                color:
                  'white',
                padding:
                  '2px 8px',
                borderRadius:
                  '4px',
                fontSize:
                  '0.75rem',
                zIndex: 10,
              }}
            >
              Live Preview
            </div>

            <iframe
              title="Live Preview"
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
              }}

              srcDoc={`
                <!DOCTYPE html>

                <html>

                  <head>

                    <style>

                      body {
                        margin: 0;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        background-color: #f1f5f9;
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


          {/* =================================================
              HTML / CSS EDITORS
          ================================================= */}

          <div
            style={{
              flex: 1,
              display: 'flex',
              padding: '16px',
              gap: '16px',
              backgroundColor:
                '#020617',
            }}
          >

            {/* HTML */}

            <div
              style={{
                flex: 1,
                display:
                  'flex',
                flexDirection:
                  'column',
              }}
            >

              <label
                style={{
                  color:
                    '#38bdf8',
                  fontSize:
                    '0.8rem',
                  fontWeight:
                    '700',
                  marginBottom:
                    '8px',
                  textTransform:
                    'uppercase',
                  letterSpacing:
                    '1px',
                }}
              >
                HTML
              </label>

              <textarea
                value={
                  generatedData.html
                }

                onChange={
                  handleHtmlChange
                }

                spellCheck="false"

                style={{
                  flex: 1,
                  backgroundColor:
                    '#0f172a',
                  color:
                    '#e2e8f0',
                  padding:
                    '16px',
                  borderRadius:
                    '8px',
                  border:
                    '1px solid #334155',
                  fontFamily:
                    'monospace',
                  fontSize:
                    '0.85rem',
                  resize:
                    'none',
                  outline:
                    'none',
                  lineHeight:
                    '1.5',
                }}
              />

            </div>


            {/* CSS */}

            <div
              style={{
                flex: 1,
                display:
                  'flex',
                flexDirection:
                  'column',
              }}
            >

              <label
                style={{
                  color:
                    '#a78bfa',
                  fontSize:
                    '0.8rem',
                  fontWeight:
                    '700',
                  marginBottom:
                    '8px',
                  textTransform:
                    'uppercase',
                  letterSpacing:
                    '1px',
                }}
              >
                CSS
              </label>

              <textarea
                value={
                  generatedData.css
                }

                onChange={
                  handleCssChange
                }

                spellCheck="false"

                style={{
                  flex: 1,
                  backgroundColor:
                    '#0f172a',
                  color:
                    '#e2e8f0',
                  padding:
                    '16px',
                  borderRadius:
                    '8px',
                  border:
                    '1px solid #334155',
                  fontFamily:
                    'monospace',
                  fontSize:
                    '0.85rem',
                  resize:
                    'none',
                  outline:
                    'none',
                  lineHeight:
                    '1.5',
                }}
              />

            </div>

          </div>

        </div>
      )}

    </div>
  )
}


// ============================================================
// APP
// ============================================================

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