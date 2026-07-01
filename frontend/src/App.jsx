import React, { useState } from 'react';
import DocumentPanel from './components/DocumentPanel';
import ChatInterface from './components/ChatInterface';
import './App.css';

function App() {
  const [selectedDocIds, setSelectedDocIds] = useState([]);

  const isCodespacesPreviewHost = (host) => {
    return /-3000\.(app\.github\.dev|preview\.app\.github\.dev|githubpreview\.dev)$/.test(host);
  };

  const getCodespacesPreviewApiUrl = (host) => {
    return `https://${host.replace('-3000.', '-5001.')}`;
  };

  const getApiUrl = () => {
    const host = typeof window !== 'undefined' ? window.location.host : '';
    const port = typeof window !== 'undefined' ? window.location.port : '';
    const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
    const isPreview = host && isCodespacesPreviewHost(host);

    if (process.env.REACT_APP_API_URL) {
      const explicitUrl = process.env.REACT_APP_API_URL.trim();
      if (isPreview && explicitUrl.match(/^https?:\/\/(localhost|127\.0\.0\.1):5001/)) {
        console.warn('Detected Codespaces preview environment with local API URL; switching to preview backend host.');
        return getCodespacesPreviewApiUrl(host);
      }

      return explicitUrl;
    }

    if (isPreview) {
      const apiUrl = getCodespacesPreviewApiUrl(host);
      console.info('Detected Codespaces preview, using backend URL:', apiUrl);
      return apiUrl;
    }

    // In Codespaces with dev server (not preview), use proxy
    if (port === '3000' && !isPreview) {
      console.info('Using proxy for local dev server');
      return '';
    }

    // Use relative paths by default so the frontend and API share the same origin.
    return '';
  };

  const apiUrl = getApiUrl();
  console.info('GCF Document Analyst API base URL:', apiUrl);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>GCF Document Analyst</h1>
        <p>Ask questions across your uploaded documents</p>
      </header>
      
      <div className="app-layout">
        <DocumentPanel 
          selectedDocIds={selectedDocIds}
          onSelectChange={setSelectedDocIds}
          apiUrl={apiUrl}
        />
        <ChatInterface 
          selectedDocIds={selectedDocIds}
          apiUrl={apiUrl}
        />
      </div>
    </div>
  );
}

export default App;
