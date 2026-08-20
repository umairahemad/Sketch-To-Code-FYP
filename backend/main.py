from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import google.generativeai as genai
import os
import json
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

if api_key:
    genai.configure(api_key=api_key)
    # Using the stable 2.5 flash model
    model = genai.GenerativeModel('gemini-3.6-flash')

app = FastAPI(title="VisionCraft API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SketchPayload(BaseModel):
    sketch_data: List[Dict[str, Any]]

@app.get("/")
def root():
    return {"message": "VisionCraft API is running"}

@app.post("/api/generate-code")
async def generate_code(payload: SketchPayload):
    if not api_key:
        return {"status": "error", "message": "API key missing"}
    
    try:
        layout_string = json.dumps(payload.sketch_data, indent=2)
        
        prompt = f"""
        You are an expert frontend developer. Based on this UI wireframe JSON layout:
        {layout_string}
        
        Generate a working webpage. You MUST output ONLY a valid JSON format with exactly two keys: "html" and "css". 
        Do not write any introduction, no markdown formatting blocks, no explanations. Just raw JSON starting with {{ and ending with }}.
        """
        
        response = model.generate_content(prompt)
        ai_text = response.text.strip()
        
        # Clean up any potential markdown formatting
        if "```json" in ai_text:
            ai_text = ai_text.split("```json")[1].split("```")[0].strip()
        elif "```" in ai_text:
            ai_text = ai_text.split("```")[1].split("```")[0].strip()
            
        # Extract just the JSON object if there is stray text around it
        start_idx = ai_text.find('{')
        end_idx = ai_text.rfind('}')
        if start_idx != -1 and end_idx != -1:
            ai_text = ai_text[start_idx:end_idx+1]

        parsed_data = json.loads(ai_text, strict=False)
        
        return {
            "status": "success", 
            "data": {
                "html": parsed_data.get("html", "<div></div>"),
                "css": parsed_data.get("css", "")
            }
        }

    except Exception as e:
        print(f"Parsing error: {str(e)}")
        # If it ever fails, let's return a clean visual error page so you can see why
        return {
            "status": "success",
            "data": {
                "html": f"<div style='font-family:sans-serif; padding:40px; text-align:center;'><h2>Generation Error</h2><p>{str(e)}</p></div>",
                "css": "body { background: #f8d7da; color: #721c24; }"
            }
        }

    except Exception as e:
        return {
            "status": "success",
            "data": {
                "html": f"<div style='padding:20px; text-align:center;'><h3>Generated via Layout</h3><p>Canvas processed successfully.</p></div>",
                "css": "body { font-family: sans-serif; }"
            }
        }