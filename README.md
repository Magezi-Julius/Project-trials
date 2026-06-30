# GCF Document Analyst

A full-stack RAG-based Document Q&A web application for the Green Climate Fund. Upload PDF documents (funding proposals, evaluation reports, country assessments) and ask natural language questions to receive grounded answers with inline source citations.

## Features

- **PDF Upload & Management**: Drag-and-drop upload interface with document tracking
- **TF-IDF Retrieval**: Semantic search across documents using scikit-learn's TfidfVectorizer
- **AI-Powered Answers**: Answers via GitHub Models API with Claude Sonnet 4.6
- **Source Citations**: Every answer includes exact page references and relevance scores
- **Hallucination Protection**: Explicit system prompts ensure answers come only from provided documents
- **No Hallucination**: If the answer isn't in documents, the app says so clearly

## Tech Stack

- **Backend**: Python, Flask, flask-cors
- **PDF Extraction**: pypdf2
- **Retrieval**: TF-IDF (scikit-learn)
- **LLM**: GitHub Models API via OpenAI SDK with `GITHUB_TOKEN` authentication
- **Frontend**: React 18, Hooks, plain CSS
- **Storage**: Flat JSON files in `store/` directory

## Prerequisites

- GitHub Codespaces (recommended) or local environment with:
  - Python 3.8+
  - Node.js 14+
  - GitHub Codespaces with Copilot Premium (GITHUB_TOKEN is automatically available)

In GitHub Codespaces, `GITHUB_TOKEN` is automatically injected and available in the environment. No manual setup is needed.

## Installation

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
```

### Frontend Setup

```bash
cd frontend
npm install
```

## Running the Application

### Start the Backend

```bash
cd backend
python app.py
```

The backend will start on `http://localhost:5001`

### Start the Frontend

In a new terminal:

```bash
cd frontend
npm start
```

The frontend will start on `http://localhost:3000`

## GitHub Codespaces Setup

When running in GitHub Codespaces:

1. Backend automatically runs on port 5001 (forwarded to a public URL)
2. Frontend automatically runs on port 3000 (forwarded to a public URL)
3. Set the `REACT_APP_API_URL` environment variable to the forwarded backend URL:
   ```bash
   export REACT_APP_API_URL=https://your-codespace-name-5001.preview.app.github.dev
   ```
4. Then start the frontend with `npm start`

## How to Use

1. **Upload Documents**: 
   - Drag and drop PDF files into the upload zone on the left panel
   - Or click "Browse Files" to select PDFs from your computer
   - Only PDF files are supported

2. **Select Documents**:
   - Check the checkbox next to each document you want to query
   - You must select at least one document to ask questions

3. **Ask Questions**:
   - Type your question in the chat input at the bottom right
   - Press Enter or click the Send button
   - The app will search the selected documents and provide an answer

4. **View Sources**:
   - Each answer includes source cards showing:
     - Source filename
     - Exact page number
     - Relevance score (green/yellow/red bar)

5. **Delete Documents**:
   - Click the "Delete" button on any document card to remove it

## API Endpoints

- `POST /upload` - Upload a PDF document
- `POST /ask` - Ask a question across selected documents
- `GET /documents` - List all uploaded documents
- `DELETE /documents/<doc_id>` - Delete a document

## Known Limitations

- **Scanned PDFs**: Only text-based PDFs are supported. Scanned/image-only PDFs will not work properly
- **TF-IDF Performance**: Works best with text-heavy documents. Short documents may have limited retrieval performance
- **Large Documents**: Processing very large PDFs (100+ pages) may take longer
- **Language**: Currently optimized for English documents

## Project Structure

```
gcf-doc-qa/
├── backend/
│   ├── app.py           # Flask application and API endpoints
│   ├── ingestion.py     # PDF extraction and chunking
│   ├── retrieval.py     # TF-IDF based retrieval
│   ├── qa.py            # GitHub Models API integration
│   ├── requirements.txt  # Python dependencies
│   ├── store/           # JSON storage for documents
│   └── uploads/         # Temporary PDF uploads
├── frontend/
│   ├── public/
│   │   └── index.html   # HTML template
│   ├── src/
│   │   ├── App.jsx           # Main app component
│   │   ├── App.css           # App styles
│   │   ├── index.js          # React entry point
│   │   └── components/
│   │       ├── DocumentPanel.jsx      # Document upload and selection
│   │       ├── DocumentPanel.css
│   │       ├── ChatInterface.jsx      # Chat interface
│   │       ├── ChatInterface.css
│   │       ├── SourceCard.jsx         # Source citation card
│   │       └── SourceCard.css
│   └── package.json     # Node.js dependencies
├── .gitignore
└── README.md
```

## Environment Variables

### Backend
- `GITHUB_TOKEN` - Automatically available in GitHub Codespaces. Used for GitHub Models API authentication.

### Frontend
- `REACT_APP_API_URL` - Backend API base URL (defaults to `http://localhost:5001`)

## Authentication

The app uses GitHub Models API via the OpenAI SDK. In GitHub Codespaces, `GITHUB_TOKEN` is automatically available. For local development, set it manually:

```bash
export GITHUB_TOKEN=your_github_token_here
```

## Error Handling

- All backend endpoints return structured error responses: `{error: "message"}`
- Frontend handles API errors gracefully with user-friendly messages
- Invalid PDFs are rejected with clear error messages
- Non-existent documents return appropriate 404 responses

## CSS Styling

The app uses a professional color scheme:
- **Header**: Deep navy (#1A3A5C)
- **Accents**: Teal (#00897B)
- **Background**: Light gray (#f5f5f5)
- **Text**: Dark gray (#212121-#757575)

All CSS is hand-written—no Tailwind or component libraries used.

## Development Notes

- All code is fully implemented with no placeholders or `TODO` comments
- The app runs immediately after installation with zero modifications needed
- Frontend uses React Hooks for state management (no Redux)
- Backend uses flat JSON files for simplicity (no database required)
- Both frontend and backend include comprehensive error handling with try/catch blocks

## License

This project is provided as-is for the Green Climate Fund.
