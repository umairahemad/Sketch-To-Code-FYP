from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from jose import JWTError, jwt
import bcrypt
import google.generativeai as genai
import os
import json
import re
import time
from dotenv import load_dotenv


# ============================================================
# DATABASE IMPORTS
# ============================================================

from database import engine, Base, get_db
from models import User

# ✅ Safe table creation (won't crash if tables exist)
try:
    Base.metadata.create_all(bind=engine, checkfirst=True)
    print("✅ Database tables ready")
except Exception as e:
    print(f"⚠️  DB warning (safe to ignore): {e}")


# ============================================================
# CONFIG
# ============================================================

load_dotenv()

# JWT config
SECRET_KEY = os.getenv("SECRET_KEY", "change-this-in-production-1234567890-abc")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7   # 7 days

# Bearer token security
security = HTTPBearer()

# Gemini
api_key = os.getenv("GEMINI_API_KEY")


# ============================================================
# GEMINI SETUP
# ============================================================

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
                "You are a SENIOR DESIGN ENGINEER at Stripe, Linear, Vercel, "
                "and Framer. You build WORLD-CLASS, STUNNING, "
                "PRODUCTION-QUALITY webpages that win design awards.\n\n"

                "ABSOLUTE RULES (NEVER BREAK):\n"
                "1. Output EXACTLY the elements the user drew. No new elements.\n"
                "2. Use the EXACT base color the user chose.\n"
                "3. Each element MUST have inline position:absolute.\n"
                "4. All elements are siblings inside .canvas-root.\n\n"

                "WHERE YOU HAVE TOTAL CREATIVE FREEDOM:\n"
                "Style, polish, animations, shadows, gradients, typography — "
                "everything is yours to make it beautiful.\n\n"

                "DESIGN QUALITY BAR:\n"
                "Every output must look like a real production SaaS product.\n"
                "Multi-layer shadows. Rich gradients. Smooth micro-animations.\n"
                "Refined typography. Perfect spacing. Premium feel.\n\n"

                "OUTPUT: raw JSON only with 'html' and 'css' keys."
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
    allow_origins=["http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# PYDANTIC MODELS
# ============================================================

class SketchPayload(BaseModel):
    sketch_data: List[Dict[str, Any]]
    canvas_bounds: Dict[str, Any] = {}


class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# ============================================================
# AUTH HELPERS (✅ Direct bcrypt — Python 3.14 compatible)
# ============================================================

def hash_password(password: str) -> str:
    """Hash password with bcrypt (truncated to 72 bytes)."""
    pw_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pw_bytes, salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Verify password against bcrypt hash."""
    try:
        pw_bytes = plain.encode("utf-8")[:72]
        return bcrypt.checkpw(pw_bytes, hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    try:
        payload = jwt.decode(
            credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM]
        )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# ============================================================
# AUTH ENDPOINTS
# ============================================================

@app.post("/api/auth/signup")
async def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    # Check existing email
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered. Please login instead.",
        )

    # Create user
    user = User(
        name=payload.name.strip(),
        email=payload.email.lower().strip(),
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "status": "success",
        "message": "Account created successfully",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
        },
    }


@app.post("/api/auth/login")
async def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower().strip()).first()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    token = create_access_token({"sub": str(user.id), "email": user.email})

    return {
        "status": "success",
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
        },
    }


@app.get("/api/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
    }


# ============================================================
# COLOR MAP + PALETTE
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


def hex_to_rgb(hex_color: str):
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))


def generate_palette(base_hex: str) -> dict:
    r, g, b = hex_to_rgb(base_hex)

    def clamp(v):
        return max(0, min(255, int(v)))

    def lighten(amount):
        lr = clamp(r + (255 - r) * amount)
        lg = clamp(g + (255 - g) * amount)
        lb = clamp(b + (255 - b) * amount)
        return f"#{lr:02x}{lg:02x}{lb:02x}"

    def darken(amount):
        dr = clamp(r * (1 - amount))
        dg = clamp(g * (1 - amount))
        db = clamp(b * (1 - amount))
        return f"#{dr:02x}{dg:02x}{db:02x}"

    return {
        "base": base_hex,
        "light": lighten(0.30),
        "lighter": lighten(0.60),
        "lightest": lighten(0.85),
        "dark": darken(0.15),
        "darker": darken(0.30),
        "deepest": darken(0.50),
        "glow": f"rgba({r}, {g}, {b}, 0.35)",
        "glow_strong": f"rgba({r}, {g}, {b}, 0.55)",
        "soft": f"rgba({r}, {g}, {b}, 0.15)",
        "softer": f"rgba({r}, {g}, {b}, 0.08)",
        "border": f"rgba({r}, {g}, {b}, 0.25)",
        "rgb": f"{r}, {g}, {b}",
    }


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():
    return {"message": "Sketch2Code API running", "model": current_model_name}


# ============================================================
# GENERATE CODE
# ============================================================

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

        print(
            f"🎨 Page root: color={page_root_color} "
            f"({page_root_css_color}), fill={page_root_fill}"
        )

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
            palette = generate_palette(css_color)
            abs_left = x - canvas_min_x
            abs_top = y - canvas_min_y

            line = (
                f"- type={assigned or stype} "
                f"| pos=({abs_left},{abs_top}) size={w}x{h}\n"
                f"  BASE: {palette['base']}\n"
                f"  LIGHT TINTS: {palette['light']} | {palette['lighter']} | {palette['lightest']}\n"
                f"  DARK SHADES: {palette['dark']} | {palette['darker']} | {palette['deepest']}\n"
                f"  GLOW: {palette['glow']}\n"
                f"  SOFT BG: {palette['soft']}\n"
                f"  BORDER: {palette['border']}\n"
                f"  RGB: {palette['rgb']}"
            )

            if text:
                line += f'\n  text="{text}"'

            lines.append(line)

        layout = "\n\n".join(lines)

        # ----------------------------------------------------
        # Prompt
        # ----------------------------------------------------
        prompt = (
            "Transform this wireframe into a STUNNING, WORLD-CLASS webpage.\n\n"
            "Design target: Stripe / Linear / Vercel / Framer / Apple.\n"
            "Make people say WOW.\n\n"
            f"CANVAS: {canvas_w}x{canvas_h}px\n\n"
            "===========================================\n"
            "ELEMENTS TO RENDER (with full color palettes):\n"
            "===========================================\n\n"
            f"{layout}\n\n"
            "===========================================\n"
            "ABSOLUTE RULES (NEVER BREAK):\n"
            "===========================================\n\n"
            "1. Output EXACTLY these elements. Do NOT add new elements.\n"
            "2. Do NOT create wrapper divs, headings, dividers, or text.\n"
            "3. Each element MUST have inline style:\n"
            "   position: absolute; left: Xpx; top: Ypx; width: Wpx; height: Hpx;\n"
            "4. All elements are siblings inside .canvas-root.\n"
            "5. Do NOT style .canvas-root.\n"
            "6. Use ONLY the colors from the palettes above.\n\n"
            "===========================================\n"
            "FULL CREATIVE FREEDOM (STYLE ONLY):\n"
            "===========================================\n\n"
            "You have COMPLETE FREEDOM to make this beautiful.\n\n"

            "BUTTONS - WOW MASTERPIECE:\n"
            "- Multi-stop linear-gradient (BASE -> DARK -> DARKER)\n"
            "- Multi-layer box-shadow (4 layers) for deep 3D feel\n"
            "- Border-radius: 12-16px\n"
            "- Padding: 16px 32px\n"
            "- Font-weight: 700, letter-spacing: 0.02em\n"
            "- Text-shadow: 0 1px 2px rgba(0,0,0,0.15)\n"
            "- Transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)\n"
            "- Hover: translateY(-3px) scale(1.03)\n"
            "- Active: translateY(0) scale(0.97)\n\n"

            "INPUTS - PREMIUM:\n"
            "- Background: #ffffff, border 1.5px solid #e5e7eb\n"
            "- Border-radius: 12px, padding 16px 20px\n"
            "- Font-size 15px, font-weight 500\n"
            "- Focus: border-color BASE, ring 0 0 0 4px SOFT\n\n"

            "LABELS - REFINED:\n"
            "- color: BASE\n"
            "- font-weight: 600, font-size 13px\n"
            "- letter-spacing: 0.5px\n"
            "- text-transform: uppercase\n\n"

            "CARDS - ELEGANT:\n"
            "- Background: linear-gradient(135deg, #ffffff -> LIGHTEST)\n"
            "- Border-radius: 20px, border 1px solid BORDER\n"
            "- Multi-layer shadow (3 layers)\n"
            "- Hover: translateY(-6px)\n\n"

            "===========================================\n"
            "FINAL REMINDER:\n"
            "===========================================\n\n"
            "- Elements: STRICT (only what's listed)\n"
            "- Colors: STRICT (use palette shades)\n"
            "- Style/Animation: TOTAL FREEDOM\n\n"
            "Return ONLY raw JSON:\n"
            '{"html": "...", "css": "..."}'
        )

        response = model.generate_content(
            prompt,
            generation_config={
                "max_output_tokens": 6000,
                "temperature": 1.0,
                "top_p": 0.95,
                "top_k": 50,
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

        # ----------------------------------------------------
        # POST-PROCESS
        # ----------------------------------------------------
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

        css = re.sub(r'\.canvas-root\s*\{[^}]*\}', '', css)

        BASE_WIDTH = 1000
        scale = BASE_WIDTH / canvas_w if canvas_w > 0 else 1.2
        scale = max(0.8, min(1.4, scale))

        print(f"🔍 Zoom scale: {scale:.2f}x")

        if has_page_root:
            if page_root_fill == "none":
                forced_page_root_style = (
                    f"border: 2px solid {page_root_css_color} !important; "
                    f"background: #ffffff !important;"
                )
            else:
                forced_page_root_style = (
                    f"background: {page_root_css_color} !important; "
                    f"border: none !important;"
                )
        else:
            forced_page_root_style = "background: #ffffff !important;"

        css += f"""

html, body {{
  margin: 0;
  padding: 0;
  width: 100%;
  min-height: 100vh;
  background: #f1f5f9;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
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
  {forced_page_root_style}
  box-sizing: border-box;
  overflow: visible !important;
  margin: 0 auto !important;
  padding: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}}

* {{
  -webkit-tap-highlight-color: transparent;
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