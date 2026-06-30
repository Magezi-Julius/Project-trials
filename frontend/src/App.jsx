import React, { useState } from 'react';
import DocumentPanel from './components/DocumentPanel';
import ChatInterface from './components/ChatInterface';
import './App.css';

function App() {
  const [selectedDocIds, setSelectedDocIds] = useState([]);

  const getApiUrl = () => {
    if (process.env.REACT_APP_API_URL) {
      return process.env.REACT_APP_API_URL;
    }

    if (typeof window !== 'undefined') {
      const host = window.location.host;
      const port = window.location.port;

      // In Codespaces preview, the frontend may be served from the 3000 preview URL,
      // while the backend runs on the corresponding 5001 preview URL.
      if (host.includes('-3000.app.github.dev')) {
        return `https://${host.replace('-3000.app.github.dev', '-5001.app.github.dev')}`;
      }
      if (host.includes('-3000.preview.app.github.dev')) {
        return `https://${host.replace('-3000.preview.app.github.dev', '-5001.preview.app.github.dev')}`;
      }
      if (host.includes('-3000.githubpreview.dev')) {
        return `https://${host.replace('-3000.githubpreview.dev', '-5001.githubpreview.dev')}`;
      }

      // Use the React dev server proxy in local development.
      if (port === '3000') {
        return '';
      }
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
