import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiBox, FiSettings, FiStar, FiDollarSign, FiUser, FiClock,
  FiTrendingUp, FiBarChart2, FiMessageCircle, FiAward, FiUsers, FiSearch, FiFileText
} from "react-icons/fi";

import api from "../../api/axios";
import PortalHeader from "../../components/portalheader/PortalHeader";
import HeroCard from "../../components/herocard/HeroCard";
import QuickInsights from "../../components/quickinsights/QuickInsights";
import DailyPointsChart from "../../components/dailypointschart/DailyPointsChart";
import RecentActivity from "../../components/recentactivity/RecentActivity";
import TopListCard from "../../components/toplistcard/TopListCard";
import TotalValueCard from "../../components/totalvaluecard/TotalValueCard";
import WhatsAppCard from "../../components/whatsappcard/WhatsAppCard";
import RecentRedemptionsCard from "../../components/recentredemptionscard/RecentRedemptionsCard";
import SystemMilestonesCard from "../../components/systemmilestonescard/SystemMilestonesCard";

import "./dashBoard.css";

const formatNumber = (value) => {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "0";
};

const normalizeList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.customers)) return data.customers;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  
  const [allCustomers, setAllCustomers] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);

  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalItems: 0,
    totalPoints: 0,
    totalPayouts: 0,
    totalIssued: 0,
    issuedGrowthPercent: 0,
    todayPoints: 0,
    todayEntries: 0,
    topCustomer: "No Activity",
    topItem: "No Activity",
    topCustomersList: [],
    topItemsList: [],
    totalAmountValue: 0,
    totalRedeemedValue: 0,
    totalRemainingValue: 0,
    whatsappPending: [],
    whatsappSent: [],
    whatsappPendingCount: 0,
    whatsappSentCount: 0,
    recentRedemptions: []
  });

  const loggedInUser = useMemo(() => {
    try {
      const savedUser = localStorage.getItem("aerostate_loyalty_user") || localStorage.getItem("user");
      if (savedUser) return JSON.parse(savedUser)?.username || "User";
      return "User";
    } catch { return "User"; }
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadDashboardData = useCallback(async () => {
    try {
      setActivityLoading(true);
      const [summaryRes, customersRes, itemsRes, activityRes] = await Promise.allSettled([
        api.get("/dashboard/summary"),
        api.get("/customers/"),
        api.get("/loyalty/items"),
        api.get("/dashboard/recent-activity")
      ]);

      if (summaryRes.status === "fulfilled" && summaryRes.value.data) {
        setStats(summaryRes.value.data);
      }
      if (customersRes.status === "fulfilled") {
        setAllCustomers(normalizeList(customersRes.value.data));
      }
      if (itemsRes.status === "fulfilled") {
        setAllItems(normalizeList(itemsRes.value.data));
      }
      if (activityRes.status === "fulfilled") {
        setRecentActivities(activityRes.value.data);
      }
    } catch (error) {
      console.error("Dashboard data loading error:", error);
    } finally {
      setActivityLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const moduleCards = useMemo(() => [
    { key: "rewardEntry", title: "Reward Entry", icon: FiAward, color: "purple", path: "/reward-entry" },
    { key: "customerDirectory", title: "Customer Directory", icon: FiUsers, color: "blue", path: "/customer-directory" },
    { key: "itemMaster", title: "Item Master", icon: FiBox, color: "green", path: "/item-master" },
    { key: "transactionHistory", title: "Transaction History", icon: FiClock, color: "teal", path: "/transaction-history" },
    { key: "redemption", title: "Payout / Redemption", icon: FiDollarSign, color: "green", path: "/redemption" },
    { key: "amountAssignment", title: "Amount Assignment", icon: FiDollarSign, color: "purple", path: "/amount-assignment" },
    { key: "leaderboard", title: "Leaderboard", icon: FiTrendingUp, color: "orange", path: "/leaderboard" },
    { key: "whatsapp", title: "WhatsApp", icon: FiMessageCircle, color: "green", path: "/whatsapp" },
    { key: "reports", title: "Reports", icon: FiBarChart2, color: "blue", path: "/reports" },
    { key: "settings", title: "Settings", icon: FiSettings, color: "gray", path: "/settings" },
  ], []);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return { modules: [], customers: [], items: [] };
    const query = searchQuery.toLowerCase();

    const modules = moduleCards.filter((mod) => 
      mod.title.toLowerCase().includes(query)
    );

    const customers = allCustomers.filter((c) => {
      const name = String(c?.name || c?.customer_name || "").toLowerCase();
      const phone = String(c?.phone || c?.mobile || c?.phone_number || "").toLowerCase();
      return name.includes(query) || phone.includes(query);
    }).slice(0, 4);

    const items = allItems.filter((i) => {
      const itemName = String(i?.name || i?.item_name || i?.title || "").toLowerCase();
      return itemName.includes(query);
    }).slice(0, 4);

    return { modules, customers, items };
  }, [searchQuery, moduleCards, allCustomers, allItems]);

  const hasAnyResults = searchResults.modules.length > 0 || searchResults.customers.length > 0 || searchResults.items.length > 0;

  const formattedDate = currentTime.toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" });
  const formattedTime = currentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });

  const totalPointsIssued = stats.totalIssued > 0 ? stats.totalIssued : (stats.totalPoints + stats.totalPayouts);
  const redemptionPercent = totalPointsIssued > 0 ? Math.min(100, Math.round((stats.totalPayouts / totalPointsIssued) * 100)) : 0;

  return (
    <div className="dashboard-page">
      <PortalHeader 
        title={`${getGreeting()}, ${loggedInUser}`}
        kicker="LRS DASHBOARD"
        showBack={false}
        rightAction={
          <div className="header-actions">
            <div className="header-search-container">
              <div className="header-search-bar">
                <FiSearch size={16} className="search-icon" />
                <input 
                  type="text" 
                  placeholder="Search modules, customers, items..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {searchQuery.trim() && (
                <div className="header-search-dropdown">
                  {hasAnyResults ? (
                    <>
                      {searchResults.modules.length > 0 && (
                        <div className="search-category">
                          <div className="search-category-title">Modules</div>
                          {searchResults.modules.map((mod) => (
                            <div 
                              key={mod.key} 
                              className="search-result-item"
                              onClick={() => { setSearchQuery(""); navigate(mod.path); }}
                            >
                              <div className="search-result-icon"><mod.icon size={16} /></div>
                              <span className="sr-title">{mod.title}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {searchResults.customers.length > 0 && (
                        <div className="search-category">
                          <div className="search-category-title">Customers</div>
                          {searchResults.customers.map((c, idx) => (
                            <div 
                              key={`c-${idx}`} 
                              className="search-result-item"
                              onClick={() => { 
                                setSearchQuery(""); 
                                navigate('/customer-directory', { state: { autoEdit: c } }); 
                              }}
                            >
                              <div className="search-result-icon"><FiUser size={16} /></div>
                              <div className="search-result-text">
                                <span className="sr-title">{c?.name || c?.customer_name || "Unknown"}</span>
                                <span className="sr-sub">{c?.phone || c?.mobile || c?.phone_number || "No Phone"}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {searchResults.items.length > 0 && (
                        <div className="search-category">
                          <div className="search-category-title">Items</div>
                          {searchResults.items.map((i, idx) => (
                            <div 
                              key={`i-${idx}`} 
                              className="search-result-item"
                              onClick={() => { 
                                setSearchQuery(""); 
                                navigate('/item-master', { state: { autoEdit: i } }); 
                              }}
                            >
                              <div className="search-result-icon"><FiBox size={16} /></div>
                              <div className="search-result-text">
                                <span className="sr-title">{i?.name || i?.item_name || i?.title || "Unknown Item"}</span>
                                {i?.points && <span className="sr-sub">{i.points} pts</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="search-no-results">
                      No matches found for "{searchQuery}"
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="time-widget">
              <FiClock size={18} className="time-icon" />
              <div className="time-text">
                <span className="date">{formattedDate}</span>
                <span className="time">{formattedTime}</span>
              </div>
            </div>
          </div>
        }
      />

      <div className="top-dashboard-row">
        <div className="hero-section-wrapper">
          <HeroCard 
            totalIssuedFormatted={formatNumber(totalPointsIssued)}
            activeMembers={stats.totalCustomers}
            payoutsFormatted={formatNumber(stats.totalPayouts)}
            growthPercent={stats.issuedGrowthPercent}
            redemptionPercent={redemptionPercent}
          />
        </div>

        <div className="insights-wrapper">
          <QuickInsights 
            title="Quick Insights"
            subtitle="Today's activity at a glance."
            insights={[
              {
                label: "Today's Points",
                value: `${formatNumber(stats.todayPoints)} pts`,
                icon: <FiStar size={16} />,
                colorTheme: "theme-orange"
              },
              {
                label: "Today's Entries",
                value: formatNumber(stats.todayEntries),
                icon: <FiFileText size={16} />,
                colorTheme: "theme-navy"
              },
              {
                label: "Top Customer",
                value: stats.topCustomer,
                icon: <FiUser size={16} />,
                colorTheme: "theme-blue"
              },
              {
                label: "Top Item",
                value: stats.topItem,
                icon: <FiBox size={16} />,
                colorTheme: "theme-green"
              }
            ]}
          />
        </div>
      </div>

      <div className="analytics-section-row">
        <div className="side-insights-wrapper">
          <RecentActivity activities={recentActivities} loading={activityLoading} />
        </div>

        <div className="chart-container-wrapper">
          <DailyPointsChart />
        </div>
      </div>

      <div className="dashboard-bottom-grid">
        <TopListCard 
          title="Top Customers" 
          subtitle="Based on points balance" 
          data={stats.topCustomersList} 
          valueLabel="pts" 
        />
        
        <TopListCard 
          title="Top Item Performance" 
          subtitle="Most rewarded items" 
          data={stats.topItemsList} 
          valueLabel="issued" 
        />

        <TotalValueCard 
          totalAmountValue={stats.totalAmountValue}
          totalRedeemedValue={stats.totalRedeemedValue}
          totalRemainingValue={stats.totalRemainingValue}
          redemptionPercent={redemptionPercent}
        />
      </div>

      <div className="operations-row">
        <div className="ops-col-left">
          <WhatsAppCard 
            pendingMessages={stats.whatsappPending} 
            sentMessages={stats.whatsappSent} 
            isConnected={true} 
            pendingCount={stats.whatsappPendingCount}
            sentCount={stats.whatsappSentCount}
          />
        </div>

        <div className="ops-col-right">
          <RecentRedemptionsCard 
            redemptions={stats.recentRedemptions}
            totalPayouts={stats.totalPayouts}
            totalRedeemedValue={stats.totalRedeemedValue}
          />

          <SystemMilestonesCard 
            totalCustomers={stats.totalCustomers} 
            totalIssued={stats.totalIssued} 
            totalPayouts={stats.totalPayouts} 
          />
        </div>
      </div>
    </div>
  );
}