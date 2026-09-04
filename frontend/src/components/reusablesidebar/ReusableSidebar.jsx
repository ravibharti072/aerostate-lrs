import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FiChevronDown, FiSearch, FiLogOut, FiX, FiUser, FiBox } from "react-icons/fi";
import api from "../../api/axios";
import { APP_NAME, APP_FULL_NAME, APP_VERSION } from "../../config/appInfo";

const sidebarCss = `
  :root {
    --rs-width: 300px; 
    --rs-bg: #0a1120;
    --rs-text-muted: #8b8b9b;
    --rs-text-light: #ffffff;
    --rs-accent: #2d5696;
    --rs-hover: rgba(255, 255, 255, 0.05);
    --rs-border: #1f2029;
    
    --lrs-sidebar-width: var(--rs-width);
  }

  .rs-container {
    width: var(--rs-width);
    height: 100vh;
    background: var(--rs-bg);
    border-right: 1px solid var(--rs-border);
    display: flex;
    flex-direction: column;
    color: var(--rs-text-muted);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    z-index: 9998;
  }

  /* Header & Logo */
  .rs-header {
    padding: 24px 20px 20px;
    display: flex;
    align-items: center;
    gap: 14px; 
  }
  
  .rs-logo {
    width: 48px;  
    height: 48px; 
    border-radius: 12px; 
    display: grid;
    place-items: center;
    color: white;
    font-weight: 700;
    font-size: 20px; 
    flex-shrink: 0; 
  }
  
  .rs-logo.text-fallback {
    background: var(--rs-accent);
  }
  
  .rs-logo img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 12px;
    display: block;
  }
  
  .rs-brand-header {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .rs-brand-name {
    color: var(--rs-text-light);
    font-size: 17px; 
    font-weight: 600;
    margin: 0;
    line-height: 1.2;
  }

  .rs-version-badge {
    display: inline-flex;
    align-items: center;
    font-size: 11px;
    font-weight: 600;
    padding: 2px 7px;
    border-radius: 9999px;
    background: rgba(45, 86, 150, 0.25);
    color: #93c5fd;
    border: 1px solid rgba(45, 86, 150, 0.4);
    letter-spacing: 0.3px;
    line-height: 1.2;
  }

  .rs-brand-sub {
    font-size: 11px;
    margin: 4px 0 0 0;
    font-weight: 500;
    color: var(--rs-text-muted);
  }

  /* Search & Faded Lines */
  .rs-search-wrap { 
    padding: 0 20px;
    display: flex;
    flex-direction: column;
    margin-top: 10px;
  }
  .rs-search-box {
    display: flex;
    align-items: center;
    background: transparent;
    border: none;
    padding: 8px 4px 12px 4px;
    gap: 10px;
  }
  .rs-search-box input {
    background: transparent !important; 
    border: none !important;
    color: #ffffff !important; 
    width: 100%;
    outline: none;
    font-size: 13px;
    box-shadow: none !important;
  }
  .rs-search-box input::placeholder {
    color: #6b6b7b !important;
  }
  
  /* Gradient Divider Lines */
  .rs-search-divider {
    height: 1px;
    width: 100%;
    background: linear-gradient(
      90deg, 
      rgba(45, 86, 150, 0) 0%, 
      rgba(45, 86, 150, 0.5) 50%, 
      rgba(45, 86, 150, 0) 100%
    );
    margin-bottom: 16px;
  }

  .rs-search-divider-top {
    height: 1px;
    width: 100%;
    background: linear-gradient(
      90deg, 
      rgba(45, 86, 150, 0) 0%, 
      rgba(45, 86, 150, 0.5) 50%, 
      rgba(45, 86, 150, 0) 100%
    );
    margin-bottom: 12px;
  }

  /* Section Divider Line */
  .rs-section-divider {
    height: 1px;
    width: calc(100% - 24px);
    margin: 20px auto 4px auto;
    background: linear-gradient(
      90deg, 
      rgba(45, 86, 150, 0) 0%, 
      rgba(45, 86, 150, 0.4) 50%, 
      rgba(45, 86, 150, 0) 100%
    );
  }

  /* Footer Gradient Line */
  .rs-footer-divider {
    height: 1px;
    width: 100%;
    background: linear-gradient(
      90deg, 
      rgba(45, 86, 150, 0) 0%, 
      rgba(45, 86, 150, 0.5) 50%, 
      rgba(45, 86, 150, 0) 100%
    );
  }

  /* Navigation Base */
  .rs-nav {
    flex: 1;
    overflow-y: auto;
    padding: 0 12px 10px;
  }
  .rs-nav::-webkit-scrollbar { width: 4px; }
  .rs-nav::-webkit-scrollbar-thumb { background: #272730; border-radius: 4px; }

  .rs-section-title {
    font-size: 13px; 
    font-weight: 700;
    color: #6b6b7b;
    margin: 16px 0 10px 12px; 
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .rs-no-results {
    font-size: 12px;
    color: #6b6b7b;
    text-align: center;
    padding: 20px;
  }

  /* Nav Items */
  .rs-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 13.5px;
    font-weight: 500;
    margin-bottom: 2px;
    transition: 0.2s;
  }
  .rs-item:hover { background: var(--rs-hover); color: var(--rs-text-light); }
  .rs-item.active {
    background: var(--rs-accent);
    color: var(--rs-text-light);
  }

  /* Tree Structure */
  .rs-submenu {
    margin: 4px 0 8px 21px;
    padding-left: 0;
  }
  .rs-subitem {
    position: relative;
    padding: 8px 12px 8px 26px;
    font-size: 13px;
    cursor: pointer;
    border-radius: 6px;
    margin-bottom: 2px;
    color: var(--rs-text-muted);
    transition: 0.2s;
  }
  .rs-subitem::before {
    content: '';
    position: absolute;
    left: 0;
    top: -12px; 
    height: calc(50% + 12px); 
    width: 14px;
    border-left: 1px solid rgba(45, 86, 150, 0.35);
    border-bottom: 1px solid rgba(45, 86, 150, 0.35);
    border-bottom-left-radius: 12px; 
    transition: 0.2s;
  }
  .rs-subitem:first-child::before {
    top: -26px; 
    height: calc(50% + 26px);
  }
  .rs-subitem::after {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    bottom: -4px; 
    border-left: 1px solid rgba(45, 86, 150, 0.35);
    transition: 0.2s;
  }
  .rs-subitem:last-child::after {
    display: none; 
  }
  .rs-subitem:hover { color: var(--rs-text-light); }
  .rs-subitem.active { color: var(--rs-accent); font-weight: 600; }
  .rs-subitem.active::before {
    border-color: var(--rs-accent);
  }

  /* Global Search Rich Result Items */
  .rs-global-result {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border-radius: 10px;
    cursor: pointer;
    margin-bottom: 6px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.04);
    transition: all 0.2s ease;
  }
  .rs-global-result:hover {
    background: var(--rs-hover);
    border-color: rgba(45, 86, 150, 0.3);
  }
  .rs-global-icon {
    width: 34px;
    height: 34px;
    border-radius: 8px;
    background: rgba(45, 86, 150, 0.1);
    color: var(--rs-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    flex-shrink: 0;
  }
  .rs-global-info {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .rs-global-title {
    color: var(--rs-text-light);
    font-size: 13.5px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .rs-global-sub {
    color: var(--rs-text-muted);
    font-size: 11px;
    margin-top: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Footer */
  .rs-footer {
    padding: 16px 20px;
    border-top: none;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .rs-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--rs-accent);
    display: grid;
    place-items: center;
    color: white;
    font-weight: 600;
  }
  .rs-user-info { flex: 1; overflow: hidden; }
  .rs-username { color: white; font-size: 13px; font-weight: 500; }
  .rs-logout { 
    color: var(--rs-accent);
    cursor: pointer; 
    transition: 0.2s; 
  }
  .rs-logout:hover { color: #ef4444; }
  
  @media (min-width: 901px) {
    .rs-container { position: fixed; left: 0; top: 0; }
    body .lrs-main-content {
      margin-left: var(--rs-width) !important;
      width: calc(100% - var(--rs-width)) !important;
    }
  }
  @media (max-width: 900px) {
    .rs-container { position: fixed; left: -105%; transition: left 0.3s ease; }
    .rs-container.is-open { left: 0; }
  }
`;

const NavItem = ({ item, currentPath, onNavigate, isSearching }) => {
  const hasChildren = Boolean(item.children?.length);
  const [isOpen, setIsOpen] = useState(
    hasChildren && item.children.some((c) => c.path === currentPath)
  );

  useEffect(() => {
    if (isSearching && hasChildren) {
      setIsOpen(true);
    } else if (!isSearching && hasChildren) {
      setIsOpen(item.children.some((c) => c.path === currentPath));
    }
  }, [isSearching, hasChildren, currentPath, item.children]);

  const isActive = currentPath === item.path;
  const isParentActive = hasChildren && item.children.some((c) => c.path === currentPath);

  const handleClick = () => {
    if (hasChildren) setIsOpen(!isOpen);
    else if (item.path) onNavigate(item.path);
  };

  return (
    <>
      <div 
        className={`rs-item ${(isActive || (isParentActive && !isOpen)) && !hasChildren ? "active" : ""}`} 
        onClick={handleClick}
      >
        <span style={{ fontSize: 18, display: "flex", color: isParentActive ? "var(--rs-accent)" : "inherit" }}>
          {item.icon}
        </span>
        <span style={{ flex: 1, color: isParentActive ? "var(--rs-text-light)" : "inherit", fontWeight: isParentActive ? "600" : "500" }}>
          {item.label}
        </span>
        {hasChildren && (
          <FiChevronDown style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0)", transition: "0.2s" }} />
        )}
      </div>

      {hasChildren && isOpen && (
        <div className="rs-submenu">
          {item.children.map((child) => (
            <div
              key={child.path}
              className={`rs-subitem ${currentPath === child.path ? "active" : ""}`}
              onClick={() => onNavigate(child.path)}
            >
              {child.label}
            </div>
          ))}
        </div>
      )}
    </>
  );
};

const normalizeList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.customers)) return data.customers;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

export const ReusableSidebar = ({
  isOpen,
  onClose,
  brandName = APP_NAME,
  brandSub = APP_FULL_NAME,
  version = APP_VERSION,
  logoChar = "A",
  logoImg,
  navConfig = [],
  currentPath,
  onNavigate,
  user,
  onLogout,
  showSearch = true,
  onSearchChange,
  customSearchResults = [],
}) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const [allCustomers, setAllCustomers] = useState([]);
  const [allItems, setAllItems] = useState([]);

  useEffect(() => {
    if (!showSearch) return;

    const fetchGlobalData = async () => {
      try {
        const [customersRes, itemsRes] = await Promise.allSettled([
          api.get("/customers/"),
          api.get("/loyalty/items")
        ]);

        if (customersRes.status === "fulfilled") {
          setAllCustomers(normalizeList(customersRes.value.data));
        }
        if (itemsRes.status === "fulfilled") {
          setAllItems(normalizeList(itemsRes.value.data));
        }
      } catch (error) {
        console.error("Sidebar global fetch error:", error);
      }
    };
    fetchGlobalData();
  }, [showSearch]);

  const handleSearchInput = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (onSearchChange) onSearchChange(val);
  };

  const clearSearch = () => {
    setSearchQuery("");
    if (onSearchChange) onSearchChange("");
  };

  const filteredNavConfig = useMemo(() => {
    if (!searchQuery.trim()) return navConfig;
    const query = searchQuery.toLowerCase();

    return navConfig.map((group) => {
      const filteredItems = group.items.map((item) => {
        const itemMatches = item.label.toLowerCase().includes(query);

        if (item.children) {
          const matchingChildren = item.children.filter((child) =>
            child.label.toLowerCase().includes(query)
          );
          if (itemMatches || matchingChildren.length > 0) {
            return {
              ...item,
              children: itemMatches ? item.children : matchingChildren,
            };
          }
        } else if (itemMatches) {
          return item;
        }
        return null;
      }).filter(Boolean);

      if (filteredItems.length > 0) return { ...group, items: filteredItems };
      return null;
    }).filter(Boolean);
  }, [navConfig, searchQuery]);

  const mergedGlobalResults = useMemo(() => {
    if (!searchQuery.trim()) return customSearchResults;
    
    const query = searchQuery.toLowerCase();
    const results = [];

    const matchedCustomers = allCustomers.filter((c) => {
      const name = String(c?.name || c?.customer_name || "").toLowerCase();
      const phone = String(c?.phone || c?.mobile || c?.phone_number || "").toLowerCase();
      return name.includes(query) || phone.includes(query);
    }).slice(0, 4);

    if (matchedCustomers.length > 0) {
      results.push({
        section: "Customers",
        items: matchedCustomers.map((c) => ({
          label: c?.name || c?.customer_name || "Unknown",
          subLabel: c?.phone || c?.phone_number || "No Phone",
          icon: <FiUser size={16} />,
          onClick: () => navigate('/customer-directory', { state: { autoEdit: c } })
        }))
      });
    }

    const matchedItems = allItems.filter((i) => {
      const itemName = String(i?.name || i?.item_name || i?.title || "").toLowerCase();
      return itemName.includes(query);
    }).slice(0, 4);

    if (matchedItems.length > 0) {
      results.push({
        section: "Items",
        items: matchedItems.map((i) => ({
          label: i?.name || i?.item_name || "Unknown Item",
          subLabel: i?.points ? `${i.points} pts` : "",
          icon: <FiBox size={16} />,
          onClick: () => navigate('/item-master', { state: { autoEdit: i } })
        }))
      });
    }

    return [...results, ...customSearchResults];
  }, [searchQuery, allCustomers, allItems, customSearchResults, navigate]);

  const handleNavClick = (path) => {
    onNavigate(path);
    if (window.innerWidth <= 900) {
      clearSearch(); 
    }
  };

  const isSearching = searchQuery.trim().length > 0;
  const hasNoResults = filteredNavConfig.length === 0 && mergedGlobalResults.length === 0;

  return (
    <>
      <style>{sidebarCss}</style>
      
      {isOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9997 }} onClick={onClose} />
      )}

      <aside className={`rs-container ${isOpen ? "is-open" : ""}`}>
        <div className="rs-header">
          <div className={`rs-logo ${!logoImg ? "text-fallback" : ""}`}>
            {logoImg ? <img src={logoImg} alt={brandName} /> : logoChar}
          </div>
          <div>
            <div className="rs-brand-header">
              <h2 className="rs-brand-name">{brandName}</h2>
              {version && <span className="rs-version-badge">v{version}</span>}
            </div>
            {brandSub && <p className="rs-brand-sub">{brandSub}</p>}
          </div>
        </div>

        {showSearch && (
          <div className="rs-search-wrap">
            <div className="rs-search-divider-top" />
            <div className="rs-search-box">
              <FiSearch color="#8b8b9b" size={16} />
              <input 
                type="text" 
                placeholder="Search modules, items, customers..." 
                value={searchQuery}
                onChange={handleSearchInput}
              />
              {isSearching && (
                <FiX 
                  color="#8b8b9b" 
                  size={16} 
                  style={{ cursor: "pointer" }} 
                  onClick={clearSearch} 
                />
              )}
            </div>
            <div className="rs-search-divider" />
          </div>
        )}

        <nav className="rs-nav">
          {!isSearching && navConfig.map((group, idx) => (
            <div key={idx}>
              {group.section && (
                <>
                  <div className="rs-section-divider" />
                  <div className="rs-section-title">{group.section}</div>
                </>
              )}
              {group.items.map((item, itemIdx) => (
                <NavItem 
                  key={itemIdx} 
                  item={item} 
                  currentPath={currentPath} 
                  onNavigate={handleNavClick}
                  isSearching={false} 
                />
              ))}
            </div>
          ))}

          {isSearching && (
            <>
              {filteredNavConfig.length > 0 && (
                <>
                  <div className="rs-section-divider" />
                  <div className="rs-section-title">Modules</div>
                </>
              )}
              {filteredNavConfig.map((group, idx) => (
                <React.Fragment key={`mod-${idx}`}>
                  {group.items.map((item, itemIdx) => (
                    <NavItem 
                      key={`search-${itemIdx}`} 
                      item={item} 
                      currentPath={currentPath} 
                      onNavigate={handleNavClick}
                      isSearching={true} 
                    />
                  ))}
                </React.Fragment>
              ))}

              {mergedGlobalResults.map((group, gIdx) => (
                <div key={`global-g-${gIdx}`}>
                  <div className="rs-section-divider" />
                  <div className="rs-section-title">{group.section}</div>
                  {group.items.map((item, iIdx) => (
                    <div 
                      key={`global-i-${iIdx}`} 
                      className="rs-global-result" 
                      onClick={() => {
                        if (item.onClick) item.onClick();
                        clearSearch();
                      }}
                    >
                      <div className="rs-global-icon">{item.icon}</div>
                      <div className="rs-global-info">
                        <span className="rs-global-title">{item.label}</span>
                        {item.subLabel && <span className="rs-global-sub">{item.subLabel}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ))}

              {hasNoResults && (
                <div className="rs-no-results">No matches found for "{searchQuery}"</div>
              )}
            </>
          )}
        </nav>

        <div className="rs-footer-divider" />
        <div className="rs-footer">
          <div className="rs-avatar">{String(user?.username || "U").charAt(0).toUpperCase()}</div>
          <div className="rs-user-info">
            <div className="rs-username">{user?.username || "User"}</div>
          </div>
          <FiLogOut className="rs-logout" size={18} onClick={onLogout} title="Logout" />
        </div>
      </aside>
    </>
  );
};