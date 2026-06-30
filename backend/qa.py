import json
import os
import urllib.request
from openai import OpenAI


def _get_available_models():
    try:
        request = urllib.request.Request(
            "https://models.inference.ai.azure.com/models",
            headers={
                "Authorization": f"Bearer {os.environ['GITHUB_TOKEN']}",
                "Content-Type": "application/json"
            }
        )
        with urllib.request.urlopen(request, timeout=30) as response:
            data = json.load(response)

        if isinstance(data, list):
            return [item.get("name") or item.get("id") for item in data if isinstance(item, dict)]
        if isinstance(data, dict) and "data" in data:
            return [item.get("name") or item.get("id") for item in data.get("data", []) if isinstance(item, dict)]
    except Exception:
        pass

    return []


def _choose_fallback_model(models):
    for candidate in ["gpt-4o-mini", "gpt-4o", "Meta-Llama-3.1-8B-Instruct", "Meta-Llama-3.1-405B-Instruct"]:
        for model in models:
            if model and candidate.lower() in model.lower():
                return candidate
    for model in models:
        if model and any(keyword in model.lower() for keyword in ["gpt", "llama", "instruct"]):
            return model
    return "gpt-4o-mini"


def answer(question, retrieved_chunks):
    """
    Generate an answer using GitHub Models API via OpenAI SDK.
    Returns {answer, sources} where sources is a list of {filename, page, score}.
    If no chunks are retrieved, returns a hardcoded no-results message.
    """
    if not retrieved_chunks:
        return {
            "answer": "I don't have any relevant information in the selected documents to answer your question. Please try selecting different documents or rephrasing your question.",
            "sources": []
        }
    
    context_parts = []
    sources = []
    
    for idx, chunk in enumerate(retrieved_chunks, 1):
        context_parts.append(
            f"[Source {idx} — {chunk['filename']}, Page {chunk['page']}]\n{chunk['text']}"
        )
        sources.append({
            "filename": chunk["filename"],
            "page": chunk["page"],
            "score": chunk.get("score", 0)
        })
    
    context = "\n\n".join(context_parts)
    
    system_prompt = """You are a helpful document analysis assistant for the Green Climate Fund. Your role is to answer questions based strictly on the provided document excerpts. 

IMPORTANT RULES:
1. Only answer based on the document excerpts provided below. Do not use any training knowledge or external information.
2. If the answer to the question is not present in the provided excerpts, clearly state: "This information is not available in the selected documents."
3. Always cite your sources inline using the exact format [Source N] where N matches the source number in the document excerpts.
4. Be precise and factual. Do not speculate or infer beyond what is explicitly stated in the documents.
5. If multiple sources contain relevant information, cite all of them."""
    
    user_prompt = f"""Please answer the following question based ONLY on the provided document excerpts. Remember to cite sources using [Source N] format.

Question: {question}

Document Excerpts:
{context}

Answer:"""
    
    try:
        client = OpenAI(
            base_url="https://models.inference.ai.azure.com",
            api_key=os.environ["GITHUB_TOKEN"]
        )

        model_name = "claude-sonnet-4-6"
        try:
            response = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=1000
            )
        except Exception as first_error:
            if "unknown_model" in str(first_error).lower() or "Unknown model" in str(first_error):
                available_models = _get_available_models()
                fallback_model = _choose_fallback_model(available_models)
                response = client.chat.completions.create(
                    model=fallback_model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    max_tokens=1000
                )
            else:
                raise
        
        answer_text = response.choices[0].message.content
        
        return {
            "answer": answer_text,
            "sources": sources
        }
    
    except KeyError:
        return {
            "answer": "Error: GITHUB_TOKEN environment variable is not set. Please ensure you are running this in GitHub Codespaces or have set the GITHUB_TOKEN manually.",
            "sources": []
        }
    except Exception as e:
        return {
            "answer": f"Error generating answer: {str(e)}",
            "sources": []
        }
