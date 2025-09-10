'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Header from '../src/components/Header';
import MainContent from '../src/components/MainContent';
import { parseDate } from '../src/utils/date';
import '../app/globals.css';

export default function Home() {
  const [allArticles, setAllArticles] = useState([]);
  const [filteredArticles, setFilteredArticles] = useState([]);
  const [logs, setLogs] = useState([]);
  const [kpiData, setKpiData] = useState([]);
  const [sourceCounts, setSourceCounts] = useState([]);

  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [currentContentType, setCurrentContentType] = useState('news');

  const addLog = useCallback((message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prevLogs => [{ message: `[${timestamp}] ${message}`, type }, ...prevLogs]);
  }, []);

  useEffect(() => {
    addLog('Fetching articles...');
    fetch(`/articles.json?v=${new Date().getTime()}`)
      .then(res => res.json())
      .then(data => {
        setArticles(data);
        console.log('Initial articles (after research filter):', data); // Debugging
        setFilteredArticles(data); // Initialize filtered articles with all non-research articles
      })
      .catch(err => addLog(`Error loading articles: ${err.message}`, 'error'));
  }, [addLog]);

  useEffect(() => {
    let articles = [...allArticles];

    if (currentContentType === 'science') {
        articles = articles.filter(a => a.type === 'research' || a.source === 'PubMed');
    } else if (currentContentType === 'news') {
        articles = articles.filter(a => a.type !== 'research' && a.source !== 'PubMed');
    } else if (currentContentType === 'africa') {
        articles = articles.filter(a => a.continent === 'Africa');
    } else if (currentContentType === 'latin-america') {
        articles = articles.filter(a => a.continent === 'Latin America');
    } else if (currentContentType === 'caribbean') {
        articles = articles.filter(a => a.continent === 'Caribbean');
    } else if (currentContentType === 'asia') {
        articles = articles.filter(a => a.continent === 'Asia');
    } else if (currentContentType === 'north-america') {
        articles = articles.filter(a => a.continent === 'North America');
    } else if (currentContentType === 'europe') {
        articles = articles.filter(a => a.continent === 'Europe');
    }

    articles.sort((a, b) => {
      const dateA = parseDate(a.publishedAt);
      const dateB = parseDate(b.publishedAt);
      if (dateA && dateB) return dateB - dateA;
      if (dateA && !dateB) return -1;
      if (!dateA && dateB) return 1;
      return 0;
    });

    setFilteredArticles(articles);

    if (allArticles.length > 0) {
        const sources = allArticles.reduce((acc, article) => {
            acc[article.source] = (acc[article.source] || 0) + 1;
            return acc;
        }, {});
        setSourceCounts(Object.entries(sources).map(([name, count]) => ({id: name, name, count, status: 'green'})));

        setKpiData([
            { label: 'Total Articles', value: allArticles.length },
            { label: 'High Relevance', value: allArticles.filter(a => a.relevanceScore >= 20).length },
            { label: 'Countries', value: new Set(allArticles.map(a => a.country)).size },
            { label: 'Continents', value: new Set(allArticles.map(a => a.continent)).size }
        ]);
    }
  }, [allArticles, currentContentType]);

  const handleMarkAsRead = (uniqueId) => {
    setAllArticles(prevArticles =>
      prevArticles.map(article =>
        article.uniqueId === uniqueId ? { ...article, isRead: true } : article
      )
    );
  };

  const handleTranslation = (targetLang) => {
    addLog(`Switching language view to ${targetLang}.`);
    setCurrentLanguage(targetLang);
  };

  return (
    <div className="dashboard-container">
      <Header 
        onSwitchTab={setCurrentContentType}
        onTranslate={handleTranslation}
        onExport={() => addLog('Export functionality not yet implemented.', 'warning')}
        currentLanguage={currentLanguage}
        currentContentType={currentContentType}
      />
      <div className="main-content-component">
        <MainContent 
          kpiData={kpiData}
          articles={filteredArticles}
          onCardClick={handleMarkAsRead}
          currentLanguage={currentLanguage}
        />
      </div>
      <div className="kpis">
        {kpiData.slice(0, 3).map((kpi, index) => (
          <div className="kpi-card" key={`${kpi.label}-${index}`}>
            <span>{kpi.value}</span>
            <small>{kpi.label}</small>
          </div>
        ))}
        
        <h2 className="active-sources-title">Active Sources</h2>
        <div className="active-sources">
          {sourceCounts.slice(0, 4).map((source, index) => (
            <div className="source-item" key={`${source.name}-${index}`}>
              <div className="source-name">{source.name}</div>
              <div className="source-count">{source.count}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
