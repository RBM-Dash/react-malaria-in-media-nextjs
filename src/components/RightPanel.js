import React from 'react';

const RightPanel = ({ logs }) => {
  return (
    <aside className="right-panel-component">
      <div className="activity-log">
        <h2>Activity Log</h2>
        <ul className="log-list">
          {logs.map((log, index) => (
            <li key={index} className={`log-entry ${log.type}`}>{log.message}</li>
          ))}
        </ul>
      </div>
    </aside>
  );
};

export default RightPanel;