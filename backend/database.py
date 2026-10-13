from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os

# Database file ka path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_URL = f"sqlite:///{os.path.join(BASE_DIR, 'visioncraft.db')}"

# Engine create karein
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

# Session create karein
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class
Base = declarative_base()

# ==================== PROJECT TABLE ====================
class ProjectDB(Base):
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship with pages
    pages = relationship("PageDB", back_populates="project", cascade="all, delete-orphan")

# ==================== PAGE TABLE ====================
class PageDB(Base):
    __tablename__ = "pages"
    
    id = Column(String, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    name = Column(String)
    parent_id = Column(String, nullable=True)
    status = Column(String, default="draft")
    canvas_data = Column(Text, default="[]")
    generated_html = Column(Text, default="")
    generated_css = Column(Text, default="")
    generated_js = Column(Text, default="")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship with project
    project = relationship("ProjectDB", back_populates="pages")


# ==================== USER TABLE ====================
class UserDB(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


# ==================== DATABASE INITIALIZE ====================
def init_db():
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully!")

# ==================== DATABASE SESSION ====================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Test function
if __name__ == "__main__":
    init_db()
    print("Database file location:", DATABASE_URL)