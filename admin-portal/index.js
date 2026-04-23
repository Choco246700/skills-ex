    const AUTH_KEY = 'skillswap_auth';
    const API_URL = 'http://localhost:8000'; // Point this to your live production API URL later

    // ── Helper: Email Validation ──
    function validateEmail(email) {
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return re.test(String(email).toLowerCase());
    }

    // ── Auth helpers ──
    function getAuthUser() {
      try { return JSON.parse(localStorage.getItem(AUTH_KEY)); }
      catch { return null; }
    }

    function logout() {
      localStorage.removeItem(AUTH_KEY);
      window.location.href = 'homepage.html';
    }

    async function updateAuthHeader() {
      const user = getAuthUser();
      const navList = document.querySelector('.nav-list');
      const actionArea = document.getElementById('authHeaderAction');
      if (!navList || !actionArea) return;

      const currentPath = window.location.pathname.split('/').pop() || 'homepage.html';
      const pages = [
        { name: 'Home', href: 'homepage.html' },
        { name: 'Explore', href: 'explore.html' },
        { name: 'Exchange', href: 'app.html' },
        { name: 'Chat', href: 'chat.html' }
      ];

      // 1. Update Core Links
      let navHtml = pages.map(p => {
        const isActive = currentPath === p.href ? 'active' : '';
        return `<li><a href="${p.href}" class="nav-link ${isActive}">${p.name}</a></li>`;
      }).join('');

      if (!user) {
        const isLogin = currentPath === 'login.html' ? 'active' : '';
        navHtml += `<li><a href="login.html" class="nav-link ${isLogin}">Log In</a></li>`;
      }
      navList.innerHTML = navHtml;

      // 2. Update CTA Area
      if (user) {
        let notifCount = 0;
        try {
          // Check notifications if backend is available
          const notifications = await apiFetch(`/users/${user.id}/notifications`);
          notifCount = notifications.length;
        } catch (e) {
          console.warn("Could not fetch notifications");
        }

        const isUrl = user.image && user.image.startsWith('http');
        const imgPath = user.image ? (isUrl ? user.image : `./images/${user.image}`) : null;
        
        const avatarContent = imgPath 
          ? `<img src="${imgPath}" alt="${escHtml(user.name)}" onerror="this.parentElement.innerHTML='${getInitial(user.name)}'">`
          : getInitial(user.name);

        const badgeHtml = notifCount > 0 ? `<div class="notification-badge">${notifCount}</div>` : '';

        actionArea.innerHTML = `
          <div class="auth-profile-wrap">
            <a href="notifications.html" style="text-decoration: none;" title="Notifications">
              <div class="avatar-container">
                ${badgeHtml}
                <div class="header-avatar">${avatarContent}</div>
              </div>
            </a>
            <div class="header-user-info" style="margin-right: 12px;">
              <span class="header-user-name">${escHtml(user.name)}</span>
            </div>
            <button onclick="logout()" class="nav-cta logout-btn-refined">Log Out</button>
          </div>`;
      } else {
        const isSignup = currentPath === 'signup.html' ? 'active' : '';
        actionArea.innerHTML = `<a href="signup.html" class="nav-cta ${isSignup}">Sign Up</a>`;
      }
    }

    // ── API helpers ──
    async function apiFetch(endpoint, options = {}) {
      try {
        const response = await fetch(`${API_URL}${endpoint}`, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers
          }
        });
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.detail || 'API Error');
        }
        return await response.json();
      } catch (err) {
        console.error('Fetch Error:', err);
        showToast(err.message);
        throw err;
      }
    }

    // ── User Actions ──
    async function updateUserExchange() {
      const user = getAuthUser();
      if (!user || (!user.id && user.id !== 0)) {
        showToast('You must be logged in to update your profile.');
        return;
      }
      
      const teach = document.getElementById('teachInput').value.trim();
      const learn = document.getElementById('learnInput').value.trim();

      try {
        const updatedUser = await apiFetch(`/users/${user.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ teach, learn, image: "" }) // Send empty string to trigger backend auto-fetch
        });

        // Update local storage so changes reflect immediately
        localStorage.setItem(AUTH_KEY, JSON.stringify(updatedUser));
        
        // Refresh grid
        render();
        showToast(`Your profile has been updated! 🎉`);
      } catch (e) {}
    }

    async function deleteUser(id) {
      try {
        await apiFetch(`/users/${id}`, { method: 'DELETE' });
        render();
      } catch (e) {}
    }

    async function handleLogin(email, password) {
      try {
        const user = await apiFetch('/login', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });
        localStorage.setItem(AUTH_KEY, JSON.stringify(user));
        showToast('Logged in successfully! Redirecting...');
        setTimeout(() => window.location.href = 'homepage.html', 1500);
      } catch (e) {}
    }

    async function handleSignup(data) {
      try {
        const user = await apiFetch('/signup', {
          method: 'POST',
          body: JSON.stringify(data)
        });
        localStorage.setItem(AUTH_KEY, JSON.stringify(user));
        showToast('Account created! Redirecting...');
        setTimeout(() => window.location.href = 'homepage.html', 1500);
      } catch (e) {}
    }

    // New Google Credential Handler
    window.handleCredentialResponse = async (response) => {
      try {
        console.log("Encoded JWT ID token: " + response.credential);
        const action = window.location.pathname.includes('signup.html') ? 'signup' : 'login';
        
        const user = await apiFetch(`/auth/google?action=${action}`, {
          method: 'POST',
          body: JSON.stringify({ token: response.credential })
        });
        
        localStorage.setItem(AUTH_KEY, JSON.stringify(user));
        
        if (action === 'signup') {
          showToast('Account created! Welcome to Skills EX.');
        } else {
          showToast(`Welcome back, ${user.name}! 👋`);
        }
        
        setTimeout(() => window.location.href = 'homepage.html', 1500);
      } catch (e) {
        // Error already handled by apiFetch showToast
      }
    };

    // ── Rendering ──
    async function render() {
      try {
        // Branch to chat view - FAST check
        if (document.getElementById('chatContainer')) {
          await renderChat();
          return;
        }

        // Branch to notifications view
        if (document.getElementById('notificationsGrid')) {
          await renderNotifications();
          return;
        }

        const users = await apiFetch('/users');
        const matches = await apiFetch('/matches');

        // Branch to explore view
        if (document.getElementById('exploreGrid')) {
          renderExplore(users);
          return;
        }

        // Stats
        const teachSkills = users.map(u => u.teach?.toLowerCase()).filter(s => s);
        const learnSkills = users.map(u => u.learn?.toLowerCase()).filter(s => s);
        const uniqueSkills = new Set([...teachSkills, ...learnSkills]);
        
        const statUsersEl = document.getElementById('statUsers');
        const statMatchesEl = document.getElementById('statMatches');
        const statSkillsEl = document.getElementById('statSkills');
        const userCountEl = document.getElementById('userCount');
        const matchCountEl = document.getElementById('matchCount');

        if (statUsersEl) statUsersEl.textContent = users.length;
        if (statMatchesEl) statMatchesEl.textContent = matches.length;
        if (statSkillsEl) statSkillsEl.textContent = uniqueSkills.size;
        if (userCountEl) userCountEl.textContent = users.length + (users.length === 1 ? ' person' : ' people');
        if (matchCountEl) matchCountEl.textContent = matches.length + ' found';

        // Users Grid
        const grid = document.getElementById('usersGrid');
        if (grid) {
          if (users.length === 0) {
            grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p class="empty-text">No members yet</p></div>`;
          } else {
            grid.innerHTML = users.map((u, i) => `
              <div class="user-card" style="animation-delay:${i * 0.04}s">
                <button class="card-delete" onclick="deleteUser(${u.id})" title="Remove">✕</button>
                <div class="user-avatar">${getInitial(u.name)}</div>
                <div class="user-name">${escHtml(u.name)}</div>
                ${u.teach ? `
                  <div class="skill-badge">
                    <div class="skill-icon icon-teach">↑</div>
                    <div><span class="skill-label">Teaches</span><span class="skill-text">${escHtml(u.teach)}</span></div>
                  </div>` : ''}
                ${u.learn ? `
                  <div class="skill-badge">
                    <div class="skill-icon icon-learn">↓</div>
                    <div><span class="skill-label">Wants to Learn</span><span class="skill-text">${escHtml(u.learn)}</span></div>
                  </div>` : ''}
              </div>`).join('');
          }
        }

        // Matches
        const container = document.getElementById('matchesContainer');
        if (container) {
          if (matches.length === 0) {
            container.innerHTML = `<div class="empty-state"><p class="empty-text">No connections yet</p></div>`;
          } else {
            container.innerHTML = matches.map((m, i) => {
              if (m.type === 'exchange') {
                return `
                <div class="match-card" style="animation-delay:${i * 0.05}s">
                  <div class="match-avatars">
                    <div class="match-avatar">${getInitial(m.a.name)}</div>
                    <div class="match-connector"></div>
                    <div class="match-avatar">${getInitial(m.b.name)}</div>
                  </div>
                  <div class="match-info">
                    <div class="match-names">${escHtml(m.a.name)} × ${escHtml(m.b.name)}</div>
                    <div class="match-detail">
                      <strong>${escHtml(m.a.name)}</strong> teaches <strong>${escHtml(m.a.teach)}</strong> · 
                      <strong>${escHtml(m.b.name)}</strong> teaches <strong>${escHtml(m.b.teach)}</strong>
                    </div>
                  </div>
                  <div class="match-exchange-icon">⇄</div>
                </div>`;
              } else {
                return `
                <div class="match-card mentor-card" style="animation-delay:${i * 0.05}s">
                  <div class="match-avatars">
                    <div class="match-avatar">${getInitial(m.teacher.name)}</div>
                    <div class="match-connector"></div>
                    <div class="match-avatar" style="background:var(--sage)">${getInitial(m.learner.name)}</div>
                  </div>
                  <div class="match-info">
                    <div class="match-names">${escHtml(m.teacher.name)} → ${escHtml(m.learner.name)}</div>
                    <div class="match-detail"><strong>${escHtml(m.teacher.name)}</strong> teaches <strong>${escHtml(m.learner.learn)}</strong></div>
                  </div>
                  <div class="match-exchange-icon">→</div>
                </div>`;
              }
            }).join('');
          }
        }
      } catch (e) {}
    }

    function renderExplore(users, filter = '', categoryFilter = '') {
      const grid = document.getElementById('exploreGrid');
      if (!grid) return;

      const skillsMap = {};
      users.forEach(u => {
        if (!u.teach) return;
        const skill = u.teach.trim();
        const skillKey = skill.toLowerCase();
        if (!skillsMap[skillKey]) {
          skillsMap[skillKey] = { name: skill, tutors: [], category: u.category || 'Community', rating: u.rating };
        }
        skillsMap[skillKey].tutors.push(u.name);
      });

      const skillKeys = Object.keys(skillsMap).filter(k => {
        const matchesText = k.includes(filter.toLowerCase());
        const matchesCategory = !categoryFilter || skillsMap[k].category === categoryFilter;
        return matchesText && matchesCategory;
      });

      if (skillKeys.length === 0) {
        grid.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;"><p class="empty-text">No matching skills found.</p></div>`;
        return;
      }

      grid.innerHTML = skillKeys.sort().map((k, i) => {
        const skill = skillsMap[k];
        return `
          <div class="skill-card" style="animation-delay: ${i * 0.05}s">
            <div class="skill-card-content">
              <div class="skill-card-header">
                <span class="skill-card-badge">${escHtml(skill.category)}</span>
                <div class="skill-card-rating">⭐ <span class="score">${skill.rating}</span></div>
              </div>
              <h3 class="skill-card-title">${escHtml(skill.name)}</h3>
              <div class="tutor-list">
                ${skill.tutors.map(t => `<span class="tutor-pill">${escHtml(t)}</span>`).join('')}
              </div>
              <a href="app.html?learn=${encodeURIComponent(skill.name)}" class="join-cta">Request to Learn →</a>
            </div>
          </div>`;
      }).join('');
    }

    async function renderNotifications() {
      const grid = document.getElementById('notificationsGrid');
      if (!grid) return;

      const user = getAuthUser();
      if (!user) {
        grid.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;"><p class="empty-text">Please log in to view your notifications.</p></div>`;
        return;
      }

      try {
        const notifications = await apiFetch(`/users/${user.id}/notifications`);
        
        if (notifications.length === 0) {
          const teachDisplay = user.teach ? `"${escHtml(user.teach)}"` : '"your skills"';
          grid.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;"><p class="empty-text">No new requests to learn ${teachDisplay} yet!</p></div>`;
          return;
        }

        grid.innerHTML = notifications.map((u, i) => `
          <div class="user-card" style="animation-delay:${i * 0.04}s">
            <div class="user-avatar">${getInitial(u.name)}</div>
            <div class="user-name">${escHtml(u.name)}</div>
            <div class="skill-badge" style="margin-top: 12px; margin-bottom: 24px;">
              <div class="skill-icon icon-learn">⭐</div>
              <div><span class="skill-label">Wants to learn</span><span class="skill-text">${escHtml(u.learn)}</span></div>
            </div>
            <a href="javascript:void(0)" onclick="acknowledgeAndGo(${u.id})" class="nav-cta contact-btn" style="display: block; text-align: center; text-decoration: none; width: 100%; background: var(--terracotta); color: white; padding: 12px; border-radius: 12px; font-weight: 600; transition: transform 0.2s, background 0.2s; box-sizing: border-box; margin-top: auto;">
              Contact ${escHtml(u.name.split(' ')[0])}
            </a>
          </div>`).join('');
      } catch (e) {
        grid.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;"><p class="empty-text">Failed to load notifications.</p></div>`;
      }
    }

    async function acknowledgeAndGo(targetId) {
      const user = getAuthUser();
      if (!user) return;
      try {
        await apiFetch(`/users/${user.id}/notifications/acknowledge/${targetId}`, { method: 'POST' });
        window.location.href = `chat.html?user=${targetId}`;
      } catch (e) {
        window.location.href = `chat.html?user=${targetId}`;
      }
    }

    async function renderChat() {
      const user = getAuthUser();
      const chatContainer = document.getElementById('chatContainer');
      const unauthChat = document.getElementById('unauthChat');
      if (!chatContainer || !unauthChat) return;
      
      if (!user || user.id === undefined) {
        chatContainer.style.display = 'none';
        unauthChat.style.display = 'block';
        return;
      }

      chatContainer.style.display = 'grid';
      unauthChat.style.display = 'none';

      try {
        const queryParams = new URLSearchParams(window.location.search);
        const TargetUserId = queryParams.get('user');
        const sidebar = document.getElementById('chatContacts');
        
        const loadSidebar = async () => {
          try {
            const contacted = await apiFetch(`/users/${parseInt(user.id)}/chats`);
            let usersToDisplay = [...contacted];
            
            if (TargetUserId && !contacted.find(u => String(u.id) === String(TargetUserId))) {
              try {
                 const allUsers = await apiFetch(`/users`);
                 const specificUser = allUsers.find(u => String(u.id) === String(TargetUserId));
                 if (specificUser) usersToDisplay.unshift(specificUser);
              } catch(e) {}
            }

            if (usersToDisplay.length === 0) {
              sidebar.innerHTML = '<div style="padding: 20px; color: var(--muted); font-size: 14px;">No ongoing conversations.</div>';
              return;
            }

            const currentContactsHtml = usersToDisplay.map(u => `
              <a href="chat.html?user=${u.id}" style="text-decoration:none; color:inherit;">
                <div class="chat-contact-item ${String(u.id) === String(TargetUserId) ? 'active' : ''}">
                  <div class="user-avatar" style="width:36px;height:36px;font-size:14px;">${getInitial(u.name)}</div>
                  <div style="font-weight: 500;">${escHtml(u.name)}</div>
                </div>
              </a>
            `).join('');
            
            if (sidebar.innerHTML !== currentContactsHtml) {
              sidebar.innerHTML = currentContactsHtml;
            }
          } catch (e) {
            console.error("Error loading sidebar", e);
          }
        };

        await loadSidebar();

        if (TargetUserId) {
          const placeholder = document.getElementById('chatMainPlaceholder');
          const activeArea = document.getElementById('chatMainActive');
          if (placeholder) placeholder.style.display = 'none';
          if (activeArea) activeArea.style.display = 'flex';
          
          let targetUserObj = null;
          try {
             const allResp = await apiFetch(`/users`);
             targetUserObj = allResp.find(u => String(u.id) === String(TargetUserId));
          } catch(e) {}

          if (targetUserObj) {
             document.getElementById('activeChatName').innerText = targetUserObj.name;
             document.getElementById('activeChatAvatar').innerHTML = getInitial(targetUserObj.name);
          }

          const messagesBox = document.getElementById('chatMessages');
          let currentMessagesCount = -1;
          
          const fetchMessages = async () => {
            try {
              const msgs = await apiFetch(`/messages?user1_id=${parseInt(user.id)}&user2_id=${parseInt(TargetUserId)}`);
              if (msgs.length !== currentMessagesCount) {
                currentMessagesCount = msgs.length;
                messagesBox.innerHTML = msgs.map(m => `
                  <div class="chat-bubble ${String(m.sender_id) === String(user.id) ? 'sent' : 'received'}">
                    ${escHtml(m.content)}
                  </div>
                `).join('');
                messagesBox.scrollTop = messagesBox.scrollHeight;
                // Whenever messages change, also refresh the sidebar order
                loadSidebar();
              }
            } catch(e) {}
          };
          
          fetchMessages();
          setInterval(fetchMessages, 2500);

          const chatForm = document.getElementById('chatForm');
          if (chatForm) {
            const newForm = chatForm.cloneNode(true);
            chatForm.parentNode.replaceChild(newForm, chatForm);
            
            newForm.addEventListener('submit', async (e) => {
              e.preventDefault();
              const input = newForm.querySelector('#chatInput');
              const content = input.value.trim();
              if (!content) return;

              input.value = '';
              try {
                await apiFetch('/messages', {
                  method: 'POST',
                  body: JSON.stringify({ sender_id: parseInt(user.id), receiver_id: parseInt(TargetUserId), content })
                });
                fetchMessages();
                loadSidebar();
              } catch(e) {}
            });
          }
        }
      } catch (e) {
        console.error("Chat Error:", e);
      }
    }

    // ── Helper functions ──
    async function populateCategories() {
      const filterEl = document.getElementById('categoryFilter');
      if (!filterEl) return;
      try {
        const users = await apiFetch('/users');
        const categories = [...new Set(users.map(s => s.category))].sort();
        filterEl.innerHTML = '<option value="">All Categories</option>';
        categories.forEach(cat => {
          const opt = document.createElement('option');
          opt.value = cat;
          opt.textContent = cat;
          filterEl.appendChild(opt);
        });
      } catch (e) {}
    }

    function getInitial(name) { return name.trim().charAt(0).toUpperCase() || '?'; }
    function showToast(msg) {
      const t = document.getElementById('toast');
      if(!t) return;
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2800);
    }
    function escHtml(str) { return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

    // ── Init ──
    document.addEventListener('DOMContentLoaded', () => {
      populateCategories();
      updateAuthHeader();
      render();

      const user = getAuthUser();
      
      // Toggle app.html Exchange forms based on auth state
      const unauthExchange = document.getElementById('unauthExchange');
      const authExchange = document.getElementById('authExchange');
      if (unauthExchange && authExchange) {
        if (user) {
          unauthExchange.style.display = 'none';
          authExchange.style.display = 'block';
          
          document.getElementById('nameInput').value = user.name || '';
          if (user.teach && user.teach !== 'Exploring') document.getElementById('teachInput').value = user.teach;
          
          const urlLearn = new URLSearchParams(window.location.search).get('learn');
          if (urlLearn) {
            document.getElementById('learnInput').value = urlLearn;
          } else if (user.learn && user.learn !== 'New Skills') {
            document.getElementById('learnInput').value = user.learn;
          }
        } else {
          unauthExchange.style.display = 'block';
          authExchange.style.display = 'none';
        }
      }

      // Mobile Menu
      const mobileMenuBtn = document.getElementById('mobileMenuBtn');
      const mainNav = document.getElementById('mainNav');
      mobileMenuBtn?.addEventListener('click', () => {
        mobileMenuBtn.classList.toggle('open');
        mainNav.classList.toggle('open');
      });

      // Search listeners
      const exploreSearch = document.getElementById('exploreSearch');
      const categoryFilter = document.getElementById('categoryFilter');
      const runFilter = async () => {
        const users = await apiFetch('/users');
        renderExplore(users, exploreSearch?.value || '', categoryFilter?.value || '');
      };
      exploreSearch?.addEventListener('input', runFilter);
      categoryFilter?.addEventListener('change', runFilter);
    });