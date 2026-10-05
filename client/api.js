(function () {
    const BASE = () => 'https://vault-lovat-theta.vercel.app/api';
    const TOKEN_KEY = 'vault_token';
    const USER_KEY = 'vault_user';      

    window.VaultAuth = {
        getToken: () => localStorage.getItem(TOKEN_KEY),
        getUser: () => {
            try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); }
            catch { return null; }
        },
        setSession(token, user) {
            if (token) localStorage.setItem(TOKEN_KEY, token);
            if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
        },
        clear() {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
        },
        isLoggedIn: () => !!localStorage.getItem(TOKEN_KEY),
        isAdmin: () => (window.VaultAuth.getUser()?.role === 'admin'),
    };

    async function request(method, path, body, opts = {}) {
        const url = `${BASE()}${path}`;
        const headers = { ...(opts.headers || {}) };
        const token = window.VaultAuth.getToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;

        let payload;
        if (body instanceof FormData) {
            payload = body;
        } else if (body !== undefined && body !== null) {
            headers['Content-Type'] = 'application/json';
            payload = JSON.stringify(body);
        }

        let res;
        try {
            res = await fetch(url, { method, headers, body: payload });
        } catch (netErr) {
            if (typeof window.showToast === 'function') window.showToast('⚠  Backend offline', '⚠');
            throw Object.assign(new Error('Network error'), { isNetwork: true });
        }

        if (res.status === 401 && !opts.skipAuthRedirect) {
            window.VaultAuth.clear();
            if (typeof window.showToast === 'function') window.showToast('✖  Session expired — please sign in', '✖');
            if (typeof window.showPage === 'function') window.showPage('login');
            throw new Error('Unauthorized');
        }

        let data = null;
        const ct = res.headers.get('content-type') || '';
        try {
            data = ct.includes('application/json') ? await res.json() : await res.text();
        } catch { data = null; }

        if (!res.ok) {
            const msg = (data && data.message) || `HTTP ${res.status}`;
            throw Object.assign(new Error(msg), { status: res.status, body: data });
        }
        return data;
    }

    window.apiGet = (p, opts) => request('GET', p, null, opts);
    window.apiPost = (p, b, opts) => request('POST', p, b, opts);
    window.apiPut = (p, b, opts) => request('PUT', p, b, opts);
    window.apiDelete = (p, b, opts) => request('DELETE', p, b, opts);

    window.VaultAPI = {
        login: (email, password) => apiPost('/auth/login', { email, password }),
        register: (payload) => apiPost('/auth/register', payload),
        googleLogin: (payload) => apiPost('/auth/google', payload),
        me: () => apiGet('/auth/me'),

        products: (qs = '') => apiGet(`/products${qs}`),
        product: (id) => apiGet(`/products/${id}`),
        featured: (limit = 8) => apiGet(`/products/featured?limit=${limit}`),
        search: (q) => apiGet(`/products/search?q=${encodeURIComponent(q)}`),
        byCategory: (cat, limit = 20) => apiGet(`/products/category/${encodeURIComponent(cat)}?limit=${limit}`),
        categories: () => apiGet('/categories'),

        cart: () => apiGet('/cart'),
        cartAdd: (productId, quantity = 1) => apiPost('/cart', { productId, quantity }),
        cartUpdate: (productId, quantity) => apiPut(`/cart/${productId}`, { quantity }),
        cartRemove: (productId) => apiDelete(`/cart/${productId}`),
        cartClear: () => apiDelete('/cart'),

        wishlist: () => apiGet('/wishlist'),
        wishlistAdd: (productId) => apiPost(`/wishlist/${productId}`),
        wishlistRemove: (productId) => apiDelete(`/wishlist/${productId}`),
        wishlistClear: () => apiDelete('/wishlist'),

        orders: (status) => apiGet('/orders' + (status ? `?status=${status}` : '')),
        order: (id) => apiGet(`/orders/${id}`),
        orderCreate: (payload) => apiPost('/orders', payload),
        orderCancel: (id) => apiDelete(`/orders/${id}`),

        couponApply: (code, basketTotal) => apiPost('/coupons/apply', { code, basketTotal }),
        couponRemove: () => apiDelete('/coupons/remove'),

        pincodeCheck: (pincode) => apiGet(`/settings/deliveryPincodes/check?pincode=${pincode}`),

        adminStats: () => apiGet('/admin/dashboard/stats'),
        adminOrders: (qs = '') => apiGet(`/admin/orders${qs}`),
        adminOrderStatus: (id, status, notes) => apiPut(`/admin/orders/${id}/status`, { status, notes }),
        adminUsers: () => apiGet('/admin/users'),
        adminUserUpdate: (id, payload) => apiPut(`/admin/users/${id}`, payload),
        adminUserDelete: (id) => apiDelete(`/admin/users/${id}`),
        adminProducts: (qs = '') => apiGet(`/products/admin/all${qs}`),
        adminProductCreate: (formData) => apiPost('/products', formData),
        adminProductUpdate: (id, formData) => apiPut(`/products/${id}`, formData),
        adminProductDelete: (id) => apiDelete(`/products/${id}`),
    };
})();