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
      const origin = window.location.origin;
      const host = window.location.host;

      if (host.includes('-3000.app.github.dev')) {
        return origin.replace('-3000.app.github.dev', '-5001.app.github.dev');
      }

      if (host.includes('preview.app.github.dev') || host.includes('githubpreview.dev')) {
        return origin.replace(/3000/g, '5001');
      }

      if (window.location.port === '3000') {
        return origin.replace(':3000', ':5001');
      }
    }

    return 'http://localhost:5001';
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
