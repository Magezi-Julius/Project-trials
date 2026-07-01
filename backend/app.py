import os
import json
import uuid
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.exceptions import RequestEntityTooLarge
from werkzeug.utils import secure_filename
from ingestion import extract_text, chunk_pages, save_doc
from retrieval import retrieve
from qa import answer

def load_env_file(path):
    """Load simple KEY=VALUE pairs from a .env file if it exists."""
    if not os.path.exists(path):
        return
    try:
        with open(path, "r") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" not in line:
                    continue
                key, value = line.split("=", 1)
                os.environ.setdefault(key.strip(), value.strip())
    except Exception:
        pass

# If a production build of the frontend exists, serve it from Flask so the
# app and API share the same origin (avoids Codespaces preview CORS/auth redirects).
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_env_file(os.path.join(BASE_DIR, "..", ".env"))
FRONTEND_BUILD = os.path.join(BASE_DIR, "..", "frontend", "build")
if os.path.exists(FRONTEND_BUILD):
    app = Flask(__name__, static_folder=FRONTEND_BUILD, static_url_path="")
else:
    app = Flask(__name__)

# Allow large PDF uploads. Default is 500 MB, but can be overridden with MAX_CONTENT_LENGTH_MB.
max_upload_mb = int(os.getenv("MAX_CONTENT_LENGTH_MB", "500"))
app.config["MAX_CONTENT_LENGTH"] = max_upload_mb * 1024 * 1024

# Allow cross-origin for API consumers during development; when serving the
# frontend from Flask this is not needed for the browser, but harmless.
CORS(app, 
     origins=["*"],
     supports_credentials=True,
     allow_headers=['Content-Type', 'Authorization', 'X-Requested-With'],
     methods=['GET', 'POST', 'OPTIONS', 'DELETE', 'PUT'],
     max_age=3600)

# Add explicit preflight handling for all routes
@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        response = app.make_default_options_response()
        # Get the Origin header from the request
        origin = request.headers.get('Origin')
        if origin:
            response.headers['Access-Control-Allow-Origin'] = origin
        else:
            response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization,X-Requested-With'
        response.headers['Access-Control-Allow-Methods'] = 'GET,POST,OPTIONS,DELETE,PUT'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = '3600'
        return response

UPLOAD_FOLDER = "uploads"
STORE_FOLDER = "store"
ALLOWED_EXTENSIONS = {"pdf"}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(STORE_FOLDER, exist_ok=True)


def allowed_file(filename):
    """Check if the uploaded file has a .pdf extension."""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route("/upload", methods=["POST"])
def upload():
    """
    Accept multipart PDF upload.
    Returns {doc_id, filename, pages, chunks}.
    """
    try:
        if "file" not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files["file"]
        
        if file.filename == "":
            return jsonify({"error": "No file selected"}), 400
        
        if not allowed_file(file.filename):
            return jsonify({"error": "Only PDF files are allowed"}), 400
        
        doc_id = str(uuid.uuid4())[:8]
        filename = secure_filename(file.filename)
        filepath = os.path.join(UPLOAD_FOLDER, f"{doc_id}.pdf")
        
        file.save(filepath)
        
        pages = extract_text(filepath)
        chunks = chunk_pages(pages)
        
        save_doc(doc_id, filename, chunks)
        
        return jsonify({
            "doc_id": doc_id,
            "filename": filename,
            "pages": len(pages),
            "chunks": len(chunks)
        }), 200
    
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Upload failed: {str(e)}"}), 500


@app.route("/ask", methods=["POST"])
def ask():
    """
    Accept {question, doc_ids[]}.
    Returns {answer, sources[]}.
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No JSON body provided"}), 400
        
        question = data.get("question", "").strip()
        doc_ids = data.get("doc_ids", [])
        
        if not question:
            return jsonify({"error": "Question is required"}), 400
        
        if not doc_ids:
            return jsonify({"error": "At least one document must be selected"}), 400
        
        retrieved_chunks = retrieve(question, doc_ids, top_k=5)
        
        result = answer(question, retrieved_chunks)
        
        return jsonify(result), 200
    
    except Exception as e:
        return jsonify({"error": f"Ask failed: {str(e)}"}), 500


@app.route("/documents", methods=["GET"])
def documents():
    """
    Read all store/*/chunks.json.
    Returns list of {doc_id, filename, chunks_count}.
    """
    try:
        docs = []
        
        if not os.path.exists(STORE_FOLDER):
            return jsonify(docs), 200
        
        for doc_id in os.listdir(STORE_FOLDER):
            doc_path = os.path.join(STORE_FOLDER, doc_id)
            if not os.path.isdir(doc_path):
                continue
            
            chunks_file = os.path.join(doc_path, "chunks.json")
            if os.path.exists(chunks_file):
                try:
                    with open(chunks_file, "r") as f:
                        doc_data = json.load(f)
                    
                    filename = doc_data.get("filename", "Unknown")
                    chunks_count = len(doc_data.get("chunks", []))
                    
                    docs.append({
                        "doc_id": doc_id,
                        "filename": filename,
                        "chunks_count": chunks_count
                    })
                except Exception as e:
                    print(f"Error reading {chunks_file}: {str(e)}")
                    continue
        
        return jsonify(docs), 200
    
    except Exception as e:
        return jsonify({"error": f"Failed to list documents: {str(e)}"}), 500


@app.route("/documents/<doc_id>", methods=["DELETE"])
def delete_document(doc_id):
    """
    Delete store/{doc_id}/ and uploads/{doc_id}.pdf.
    Returns {deleted: true}.
    """
    try:
        store_path = os.path.join(STORE_FOLDER, doc_id)
        upload_path = os.path.join(UPLOAD_FOLDER, f"{doc_id}.pdf")
        
        if os.path.exists(store_path):
            import shutil
            shutil.rmtree(store_path)
        
        if os.path.exists(upload_path):
            os.remove(upload_path)
        
        return jsonify({"deleted": True}), 200
    except Exception as e:
        return jsonify({"error": f"Delete failed: {str(e)}"}), 500


@app.errorhandler(RequestEntityTooLarge)
def handle_request_entity_too_large(error):
    return jsonify({"error": "File too large. Please upload a PDF under 50 MB."}), 413


@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    """Serve the built React app when available. If no build exists, return helpful message."""
    # If frontend build exists, serve files; otherwise inform user.
    if os.path.exists(FRONTEND_BUILD):
        if path != '' and os.path.exists(os.path.join(FRONTEND_BUILD, path)):
            return send_from_directory(FRONTEND_BUILD, path)
        return send_from_directory(FRONTEND_BUILD, 'index.html')

    return jsonify({
        "message": "Frontend build not found. Run npm run build in the frontend/ folder or start the React dev server separately."
    }), 200


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5001)
