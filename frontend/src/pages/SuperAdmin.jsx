import { useEffect, useState } from "react";
import {
  LogOut,
  Store,
  UserPlus,
  Users,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  Edit,
  Trash2,
  KeyRound,
  X,
  Building2,
} from "lucide-react";

import api from "../api/axios";
import "./SuperAdmin.css";

const logo = "/logo.png";

export default function SuperAdmin() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [currentSuperAdmin, setCurrentSuperAdmin] = useState(null);

  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
  });

  const [formData, setFormData] = useState({
    shop_name: "",
    business_type: "",
    owner_name: "",
    owner_phone: "",
    owner_email: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    admin_username: "",
    admin_password: "",
  });

  const [superAdminForm, setSuperAdminForm] = useState({
    current_password: "",
    new_username: "",
    new_password: "",
  });

  const [editForm, setEditForm] = useState({
    user_id: "",
    username: "",
    new_password: "",
    is_active: true,
    superadmin_password: "",
  });

  const [deleteForm, setDeleteForm] = useState({
    user_id: "",
    username: "",
    superadmin_password: "",
  });

  const [storeForm, setStoreForm] = useState({
    id: "",
    name: "",
    business_type: "",
    owner_name: "",
    owner_phone: "",
    owner_email: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    is_active: true,
  });

  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [createdCredentials, setCreatedCredentials] = useState(null);

  const [loading, setLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [superAdminLoading, setSuperAdminLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [storeLoading, setStoreLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loginError, setLoginError] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [showSuperAdminPassword, setShowSuperAdminPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showDeletePassword, setShowDeletePassword] = useState(false);

  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [editingStore, setEditingStore] = useState(null);
  const [showSuperAdminModal, setShowSuperAdminModal] = useState(false);

  const normalizeText = (value) => String(value || "").trim().toLowerCase();

  const clearAuth = () => {
    localStorage.removeItem("aerostate_loyalty_token");
    localStorage.removeItem("aerostate_loyalty_user");
    localStorage.removeItem("token");
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    localStorage.removeItem("username");
  };

  const getSavedSuperAdminUser = () => {
    try {
      const rawUser =
        localStorage.getItem("aerostate_loyalty_user") ||
        localStorage.getItem("user");

      if (!rawUser) return null;

      const parsedUser = JSON.parse(rawUser);

      if (parsedUser && typeof parsedUser === "object") {
        return parsedUser;
      }

      return null;
    } catch {
      return null;
    }
  };

  const saveCurrentSuperAdmin = (userData) => {
    const savedUser = {
      username: userData?.username || loginData.username,
      role: userData?.role || "SuperAdmin",
      loginType: "superadmin",
      id: userData?.id || userData?.user_id || null,
      store_id: userData?.store_id ?? null,
    };

    localStorage.setItem("aerostate_loyalty_user", JSON.stringify(savedUser));
    setCurrentSuperAdmin(savedUser);

    return savedUser;
  };

  const getErrorMessage = (err, fallback) => {
    const detail = err?.response?.data?.detail;

    if (Array.isArray(detail)) {
      return detail
        .map((item) => item?.msg || item?.message || JSON.stringify(item))
        .join(", ");
    }

    if (typeof detail === "string") return detail;

    return err?.message || fallback;
  };

  const normalizeList = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.users)) return payload.users;
    if (Array.isArray(payload?.stores)) return payload.stores;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.results)) return payload.results;
    return [];
  };

  const isSuperAdminUser = (user) => {
    const role = normalizeText(user?.role).replaceAll("-", "").replaceAll("_", "");

    return role === "superadmin";
  };

  const isCurrentLoggedInUser = (user) => {
    const savedUser = currentSuperAdmin || getSavedSuperAdminUser();

    if (!savedUser || !user) return false;

    const userId = user.id || user.user_id;
    const savedId = savedUser.id || savedUser.user_id;

    if (userId && savedId && Number(userId) === Number(savedId)) {
      return true;
    }

    return (
      normalizeText(user.username) &&
      normalizeText(user.username) === normalizeText(savedUser.username)
    );
  };

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      setError("");

      const response = await api.get("/superadmin/users", {
        timeout: 10000,
      });

      const loadedUsers = normalizeList(response.data);
      setUsers(loadedUsers);

      const savedUser = currentSuperAdmin || getSavedSuperAdminUser();
      const savedUsername = savedUser?.username || loginData.username;

      const matchedCurrentUser = loadedUsers.find(
        (user) =>
          normalizeText(user.username) === normalizeText(savedUsername) &&
          isSuperAdminUser(user)
      );

      if (matchedCurrentUser) {
        saveCurrentSuperAdmin({
          ...savedUser,
          ...matchedCurrentUser,
          loginType: "superadmin",
        });
      }

      return loadedUsers;
    } catch (err) {
      console.error("Users fetch error:", err);

      const status = err?.response?.status;

      if (status === 401) {
        setError("Users list failed: login token expired. Please logout and login again.");
      } else if (status === 403) {
        setError("Users list failed: SuperAdmin access denied from backend.");
      } else if (status === 404) {
        setError("Users list failed: /superadmin/users API not found in backend.");
      } else {
        setError(
          err?.response?.data?.detail ||
            err?.message ||
            "Users list failed. Check backend terminal."
        );
      }

      setUsers([]);
      return [];
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchStores = async () => {
    try {
      const response = await api.get("/stores/", {
        timeout: 10000,
      });

      const loadedStores = normalizeList(response.data);
      setStores(loadedStores);
      return loadedStores;
    } catch (err) {
      console.error("Stores fetch error:", err);
      setStores([]);
      return [];
    }
  };

  const loadSuperAdminData = async () => {
    await Promise.all([fetchUsers(), fetchStores()]);
  };

  useEffect(() => {
    const token = localStorage.getItem("aerostate_loyalty_token");
    const savedUser = localStorage.getItem("aerostate_loyalty_user");

    if (token && savedUser) {
      try {
        const user = JSON.parse(savedUser);

        if (
          user?.role === "SuperAdmin" ||
          user?.role === "super-admin" ||
          user?.role === "superadmin" ||
          user?.loginType === "superadmin"
        ) {
          setCurrentSuperAdmin(user);
          setIsLoggedIn(true);
          loadSuperAdminData();
        }
      } catch {
        clearAuth();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage("");
      }, 4500);

      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleLoginChange = (e) => {
    const { name, value } = e.target;

    setLoginData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSuperAdminLogin = async (e) => {
    e.preventDefault();

    try {
      setLoginLoading(true);
      setLoginError("");

      const form = new URLSearchParams();
      form.append("username", loginData.username);
      form.append("password", loginData.password);

      const response = await api.post("/superadmin/token", form, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      const token = response.data?.access_token;

      if (!token) {
        throw new Error("Login token not received from backend.");
      }

      clearAuth();

      localStorage.setItem("aerostate_loyalty_token", token);
      saveCurrentSuperAdmin({
        username: loginData.username,
        role: "SuperAdmin",
        loginType: "superadmin",
      });

      setIsLoggedIn(true);
      await loadSuperAdminData();
    } catch (err) {
      console.error("SuperAdmin login error:", err);
      setLoginError(getErrorMessage(err, "SuperAdmin login failed."));
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuth();
    setCurrentSuperAdmin(null);
    setIsLoggedIn(false);
    setCreatedCredentials(null);
    setUsers([]);
    setStores([]);
    setError("");
    setMessage("");
    setLoginError("");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFormData({
      shop_name: "",
      business_type: "",
      owner_name: "",
      owner_phone: "",
      owner_email: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      admin_username: "",
      admin_password: "",
    });
  };

  const handleCreateShopAndAdmin = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");
      setMessage("");

      const storePayload = {
        name: formData.shop_name,
        business_type: formData.business_type,
        owner_name: formData.owner_name,
        owner_phone: formData.owner_phone,
        owner_email: formData.owner_email,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        is_active: true,
      };

      const storeResponse = await api.post("/stores/", storePayload, {
        timeout: 15000,
      });

      const storeId =
        storeResponse.data?.id ||
        storeResponse.data?.store_id ||
        storeResponse.data?.store?.id ||
        storeResponse.data?.data?.id;

      if (!storeId) {
        throw new Error("Store created but store ID was not received.");
      }

      const adminPayload = {
        username: formData.admin_username,
        password: formData.admin_password,
        store_id: storeId,
        role: "Admin",
        is_active: true,
      };

      const adminResponse = await api.post(
        "/superadmin/create-client/",
        adminPayload,
        { timeout: 15000 }
      );

      const createdUserId =
        adminResponse.data?.id ||
        adminResponse.data?.user_id ||
        adminResponse.data?.user?.id ||
        adminResponse.data?.data?.id ||
        "Created";

      setCreatedCredentials({
        store_id: storeId,
        user_id: createdUserId,
        shop_name: formData.shop_name,
        business_type: formData.business_type,
        owner_name: formData.owner_name,
        owner_phone: formData.owner_phone,
        owner_email: formData.owner_email,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        admin_username: formData.admin_username,
        admin_password: formData.admin_password,
      });

      setMessage("Shop and admin login created successfully.");
      resetForm();
      await loadSuperAdminData();
    } catch (err) {
      console.error("Create shop/admin error:", err);

      if (err.code === "ECONNABORTED") {
        setError("Request timeout. Backend is taking too long to respond.");
      } else {
        setError(
          getErrorMessage(err, "Failed to create shop and admin credentials.")
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSuperAdminFormChange = (e) => {
    const { name, value } = e.target;

    setSuperAdminForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUpdateSuperAdminCredentials = async (e) => {
    e.preventDefault();

    try {
      setSuperAdminLoading(true);
      setError("");
      setMessage("");

      if (!superAdminForm.new_username && !superAdminForm.new_password) {
        setError("Enter a new username or new password to update.");
        return;
      }

      await api.put("/superadmin/update-credentials", {
        current_password: superAdminForm.current_password,
        new_username: superAdminForm.new_username || null,
        new_password: superAdminForm.new_password || null,
      });

      setMessage("SuperAdmin credentials updated successfully. Please login again.");
      setShowSuperAdminModal(false);

      setSuperAdminForm({
        current_password: "",
        new_username: "",
        new_password: "",
      });

      setTimeout(() => {
        handleLogout();
      }, 1200);
    } catch (err) {
      console.error("SuperAdmin credential update error:", err);
      setError(getErrorMessage(err, "Failed to update SuperAdmin credentials."));
    } finally {
      setSuperAdminLoading(false);
    }
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setEditForm({
      user_id: user.id,
      username: user.username || "",
      new_password: "",
      is_active: user.is_active !== false,
      superadmin_password: "",
    });
    setError("");
    setMessage("");
  };

  const closeEditModal = () => {
    setEditingUser(null);
    setEditForm({
      user_id: "",
      username: "",
      new_password: "",
      is_active: true,
      superadmin_password: "",
    });
  };

  const handleEditFormChange = (e) => {
    const { name, value, type, checked } = e.target;

    setEditForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleUpdateAdminUser = async (e) => {
    e.preventDefault();

    try {
      setEditLoading(true);
      setError("");
      setMessage("");

      await api.put(`/superadmin/users/${editForm.user_id}`, {
        new_username: editForm.username || null,
        new_password: editForm.new_password || null,
        is_active: editForm.is_active,
        superadmin_password: editForm.superadmin_password,
      });

      setMessage("Admin user updated successfully.");
      closeEditModal();
      await fetchUsers();
    } catch (err) {
      console.error("Admin user update error:", err);
      setError(getErrorMessage(err, "Failed to update admin user."));
    } finally {
      setEditLoading(false);
    }
  };

  const openDeleteModal = (user) => {
    if (isCurrentLoggedInUser(user)) {
      setError("You cannot delete the SuperAdmin account you are currently logged in with.");
      return;
    }

    setDeletingUser(user);
    setDeleteForm({
      user_id: user.id,
      username: user.username || "",
      superadmin_password: "",
    });
    setError("");
    setMessage("");
  };

  const closeDeleteModal = () => {
    setDeletingUser(null);
    setDeleteForm({
      user_id: "",
      username: "",
      superadmin_password: "",
    });
  };

  const handleDeletePasswordChange = (e) => {
    setDeleteForm((prev) => ({
      ...prev,
      superadmin_password: e.target.value,
    }));
  };

  const handleDeleteAdminUser = async (e) => {
    e.preventDefault();

    try {
      setDeleteLoading(true);
      setError("");
      setMessage("");

      await api.delete(`/superadmin/users/${deleteForm.user_id}`, {
        data: {
          superadmin_password: deleteForm.superadmin_password,
        },
      });

      setMessage("User deleted successfully.");
      closeDeleteModal();
      await fetchUsers();
    } catch (err) {
      console.error("User delete error:", err);
      setError(getErrorMessage(err, "Failed to delete user."));
    } finally {
      setDeleteLoading(false);
    }
  };

  const openStoreModal = async (user) => {
    try {
      setError("");

      if (!user.store_id) {
        setError("This user does not have a store assigned.");
        return;
      }

      setStoreLoading(true);

      const response = await api.get(`/stores/${user.store_id}`, {
        timeout: 10000,
      });

      const store = response.data;

      setEditingStore(store);

      setStoreForm({
        id: store.id || user.store_id || "",
        name: store.name || user.store_name || "",
        business_type: store.business_type || "",
        owner_name: store.owner_name || "",
        owner_phone: store.owner_phone || "",
        owner_email: store.owner_email || "",
        address: store.address || "",
        city: store.city || "",
        state: store.state || "",
        pincode: store.pincode || "",
        is_active: store.is_active !== false,
      });
    } catch (err) {
      console.error("Store details fetch error:", err);

      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "Failed to load shop details."
      );
    } finally {
      setStoreLoading(false);
    }
  };

  const closeStoreModal = () => {
    setEditingStore(null);
    setStoreForm({
      id: "",
      name: "",
      business_type: "",
      owner_name: "",
      owner_phone: "",
      owner_email: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      is_active: true,
    });
  };

  const handleStoreFormChange = (e) => {
    const { name, value, type, checked } = e.target;

    setStoreForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleUpdateStore = async (e) => {
    e.preventDefault();

    try {
      setStoreLoading(true);
      setError("");
      setMessage("");

      await api.put(`/stores/${storeForm.id}`, {
        name: storeForm.name,
        business_type: storeForm.business_type,
        owner_name: storeForm.owner_name,
        owner_phone: storeForm.owner_phone,
        owner_email: storeForm.owner_email,
        address: storeForm.address,
        city: storeForm.city,
        state: storeForm.state,
        pincode: storeForm.pincode,
        is_active: storeForm.is_active,
      });

      setMessage("Shop/client details updated successfully.");
      closeStoreModal();
      await fetchStores();
      await fetchUsers();
    } catch (err) {
      console.error("Store update error:", err);
      setError(getErrorMessage(err, "Failed to update shop/client details."));
    } finally {
      setStoreLoading(false);
    }
  };

  const renderUserActions = (user) => {
    const ownAccount = isCurrentLoggedInUser(user);
    const superAdminAccount = isSuperAdminUser(user);

    if (ownAccount) {
      return <span className="muted">Own account</span>;
    }

    if (superAdminAccount) {
      return (
        <div className="action-buttons">
          <button
            type="button"
            className="small-btn delete-btn"
            onClick={() => openDeleteModal(user)}
          >
            <Trash2 size={13} />
            Delete
          </button>
        </div>
      );
    }

    return (
      <div className="action-buttons">
        <button
          type="button"
          className="small-btn edit-btn"
          onClick={() => openEditModal(user)}
        >
          <Edit size={13} />
          Edit
        </button>

        <button
          type="button"
          className="small-btn shop-btn"
          onClick={() => openStoreModal(user)}
        >
          <Building2 size={13} />
          Shop
        </button>

        <button
          type="button"
          className="small-btn delete-btn"
          onClick={() => openDeleteModal(user)}
        >
          <Trash2 size={13} />
          Delete
        </button>
      </div>
    );
  };

  if (!isLoggedIn) {
    return (
      <div className="super-admin-page">
        <main className="super-admin-content">
          <section
            className="admin-card"
            style={{
              maxWidth: "480px",
              margin: "60px auto",
            }}
          >
            <div className="card-title">
              <ShieldCheck size={24} />
              <h2>SuperAdmin Login</h2>
            </div>

            <div className="brand-area" style={{ marginBottom: "24px" }}>
              <img src={logo} alt="Aerostate Logo" className="brand-logo" />
              <h1>Aerostate Loyalty Reward System</h1>
            </div>

            {loginError && (
              <div className="alert error-alert">
                <AlertCircle size={18} />
                {loginError}
              </div>
            )}

            <form onSubmit={handleSuperAdminLogin}>
              <div className="form-grid" style={{ gridTemplateColumns: "1fr" }}>
                <div className="form-group">
                  <label>Username</label>
                  <input
                    name="username"
                    value={loginData.username}
                    onChange={handleLoginChange}
                    placeholder="Enter SuperAdmin username"
                    required
                  />
                </div>

                <div className="form-group password-group">
                  <label>Password</label>

                  <div className="password-wrapper">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={loginData.password}
                      onChange={handleLoginChange}
                      placeholder="Enter SuperAdmin password"
                      required
                    />

                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword((prev) => !prev)}
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                className="primary-btn"
                type="submit"
                disabled={loginLoading}
              >
                {loginLoading ? "Logging in..." : "Login"}
              </button>
            </form>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="super-admin-page">
      <header className="super-admin-header">
        <div className="brand-area">
          <img src={logo} alt="Aerostate Logo" className="brand-logo" />
          <h1>Aerostate Loyalty Reward System</h1>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="header-secondary-btn"
            onClick={() => setShowSuperAdminModal(true)}
          >
            <KeyRound size={17} />
            Update Credentials
          </button>

          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </header>

      <main className="super-admin-content">
        {message && (
          <div className="alert success-alert">
            <CheckCircle size={18} />
            {message}
          </div>
        )}

        {error && (
          <div className="alert error-alert">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <section className="top-grid">
          <form
            className="admin-card create-card"
            onSubmit={handleCreateShopAndAdmin}
          >
            <div className="card-title">
              <Store size={21} />
              <h2>Create New Shop / Client</h2>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Shop Name *</label>
                <input
                  name="shop_name"
                  value={formData.shop_name}
                  onChange={handleChange}
                  placeholder="e.g. Ravi Retail Store"
                  required
                />
              </div>

              <div className="form-group">
                <label>Business Type *</label>
                <input
                  name="business_type"
                  value={formData.business_type}
                  onChange={handleChange}
                  placeholder="e.g. Retail, Pharmacy, Grocery"
                  required
                />
              </div>

              <div className="form-group">
                <label>Owner Name *</label>
                <input
                  name="owner_name"
                  value={formData.owner_name}
                  onChange={handleChange}
                  placeholder="e.g. Ravi Bharti"
                  required
                />
              </div>

              <div className="form-group">
                <label>Owner Phone *</label>
                <input
                  name="owner_phone"
                  value={formData.owner_phone}
                  onChange={handleChange}
                  placeholder="e.g. 9876543210"
                  required
                />
              </div>

              <div className="form-group">
                <label>Owner Email</label>
                <input
                  type="email"
                  name="owner_email"
                  value={formData.owner_email}
                  onChange={handleChange}
                  placeholder="e.g. owner@example.com"
                />
              </div>

              <div className="form-group">
                <label>Address</label>
                <input
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Shop address"
                />
              </div>

              <div className="form-group">
                <label>City</label>
                <input
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="City"
                />
              </div>

              <div className="form-group">
                <label>State</label>
                <input
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="State"
                />
              </div>

              <div className="form-group">
                <label>Pincode</label>
                <input
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  placeholder="Pincode"
                />
              </div>
            </div>

            <div className="section-divider" />

            <div className="card-title small-title">
              <UserPlus size={20} />
              <h2>Assign Admin Credentials</h2>
            </div>

            <div className="form-grid two-col">
              <div className="form-group">
                <label>Admin Username *</label>
                <input
                  name="admin_username"
                  value={formData.admin_username}
                  onChange={handleChange}
                  placeholder="e.g. shopadmin1"
                  required
                />
              </div>

              <div className="form-group password-group">
                <label>Admin Password *</label>

                <div className="password-wrapper">
                  <input
                    type={showAdminPassword ? "text" : "password"}
                    name="admin_password"
                    value={formData.admin_password}
                    onChange={handleChange}
                    placeholder="e.g. Admin@123"
                    required
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowAdminPassword((prev) => !prev)}
                  >
                    {showAdminPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>
            </div>

            <button className="primary-btn" type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Shop + Admin"}
            </button>
          </form>

          <div className="admin-card credentials-card">
            <div className="card-title">
              <CheckCircle size={21} />
              <h2>Created Credentials</h2>
            </div>

            {createdCredentials ? (
              <div className="credential-box">
                <div className="credential-row">
                  <span>Shop Name</span>
                  <strong>{createdCredentials.shop_name}</strong>
                </div>

                <div className="credential-row">
                  <span>Business Type</span>
                  <strong>{createdCredentials.business_type}</strong>
                </div>

                <div className="credential-row">
                  <span>Store ID</span>
                  <strong>{createdCredentials.store_id}</strong>
                </div>

                <div className="credential-row">
                  <span>User ID</span>
                  <strong>{createdCredentials.user_id}</strong>
                </div>

                <div className="credential-row">
                  <span>Owner Name</span>
                  <strong>{createdCredentials.owner_name}</strong>
                </div>

                <div className="credential-row">
                  <span>Owner Phone</span>
                  <strong>{createdCredentials.owner_phone}</strong>
                </div>

                {createdCredentials.owner_email && (
                  <div className="credential-row">
                    <span>Owner Email</span>
                    <strong>{createdCredentials.owner_email}</strong>
                  </div>
                )}

                {(createdCredentials.city || createdCredentials.state) && (
                  <div className="credential-row">
                    <span>Location</span>
                    <strong>
                      {[createdCredentials.city, createdCredentials.state]
                        .filter(Boolean)
                        .join(", ")}
                    </strong>
                  </div>
                )}

                <div className="credential-row">
                  <span>Admin Username</span>
                  <strong>{createdCredentials.admin_username}</strong>
                </div>

                <div className="credential-row password-row">
                  <span>Admin Password</span>
                  <strong>{createdCredentials.admin_password}</strong>
                </div>

                <div className="login-note">
                  Normal admin can now login from the main login page using
                  these credentials.
                </div>
              </div>
            ) : (
              <div className="empty-box">
                Created shop and admin login details will appear here.
              </div>
            )}
          </div>
        </section>

        <section className="admin-card users-card">
          <div className="card-title users-title">
            <Users size={21} />
            <h2>All Users Details</h2>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Store</th>
                  <th>Status</th>
                  <th className="actions-header">Actions</th>
                </tr>
              </thead>

              <tbody>
                {usersLoading ? (
                  <tr>
                    <td colSpan="6" className="table-empty">
                      Loading users...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="table-empty">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((user, index) => (
                    <tr key={user.id || `${user.username}-${index}`}>
                      <td data-label="ID">{user.id || "N/A"}</td>

                      <td data-label="Username">{user.username || "N/A"}</td>

                      <td data-label="Role">
                        <span className={`role-pill ${user.role}`}>
                          {user.role || "N/A"}
                        </span>
                      </td>

                      <td data-label="Store">
                        {user.store?.name ||
                          user.store_name ||
                          user.shop_name ||
                          user.store_id ||
                          "N/A"}
                      </td>

                      <td data-label="Status">
                        <span
                          className={
                            user.is_active === false
                              ? "status inactive"
                              : "status active"
                          }
                        >
                          {user.is_active === false ? "Inactive" : "Active"}
                        </span>
                      </td>

                      <td data-label="Actions" className="action-cell">
                        {renderUserActions(user)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {showSuperAdminModal && (
        <div className="modal-overlay">
          <div className="admin-card modal-card">
            <div className="modal-header">
              <div className="card-title">
                <KeyRound size={21} />
                <h2>Update SuperAdmin Credentials</h2>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() => setShowSuperAdminModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateSuperAdminCredentials}>
              <div className="form-grid" style={{ gridTemplateColumns: "1fr" }}>
                <div className="form-group password-group">
                  <label>Current SuperAdmin Password *</label>
                  <div className="password-wrapper">
                    <input
                      type={showSuperAdminPassword ? "text" : "password"}
                      name="current_password"
                      value={superAdminForm.current_password}
                      onChange={handleSuperAdminFormChange}
                      placeholder="Enter current password"
                      required
                    />

                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowSuperAdminPassword((prev) => !prev)}
                    >
                      {showSuperAdminPassword ? (
                        <EyeOff size={17} />
                      ) : (
                        <Eye size={17} />
                      )}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>New Username</label>
                  <input
                    name="new_username"
                    value={superAdminForm.new_username}
                    onChange={handleSuperAdminFormChange}
                    placeholder="New SuperAdmin username"
                  />
                </div>

                <div className="form-group">
                  <label>New Password</label>
                  <input
                    type="password"
                    name="new_password"
                    value={superAdminForm.new_password}
                    onChange={handleSuperAdminFormChange}
                    placeholder="New SuperAdmin password"
                  />
                </div>
              </div>

              <button
                className="primary-btn"
                type="submit"
                disabled={superAdminLoading}
              >
                {superAdminLoading ? "Updating..." : "Update Credentials"}
              </button>
            </form>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="modal-overlay">
          <div className="admin-card modal-card">
            <div className="modal-header">
              <div className="card-title">
                <Edit size={21} />
                <h2>Edit Admin User</h2>
              </div>

              <button type="button" className="modal-close" onClick={closeEditModal}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateAdminUser}>
              <div className="form-grid" style={{ gridTemplateColumns: "1fr" }}>
                <div className="form-group">
                  <label>Username</label>
                  <input
                    name="username"
                    value={editForm.username}
                    onChange={handleEditFormChange}
                    required
                  />
                </div>

                <div className="form-group password-group">
                  <label>New Password</label>
                  <div className="password-wrapper">
                    <input
                      type={showEditPassword ? "text" : "password"}
                      name="new_password"
                      value={editForm.new_password}
                      onChange={handleEditFormChange}
                      placeholder="Leave blank if no password change"
                    />

                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowEditPassword((prev) => !prev)}
                    >
                      {showEditPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={editForm.is_active}
                    onChange={handleEditFormChange}
                  />
                  Active user
                </label>

                <div className="form-group">
                  <label>SuperAdmin Password *</label>
                  <input
                    type="password"
                    name="superadmin_password"
                    value={editForm.superadmin_password}
                    onChange={handleEditFormChange}
                    placeholder="Confirm with your SuperAdmin password"
                    required
                  />
                </div>
              </div>

              <button className="primary-btn" type="submit" disabled={editLoading}>
                {editLoading ? "Updating..." : "Update Admin User"}
              </button>
            </form>
          </div>
        </div>
      )}

      {editingStore && (
        <div className="modal-overlay">
          <div className="admin-card modal-card large-modal-card">
            <div className="modal-header">
              <div className="card-title">
                <Building2 size={21} />
                <h2>View / Update Shop Details</h2>
              </div>

              <button type="button" className="modal-close" onClick={closeStoreModal}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateStore}>
              <div className="form-grid two-col">
                <div className="form-group">
                  <label>Shop Name *</label>
                  <input
                    name="name"
                    value={storeForm.name}
                    onChange={handleStoreFormChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Business Type</label>
                  <input
                    name="business_type"
                    value={storeForm.business_type}
                    onChange={handleStoreFormChange}
                  />
                </div>

                <div className="form-group">
                  <label>Owner Name</label>
                  <input
                    name="owner_name"
                    value={storeForm.owner_name}
                    onChange={handleStoreFormChange}
                  />
                </div>

                <div className="form-group">
                  <label>Owner Phone</label>
                  <input
                    name="owner_phone"
                    value={storeForm.owner_phone}
                    onChange={handleStoreFormChange}
                  />
                </div>

                <div className="form-group">
                  <label>Owner Email</label>
                  <input
                    type="email"
                    name="owner_email"
                    value={storeForm.owner_email}
                    onChange={handleStoreFormChange}
                  />
                </div>

                <div className="form-group">
                  <label>Address</label>
                  <input
                    name="address"
                    value={storeForm.address}
                    onChange={handleStoreFormChange}
                  />
                </div>

                <div className="form-group">
                  <label>City</label>
                  <input
                    name="city"
                    value={storeForm.city}
                    onChange={handleStoreFormChange}
                  />
                </div>

                <div className="form-group">
                  <label>State</label>
                  <input
                    name="state"
                    value={storeForm.state}
                    onChange={handleStoreFormChange}
                  />
                </div>

                <div className="form-group">
                  <label>Pincode</label>
                  <input
                    name="pincode"
                    value={storeForm.pincode}
                    onChange={handleStoreFormChange}
                  />
                </div>

                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={storeForm.is_active}
                    onChange={handleStoreFormChange}
                  />
                  Active shop/client
                </label>
              </div>

              <button className="primary-btn" type="submit" disabled={storeLoading}>
                {storeLoading ? "Updating..." : "Update Shop Details"}
              </button>
            </form>
          </div>
        </div>
      )}

      {deletingUser && (
        <div className="modal-overlay">
          <div className="admin-card modal-card">
            <div className="modal-header">
              <div className="card-title">
                <Trash2 size={21} />
                <h2>Delete User</h2>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={closeDeleteModal}
              >
                <X size={18} />
              </button>
            </div>

            <p className="delete-warning">
              Are you sure you want to delete{" "}
              <strong>{deleteForm.username}</strong>?
            </p>

            <form onSubmit={handleDeleteAdminUser}>
              <div className="form-grid" style={{ gridTemplateColumns: "1fr" }}>
                <div className="form-group password-group">
                  <label>SuperAdmin Password *</label>
                  <div className="password-wrapper">
                    <input
                      type={showDeletePassword ? "text" : "password"}
                      value={deleteForm.superadmin_password}
                      onChange={handleDeletePasswordChange}
                      placeholder="Confirm with your SuperAdmin password"
                      required
                    />

                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowDeletePassword((prev) => !prev)}
                    >
                      {showDeletePassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                className="primary-btn delete-confirm-btn"
                type="submit"
                disabled={deleteLoading}
              >
                {deleteLoading ? "Deleting..." : "Delete User"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}