import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import "./portalHeader.css";

export default function PortalHeader({ 
  title, 
  kicker, 
  description, 
  icon: Icon, 
  backPath, 
  showBack = true, 
  rightAction 
}) {
  const navigate = useNavigate();

  return (
    <header className="portal-header-card">
      <div className="portal-header-left">
        {showBack && backPath && (
          <button className="portal-back-btn" onClick={() => navigate(backPath)}>
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
        )}

        {Icon && (
          <div className="portal-header-icon-box">
            <Icon size={28} />
          </div>
        )}

        <div className="portal-header-text">
          {kicker && <span className="portal-kicker">{kicker}</span>}
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
      </div>

      {rightAction && (
        <div className="portal-header-right">
          {rightAction}
        </div>
      )}
    </header>
  );
}