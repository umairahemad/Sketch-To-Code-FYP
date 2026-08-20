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
  if (!selectedShape) {
    return (
      <div
        style={{
          position: 'absolute',
          top: 8,
          right: 170,
          width: 260,
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '9px',
          padding: '18px',
          zIndex: 1000,
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <h3
          style={{
            margin: '0 0 14px',
            fontSize: '16px',
            color: '#111827',
          }}
        >
          Properties
        </h3>

        <p
          style={{
            margin: 0,
            color: '#6b7280',
            fontSize: '14px',
          }}
        >
          Select an object
        </p>
      </div>
    )
  }

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
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '9px',
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
  
  // --- NEW AI GENERATION STATE ---
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [generatedData, setGeneratedData] = useState({ html: '', css: '' })

  const handleGenerateClick = async () => {
    if (!window.editor) return;
    
    // 1. Get all the shapes from the canvas
    const shapes = window.editor.getCurrentPageShapes();
    if (shapes.length === 0) {
      alert("Please draw your UI layout first!");
      return;
    }

    setIsGenerating(true);

    // 2. Extract exact X/Y coordinates, width, height, and text
    const sketchData = shapes.map((shape) => ({
      type: shape.type,
      shapeType: shape.props?.geo || null,
      x: Math.round(shape.x),
      y: Math.round(shape.y),
      width: Math.round(shape.props?.w || 0),
      height: Math.round(shape.props?.h || 0),
      text: shape.props?.text || 
            shape.props?.richText?.content?.map(b => b.content?.map(c => c.text).join('')).join(' ') || ''
    }));

    try {
      // 3. Send data to the FastAPI backend
      const response = await fetch('http://localhost:8000/api/generate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sketch_data: sketchData })
      });

      if (!response.ok) throw new Error("Backend connection failed");
      
      const result = await response.json();
      
      // 4. Put the real AI generated code into the IDE panel
      setGeneratedData({
        html: result.data.html,
        css: result.data.css
      });
      setIsPanelOpen(true);

    } catch (error) {
      console.error("Generation failed:", error);
      alert("Failed to connect to the backend. Please ensure the FastAPI server is running on port 8000.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleHtmlChange = (e) => setGeneratedData(prev => ({ ...prev, html: e.target.value }));
  const handleCssChange = (e) => setGeneratedData(prev => ({ ...prev, css: e.target.value }));
  
  const copyToClipboard = () => {
    const combinedCode = `<style>\n${generatedData.css}\n</style>\n\n${generatedData.html}`;
    navigator.clipboard.writeText(combinedCode);
    alert("Code copied to clipboard!");
  };

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
    <div style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden' }}>
      
      {/* LEFT SIDE: Canvas Container */}
      <div style={{ flex: 1, position: 'relative', transition: 'all 0.3s ease' }}>
        
        {/* Your original properties panel */}
        <PropertiesPanel selectedShape={selectedShape} />
        
        {/* Floating Generate Button placed top-center so it does not overlap your properties panel */}
        <button 
          onClick={handleGenerateClick}
          disabled={isGenerating}
          style={{
            position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 1000,
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 24px', backgroundColor: isGenerating ? '#4b5563' : '#6366f1',
            color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
            fontSize: '0.95rem', fontWeight: '600', cursor: isGenerating ? 'wait' : 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)', transition: 'all 0.2s ease', fontFamily: 'Arial, sans-serif'
          }}
        >
          {isGenerating ? '⏳ Processing...' : '✨ Generate Code'}
        </button>

        <Tldraw
          components={{
            Grid: CustomGrid,
          }}
          onMount={(editor) => {
            window.editor = editor
            editor.updateInstanceState({ isGridMode: true })

            const updateSelection = () => {
              const selected = editor.getSelectedShapes()
              if (selected.length > 0) {
                setSelectedShape(selected[0])
              } else {
                setSelectedShape(null)
              }
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

      {/* RIGHT SIDE: Live IDE Panel */}
      {isPanelOpen && (
        <div style={{
          width: '45vw', minWidth: '500px', height: '100%',
          backgroundColor: '#0f172a', borderLeft: '1px solid #334155',
          display: 'flex', flexDirection: 'column', boxShadow: '-10px 0 30px rgba(0,0,0,0.3)',
          fontFamily: 'Arial, sans-serif'
        }}>
          {/* Panel Header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '16px 24px', backgroundColor: '#1e293b', borderBottom: '1px solid #334155'
          }}>
            <h2 style={{ margin: 0, color: '#f8fafc', fontSize: '1.1rem', fontWeight: '600' }}>Developer Environment</h2>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={copyToClipboard} style={{
                padding: '6px 14px', backgroundColor: '#334155', color: '#f8fafc',
                border: '1px solid #475569', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem'
              }}>📋 Copy</button>
              <button onClick={() => setIsPanelOpen(false)} style={{
                padding: '6px 14px', backgroundColor: 'transparent', color: '#94a3b8',
                border: '1px solid #475569', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem'
              }}>Close</button>
            </div>
          </div>

          {/* Top Half: Live Preview iframe */}
          <div style={{ flex: '0 0 45%', backgroundColor: '#ffffff', position: 'relative', borderBottom: '1px solid #334155' }}>
            <div style={{ position: 'absolute', top: 8, left: 12, backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', zIndex: 10 }}>Live Preview</div>
            <iframe 
              title="Live Preview"
              style={{ width: '100%', height: '100%', border: 'none' }}
              srcDoc={`
                <!DOCTYPE html>
                <html>
                  <head>
                    <style>
                      body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #f1f5f9; }
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

          {/* Bottom Half: Live Code Editors */}
          <div style={{ flex: 1, display: 'flex', padding: '16px', gap: '16px', backgroundColor: '#020617' }}>
            {/* HTML Editor */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <label style={{ color: '#38bdf8', fontSize: '0.8rem', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>HTML</label>
              <textarea 
                value={generatedData.html}
                onChange={handleHtmlChange}
                spellCheck="false"
                style={{
                  flex: 1, backgroundColor: '#0f172a', color: '#e2e8f0', padding: '16px',
                  borderRadius: '8px', border: '1px solid #334155', fontFamily: 'monospace',
                  fontSize: '0.85rem', resize: 'none', outline: 'none', lineHeight: '1.5'
                }}
              />
            </div>
            {/* CSS Editor */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <label style={{ color: '#a78bfa', fontSize: '0.8rem', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>CSS</label>
              <textarea 
                value={generatedData.css}
                onChange={handleCssChange}
                spellCheck="false"
                style={{
                  flex: 1, backgroundColor: '#0f172a', color: '#e2e8f0', padding: '16px',
                  borderRadius: '8px', border: '1px solid #334155', fontFamily: 'monospace',
                  fontSize: '0.85rem', resize: 'none', outline: 'none', lineHeight: '1.5'
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
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