from pydantic import BaseModel, Field
from typing import List, Optional, Any
from datetime import datetime

# ==================== PAGE MODELS ====================

class PageCreate(BaseModel):
    """Naya page create karne ke liye"""
    id: str
    name: str
    parent_id: Optional[str] = None
    status: str = "draft"
    canvas_data: str = "[]"
    generated_html: str = ""
    generated_css: str = ""
    generated_js: str = ""

class PageUpdate(BaseModel):
    """Page update karne ke liye"""
    name: Optional[str] = None
    status: Optional[str] = None
    canvas_data: Optional[str] = None
    generated_html: Optional[str] = None
    generated_css: Optional[str] = None
    generated_js: Optional[str] = None

class PageResponse(BaseModel):
    """Page data return karne ke liye"""
    id: str
    project_id: int
    name: str
    parent_id: Optional[str]
    status: str
    canvas_data: str
    generated_html: str
    generated_css: str
    generated_js: str
    updated_at: datetime
    
    class Config:
        from_attributes = True

# ==================== PROJECT MODELS ====================

class ProjectCreate(BaseModel):
    """Naya project create karne ke liye"""
    name: str
    description: str = ""
    pages: List[PageCreate] = []

class ProjectUpdate(BaseModel):
    """Project update karne ke liye"""
    name: Optional[str] = None
    description: Optional[str] = None

class ProjectResponse(BaseModel):
    """Project data return karne ke liye"""
    id: int
    name: str
    description: str
    created_at: datetime
    updated_at: datetime
    pages: List[PageResponse] = []
    
    class Config:
        from_attributes = True

# ==================== CODE GENERATION MODELS ====================

class ShapeData(BaseModel):
    """Canvas shape data"""
    id: str
    type: str
    x: float
    y: float
    width: Optional[float] = None
    height: Optional[float] = None
    text: Optional[str] = None
    color: Optional[str] = None
    fill: Optional[str] = None

class SketchPayload(BaseModel):
    """Canvas se aane wala data"""
    sketch_data: List[ShapeData]

# ==================== RESPONSE MODEL ====================

class APIResponse(BaseModel):
    """Standard API response format"""
    status: str
    message: str = ""
    data: Optional[Any] = None