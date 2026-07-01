import React, { useState, useEffect } from 'react';
import './DocumentPanel.css';

const MAX_UPLOAD_MB = parseInt(process.env.REACT_APP_MAX_UPLOAD_MB || '500', 10);
const LARGE_UPLOAD_WARNING_MB = 20;

function DocumentPanel({ selectedDocIds, onSelectChange, apiUrl }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadWarning, setUploadWarning] = useState('');
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`${apiUrl || ''}/documents`);
      if (!response.ok) throw new Error('Failed to fetch documents');
      const data = await response.json();
      setDocuments(data);
    } catch (err) {
      setError('Failed to load documents');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files) => {
    const file = files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Only PDF files are allowed');
      return;
    }

    const fileSizeMb = file.size / 1024 / 1024;
    if (fileSizeMb > MAX_UPLOAD_MB) {
      setError(`File is too large. Maximum allowed size is ${MAX_UPLOAD_MB} MB.`);
      return;
    }

    if (fileSizeMb >= LARGE_UPLOAD_WARNING_MB) {
      setUploadWarning(
        `This file is large (${fileSizeMb.toFixed(1)} MB). Upload may take a while.`
      );
    } else {
      setUploadWarning('');
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true);
      setProgress(0);
      setError('');

      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const uploadUrl = `${apiUrl || ''}/upload`;
        console.log('Upload URL:', uploadUrl);
        console.log('API URL:', apiUrl);
        xhr.open('POST', uploadUrl);
        
        // Enable credentials for cross-origin requests (needed for Codespaces preview)
        xhr.withCredentials = true;

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setProgress(Math.round((event.loaded / event.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            let message = `Upload failed (${xhr.status})`;
            try {
              const errorData = JSON.parse(xhr.responseText);
              message = errorData.error || message;
            } catch {
              if (xhr.responseText) message = xhr.responseText;
            }
            reject(new Error(message));
          }
        };

        xhr.onerror = () => {
          console.error('XHR error - URL:', uploadUrl, 'ReadyState:', xhr.readyState, 'Status:', xhr.status);
          reject(new Error('Upload failed due to network error'));
        };
        
        xhr.ontimeout = () => {
          console.error('XHR timeout - URL:', uploadUrl);
          reject(new Error('Upload timed out'));
        };
        
        xhr.send(formData);
      });

      await fetchDocuments();
    } catch (err) {
      setError(err.message || 'Upload failed');
      console.error(err);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const handleBrowseClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.onchange = (e) => handleFileUpload(e.target.files);
    input.click();
  };

  const handleDelete = async (docId) => {
    try {
      const response = await fetch(`${apiUrl || ''}/documents/${docId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Delete failed');

      onSelectChange(selectedDocIds.filter(id => id !== docId));
      await fetchDocuments();
    } catch (err) {
      setError('Failed to delete document');
      console.error(err);
    }
  };

  const handleToggleSelect = (docId) => {
    if (selectedDocIds.includes(docId)) {
      onSelectChange(selectedDocIds.filter(id => id !== docId));
    } else {
      onSelectChange([...selectedDocIds, docId]);
    }
  };

  return (
    <div className="document-panel">
      <div className="panel-header">
        <h2>Documents</h2>
      </div>

      <div
        className={`upload-zone ${dragActive ? 'active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="upload-content">
          <p className="upload-text">Drag PDF files here</p>
          <p className="upload-subtext">or</p>
          <button
            className="browse-button"
            onClick={handleBrowseClick}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Browse Files'}
          </button>
        </div>
      </div>

      {uploadWarning && !error && (
        <div className="upload-warning">{uploadWarning}</div>
      )}

      {uploading && (
        <div className="progress-bar-container">
          <div className="progress-bar" style={{ width: `${progress}%` }} />
          <div className="progress-label">Uploading... {progress}%</div>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      <div className="documents-list">
        {loading && <p className="loading-text">Loading documents...</p>}

        {!loading && documents.length === 0 && (
          <p className="empty-state">No documents uploaded yet</p>
        )}

        {!loading && documents.length > 0 && documents.map((doc) => (
          <div key={doc.doc_id} className="document-card">
            <div className="card-header">
              <input
                type="checkbox"
                checked={selectedDocIds.includes(doc.doc_id)}
                onChange={() => handleToggleSelect(doc.doc_id)}
                className="doc-checkbox"
              />
              <div className="card-title">
                <h3>{doc.filename}</h3>
              </div>
            </div>
            <div className="card-meta">
              <span className="meta-item">
                <span className="meta-label">Chunks:</span>
                <span className="meta-value">{doc.chunks_count}</span>
              </span>
            </div>
            <button
              className="delete-button"
              onClick={() => handleDelete(doc.doc_id)}
              title="Delete document"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DocumentPanel;
