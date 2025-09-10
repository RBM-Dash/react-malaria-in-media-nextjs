import React from 'react';

const Header = ({ onSwitchTab, onTranslate, onExport, currentLanguage, currentContentType }) => {
  // Function to handle tab clicks and manage active state
  const handleTabClick = (e, tab) => {
    onSwitchTab(tab);
  };

  return (
    <header className="header-component">
      <div className="header-main">
        <div>
          <h1>Malaria News Intelligence Dashboard</h1>
          <p>Multi-language global malaria surveillance through news and research monitoring</p>
        </div>
      </div>
      <div className="header-actions">
        <div className="tabs" id="content-type-tabs">
            <button className={`tab ${currentContentType === 'news' ? 'active' : ''}`} data-content-type="news" onClick={(e) => handleTabClick(e, 'news')}>News</button>
            <button className={`tab ${currentContentType === 'science' ? 'active' : ''}`} data-content-type="science" onClick={(e) => handleTabClick(e, 'science')}>Scientific</button>
            <button className={`tab ${currentContentType === 'africa' ? 'active' : ''}`} data-content-type="africa" onClick={(e) => handleTabClick(e, 'africa')}>Africa</button>
            <button className={`tab ${currentContentType === 'latin-america' ? 'active' : ''}`} data-content-type="latin-america" onClick={(e) => handleTabClick(e, 'latin-america')}>Latin America</button>
            <button className={`tab ${currentContentType === 'caribbean' ? 'active' : ''}`} data-content-type="caribbean" onClick={(e) => handleTabClick(e, 'caribbean')}>Caribbean</button>
            <button className={`tab ${currentContentType === 'asia' ? 'active' : ''}`} data-content-type="asia" onClick={(e) => handleTabClick(e, 'asia')}>Asia</button>
            <button className={`tab ${currentContentType === 'north-america' ? 'active' : ''}`} data-content-type="north-america" onClick={(e) => handleTabClick(e, 'north-america')}>North America</button>
            <button className={`tab ${currentContentType === 'europe' ? 'active' : ''}`} data-content-type="europe" onClick={(e) => handleTabClick(e, 'europe')}>Europe</button>
            <button className={`tab ${currentContentType === 'all' ? 'active' : ''}`} data-content-type="all" onClick={(e) => handleTabClick(e, 'all')}>All Content</button>
        </div>
        <div className="translate-chips">
            <span>Translate:</span>
            <button className={`translation-btn ${currentLanguage === 'en' ? 'active' : ''}`} data-lang="en" onClick={() => onTranslate('en')}>EN</button>
            <button className={`translation-btn ${currentLanguage === 'fr' ? 'active' : ''}`} data-lang="fr" onClick={() => onTranslate('fr')}>FR</button>
            <button className={`translation-btn ${currentLanguage === 'pt' ? 'active' : ''}`} data-lang="pt" onClick={() => onTranslate('pt')}>PT</button>
            <button className={`translation-btn ${currentLanguage === 'es' ? 'active' : ''}`} data-lang="es" onClick={() => onTranslate('es')}>ES</button>
        </div>
        <div>
            <button className="primary-button" onClick={() => onExport('json')}>Export JSON</button>
            <button className="primary-button" onClick={() => onExport('csv')}>Export CSV</button>
        </div>
      </div>
    </header>
  );
};

export default Header;