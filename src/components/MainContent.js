import React from 'react';
import ArticleCard from './ArticleCard';

const MainContent = ({ articles, onCardClick, currentLanguage }) => {
  return (
    <main className="main-content-component">
      <div className="content-cards">
        {articles.map((article, index) => (
          <ArticleCard key={`${article.uniqueId}-${index}`} article={article} onClick={onCardClick} currentLanguage={currentLanguage} />
        ))}
      </div>
    </main>
  );
};

export default MainContent;