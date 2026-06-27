import React from 'react';
import { FiClock } from 'react-icons/fi';

// Friendly names for the module keys
const MODULE_NAMES = {
  Inventory: 'Inventory',
  SalesPOS: 'Sales & POS',
  Rewards: 'Rewards System',
  Reports: 'Reports',
  Settlements: 'Settlements',
  Settings: 'Settings',
};

const RecentActivity = ({ recentModules, onModuleClick }) => {
  return (
    <section style={styles.recentBox}>
      <div style={styles.recentHeader}>
        <h2 style={styles.recentTitle}>
          <FiClock size={20} color="#2563eb" /> Recently Used Modules
        </h2>
        <span style={styles.badge}>
          {recentModules.length > 0 ? `${recentModules.length} modules` : 'None'}
        </span>
      </div>
      {recentModules.length > 0 ? (
        <div style={styles.activityList}>
          {recentModules.map((moduleKey, index) => (
            <div
              key={index}
              style={{ ...styles.activityItem, cursor: 'pointer' }}
              onClick={() => onModuleClick(moduleKey)}
            >
              <h4 style={styles.activityTitle}>
                {MODULE_NAMES[moduleKey] || moduleKey}
              </h4>
              <span style={styles.activityTag}>Module</span>
            </div>
          ))}
        </div>
      ) : (
        <p style={styles.noActivity}>
          No modules used yet. Start exploring by clicking a module above or in the sidebar.
        </p>
      )}
    </section>
  );
};

const styles = {
  recentBox: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    padding: '24px',
    marginTop: '34px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  recentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '18px',
    flexWrap: 'wrap',
    gap: '8px',
  },
  recentTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '700',
    color: '#111827',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  badge: {
    backgroundColor: '#eff6ff',
    color: '#2563eb',
    padding: '6px 14px',
    borderRadius: '30px',
    fontSize: '13px',
    fontWeight: '700',
  },
  activityList: {
    display: 'grid',
    gap: '10px',
  },
  activityItem: {
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    padding: '14px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    flexWrap: 'wrap',
    gap: '8px',
  },
  activityTitle: {
    margin: 0,
    fontSize: '15px',
    color: '#111827',
    fontWeight: '500',
  },
  activityTag: {
    border: '1px solid #dbeafe',
    color: '#2563eb',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '700',
    backgroundColor: '#ffffff',
  },
  noActivity: {
    color: '#6b7280',
    fontSize: '14px',
  },
};

export default RecentActivity;