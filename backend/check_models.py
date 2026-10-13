import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("❌ No API key found in .env file")
    exit()

print("✅ API key found. Configuring...")
genai.configure(api_key=api_key)

print("\n📋 Available models:")
print("=" * 50)

try:
    # Try different ways to list models
    models = genai.list_models()
    
    for model in models:
        # Check if model supports generateContent
        if 'generateContent' in model.supported_generation_methods:
            print(f"✅ {model.name} - supports generateContent")
        else:
            print(f"⚠️  {model.name} - no generateContent support")
            
except Exception as e:
    print(f"❌ Error listing models: {e}")
    print("\nTrying alternative method...")
    
    try:
        # Alternative: try to use a model directly
        test_model = genai.GenerativeModel('models/gemini-pro')
        print("✅ 'models/gemini-pro' works!")
    except:
        try:
            test_model = genai.GenerativeModel('models/gemini-1.5-pro')
            print("✅ 'models/gemini-1.5-pro' works!")
        except:
            try:
                test_model = genai.GenerativeModel('models/gemini-2.0-flash-exp')
                print("✅ 'models/gemini-2.0-flash-exp' works!")
            except Exception as e2:
                print(f"❌ No models work: {e2}")
                print("\n💡 Try creating a new API key in Google AI Studio:")
                print("   https://aistudio.google.com/apikey")