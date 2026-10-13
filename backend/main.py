
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from pwdlib import PasswordHash
from jose import jwt, JWTError
from datetime import datetime, timedelta, timezone
from pydantic import EmailStr

import google.generativeai as genai

from dotenv import load_dotenv
import os
import json
import time

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
ENV_FILE = BASE_DIR / ".env"

load_dotenv(dotenv_path=ENV_FILE, override=True)

api_key = os.getenv("GEMINI_API_KEY")

print("ENV file exists:", ENV_FILE.is_file())
print("API key loaded:", bool(api_key))

from database import init_db, get_db, ProjectDB, PageDB, UserDB
from models import (
    ProjectCreate,
    ProjectUpdate,
    PageCreate,
    PageUpdate,
    SketchPayload,
    APIResponse
)


# ============================================================
# ENVIRONMENT
# ============================================================

load_dotenv()
AUTH_SECRET_KEY = os.getenv("AUTH_SECRET_KEY")

if not AUTH_SECRET_KEY:
    raise RuntimeError(
        "AUTH_SECRET_KEY is missing from your backend .env file"
    )

AUTH_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return password_hash.verify(password, hashed_password)


def create_access_token(user_id: int) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": str(user_id),
        "exp": expires_at,
    }

    return jwt.encode(
        payload,
        AUTH_SECRET_KEY,
        algorithm=AUTH_ALGORITHM,
    )


# ============================================================
# GEMINI INITIALIZATION
# ============================================================

if api_key:
    try:
        genai.configure(api_key=api_key)

        model = genai.GenerativeModel(
            "models/gemini-3.6-flash"
        )

        print("✅ Gemini initialized with: models/gemini-3.6-flash")

    except Exception as e:
        print(f"❌ Gemini initialization error: {e}")
        model = None

else:
    print("❌ GEMINI_API_KEY not found in .env file")
    model = None


# ============================================================
# FASTAPI APP
# ============================================================

app = FastAPI(
    title="VisionCraft API"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# DATABASE
# ============================================================

init_db()


# ============================================================
# ELEMENT TYPE MAPPING
# ============================================================

ELEMENT_TYPE_MAP = {

    "text-input":
        'Text Input - <input type="text">',

    "textarea":
        "Textarea - <textarea>",

    "checkbox":
        'Checkbox - <input type="checkbox">',

    "radio":
        'Radio Button - <input type="radio">',

    "dropdown":
        "Dropdown - <select><option>",

    "toggle":
        "Toggle Switch - styled checkbox",

    "slider":
        'Slider - <input type="range">',

    "date-picker":
        'Date Picker - <input type="date">',

    "file-upload":
        'File Upload - <input type="file">',

    "primary-button":
        'Primary Button - <button class="btn-primary">',

    "secondary-button":
        'Secondary Button - <button class="btn-secondary">',

    "icon-button":
        'Icon Button - <button class="btn-icon">',

    "fab":
        'Floating Action Button - <button class="fab">',

    "navbar":
        "Navigation Bar - <nav>",

    "tabs":
        'Tabs - <div class="tabs">',

    "breadcrumbs":
        'Breadcrumbs - <nav class="breadcrumbs">',

    "pagination":
        'Pagination - <div class="pagination">',

    "sidebar":
        "Sidebar - <aside>",

    "card":
        'Card - <div class="card">',

    "avatar":
        'Avatar - <img class="avatar">',

    "badge":
        'Badge - <span class="badge">',

    "accordion":
        'Accordion - <div class="accordion">',

    "tooltip":
        'Tooltip - <span class="tooltip">',

    "progress-bar":
        'Progress Bar - <div class="progress-bar">',

    "modal":
        'Modal - <div class="modal">',

    "toast":
        'Toast - <div class="toast">'
}


# ============================================================
# HELPER
# ============================================================

def serialize_project(project: ProjectDB) -> dict:

    return {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "created_at": project.created_at,
        "updated_at": project.updated_at,

        "pages": [

            {
                "id": page.id,
                "name": page.name,
                "parent_id": page.parent_id,
                "status": page.status,
                "canvas_data": page.canvas_data,
                "generated_html": page.generated_html,
                "generated_css": page.generated_css,
                "generated_js": page.generated_js,
                "updated_at": page.updated_at
            }

            for page in project.pages
        ]
    }


# ============================================================
# FAST AI PAGE GENERATION
# ============================================================

def generate_page_code(
    page_name,
    canvas_data,
    linked_elements=None,
    frame=None,
    element_types=None
):

    """
    Convert a wireframe into HTML/CSS using Gemini.

    Optimized for:
    - smaller prompts
    - fewer output tokens
    - faster generation
    - valid JSON
    - exact positions
    """

    # --------------------------------------------------------
    # CREATE ELEMENT DESCRIPTION
    # --------------------------------------------------------

    elements_desc = []

    for elem in canvas_data:

        elem_id = elem.get("id", "")

        elem_type = elem.get(
            "type",
            "rectangle"
        )

        elem_text = elem.get(
            "text",
            ""
        )

        elem_color = elem.get(
            "color",
            ""
        )

        x = elem.get(
            "x",
            0
        )

        y = elem.get(
            "y",
            0
        )

        width = elem.get(
            "width",
            100
        )

        height = elem.get(
            "height",
            50
        )

        assigned_type = elem.get(
            "elementType"
        )

        if (
            not assigned_type
            and element_types
        ):
            assigned_type = element_types.get(
                elem_id
            )

        description = (
            f"type={elem_type}, "
            f"elementType={assigned_type or 'none'}, "
            f"text={elem_text}, "
            f"color={elem_color}, "
            f"x={x}, "
            f"y={y}, "
            f"width={width}, "
            f"height={height}"
        )

        elements_desc.append(
            description
        )


    # --------------------------------------------------------
    # FRAME
    # --------------------------------------------------------

    frame_width = (
        frame.get("width", 1440)
        if frame
        else 1440
    )

    frame_height = (
        frame.get("height", 900)
        if frame
        else 900
    )


    # --------------------------------------------------------
    # SHORT OPTIMIZED PROMPT
    # --------------------------------------------------------

    prompt = f"""
Convert this UI wireframe into a modern HTML/CSS webpage.

PAGE:
{page_name}

VIEWPORT:
{frame_width}x{frame_height}

ELEMENTS:
{chr(10).join(elements_desc)}

LINKS:
{json.dumps(linked_elements or [], separators=(",", ":"))}

REQUIREMENTS:

1. Preserve exact element positions.
2. Preserve exact text.
3. Preserve element sizes.
4. Use absolute positioning inside .website-container.
5. Create real HTML elements according to elementType.
6. Make buttons and inputs visually functional.
7. Use modern professional CSS.
8. Use clean spacing, shadows and rounded corners.
9. No page scrolling.
10. Keep all content inside the website container.
11. Return ONLY valid JSON.
12. JSON must contain exactly:
    html
    css

Do not use markdown.
Do not provide explanations.

Return:
{{"html":"...","css":"..."}}
"""


    # --------------------------------------------------------
    # CHECK MODEL
    # --------------------------------------------------------

    if model is None:

        return {

            "html": (
                "<div "
                "style='padding:40px;"
                "font-family:sans-serif;'>"
                f"<h1>{page_name}</h1>"
                "<p>Gemini model not available.</p>"
                "</div>"
            ),

            "css": ""
        }


    # --------------------------------------------------------
    # GEMINI GENERATION
    # --------------------------------------------------------

    start_time = time.time()

    try:

        response = model.generate_content(

            prompt,

            generation_config={

                "temperature": 0.1,

                "max_output_tokens": 8192
            }
        )


        generation_time = (
            time.time()
            - start_time
        )


        print(
            f"✅ Gemini generation time: "
            f"{generation_time:.2f} seconds"
        )


        # ----------------------------------------------------
        # RESPONSE TEXT
        # ----------------------------------------------------

        if not response.text:

            raise ValueError(
                "Gemini returned an empty response."
            )


        ai_text = response.text.strip()


        # ----------------------------------------------------
        # REMOVE MARKDOWN
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
        # FIND JSON
        # ----------------------------------------------------

        start_idx = ai_text.find("{")

        end_idx = ai_text.rfind("}")


        if (
            start_idx == -1
            or end_idx == -1
        ):

            raise ValueError(
                "Gemini did not return valid JSON."
            )


        ai_text = ai_text[
            start_idx:
            end_idx + 1
        ]


        # ----------------------------------------------------
        # PARSE JSON
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
        # FALLBACK CSS
        # ----------------------------------------------------

        if not css.strip():

            css = f"""

* {{
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}}

html,
body {{
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
}}

body {{
    font-family:
        Inter,
        "Segoe UI",
        Arial,
        sans-serif;

    background: #f0f4f8;
}}

.website-container {{

    width: {frame_width}px;

    height: {frame_height}px;

    position: relative;

    overflow: hidden;

    background: white;

    margin: 0 auto;

    border-radius: 12px;

    box-shadow:
        0 20px 60px
        rgba(0,0,0,0.10);
}}

.btn-primary {{

    background:
        linear-gradient(
            135deg,
            #667eea,
            #764ba2
        );

    color: white;

    border: none;

    padding: 12px 28px;

    border-radius: 8px;

    font-size: 16px;

    font-weight: 600;

    cursor: pointer;

    box-shadow:
        0 4px 15px
        rgba(102,126,234,0.35);
}}

.btn-secondary {{

    background: white;

    color: #667eea;

    border:
        2px solid #667eea;

    padding: 10px 26px;

    border-radius: 8px;

    font-size: 16px;

    font-weight: 600;

    cursor: pointer;
}}

.input-text {{

    padding: 12px 16px;

    border:
        2px solid #e2e8f0;

    border-radius: 8px;

    font-size: 16px;

    outline: none;
}}

.card {{

    background: white;

    border-radius: 12px;

    padding: 24px;

    box-shadow:
        0 4px 20px
        rgba(0,0,0,0.08);
}}

.navbar {{

    display: flex;

    align-items: center;

    justify-content:
        space-between;

    padding: 16px 24px;

    background: white;

    box-shadow:
        0 2px 10px
        rgba(0,0,0,0.05);
}}

.sidebar {{

    background: #f8fafc;

    padding: 20px;

    width: 250px;

    border-radius: 12px;
}}

"""


        return {

            "html": html,

            "css": css
        }


    except Exception as e:

        print(
            f"❌ Gemini generation error: {e}"
        )

        return {

            "html": f"""
<div style="
    padding:40px;
    font-family:Arial,sans-serif;
">
    <h1>{page_name}</h1>

    <p>
        Code generation failed.
    </p>

    <p>
        {str(e)}
    </p>
</div>
""",

            "css": ""
        }


# ============================================================
# PROJECT MODELS
# ============================================================

class LinkedElement(BaseModel):

    element_id: str

    target_page_id: str

    target_page_name: str


class SinglePageRequest(BaseModel):

    page: Dict[str, Any]

    all_pages: List[Dict[str, Any]]

    linked_elements: List[LinkedElement] = []


class MultiPageRequest(BaseModel):

    pages: List[Dict[str, Any]]

    page_links: Dict[
        str,
        List[LinkedElement]
    ] = {}


# ============================================================
# AUTHENTICATION
# ============================================================

class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


@app.post("/api/auth/signup")
def signup(
    payload: SignupRequest,
    db: Session = Depends(get_db),
):
    name = payload.name.strip()
    email = str(payload.email).strip().lower()

    if not name:
        raise HTTPException(
            status_code=400,
            detail="Name is required.",
        )

    if len(payload.password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least 8 characters.",
        )

    existing_user = (
        db.query(UserDB)
        .filter(UserDB.email == email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists.",
        )

    user = UserDB(
        name=name,
        email=email,
        hashed_password=hash_password(payload.password),
    )

    try:
        db.add(user)
        db.commit()
        db.refresh(user)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to create account.",
        )

    return {
        "status": "success",
        "message": "Account created successfully. You can now log in.",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
        },
    }


@app.post("/api/auth/login")
def login(
    payload: LoginRequest,
    db: Session = Depends(get_db),
):
    email = str(payload.email).strip().lower()

    user = (
        db.query(UserDB)
        .filter(UserDB.email == email)
        .first()
    )

    if not user or not verify_password(
        payload.password,
        user.hashed_password,
    ):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password.",
        )

    token = create_access_token(user.id)

    return {
        "status": "success",
        "message": "Login successful.",
        "access_token": token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
        },
    }


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():

    return {
        "message":
            "VisionCraft API is running"
    }


# ============================================================
# PROJECT ENDPOINTS
# ============================================================

@app.post(
    "/api/projects",
    response_model=APIResponse
)
async def create_project(
    project: ProjectCreate,
    db: Session = Depends(get_db)
):

    try:

        existing = (
            db.query(ProjectDB)
            .filter(
                ProjectDB.name
                == project.name
            )
            .first()
        )

        if existing:

            raise HTTPException(
                status_code=400,
                detail=
                    "Project name already exists"
            )


        db_project = ProjectDB(

            name=project.name,

            description=project.description
        )

        db.add(db_project)

        db.commit()

        db.refresh(db_project)


        home_page = PageDB(

            id=f"home_{db_project.id}",

            project_id=db_project.id,

            name="Home",

            status="draft",

            canvas_data="[]"
        )

        db.add(home_page)


        for page in project.pages:

            if page.id != home_page.id:

                db_page = PageDB(

                    id=page.id,

                    project_id=db_project.id,

                    name=page.name,

                    parent_id=page.parent_id,

                    status=page.status,

                    canvas_data=page.canvas_data,

                    generated_html=
                        page.generated_html,

                    generated_css=
                        page.generated_css,

                    generated_js=
                        page.generated_js
                )

                db.add(db_page)


        db.commit()

        db.refresh(db_project)


        return APIResponse(

            status="success",

            message=
                "Project created successfully",

            data=
                serialize_project(
                    db_project
                )
        )


    except HTTPException:

        raise


    except Exception as e:

        db.rollback()

        raise HTTPException(

            status_code=500,

            detail=str(e)
        )


@app.get(
    "/api/projects",
    response_model=APIResponse
)
async def list_projects(
    db: Session = Depends(get_db)
):

    try:

        projects = (
            db.query(ProjectDB)
            .all()
        )

        return APIResponse(

            status="success",

            data=[
                serialize_project(p)
                for p in projects
            ]
        )


    except Exception as e:

        raise HTTPException(

            status_code=500,

            detail=str(e)
        )


@app.get(
    "/api/projects/{project_id}",
    response_model=APIResponse
)
async def get_project(
    project_id: int,
    db: Session = Depends(get_db)
):

    try:

        project = (
            db.query(ProjectDB)
            .filter(
                ProjectDB.id
                == project_id
            )
            .first()
        )


        if not project:

            raise HTTPException(

                status_code=404,

                detail="Project not found"
            )


        return APIResponse(

            status="success",

            data=
                serialize_project(
                    project
                )
        )


    except HTTPException:

        raise


    except Exception as e:

        raise HTTPException(

            status_code=500,

            detail=str(e)
        )


@app.put(
    "/api/projects/{project_id}",
    response_model=APIResponse
)
async def update_project(
    project_id: int,
    project_update: ProjectUpdate,
    db: Session = Depends(get_db)
):

    try:

        project = (
            db.query(ProjectDB)
            .filter(
                ProjectDB.id
                == project_id
            )
            .first()
        )


        if not project:

            raise HTTPException(

                status_code=404,

                detail="Project not found"
            )


        if project_update.name:

            project.name = (
                project_update.name
            )


        if project_update.description:

            project.description = (
                project_update.description
            )


        db.commit()

        db.refresh(project)


        return APIResponse(

            status="success",

            message="Project updated",

            data=
                serialize_project(
                    project
                )
        )


    except HTTPException:

        raise


    except Exception as e:

        db.rollback()

        raise HTTPException(

            status_code=500,

            detail=str(e)
        )


@app.delete(
    "/api/projects/{project_id}",
    response_model=APIResponse
)
async def delete_project(
    project_id: int,
    db: Session = Depends(get_db)
):

    try:

        project = (
            db.query(ProjectDB)
            .filter(
                ProjectDB.id
                == project_id
            )
            .first()
        )


        if not project:

            raise HTTPException(

                status_code=404,

                detail="Project not found"
            )


        db.delete(project)

        db.commit()


        return APIResponse(

            status="success",

            message=
                "Project deleted successfully"
        )


    except HTTPException:

        raise


    except Exception as e:

        db.rollback()

        raise HTTPException(

            status_code=500,

            detail=str(e)
        )


# ============================================================
# PAGE ENDPOINTS
# ============================================================

@app.post(
    "/api/projects/{project_id}/pages",
    response_model=APIResponse
)
async def add_page(
    project_id: int,
    page: PageCreate,
    db: Session = Depends(get_db)
):

    try:

        project = (
            db.query(ProjectDB)
            .filter(
                ProjectDB.id
                == project_id
            )
            .first()
        )


        if not project:

            raise HTTPException(

                status_code=404,

                detail="Project not found"
            )


        db_page = PageDB(

            id=page.id,

            project_id=project_id,

            name=page.name,

            parent_id=page.parent_id,

            status=page.status,

            canvas_data=page.canvas_data,

            generated_html=
                page.generated_html,

            generated_css=
                page.generated_css,

            generated_js=
                page.generated_js
        )


        db.add(db_page)

        db.commit()

        db.refresh(db_page)


        return APIResponse(

            status="success",

            message="Page added successfully",

            data={
                "id": db_page.id,
                "name": db_page.name
            }
        )


    except HTTPException:

        raise


    except Exception as e:

        db.rollback()

        raise HTTPException(

            status_code=500,

            detail=str(e)
        )


@app.put(
    "/api/pages/{page_id}",
    response_model=APIResponse
)
async def update_page(
    page_id: str,
    page_update: PageUpdate,
    db: Session = Depends(get_db)
):

    try:

        page = (
            db.query(PageDB)
            .filter(
                PageDB.id
                == page_id
            )
            .first()
        )


        if not page:

            raise HTTPException(

                status_code=404,

                detail="Page not found"
            )


        if page_update.name:

            page.name = page_update.name


        if page_update.status:

            page.status = page_update.status


        if page_update.canvas_data is not None:

            page.canvas_data = (
                page_update.canvas_data
            )


        if page_update.generated_html is not None:

            page.generated_html = (
                page_update.generated_html
            )


        if page_update.generated_css is not None:

            page.generated_css = (
                page_update.generated_css
            )


        if page_update.generated_js is not None:

            page.generated_js = (
                page_update.generated_js
            )


        db.commit()

        db.refresh(page)


        return APIResponse(

            status="success",

            message=
                "Page updated successfully",

            data={
                "id": page.id,
                "name": page.name
            }
        )


    except HTTPException:

        raise


    except Exception as e:

        db.rollback()

        raise HTTPException(

            status_code=500,

            detail=str(e)
        )


@app.delete(
    "/api/pages/{page_id}",
    response_model=APIResponse
)
async def delete_page(
    page_id: str,
    db: Session = Depends(get_db)
):

    try:

        page = (
            db.query(PageDB)
            .filter(
                PageDB.id
                == page_id
            )
            .first()
        )


        if not page:

            raise HTTPException(

                status_code=404,

                detail="Page not found"
            )


        db.delete(page)

        db.commit()


        return APIResponse(

            status="success",

            message=
                "Page deleted successfully"
        )


    except HTTPException:

        raise


    except Exception as e:

        db.rollback()

        raise HTTPException(

            status_code=500,

            detail=str(e)
        )


# ============================================================
# AI CODE GENERATION
# ============================================================

@app.post(
    "/api/generate-code"
)
async def generate_code(
    payload: SinglePageRequest
):

    if model is None:

        return {

            "status": "error",

            "message":
                "Gemini model not available. "
                "Check GEMINI_API_KEY."
        }


    try:

        page = payload.page

        linked_elements = (
            payload.linked_elements
        )


        page_name = page.get(
            "name",
            "Untitled"
        )

        canvas_data = page.get(
            "canvas_data",
            []
        )

        frame = page.get(
            "frame",
            None
        )

        element_types = page.get(
            "element_types",
            {}
        )


        if not canvas_data:

            return {

                "status": "error",

                "message":
                    "No canvas data provided"
            }


        code = generate_page_code(

            page_name,

            canvas_data,

            linked_elements,

            frame,

            element_types
        )


        return {

            "status": "success",

            "data": code
        }


    except Exception as e:

        print(
            f"❌ Generation error: {e}"
        )

        return {

            "status": "error",

            "message": str(e)
        }


# ============================================================
# MULTI-PAGE GENERATION
# ============================================================

@app.post(
    "/api/generate-multi-page"
)
async def generate_multi_page(
    payload: MultiPageRequest
):

    if model is None:

        return {

            "status": "error",

            "message":
                "Gemini model not available."
        }


    try:

        all_pages = payload.pages

        page_links = payload.page_links

        results = {}


        for page in all_pages:

            page_name = page.get(
                "name",
                "Untitled"
            )

            page_id = page.get(
                "id",
                "unknown"
            )

            canvas_data = page.get(
                "canvas_data",
                []
            )

            frame = page.get(
                "frame",
                None
            )

            element_types = page.get(
                "element_types",
                {}
            )

            linked_elements = (
                page_links.get(
                    page_id,
                    []
                )
            )


            if not canvas_data:

                results[page_id] = {

                    "html": (
                        "<div "
                        "style='padding:40px;"
                        "text-align:center;"
                        "font-family:sans-serif;'>"
                        f"<h2>{page_name}</h2>"
                        "<p>This page is empty</p>"
                        "</div>"
                    ),

                    "css":
                        "body { font-family: sans-serif; }"
                }

                continue


            code = generate_page_code(

                page_name,

                canvas_data,

                linked_elements,

                frame,

                element_types
            )


            results[page_id] = code


        return {

            "status": "success",

            "data": results
        }


    except Exception as e:

        print(
            f"❌ Multi-page generation error: {e}"
        )

        return {

            "status": "error",

            "message": str(e)
        }
