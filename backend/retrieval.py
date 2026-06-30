import os
import json
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np


def load_chunks(doc_ids):
    """
    Load chunks from all specified doc_ids.
    Adds doc_id and filename to each chunk.
    Returns list of enriched chunk dicts.
    """
    all_chunks = []
    
    for doc_id in doc_ids:
        chunks_file = os.path.join("store", doc_id, "chunks.json")
        
        if not os.path.exists(chunks_file):
            continue
        
        try:
            with open(chunks_file, "r") as f:
                doc_data = json.load(f)
            
            filename = doc_data.get("filename", "Unknown")
            chunks = doc_data.get("chunks", [])
            
            for chunk in chunks:
                chunk["doc_id"] = doc_id
                chunk["filename"] = filename
                all_chunks.append(chunk)
        except Exception as e:
            print(f"Error loading chunks from {doc_id}: {str(e)}")
            continue
    
    return all_chunks


def retrieve(question, doc_ids, top_k=5):
    """
    Retrieve top_k most relevant chunks using TF-IDF cosine similarity.
    Returns list of top_k chunks with score field.
    Filters out scores below 0.05.
    """
    all_chunks = load_chunks(doc_ids)
    
    if not all_chunks:
        return []
    
    chunk_texts = [chunk["text"] for chunk in all_chunks]
    
    try:
        vectorizer = TfidfVectorizer(
            max_features=500,
            stop_words="english",
            lowercase=True
        )
        
        combined_texts = chunk_texts + [question]
        tfidf_matrix = vectorizer.fit_transform(combined_texts)
        
        question_vector = tfidf_matrix[-1]
        chunk_vectors = tfidf_matrix[:-1]
        
        similarities = cosine_similarity(question_vector, chunk_vectors)[0]
        
        scored_chunks = []
        for idx, similarity_score in enumerate(similarities):
            if similarity_score > 0.05:
                chunk = all_chunks[idx].copy()
                chunk["score"] = float(similarity_score)
                scored_chunks.append(chunk)
        
        scored_chunks.sort(key=lambda x: x["score"], reverse=True)
        
        return scored_chunks[:top_k]
    
    except Exception as e:
        print(f"Error during retrieval: {str(e)}")
        return []
