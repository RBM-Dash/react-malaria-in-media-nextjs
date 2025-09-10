import React from 'react';
import { parseDate } from '../utils/date';

const ArticleCard = ({ article, onClick, currentLanguage }) => {
  const displayTitle = article.translations && article.translations[currentLanguage] && article.translations[currentLanguage].title
    ? article.translations[currentLanguage].title
    : article.title;

  const displayDescription = article.translations && article.translations[currentLanguage] && article.translations[currentLanguage].description
    ? article.translations[currentLanguage].description
    : article.description;

  const truncateText = (text, wordLimit) => {
    if (!text) return '';
    const words = text.split(' ');
    if (words.length <= wordLimit) {
      return text;
    }
    return words.slice(0, wordLimit).join(' ') + '...';
  };

  const handleCardClick = () => {
    onClick(article.uniqueId);
  };

  const displayLocation = () => {
    if (article.country && article.country !== 'Global') {
      return `${article.country} ${article.countryDetection ? `(${(article.countryDetection.probability * 100).toFixed(0)}%)` : ''}`;
    } else if (article.region) {
      return `${article.region} ${article.regionDetection ? `(${(article.regionDetection.probability * 100).toFixed(0)}%)` : ''}`;
    }
    return 'Global';
  };

  return (
    <div className={`article-card ${article.isRead ? 'read' : ''}`} onClick={handleCardClick}>
        <div className="article-header">
            <span className="source-badge">{article.source}</span>
            <span className="country-badge">{displayLocation()}</span>
            <span className="relevance-score">Score: {article.relevanceScore}</span>
            <span className="language-badge">{(article.language || 'en').toUpperCase()}</span>
        </div>
        {article.imageUrl && <img src={`/api/image-proxy?url=${encodeURIComponent(article.imageUrl)}`} alt={displayTitle} className="article-image" />}
        <div className="article-content">
            <div className="article-title">
                <a href={article.url} target="_blank" rel="noopener noreferrer">{displayTitle}</a>
            </div>
            {displayDescription && <div className="article-description">{truncateText(displayDescription, 100)}</div>}
            <div className="article-footer">
                <span>{article.sourceName}</span>
                <span>
                  {(() => {
                    const date = parseDate(article.publishedAt);
                    return date ? date.toLocaleDateString('en-US', {
                      month: 'short',
                      day: '2-digit',
                      year: 'numeric'
                    }) : 'Invalid Date';
                  })()}
                </span>
            </div>
        </div>
    </div>
  );
};

export default ArticleCard;
