import React, { useState, useEffect } from 'react';
import './DocumentPanel.css';

function DocumentPanel({ selectedDocIds, onSelectChange, apiUrl }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`${apiUrl}/documents`);
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

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true);
      setError('');
      const response = await fetch(`${apiUrl}/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      await fetchDocuments();
    } catch (err) {
      setError(err.message || 'Upload failed');
      console.error(err);
    } finally {
      setUploading(false);
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
      const response = await fetch(`${apiUrl}/documents/${docId}`, {
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
