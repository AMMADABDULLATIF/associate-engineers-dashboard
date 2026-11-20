import React from 'react';
import { useNavigation } from '../../context/AppContext';

export const PageHeader: React.FC = React.memo(() => {
  const { pageHeader } = useNavigation();

  return (
    <div className="saas-page-head no-print">
      <div>
        <div className="eyebrow">
          <span className="eyebrow-dot" /> FIELD OPERATIONS /{' '}
          <span id="saas-breadcrumb">{pageHeader.crumb}</span>
        </div>
        <h2 id="saas-page-title">{pageHeader.title}</h2>
        <p id="saas-page-subtitle">{pageHeader.subtitle}</p>
      </div>
      <div className="page-head-right">
        <div className="head-date-chip">
          <i className="fa-regular fa-calendar ae-icon-polished" />
          <span id="saas-today-label">SITE OPERATIONS</span>
        </div>
        <div className="head-avatar">AE</div>
      </div>
    </div>
  );
});
PageHeader.displayName = 'PageHeader';
