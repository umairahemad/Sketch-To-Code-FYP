# Sketch to Code

Sketch to Code is an AI-powered web application that converts hand-drawn UI wireframes into clean HTML and CSS.

Users can create a website layout on an interactive canvas, assign UI elements such as buttons, text fields, cards, navigation bars, and website boundaries, then generate frontend code using Gemini AI.

## Features

- Draw UI wireframes on an interactive canvas
- Add shapes, text, and layout elements
- Right-click an element to assign its website role
  - Website boundary
  - Buttons
  - Text
  - Text inputs
  - Dropdowns
  - Checkboxes
  - Navigation bars
  - Cards
  - Images
- View selected shape properties such as position, size, colour, and text
- Send layout coordinates and assigned element types to Gemini AI
- Generate HTML and CSS from the wireframe
- Preview generated code live
- Edit and copy generated HTML and CSS

## Tech Stack

### Frontend

- React
- Vite
- tldraw
- React Router

### Backend

- FastAPI
- Python
- Google Gemini API

## Project Structure

```text
Sketch-To-Code/
├── src/
│   ├── App.jsx
│   ├── canvas.jsx
│   ├── homepage.jsx
│   └── main.jsx
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── .env
├── package.json
├── start.bat
└── README.md
```

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/YOUR-USERNAME/Sketch-To-Code.git
cd Sketch-To-Code
```

### 2. Install frontend dependencies

```bash
npm install
```

### 3. Set up the backend

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment:

**Windows PowerShell**

```powershell
.\.venv\Scripts\Activate.ps1
```

Install Python dependencies:

```bash
pip install -r requirements.txt
```

### 4. Add your Gemini API key

Create a `.env` file inside the `backend` folder:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

Never upload the `.env` file or your API key to GitHub.

## Running the Project

From the project root:

```powershell
.\start.bat
```

Or run the frontend and backend separately.

Frontend:

```bash
npm run dev
```

Backend:

```bash
cd backend
uvicorn main:app --reload
```

## How It Works

1. Create a wireframe on the canvas.
2. Select an object and assign its intended website element type.
3. Click **Generate Code**.
4. The app sends shape information, coordinates, dimensions, text, and assigned element types to the backend.
5. Gemini AI generates HTML and CSS based on the wireframe.
6. Review the generated code and preview it in the application.

## Environment Variables

| Variable | Description |
| --- | --- |
| `GEMINI_API_KEY` | Your Google Gemini API key used for code generation |

## Security

- Do not commit `.env` files.
- Do not share your Gemini API key.
- Add this entry to `.gitignore` if it is not already present:

```gitignore
backend/.env
```

## Future Improvements

- Save and load wireframe projects
- Support multi-page website generation
- Export generated projects
- Add more UI element types
- Improve responsive design generation
- Add reusable component templates

## Contributors

- Shaikh Umair Ahemad
- Uzaif shaikh
- Pathan Akmal
- Toufik deshmukh 

## License

This project is created for educational and academic purposes.
