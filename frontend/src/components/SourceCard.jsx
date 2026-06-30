import React from 'react';
import './SourceCard.css';

function SourceCard({ source, sourceNumber }) {
  const scorePercentage = Math.round(source.score * 100);
  
  const getScoreColor = () => {
    if (scorePercentage >= 70) return '#4caf50';
    if (scorePercentage >= 40) return '#ffa726';
    return '#ef5350';
  };

  return (
    <div className="source-card">
      <div className="source-header">
        <span className="source-label">Source {sourceNumber}</span>
        <span className="source-filename">{source.filename}</span>
      </div>
      <div className="source-details">
        <span className="page-info">Page {source.page}</span>
      </div>
      <div className="relevance-bar-container">
        <div
          className="relevance-bar"
          style={{
            width: `${scorePercentage}%`,
            backgroundColor: getScoreColor()
          }}
        ></div>
      </div>
      <div className="relevance-text">{scorePercentage}% relevant</div>
    </div>
  );
}

export default SourceCard;
