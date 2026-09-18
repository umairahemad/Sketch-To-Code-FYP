from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import google.generativeai as genai
import os
import json
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
            "gemini-3.6-flash",
            "gemini-2.5-flash",
            "gemini-2.5-flash-lite",
            "gemini-2.0-flash",
            "gemini-1.5-flash",
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
            print(f"⚠️  Could not list models: {e}")

        chosen = None
        for name in PREFERRED_MODELS:
            if name in available:
                chosen = name
                break

        if not chosen and available:
            chosen = available[0]

        if not chosen:
            chosen = "gemini-2.5-flash"

        model = genai.GenerativeModel(
            chosen,
            system_instruction=(
                "You are a strict wireframe-to-HTML converter.\n\n"
                "ABSOLUTE RULES:\n"
                "1. You output EXACTLY the elements listed in the input.\n"
                "2. You NEVER add any element that is not in the input list.\n"
                "3. You NEVER add headings, titles, subtitles, labels, "
                "logos, footers, backgrounds, dividers, or decorative text "
                "UNLESS the input explicitly has an element with type=label.\n"
                "4. You NEVER invent text.\n"
                "5. The number of HTML elements MUST equal the number of "
                "elements in the input list.\n"
                "6. Strict 1:1 conversion. No creativity."
            ),
        )

        current_model_name = chosen
        print(f"✅ Gemini initialized with {chosen}")

    except Exception as e:
        print(f"❌ Gemini init error: {e}")
        model = None
else:
    print("❌ GEMINI_API_KEY missing in .env")


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


# ============================================================
# REQUEST MODEL
# ============================================================

class SketchPayload(BaseModel):
    sketch_data: List[Dict[str, Any]]
    canvas_bounds: Dict[str, Any] = {}


# ============================================================
# ELEMENT TYPE MAP
# ============================================================

ELEMENT_TYPE_MAP = {
    "page-root":        '<div class="canvas-root">CONTENT</div>',

    # ✅ Label type (from canvas text)
    "label":            '<label class="input-label">TEXT</label>',

    "text-input":       '<input type="text" class="input-text" />',
    "textarea":         '<textarea class="textarea"></textarea>',
    "checkbox":         '<input type="checkbox" class="checkbox" />',
    "radio":            '<input type="radio" class="radio" />',
    "dropdown":         '<select class="select"><option></option></select>',
    "toggle":           '<input type="checkbox" class="toggle" />',
    "slider":           '<input type="range" class="slider" />',
    "date-picker":      '<input type="date" class="date-picker" />',
    "file-upload":      '<input type="file" class="file-upload" />',

    "primary-button":   '<button class="btn-primary"></button>',
    "secondary-button": '<button class="btn-secondary"></button>',
    "icon-button":      '<button class="btn-icon"></button>',
    "fab":              '<button class="fab"></button>',

    "navbar":           '<nav class="navbar">CONTENT</nav>',
    "tabs":             '<div class="tabs">CONTENT</div>',
    "breadcrumbs":      '<nav class="breadcrumbs">CONTENT</nav>',
    "pagination":       '<div class="pagination">CONTENT</div>',
    "sidebar":          '<aside class="sidebar">CONTENT</aside>',

    "card":             '<div class="card">CONTENT</div>',
    "avatar":           '<img class="avatar" alt="" />',
    "badge":            '<span class="badge"></span>',
    "accordion":        '<div class="accordion">CONTENT</div>',
    "tooltip":          '<span class="tooltip"></span>',
    "progress-bar":     '<div class="progress-bar"></div>',
    "modal":            '<div class="modal">CONTENT</div>',
    "toast":            '<div class="toast"></div>',
}


# ============================================================
# COLOR MAPPING
# ============================================================

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


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():
    return {
        "message": "Sketch2Code API running",
        "model": current_model_name,
    }


# ============================================================
# GENERATE CODE
# ============================================================

@app.post("/api/generate-code")
async def generate_code(payload: SketchPayload):

    if model is None:
        return {
            "status": "error",
            "message": "Gemini model not available. Check backend terminal.",
        }

    try:
        # ----------------------------------------------------
        # Build element list
        # ----------------------------------------------------
        lines = []

        for el in payload.sketch_data:
            eid = el.get("id", "")
            stype = el.get("shapeType", "unknown")
            x = el.get("x", 0)
            y = el.get("y", 0)
            w = el.get("width", 0)
            h = el.get("height", 0)
            text = el.get("text", "")
            color = el.get("color", "black")
            fill = el.get("fill", "none")
            assigned = el.get("elementType")

            css_color = COLOR_MAP.get(color, "#1e1e1e")

            line = (
                f"- id={eid} | shape={stype} "
                f"| pos=({x},{y}) | size={w}x{h} "
                f"| color={color} ({css_color}) | fill={fill}"
            )

            if assigned:
                tag = ELEMENT_TYPE_MAP.get(assigned, assigned)
                line += f" | ASSIGNED={assigned} | use_html={tag}"

            if text:
                line += f' | text="{text}"'

            lines.append(line)

        layout = "\n".join(lines)

        # ----------------------------------------------------
        # Canvas info
        # ----------------------------------------------------
        cb = payload.canvas_bounds or {}
        canvas_w = cb.get("width", 800)
        canvas_h = cb.get("height", 600)
        canvas_min_x = cb.get("minX", 0)
        canvas_min_y = cb.get("minY", 0)
        has_page_root = cb.get("hasPageRoot", False)

        page_root_info = ""
        if has_page_root:
            page_root_info = (
                "\nIMPORTANT: The canvas contains a PAGE ROOT element "
                "(a rectangle assigned as the website border).\n"
                "ALL other elements are INSIDE this page root.\n"
                "The page root becomes the outer <div class='canvas-root'>.\n"
            )

        # ----------------------------------------------------
        # STRICT prompt
        # ----------------------------------------------------
        prompt = f"""Convert this exact list of UI elements into HTML/CSS.
{page_root_info}
CANVAS:
- Overall size: {canvas_w}px x {canvas_h}px
- Origin (top-left of all elements): ({canvas_min_x}, {canvas_min_y})

ELEMENTS (this is the COMPLETE list — do not add more):
{layout}

ABSOLUTE RULES — YOU MUST FOLLOW:
1. Output ONLY the elements listed above. NOTHING ELSE.
2. Do NOT add headings, titles, subtitles, labels, logos, footers,
   or any invented text.
3. Do NOT wrap elements in a panel with an invented title.
4. The number of visible HTML elements MUST equal the number of elements in the list.
5. Use ONLY the text shown in text="..." fields. Do NOT invent text.

6. SEMANTIC TYPES — use the exact HTML:
   - type=label          -> <label class="input-label">TEXT</label>
   - type=text-input     -> <input type="text" class="input-text" />
   - type=primary-button -> <button class="btn-primary">TEXT</button>
   - type=card           -> <div class="card">TEXT</div>
   - (etc. — always use the html tag shown in use_html)

7. If an element has ASSIGNED and text, put the text INSIDE the tag.
   Example: ASSIGNED=label + text="name"
   -> <label class="input-label">name</label>
   Example: ASSIGNED=primary-button + text="login"
   -> <button class="btn-primary">login</button>

8. If an element has ASSIGNED but NO text, output the tag EMPTY.
   Do NOT invent placeholder text like "TEXT", "Button", "Label".

9. LABEL elements are STANDALONE labels. Render them exactly where
   they appear using absolute positioning.

10. Use the EXACT colors shown in "color=... (hex)".

11. Position each element absolutely:
    position: absolute;
    left: (x - canvas_min_x)px;
    top:  (y - canvas_min_y)px;
    width: Wpx;
    height: Hpx;

12. Wrap all elements in ONE outer container:
    <div class="canvas-root"> ... </div>
    .canvas-root {{
      position: relative;
      width: {canvas_w}px;
      height: {canvas_h}px;
    }}

OUTPUT FORMAT — return ONLY raw JSON:
{{"html": "...", "css": "..."}}
"""

        # ----------------------------------------------------
        # Generate
        # ----------------------------------------------------
        response = model.generate_content(
            prompt,
            generation_config={
                "max_output_tokens": 4000,
                "temperature": 0,
                "top_p": 1,
                "top_k": 1,
            },
        )

        ai_text = response.text.strip()

        if "```json" in ai_text:
            ai_text = ai_text.split("```json", 1)[1].split("```", 1)[0].strip()
        elif "```" in ai_text:
            ai_text = ai_text.split("```", 1)[1].split("```", 1)[0].strip()

        s = ai_text.find("{")
        e = ai_text.rfind("}")
        if s != -1 and e > s:
            ai_text = ai_text[s:e + 1]

        parsed = json.loads(ai_text, strict=False)

        return {
            "status": "success",
            "data": {
                "html": parsed.get("html", ""),
                "css": parsed.get("css", ""),
            },
        }

    except Exception as e:
        print(f"❌ Generation error: {e}")
        return {
            "status": "error",
            "message": str(e),
            "data": {"html": "", "css": ""},
        }