from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import google.generativeai as genai
import os
import json
import re
import time
from dotenv import load_dotenv


# ============================================================
# GEMINI SETUP
# ============================================================

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

model = None
current_model_name = None

if api_key:
    try:
        genai.configure(api_key=api_key)

        PREFERRED_MODELS = [
            "gemini-3.5-flash-lite",
            "gemini-3.5-flash",
            "gemini-2.5-flash",
            "gemini-2.0-flash",
            "gemini-3.6-flash",
        ]

        available = []
        try:
            available = [
                m.name.replace("models/", "")
                for m in genai.list_models()
                if "generateContent" in m.supported_generation_methods
            ]
            print(f"📋 Available models: {available}")
        except Exception as e:
            print(f"⚠️  Could not list: {e}")

        chosen = None
        for name in PREFERRED_MODELS:
            if name in available:
                chosen = name
                break

        if not chosen and available:
            skip = {"gemini-2.5-flash-lite", "gemini-1.5-flash"}
            for m in available:
                if m not in skip:
                    chosen = m
                    break

        if not chosen:
            chosen = "gemini-3.5-flash-lite"

        model = genai.GenerativeModel(
            chosen,
            system_instruction=(
                "You are a precise UI-to-HTML converter. "
                "Follow the rules EXACTLY — consistency is most important.\n\n"
                "STRUCTURE:\n"
                "1. Output ONLY the elements listed. No extra elements.\n"
                "2. NEVER wrap in extra divs.\n"
                "3. Each element MUST have inline position:absolute with "
                "the exact left/top/width/height given.\n"
                "4. All elements are direct children of .canvas-root.\n\n"
                "COLORS — HIGHEST PRIORITY:\n"
                "5. Each element has a color= value. You MUST use it.\n"
                "6. Labels: CSS `color` = the color= value.\n"
                "   Example: color=#ef4444 → color: #ef4444;\n"
                "   NEVER use #374151 or #111827 for labels.\n"
                "7. Buttons: gradient from the color= value.\n"
                "   Example: color=#3b82f6 → "
                "linear-gradient(135deg, #3b82f6, #1d4ed8)\n"
                "8. Inputs: background #ffffff, text #111827.\n"
                "9. Do NOT hardcode or default any color.\n\n"
                "DESIGN:\n"
                "10. Buttons: gradient, soft shadow, rounded 10px, hover lift.\n"
                "11. Inputs: white bg, border #e5e7eb, focus ring, rounded 10px.\n"
                "12. Labels: font-weight 600, font-size 13px, given color."
            ),
        )

        current_model_name = chosen
        print(f"✅ Gemini initialized with {chosen}")

    except Exception as e:
        print(f"❌ Gemini init error: {e}")
        model = None
else:
    print("❌ GEMINI_API_KEY missing")


# ============================================================
# FASTAPI
# ============================================================

app = FastAPI(title="Sketch2Code API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SketchPayload(BaseModel):
    sketch_data: List[Dict[str, Any]]
    canvas_bounds: Dict[str, Any] = {}


ELEMENT_TYPE_MAP = {
    "page-root":        '<div class="canvas-root">CONTENT</div>',
    "label":            '<label class="form-label">TEXT</label>',
    "text-input":       '<input type="text" class="input-field" />',
    "textarea":         '<textarea class="input-field"></textarea>',
    "checkbox":         '<input type="checkbox" class="checkbox-field" />',
    "radio":            '<input type="radio" class="radio-field" />',
    "dropdown":         '<select class="input-field"><option></option></select>',
    "toggle":           '<input type="checkbox" class="toggle-field" />',
    "slider":           '<input type="range" class="slider-field" />',
    "date-picker":      '<input type="date" class="input-field" />',
    "file-upload":      '<input type="file" class="file-field" />',
    "primary-button":   '<button class="btn btn-primary">TEXT</button>',
    "secondary-button": '<button class="btn btn-secondary">TEXT</button>',
    "icon-button":      '<button class="btn btn-icon">TEXT</button>',
    "fab":              '<button class="btn btn-fab">TEXT</button>',
    "navbar":           '<nav class="navbar">CONTENT</nav>',
    "tabs":             '<div class="tabs">CONTENT</div>',
    "breadcrumbs":      '<nav class="breadcrumbs">CONTENT</nav>',
    "pagination":       '<div class="pagination">CONTENT</div>',
    "sidebar":          '<aside class="sidebar">CONTENT</aside>',
    "card":             '<div class="card">CONTENT</div>',
    "avatar":           '<img class="avatar" alt="" />',
    "badge":            '<span class="badge">TEXT</span>',
    "accordion":        '<div class="accordion">CONTENT</div>',
    "tooltip":          '<span class="tooltip">TEXT</span>',
    "progress-bar":     '<div class="progress-bar"></div>',
    "modal":            '<div class="modal">CONTENT</div>',
    "toast":            '<div class="toast">TEXT</div>',
}


COLOR_MAP = {
    "black":        "#1e1e1e",
    "blue":         "#3b82f6",
    "red":          "#ef4444",
    "green":        "#22c55e",
    "yellow":       "#eab308",
    "orange":       "#f97316",
    "violet":       "#8b5cf6",
    "grey":         "#6b7280",
    "light-blue":   "#38bdf8",
    "light-green":  "#4ade80",
    "light-red":    "#f87171",
    "light-violet": "#a78bfa",
    "white":        "#ffffff",
}


@app.get("/")
def root():
    return {"message": "Sketch2Code API running", "model": current_model_name}


@app.post("/api/generate-code")
async def generate_code(payload: SketchPayload):

    if model is None:
        return {"status": "error", "message": "Gemini model not available."}

    try:
        start_time = time.time()

        cb = payload.canvas_bounds or {}
        canvas_w = cb.get("width", 800)
        canvas_h = cb.get("height", 600)
        canvas_min_x = cb.get("minX", 0)
        canvas_min_y = cb.get("minY", 0)
        has_page_root = cb.get("hasPageRoot", False)

        page_root_color = cb.get("pageRootColor", "black")
        page_root_fill = cb.get("pageRootFill", "none")
        page_root_css_color = COLOR_MAP.get(page_root_color, "#1e1e1e")

        # ----------------------------------------------------
        # Build element lines
        # ----------------------------------------------------
        lines = []
        for el in payload.sketch_data:
            x = el.get("x", 0)
            y = el.get("y", 0)
            w = el.get("width", 0)
            h = el.get("height", 0)
            text = el.get("text", "")
            color = el.get("color", "black")
            assigned = el.get("elementType")
            stype = el.get("shapeType", "unknown")

            css_color = COLOR_MAP.get(color, "#1e1e1e")
            abs_left = x - canvas_min_x
            abs_top = y - canvas_min_y

            line = (
                f"- type={assigned or stype} "
                f"| position:absolute; left:{abs_left}px; top:{abs_top}px; "
                f"width:{w}px; height:{h}px "
                f"| color={css_color}"
            )

            if text:
                line += f' | text="{text}"'

            lines.append(line)

        layout = "\n".join(lines)

        # ----------------------------------------------------
        # Page root info
        # ----------------------------------------------------
        page_root_info = ""
        page_root_css = ""

        if has_page_root:
            if page_root_fill == "none":
                page_root_info = (
                    f"PAGE ROOT (website border):\n"
                    f"- Border color: {page_root_css_color}\n"
                    f"- Fill: none\n"
                )
                page_root_css = (
                    f"border: 2px solid {page_root_css_color}; "
                    f"background: #ffffff;"
                )
            else:
                page_root_info = (
                    f"PAGE ROOT (website background):\n"
                    f"- Fill color: {page_root_css_color}\n"
                )
                page_root_css = f"background: {page_root_css_color};"

        # ----------------------------------------------------
        # Prompt
        # ----------------------------------------------------
        prompt = f"""Convert this wireframe into a premium modern webpage.
{page_root_info}
CANVAS: {canvas_w}x{canvas_h}px

ELEMENTS (each has position, size, color):
{layout}

ABSOLUTE STRUCTURE RULES:
1. Output ONLY the elements listed above. NOTHING ELSE.
2. DO NOT create wrapper divs.
3. Each element MUST have inline style:
   position: absolute; left: Xpx; top: Ypx; width: Wpx; height: Hpx;
4. All elements are siblings directly inside .canvas-root.

CRITICAL — .canvas-root RULES:
5. .canvas-root has NO inline style. Styling only in CSS:
   .canvas-root {{
     position: relative;
     width: 100%;
     min-height: 100vh;
     background: #ffffff;
     {page_root_css}
   }}

COLOR RULES (HIGHEST PRIORITY):
6. For LABELS: CSS `color` = the color= value.
   Example: label with color=#ef4444 → color: #ef4444;
   NEVER use #374151 or #111827 for labels.
7. For BUTTONS: use the color= value in the gradient.
   Example: color=#3b82f6 → linear-gradient(135deg, #3b82f6, #1d4ed8)
8. For INPUTS: background #ffffff, text #111827.

DESIGN:
- Buttons: gradient (from color), soft shadow, border-radius 10px, hover lift
- Inputs: white bg, border #e5e7eb, focus ring, rounded 10px
- Labels: font-weight 600, font-size 13px, color from color= value

Return ONLY raw JSON:
{{"html": "...", "css": "..."}}
"""

        response = model.generate_content(
            prompt,
            generation_config={
                "max_output_tokens": 3000,
                "temperature": 0.2,
                "top_p": 0.9,
                "top_k": 30,
            },
        )

        ai_text = response.text.strip()
        elapsed = time.time() - start_time
        print(f"⏱️  Gemini response: {elapsed:.2f}s")

        if "```json" in ai_text:
            ai_text = ai_text.split("```json", 1)[1].split("```", 1)[0].strip()
        elif "```" in ai_text:
            ai_text = ai_text.split("```", 1)[1].split("```", 1)[0].strip()

        s = ai_text.find("{")
        e = ai_text.rfind("}")
        if s != -1 and e > s:
            ai_text = ai_text[s:e + 1]

        parsed = json.loads(ai_text, strict=False)

        html = parsed.get("html", "")
        css = parsed.get("css", "")

        # ============================================================
        # POST-PROCESS — SIMPLE (only .canvas-root cleanup)
        # ============================================================

        # 1. Remove inline style from .canvas-root
        html = re.sub(
            r'<div\s+class="canvas-root"[^>]*>',
            '<div class="canvas-root">',
            html
        )
        html = re.sub(
            r'<div\s+style="[^"]*"\s+class="canvas-root"[^>]*>',
            '<div class="canvas-root">',
            html
        )

        # 2. Clean .canvas-root CSS
        css = re.sub(
            r'(\.canvas-root\s*\{[^}]*?)border-radius\s*:\s*[^;]+;',
            r'\1', css
        )
        css = re.sub(
            r'(\.canvas-root\s*\{[^}]*?)box-shadow\s*:\s*[^;]+;',
            r'\1', css
        )
        css = re.sub(
            r'(\.canvas-root\s*\{[^}]*?)transform\s*:\s*[^;]+;',
            r'\1', css
        )

        # 3. Scale
        BASE_WIDTH = 1440
        scale = BASE_WIDTH / canvas_w if canvas_w > 0 else 1.5
        scale = max(1.0, min(2.5, scale))

        css += f"""

/* ✅ Full page + zoom scaling (single scrollbar) */
html, body {{
  margin: 0;
  padding: 0;
  width: 100%;
  min-height: 100vh;
  background: #f1f5f9;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  overflow-x: hidden;
  overflow-y: auto;
}}

.canvas-root {{
  width: {canvas_w}px !important;
  min-height: {canvas_h}px !important;
  position: relative !important;
  zoom: {scale} !important;
  -moz-transform: scale({scale}) !important;
  -moz-transform-origin: top left !important;
  background: #ffffff !important;
  {page_root_css}
  box-sizing: border-box;
  overflow: visible !important;
  margin: 0 !important;
  padding: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}}

.form-label {{
  font-weight: 600 !important;
  font-size: 13px !important;
  letter-spacing: 0.2px;
}}
"""

        print(f"✅ Done — scale {scale:.2f}x")

        return {
            "status": "success",
            "data": {
                "html": html,
                "css": css,
            },
        }

    except Exception as e:
        print(f"❌ Generation error: {e}")
        return {
            "status": "error",
            "message": str(e),
            "data": {"html": "", "css": ""},
        }