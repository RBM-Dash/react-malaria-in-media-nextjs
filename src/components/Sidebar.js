import React from 'react';

const Sidebar = ({ sources }) => {
  return (
    <aside className="sidebar-component">
      <h2>Active Sources</h2>
      <ul>
        {sources.map(source => (
          <li key={source.id}>
            <span className={`status-icon ${source.status}`}></span> {source.name} <span>{source.count}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
};

export default Sidebar;