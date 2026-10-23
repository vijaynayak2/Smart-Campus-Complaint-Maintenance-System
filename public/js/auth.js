/**
 * Authentication and Session Management for AJIET CampusFix
 */
const Auth = (function() {
  const TOKEN_KEY = 'campusfix_token';
  const USER_KEY = 'campusfix_user';

  return {
    getToken: function() {
      return localStorage.getItem(TOKEN_KEY);
    },

    setToken: function(token) {
      localStorage.setItem(TOKEN_KEY, token);
    },

    getUser: function() {
      const u = localStorage.getItem(USER_KEY);
      try {
        return u ? JSON.parse(u) : null;
      } catch (e) {
        return null;
      }
    },

    setUser: function(user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    },

    clear: function() {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    },

    isAuthenticated: function() {
      return !!this.getToken() && !!this.getUser();
    },

    requireAuth: function(allowedRoles = []) {
      const user = this.getUser();
      const token = this.getToken();

      if (!token || !user) {
        this.clear();
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
        return false;
      }

      if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        alert(`Access Denied: You need ${allowedRoles.join(' or ')} privileges.`);
        this.redirectToDashboard(user.role);
        return false;
      }

      return true;
    },

    redirectToDashboard: function(role) {
      if (role === 'admin') {
        window.location.href = '/admin';
      } else if (role === 'staff') {
        window.location.href = '/staff';
      } else {
        window.location.href = '/student';
      }
    },

    logout: async function() {
      try {
        await API.post('/api/auth/logout', {});
      } catch (err) {
        console.warn('Logout error:', err);
      } finally {
        this.clear();
        window.location.href = '/login?msg=logged_out';
      }
    },

    setupNavbarUser: function() {
      const user = this.getUser();
      if (!user) return;

      const nameEl = document.getElementById('navUserName');
      const roleEl = document.getElementById('navUserRole');
      const deptEl = document.getElementById('navUserDept');

      if (nameEl) nameEl.textContent = user.name;
      if (roleEl) {
        let badgeClass = 'bg-secondary';
        let roleName = user.role.toUpperCase();
        if (user.role === 'admin') { badgeClass = 'bg-danger'; roleName = 'ADMINISTRATOR'; }
        else if (user.role === 'staff') { badgeClass = 'bg-warning text-dark'; roleName = 'STAFF'; }
        else if (user.role === 'student') { badgeClass = 'bg-primary'; roleName = 'STUDENT'; }

        roleEl.className = `badge ${badgeClass} ms-1`;
        roleEl.textContent = roleName;
      }
      if (deptEl && user.department) {
        deptEl.textContent = user.department;
      }

      // Attach logout buttons
      const logoutBtns = document.querySelectorAll('.action-logout');
      logoutBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          this.logout();
        });
      });
    }
  };
})();
