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

if api_key:
    try:
        genai.configure(api_key=api_key)

        # Keep your existing model for now
        model = genai.GenerativeModel("gemini-3.6-flash")

        print("✅ Gemini initialized")

    except Exception as e:
        print(f"❌ Gemini initialization error: {e}")
        model = None

else:
    print("❌ GEMINI_API_KEY not found in .env")


# ============================================================
# FASTAPI
# ============================================================

app = FastAPI(title="VisionCraft API")


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


# ============================================================
# ELEMENT TYPE MAPPING
# ============================================================

ELEMENT_TYPE_MAP = {

    # Input Controls

    "text-input":
        'Text Input - use <input type="text">',

    "textarea":
        'Textarea - use <textarea>',

    "checkbox":
        'Checkbox - use <input type="checkbox">',

    "radio":
        'Radio Button - use <input type="radio">',

    "dropdown":
        'Dropdown Menu - use <select><option>',

    "toggle":
        'Toggle Switch - use a styled checkbox/toggle',

    "slider":
        'Slider - use <input type="range">',

    "date-picker":
        'Date Picker - use <input type="date">',

    "file-upload":
        'File Upload - use <input type="file">',


    # Buttons

    "primary-button":
        'Primary Button - use <button class="btn-primary">',

    "secondary-button":
        'Secondary Button - use <button class="btn-secondary">',

    "icon-button":
        'Icon Button - use <button class="btn-icon">',

    "fab":
        'Floating Action Button - use <button class="fab">',


    # Navigation

    "navbar":
        'Navigation Bar - use <nav class="navbar">',

    "tabs":
        'Tabs - use a tabs container such as <div class="tabs">',

    "breadcrumbs":
        'Breadcrumbs - use <nav class="breadcrumbs">',

    "pagination":
        'Pagination - use <div class="pagination">',

    "sidebar":
        'Sidebar / Drawer - use <aside class="sidebar">',


    # Visual Elements

    "card":
        'Card - use <div class="card">',

    "avatar":
        'Avatar - use <img class="avatar">',

    "badge":
        'Badge / Chip - use <span class="badge">',

    "accordion":
        'Accordion - use <div class="accordion">',

    "tooltip":
        'Tooltip - use <span class="tooltip">',

    "progress-bar":
        'Progress Bar - use <div class="progress-bar">',

    "modal":
        'Modal / Dialog - use <div class="modal">',

    "toast":
        'Toast / Snackbar - use <div class="toast">',
}


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():
    return {
        "message": "VisionCraft API is running"
    }


# ============================================================
# GENERATE CODE
# ============================================================

@app.post("/api/generate-code")
async def generate_code(payload: SketchPayload):

    # --------------------------------------------------------
    # Check Gemini
    # --------------------------------------------------------

    if model is None:
        return {
            "status": "error",
            "message": "Gemini model is not available. Check API key/model configuration."
        }


    try:

        # ----------------------------------------------------
        # Convert sketch data into AI-readable description
        # ----------------------------------------------------

        elements_description = []

        for element in payload.sketch_data:

            element_id = element.get(
                "id",
                ""
            )

            element_type = element.get(
                "type",
                "unknown"
            )

            shape_type = element.get(
                "shapeType",
                ""
            )

            x = element.get(
                "x",
                0
            )

            y = element.get(
                "y",
                0
            )

            width = element.get(
                "width",
                0
            )

            height = element.get(
                "height",
                0
            )

            text = element.get(
                "text",
                ""
            )

            # NEW:
            # Semantic type assigned by the user

            assigned_type = element.get(
                "elementType",
                None
            )


            # ------------------------------------------------
            # Build description
            # ------------------------------------------------

            description = f"""
Element ID: {element_id}
Canvas Shape Type: {element_type}
Shape Geometry: {shape_type}
Position: ({x}, {y})
Size: {width}x{height}
"""


            # ------------------------------------------------
            # IMPORTANT:
            # Tell Gemini the explicit semantic type
            # ------------------------------------------------

            if assigned_type:

                mapped_type = ELEMENT_TYPE_MAP.get(
                    assigned_type,
                    assigned_type
                )

                description += f"""
USER-ASSIGNED SEMANTIC TYPE:
{mapped_type}

IMPORTANT:
The user explicitly identified this canvas shape as "{assigned_type}".
DO NOT reinterpret or guess this element's purpose.
Generate the corresponding HTML element described above.
"""


            else:

                description += """
USER-ASSIGNED SEMANTIC TYPE:
None

No semantic type was assigned by the user.
You may infer the most appropriate HTML element from the
shape, text, size, position and visual context.
"""


            # ------------------------------------------------
            # Text
            # ------------------------------------------------

            if text:

                description += f"""
Text inside element:
"{text}"
"""


            elements_description.append(
                description
            )


        # ----------------------------------------------------
        # Combine all elements
        # ----------------------------------------------------

        layout_description = "\n".join(
            elements_description
        )


        # ----------------------------------------------------
        # GEMINI PROMPT
        # ----------------------------------------------------

        prompt = f"""
You are an expert frontend developer and UI wireframe-to-code system.

You are given a UI wireframe created in VisionCraft.

Your job is to convert the wireframe into a beautiful,
modern and functional HTML/CSS webpage.


============================================================
WIREframe ELEMENTS
============================================================

{layout_description}


============================================================
CRITICAL SEMANTIC ELEMENT RULE
============================================================

Some canvas shapes have been explicitly assigned a semantic
element type by the USER.

These assignments are authoritative.

DO NOT GUESS A DIFFERENT ELEMENT TYPE when a user assignment
is provided.

For example:

If the canvas contains:

Shape: rectangle
User-assigned type: primary-button
Text: Login

You MUST generate something equivalent to:

<button class="btn-primary">Login</button>

NOT:

<div>Login</div>


Another example:

Shape: rectangle
User-assigned type: text-input

You MUST generate:

<input type="text" ...>


Another example:

Shape: rectangle
User-assigned type: navbar

You MUST generate:

<nav class="navbar">...</nav>


Use the semantic mapping provided for every assigned element.


============================================================
DESIGN REQUIREMENTS
============================================================

1. Create a modern professional webpage.

2. Preserve the exact relative positions of the wireframe
   elements.

3. Preserve the provided text.

4. Use the provided width and height information.

5. Use modern CSS.

6. Use clean spacing.

7. Use rounded corners where appropriate.

8. Use subtle shadows.

9. Add hover effects to interactive elements.

10. Use semantic HTML whenever an element type is assigned.

11. Do not replace an explicitly assigned semantic element
    with a generic div unless absolutely necessary.

12. Make the generated webpage visually coherent.

13. Make buttons actually look like buttons.

14. Make inputs actually look like inputs.

15. Make navigation elements look like navigation elements.


============================================================
HTML/CSS RULES
============================================================

Generate:

- HTML
- CSS

Do not generate JavaScript unless absolutely required.

Use classes for styling.

For example:

.primary-button
.secondary-button
.input-text
.navbar
.card
.sidebar
.badge
.modal


============================================================
OUTPUT FORMAT
============================================================

You MUST output ONLY valid JSON.

The JSON MUST contain exactly:

{{
    "html": "...",
    "css": "..."
}}

Do NOT include:

- Markdown
- ```json
- Explanations
- Comments outside the JSON
- Introduction
- Conclusion

Return raw JSON only.
"""


        # ----------------------------------------------------
        # SEND TO GEMINI
        # ----------------------------------------------------

        response = model.generate_content(
            prompt
        )

        ai_text = response.text.strip()


        # ----------------------------------------------------
        # CLEAN GEMINI RESPONSE
        # ----------------------------------------------------

        if "```json" in ai_text:

            ai_text = (
                ai_text
                .split("```json", 1)[1]
                .split("```", 1)[0]
                .strip()
            )

        elif "```" in ai_text:

            ai_text = (
                ai_text
                .split("```", 1)[1]
                .split("```", 1)[0]
                .strip()
            )


        # ----------------------------------------------------
        # Extract JSON object
        # ----------------------------------------------------

        start_idx = ai_text.find("{")
        end_idx = ai_text.rfind("}")


        if (
            start_idx != -1
            and end_idx != -1
            and end_idx > start_idx
        ):

            ai_text = ai_text[
                start_idx:end_idx + 1
            ]


        # ----------------------------------------------------
        # Parse JSON
        # ----------------------------------------------------

        parsed_data = json.loads(
            ai_text,
            strict=False
        )


        html = parsed_data.get(
            "html",
            "<div></div>"
        )

        css = parsed_data.get(
            "css",
            ""
        )


        # ----------------------------------------------------
        # SUCCESS
        # ----------------------------------------------------

        return {
            "status": "success",

            "data": {
                "html": html,
                "css": css
            }
        }


    # ========================================================
    # ERROR
    # ========================================================

    except Exception as e:

        print(
            f"❌ Generation error: {str(e)}"
        )

        return {
            "status": "error",

            "message": str(e),

            "data": {
                "html": "",
                "css": ""
            }
        }