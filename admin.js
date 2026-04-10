(() => {
  'use strict';

  const API_URL = '/api/rsvp';
  const AUTH_KEY = 'admin_token';

  let deleteTargetId = null;
  let currentData = [];

  // =========================================================
  // AUTH
  // =========================================================
  const authGate = document.getElementById('authGate');
  const dashboard = document.getElementById('dashboardContent');
  const authPassword = document.getElementById('authPassword');
  const authSubmit = document.getElementById('authSubmit');
  const authError = document.getElementById('authError');

  function getToken() {
    return sessionStorage.getItem(AUTH_KEY) || '';
  }

  function setToken(token) {
    sessionStorage.setItem(AUTH_KEY, token);
  }

  function clearToken() {
    sessionStorage.removeItem(AUTH_KEY);
  }

  function showDashboard() {
    authGate.style.display = 'none';
    dashboard.classList.remove('dashboard-hidden');
    fetchData();
  }

  function showAuthGate() {
    authGate.style.display = 'flex';
    dashboard.classList.add('dashboard-hidden');
    clearToken();
  }

  async function validateAndEnter() {
    const password = authPassword.value.trim();
    if (!password) {
      authError.textContent = 'Digite a senha de acesso.';
      return;
    }

    authError.textContent = '';
    authSubmit.disabled = true;

    try {
      const res = await fetch(API_URL, {
        headers: { 'Authorization': `Bearer ${password}` },
      });

      if (res.ok) {
        setToken(password);
        showDashboard();
      } else if (res.status === 401) {
        authError.textContent = 'Senha incorreta.';
      } else {
        setToken(password);
        showDashboard();
      }
    } catch {
      setToken(password);
      showDashboard();
    } finally {
      authSubmit.disabled = false;
    }
  }

  if (getToken()) {
    showDashboard();
  }

  authSubmit.addEventListener('click', validateAndEnter);
  authPassword.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') validateAndEnter();
  });

  document.getElementById('logoutBtn').addEventListener('click', showAuthGate);

  // =========================================================
  // TOAST
  // =========================================================
  function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icon =
      type === 'success'
        ? '<i class="fas fa-check-circle"></i>'
        : '<i class="fas fa-exclamation-triangle"></i>';

    toast.innerHTML = `<div style="display:flex;align-items:center;gap:10px;">${icon}<span>${message}</span></div>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // =========================================================
  // MODAL
  // =========================================================
  function openDeleteModal(id) {
    deleteTargetId = id;
    document.getElementById('confirmModal').classList.add('active');
  }

  function closeModal() {
    deleteTargetId = null;
    document.getElementById('confirmModal').classList.remove('active');
  }

  document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
    if (deleteTargetId) {
      await executeDelete(deleteTargetId);
      closeModal();
    }
  });

  document.getElementById('modalCancel').addEventListener('click', closeModal);

  document.getElementById('confirmModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });

  // =========================================================
  // DATA FETCHING
  // =========================================================
  async function fetchData() {
    const tableBody = document.getElementById('tableBody');
    const btnIcon = document.querySelector('.refresh-btn i');

    if (btnIcon) btnIcon.classList.add('fa-spin');

    try {
      const response = await fetch(API_URL, {
        headers: { 'Authorization': `Bearer ${getToken()}` },
      });

      const json = await response.json();
      if (!json.success) throw new Error('API Error');

      currentData = json.data;
      updateStats(currentData);
      renderTable(currentData);
    } catch (error) {
      console.error(error);
      tableBody.innerHTML = `
        <tr><td colspan="5" style="text-align:center; padding:3rem; color:var(--danger);">
          <i class="fas fa-wifi" style="font-size:2rem; margin-bottom:10px;display:block;"></i>
          Erro de conexão. O backend está rodando?
        </td></tr>`;
      showToast('Erro ao conectar com o servidor', 'error');
    } finally {
      if (btnIcon) btnIcon.classList.remove('fa-spin');
    }
  }

  document.getElementById('syncBtn').addEventListener('click', () => {
    fetchData();
    showToast('Dados sincronizados!', 'success');
  });

  // =========================================================
  // TABLE RENDERING
  // =========================================================
  function renderTable(data) {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '';

    if (data.length === 0) {
      tableBody.innerHTML = `
        <tr><td colspan="5" style="text-align:center; padding:3rem;">
          <i class="far fa-folder-open" style="font-size:2rem; opacity:0.4; display:block; margin-bottom:10px;"></i>
          <span style="opacity:0.5;">Nenhuma confirmação ainda.</span>
        </td></tr>`;
      return;
    }

    const fragment = document.createDocumentFragment();

    data.forEach((rsvp) => {
      const initial = rsvp.name.charAt(0).toUpperCase();
      const date = new Date(rsvp.confirmedAt).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });

      let childHtml = '<span class="badge badge-gray">Não</span>';
      if (rsvp.hasChildren) {
        const detail = rsvp.childrenDetails
          ? `<span class="child-info">${escapeHtml(rsvp.childrenDetails)}</span>`
          : '';
        childHtml = `<div style="text-align:right"><span class="badge badge-gold">${escapeHtml(rsvp.childrenQty || '—')}</span>${detail}</div>`;
      }

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>
          <div class="name-cell">
            <div class="user-avatar">${initial}</div>
            <div class="user-info-text">
              <div style="font-weight:600; font-size:1.05rem; color:white;">${escapeHtml(rsvp.name)}</div>
              <div style="font-size:0.7rem; opacity:0.4; font-family:monospace;">ID: ...${rsvp._id.slice(-6)}</div>
            </div>
          </div>
        </td>
        <td><span style="font-size:1rem; font-weight:500;">${rsvp.adults}</span></td>
        <td>${childHtml}</td>
        <td><span style="font-size:0.85rem; opacity:0.6;">${date}</span></td>
        <td>
          <button class="delete-btn" data-id="${rsvp._id}" title="Excluir convidado">
            <i class="fas fa-trash-alt"></i>
            <span class="delete-text">Excluir</span>
          </button>
        </td>`;

      row.querySelector('.delete-btn').addEventListener('click', () => {
        openDeleteModal(rsvp._id);
      });

      fragment.appendChild(row);
    });

    tableBody.appendChild(fragment);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // =========================================================
  // STATS
  // =========================================================
  function updateStats(data) {
    const totalRsvps = data.length;
    const totalAdults = data.reduce((acc, r) => acc + (Number(r.adults) || 0), 0);
    const totalChildren = data.reduce((acc, r) => {
      if (!r.hasChildren || !r.childrenQty) return acc;
      const qty = parseInt(r.childrenQty, 10);
      return acc + (isNaN(qty) ? 4 : qty);
    }, 0);

    animateValue('totalRsvps', totalRsvps);
    animateValue('totalAdults', totalAdults);
    animateValue('totalChildren', totalChildren);
    animateValue('totalGuests', totalAdults + totalChildren);
  }

  function animateValue(id, end) {
    const el = document.getElementById(id);
    if (!el) return;

    const start = parseInt(el.textContent, 10) || 0;
    if (start === end) return;

    const duration = 400;
    const range = Math.abs(end - start);
    const step = Math.max(Math.floor(duration / range), 15);
    const increment = end > start ? 1 : -1;
    let current = start;

    if (step < 15) {
      el.textContent = end;
      return;
    }

    const timer = setInterval(() => {
      current += increment;
      el.textContent = current;
      if (current === end) clearInterval(timer);
    }, step);
  }

  // =========================================================
  // DELETE
  // =========================================================
  async function executeDelete(id) {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` },
      });

      const json = await response.json();

      if (json.success) {
        showToast('Convidado excluído com sucesso!', 'success');
        fetchData();
      } else {
        showToast('Erro ao excluir: ' + (json.error || 'Desconhecido'), 'error');
      }
    } catch {
      showToast('Erro de conexão ao tentar excluir.', 'error');
    }
  }

  // =========================================================
  // SEARCH FILTER
  // =========================================================
  document.getElementById('searchInput').addEventListener('input', function () {
    const query = this.value.toUpperCase();
    document.querySelectorAll('#tableBody tr').forEach((row) => {
      const nameEl = row.querySelector('.user-info-text');
      if (nameEl) {
        const text = nameEl.textContent.toUpperCase();
        row.style.display = text.includes(query) ? '' : 'none';
      }
    });
  });
})();
