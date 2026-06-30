import os
import json
import re
from PyPDF2 import PdfReader


def extract_text(pdf_path):
    """
    Extract text from PDF page by page using pypdf2.
    Returns list of {page, text} dicts, skipping pages with fewer than 50 characters.
    """
    pages = []
    try:
        reader = PdfReader(pdf_path)
        for page_num, page in enumerate(reader.pages):
            text = page.extract_text()
            if text and len(text.strip()) >= 50:
                pages.append({
                    "page": page_num + 1,
                    "text": text.strip()
                })
    except Exception as e:
        raise ValueError(f"Failed to extract text from PDF: {str(e)}")
    
    if not pages:
        raise ValueError(
            "No valid text pages found in PDF. "
            "This may be an image-only or scanned document, which requires OCR before upload."
        )
    
    return pages


def chunk_pages(pages, chunk_size=400, overlap=80):
    """
    Split each page's text into overlapping word-level chunks.
    Returns list of {text, page, chunk_id} dicts, skipping chunks under 100 chars.
    """
    chunks = []
    chunk_id = 0
    
    for page_data in pages:
        page_text = page_data["text"]
        page_num = page_data["page"]
        
        words = page_text.split()
        
        step = max(1, chunk_size - overlap)
        
        for i in range(0, len(words), step):
            chunk_words = words[i:i + chunk_size]
            chunk_text = " ".join(chunk_words)
            
            if len(chunk_text) >= 100:
                chunks.append({
                    "text": chunk_text,
                    "page": page_num,
                    "chunk_id": chunk_id
                })
                chunk_id += 1
    
    return chunks


def save_doc(doc_id, filename, chunks):
    """
    Save document metadata and chunks to store/{doc_id}/chunks.json.
    """
    doc_dir = os.path.join("store", doc_id)
    os.makedirs(doc_dir, exist_ok=True)
    
    doc_data = {
        "filename": filename,
        "chunks": chunks
    }
    
    chunks_file = os.path.join(doc_dir, "chunks.json")
    with open(chunks_file, "w") as f:
        json.dump(doc_data, f, indent=2)
