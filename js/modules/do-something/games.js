/**
 * Do Something — Mini-game definitions
 * Each game: { id, prompt, setup(container, onComplete), teardown() }
 */

const games = [

  // 1. Dismiss Notification
  {
    id: 'dismiss-notification',
    prompt: 'Dismiss the notification.',
    setup(container, onComplete) {
      container.innerHTML = `
        <div class="ds-game ds-notif-game">
          <div class="ds-phone-screen">
            <div class="ds-notif-bar">
              <span class="ds-notif-time">9:41</span>
            </div>
            <div class="ds-notification" draggable="false">
              <div class="ds-notif-icon">📬</div>
              <div class="ds-notif-body">
                <div class="ds-notif-title">New Message</div>
                <div class="ds-notif-text">Hey! Are you there? I wanted to ask you about...</div>
              </div>
            </div>
            <div class="ds-notif-hint">swipe or drag to dismiss</div>
          </div>
        </div>
      `;
      const notif = container.querySelector('.ds-notification');
      let startX = 0, currentX = 0, dragging = false;

      const onStart = (e) => {
        dragging = true;
        startX = e.touches ? e.touches[0].clientX : e.clientX;
        notif.style.transition = 'none';
      };
      const onMove = (e) => {
        if (!dragging) return;
        const x = e.touches ? e.touches[0].clientX : e.clientX;
        currentX = x - startX;
        notif.style.transform = `translateX(${currentX}px)`;
        notif.style.opacity = Math.max(0, 1 - Math.abs(currentX) / 200);
      };
      const onEnd = () => {
        if (!dragging) return;
        dragging = false;
        if (Math.abs(currentX) > 80) {
          notif.style.transition = 'transform 0.3s, opacity 0.3s';
          notif.style.transform = `translateX(${currentX > 0 ? 400 : -400}px)`;
          notif.style.opacity = '0';
          setTimeout(onComplete, 350);
        } else {
          notif.style.transition = 'transform 0.2s, opacity 0.2s';
          notif.style.transform = 'translateX(0)';
          notif.style.opacity = '1';
        }
      };

      notif.addEventListener('mousedown', onStart);
      notif.addEventListener('touchstart', onStart, { passive: true });
      window.addEventListener('mousemove', onMove);
      window.addEventListener('touchmove', onMove, { passive: true });
      window.addEventListener('mouseup', onEnd);
      window.addEventListener('touchend', onEnd);

      this._cleanup = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('touchmove', onMove);
        window.removeEventListener('mouseup', onEnd);
        window.removeEventListener('touchend', onEnd);
      };
    },
    teardown() { this._cleanup?.(); }
  },

  // 2. Accept Cookies
  {
    id: 'accept-cookies',
    prompt: 'Accept the cookies.',
    setup(container, onComplete) {
      container.innerHTML = `
        <div class="ds-game ds-cookies-game">
          <div class="ds-cookies-site">
            <div class="ds-cookies-content">
              <div class="ds-cookies-fake-text"></div>
              <div class="ds-cookies-fake-text short"></div>
              <div class="ds-cookies-fake-text"></div>
              <div class="ds-cookies-fake-text med"></div>
            </div>
            <div class="ds-cookies-banner">
              <div class="ds-cookies-msg">
                🍪 We use cookies to enhance your experience, serve personalized ads, and analyze traffic.
                By clicking "Accept All" you consent to our use of cookies.
                <a href="#" class="ds-cookies-link">Cookie Policy</a>
              </div>
              <div class="ds-cookies-buttons">
                <button class="ds-cookies-manage">Manage Preferences</button>
                <button class="ds-cookies-reject">Reject Non-Essential</button>
                <button class="ds-cookies-accept">Accept All</button>
              </div>
            </div>
          </div>
        </div>
      `;
      container.querySelector('.ds-cookies-accept').addEventListener('click', () => {
        const banner = container.querySelector('.ds-cookies-banner');
        banner.style.transition = 'transform 0.4s ease, opacity 0.4s ease';
        banner.style.transform = 'translateY(100%)';
        banner.style.opacity = '0';
        setTimeout(onComplete, 450);
      });
    },
    teardown() {}
  },

  // 3. Like a Photo
  {
    id: 'like-photo',
    prompt: 'Like the photo.',
    setup(container, onComplete) {
      const hues = [200, 280, 340, 160, 30];
      const hue = hues[Math.floor(Math.random() * hues.length)];
      container.innerHTML = `
        <div class="ds-game ds-like-game">
          <div class="ds-like-post">
            <div class="ds-like-header">
              <div class="ds-like-avatar"></div>
              <span class="ds-like-username">user_${Math.floor(Math.random() * 9999)}</span>
            </div>
            <div class="ds-like-photo" style="background: linear-gradient(135deg, hsl(${hue}, 60%, 40%), hsl(${hue + 40}, 70%, 60%));">
              <div class="ds-like-big-heart">♥</div>
            </div>
            <div class="ds-like-actions">
              <button class="ds-like-btn">♡</button>
              <span class="ds-like-count">2,847 likes</span>
            </div>
          </div>
        </div>
      `;
      const btn = container.querySelector('.ds-like-btn');
      const bigHeart = container.querySelector('.ds-like-big-heart');
      const photo = container.querySelector('.ds-like-photo');
      let done = false;

      const doLike = () => {
        if (done) return;
        done = true;
        btn.textContent = '♥';
        btn.classList.add('liked');
        container.querySelector('.ds-like-count').textContent = '2,848 likes';
        bigHeart.classList.add('show');
        setTimeout(() => bigHeart.classList.remove('show'), 800);
        setTimeout(onComplete, 900);
      };

      btn.addEventListener('click', doLike);
      let lastTap = 0;
      photo.addEventListener('click', () => {
        const now = Date.now();
        if (now - lastTap < 400) doLike();
        lastTap = now;
      });
    },
    teardown() {}
  },

  // 4. Close Popup Ad
  {
    id: 'close-popup',
    prompt: 'Close the popup ad.',
    setup(container, onComplete) {
      container.innerHTML = `
        <div class="ds-game ds-popup-game">
          <div class="ds-popup-overlay">
            <div class="ds-popup-ad">
              <div class="ds-popup-close-btn">✕</div>
              <div class="ds-popup-content">
                <div class="ds-popup-badge">🎉 CONGRATULATIONS!</div>
                <div class="ds-popup-headline">You've been selected!</div>
                <div class="ds-popup-sub">Claim your FREE* prize now!</div>
                <button class="ds-popup-cta">CLAIM NOW →</button>
                <div class="ds-popup-fine">*Terms and conditions apply. Not actually free.</div>
              </div>
            </div>
          </div>
        </div>
      `;
      container.querySelector('.ds-popup-close-btn').addEventListener('click', () => {
        const ad = container.querySelector('.ds-popup-ad');
        ad.style.transition = 'transform 0.3s, opacity 0.3s';
        ad.style.transform = 'scale(0.8)';
        ad.style.opacity = '0';
        setTimeout(onComplete, 350);
      });
    },
    teardown() {}
  },

  // 5. Agree to Terms
  {
    id: 'agree-terms',
    prompt: 'Agree to the terms.',
    setup(container, onComplete) {
      const legalText = `TERMS OF SERVICE\n\nLast updated: ${new Date().toLocaleDateString()}\n\n` +
        `1. ACCEPTANCE OF TERMS\nBy accessing or using this Service, you agree to be bound by these Terms. ` +
        `If you disagree with any part of the terms, you may not access the Service.\n\n` +
        `2. USE LICENSE\nPermission is granted to temporarily download one copy of the materials on this ` +
        `Service for personal, non-commercial transitory viewing only.\n\n` +
        `3. DISCLAIMER\nThe materials on this Service are provided on an 'as is' basis. We make no warranties, ` +
        `expressed or implied, and hereby disclaim and negate all other warranties including, without limitation, ` +
        `implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement ` +
        `of intellectual property or other violation of rights.\n\n` +
        `4. LIMITATIONS\nIn no event shall this Service or its suppliers be liable for any damages (including, ` +
        `without limitation, damages for loss of data or profit, or due to business interruption) arising out of ` +
        `the use or inability to use the materials on this Service.\n\n` +
        `5. ACCURACY OF MATERIALS\nThe materials appearing on this Service could include technical, typographical, ` +
        `or photographic errors. We do not warrant that any of the materials are accurate, complete or current.\n\n` +
        `6. LINKS\nWe have not reviewed all of the sites linked to this Service and are not responsible for the ` +
        `contents of any such linked site.\n\n` +
        `7. MODIFICATIONS\nWe may revise these terms at any time without notice. By using this Service you are ` +
        `agreeing to be bound by the then current version of these terms.\n\n` +
        `8. GOVERNING LAW\nThese terms shall be governed by and construed in accordance with applicable laws ` +
        `and you irrevocably submit to the exclusive jurisdiction of the courts in that location.\n\n` +
        `By clicking "I Agree" below, you acknowledge that you have read and understand these terms.`;

      container.innerHTML = `
        <div class="ds-game ds-terms-game">
          <div class="ds-terms-window">
            <div class="ds-terms-header">Terms of Service</div>
            <div class="ds-terms-scroll">
              <pre class="ds-terms-text">${legalText}</pre>
            </div>
            <div class="ds-terms-footer">
              <span class="ds-terms-scroll-hint">↓ Scroll to the bottom</span>
              <button class="ds-terms-agree" disabled>I Agree</button>
            </div>
          </div>
        </div>
      `;

      const scrollEl = container.querySelector('.ds-terms-scroll');
      const btn = container.querySelector('.ds-terms-agree');
      const hint = container.querySelector('.ds-terms-scroll-hint');

      scrollEl.addEventListener('scroll', () => {
        const atBottom = scrollEl.scrollTop + scrollEl.clientHeight >= scrollEl.scrollHeight - 10;
        if (atBottom) {
          btn.disabled = false;
          hint.style.display = 'none';
        }
      });

      btn.addEventListener('click', () => {
        if (!btn.disabled) {
          btn.textContent = '✓ Agreed';
          btn.classList.add('agreed');
          setTimeout(onComplete, 500);
        }
      });
    },
    teardown() {}
  },

  // 6. Slide the Sliders
  {
    id: 'slide-sliders',
    prompt: 'Slide all sliders to the right.',
    setup(container, onComplete) {
      container.innerHTML = `
        <div class="ds-game ds-sliders-game">
          <div class="ds-sliders-panel">
            <div class="ds-slider-row"><label>Volume</label><input type="range" min="0" max="100" value="0" class="ds-slider"></div>
            <div class="ds-slider-row"><label>Brightness</label><input type="range" min="0" max="100" value="0" class="ds-slider"></div>
            <div class="ds-slider-row"><label>Contrast</label><input type="range" min="0" max="100" value="0" class="ds-slider"></div>
          </div>
        </div>
      `;
      const sliders = container.querySelectorAll('.ds-slider');
      const check = () => {
        const allMax = [...sliders].every(s => parseInt(s.value) >= 95);
        if (allMax) setTimeout(onComplete, 300);
      };
      sliders.forEach(s => s.addEventListener('input', check));
    },
    teardown() {}
  },

  // 7. Toggle the Switches
  {
    id: 'toggle-switches',
    prompt: 'Turn on all the switches.',
    setup(container, onComplete) {
      const labels = ['Wi-Fi', 'Bluetooth', 'Airplane Mode', 'Do Not Disturb', 'Location'];
      container.innerHTML = `
        <div class="ds-game ds-switches-game">
          <div class="ds-switches-panel">
            ${labels.map((l, i) => `
              <div class="ds-switch-row">
                <span>${l}</span>
                <label class="ds-switch">
                  <input type="checkbox" data-idx="${i}">
                  <span class="ds-switch-slider"></span>
                </label>
              </div>
            `).join('')}
          </div>
        </div>
      `;
      const checks = container.querySelectorAll('.ds-switch input');
      const verify = () => {
        if ([...checks].every(c => c.checked)) setTimeout(onComplete, 400);
      };
      checks.forEach(c => c.addEventListener('change', verify));
    },
    teardown() {}
  },

  // 8. Unsubscribe
  {
    id: 'unsubscribe',
    prompt: 'Type UNSUBSCRIBE to confirm.',
    setup(container, onComplete) {
      container.innerHTML = `
        <div class="ds-game ds-unsub-game">
          <div class="ds-unsub-panel">
            <div class="ds-unsub-icon">📧</div>
            <div class="ds-unsub-title">We're sorry to see you go!</div>
            <div class="ds-unsub-text">To confirm unsubscription, please type <strong>UNSUBSCRIBE</strong> below:</div>
            <input type="text" class="ds-unsub-input" placeholder="Type here..." autocomplete="off" spellcheck="false">
            <button class="ds-unsub-btn" disabled>Confirm</button>
          </div>
        </div>
      `;
      const input = container.querySelector('.ds-unsub-input');
      const btn = container.querySelector('.ds-unsub-btn');

      input.addEventListener('input', () => {
        const match = input.value.trim().toUpperCase() === 'UNSUBSCRIBE';
        btn.disabled = !match;
      });
      btn.addEventListener('click', () => {
        if (!btn.disabled) {
          btn.textContent = '✓ Unsubscribed';
          btn.classList.add('confirmed');
          input.disabled = true;
          setTimeout(onComplete, 600);
        }
      });
    },
    teardown() {}
  },

  // 9. Pull to Refresh
  {
    id: 'pull-to-refresh',
    prompt: 'Pull down to refresh.',
    setup(container, onComplete) {
      container.innerHTML = `
        <div class="ds-game ds-pull-game">
          <div class="ds-pull-area">
            <div class="ds-pull-indicator">
              <div class="ds-pull-arrow">↓</div>
              <span>Pull down</span>
            </div>
            <div class="ds-pull-content">
              <div class="ds-pull-item">Nothing new yet...</div>
              <div class="ds-pull-item faded">Still nothing...</div>
              <div class="ds-pull-item faded">Check back later</div>
            </div>
          </div>
        </div>
      `;
      const area = container.querySelector('.ds-pull-area');
      const indicator = container.querySelector('.ds-pull-indicator');
      const content = container.querySelector('.ds-pull-content');
      let startY = 0, pulling = false, pullDist = 0;

      const onStart = (e) => {
        if (area.scrollTop > 0) return;
        pulling = true;
        startY = e.touches ? e.touches[0].clientY : e.clientY;
      };
      const onMove = (e) => {
        if (!pulling) return;
        const y = e.touches ? e.touches[0].clientY : e.clientY;
        pullDist = Math.max(0, Math.min(y - startY, 150));
        content.style.transform = `translateY(${pullDist}px)`;
        indicator.style.opacity = Math.min(1, pullDist / 60);
        indicator.style.transform = `translateY(${pullDist - 40}px)`;
        if (pullDist > 60) {
          indicator.querySelector('.ds-pull-arrow').textContent = '↻';
          indicator.querySelector('span').textContent = 'Release to refresh';
        } else {
          indicator.querySelector('.ds-pull-arrow').textContent = '↓';
          indicator.querySelector('span').textContent = 'Pull down';
        }
      };
      const onEnd = () => {
        if (!pulling) return;
        pulling = false;
        if (pullDist > 60) {
          indicator.querySelector('.ds-pull-arrow').classList.add('spinning');
          indicator.querySelector('span').textContent = 'Refreshing...';
          content.style.transition = 'transform 0.3s';
          content.style.transform = 'translateY(50px)';
          setTimeout(() => {
            content.style.transform = 'translateY(0)';
            indicator.style.opacity = '0';
            setTimeout(onComplete, 300);
          }, 1000);
        } else {
          content.style.transition = 'transform 0.3s';
          content.style.transform = 'translateY(0)';
          indicator.style.transition = 'opacity 0.3s';
          indicator.style.opacity = '0';
          setTimeout(() => {
            content.style.transition = '';
            indicator.style.transition = '';
          }, 300);
        }
      };

      area.addEventListener('mousedown', onStart);
      area.addEventListener('touchstart', onStart, { passive: true });
      window.addEventListener('mousemove', onMove);
      window.addEventListener('touchmove', onMove, { passive: true });
      window.addEventListener('mouseup', onEnd);
      window.addEventListener('touchend', onEnd);

      this._cleanup = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('touchmove', onMove);
        window.removeEventListener('mouseup', onEnd);
        window.removeEventListener('touchend', onEnd);
      };
    },
    teardown() { this._cleanup?.(); }
  },

  // 10. Captcha Checkbox
  {
    id: 'captcha',
    prompt: 'Verify you\'re not a robot.',
    setup(container, onComplete) {
      container.innerHTML = `
        <div class="ds-game ds-captcha-game">
          <div class="ds-captcha-box">
            <div class="ds-captcha-check">
              <div class="ds-captcha-checkbox"></div>
              <span>I'm not a robot</span>
            </div>
            <div class="ds-captcha-brand">
              <div class="ds-captcha-logo">
                <svg viewBox="0 0 24 24" width="24" height="24">
                  <path fill="#4285f4" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" opacity="0.3"/>
                  <path fill="#34a853" d="M12 2v10l8.5 5c1-1.7 1.5-3.7 1.5-5.7C22 6.48 17.52 2 12 2z" opacity="0.3"/>
                </svg>
              </div>
              <div class="ds-captcha-label">reCAPTCHA<br><span>Privacy - Terms</span></div>
            </div>
          </div>
        </div>
      `;
      const checkbox = container.querySelector('.ds-captcha-checkbox');
      checkbox.addEventListener('click', () => {
        checkbox.classList.add('checking');
        checkbox.innerHTML = '<div class="ds-captcha-spinner"></div>';
        setTimeout(() => {
          checkbox.classList.remove('checking');
          checkbox.classList.add('checked');
          checkbox.innerHTML = '✓';
          setTimeout(onComplete, 600);
        }, 1500);
      });
    },
    teardown() {}
  },

  // 11. Connect to Wi-Fi
  {
    id: 'connect-wifi',
    prompt: 'Connect to Wi-Fi.',
    setup(container, onComplete) {
      const networks = [
        { name: 'FBI Surveillance Van', lock: true, bars: 3 },
        { name: 'Pretty Fly for a Wi-Fi', lock: false, bars: 4 },
        { name: 'Bill Wi the Science Fi', lock: true, bars: 2 },
        { name: 'The LAN Before Time', lock: false, bars: 4 },
        { name: 'Wu-Tang LAN', lock: true, bars: 3 },
        { name: 'It Burns When IP', lock: false, bars: 1 },
        { name: 'Martin Router King Jr', lock: true, bars: 3 },
      ];
      // Shuffle and take 5
      const shuffled = networks.sort(() => Math.random() - 0.5).slice(0, 5);

      const barsIcon = (n) => {
        const bars = [1, 2, 3, 4].map(i =>
          `<div class="ds-wifi-bar ${i <= n ? 'active' : ''}" style="height: ${4 + i * 4}px"></div>`
        ).join('');
        return `<div class="ds-wifi-bars">${bars}</div>`;
      };

      container.innerHTML = `
        <div class="ds-game ds-wifi-game">
          <div class="ds-wifi-panel">
            <div class="ds-wifi-header">
              <span class="ds-wifi-title">Wi-Fi</span>
              <label class="ds-switch ds-wifi-toggle">
                <input type="checkbox" checked>
                <span class="ds-switch-slider"></span>
              </label>
            </div>
            <div class="ds-wifi-list">
              ${shuffled.map(n => `
                <button class="ds-wifi-network" data-name="${n.name}">
                  <span class="ds-wifi-name">${n.name}</span>
                  <div class="ds-wifi-meta">
                    ${n.lock ? '<span class="ds-wifi-lock">🔒</span>' : ''}
                    ${barsIcon(n.bars)}
                  </div>
                </button>
              `).join('')}
            </div>
          </div>
        </div>
      `;

      container.querySelectorAll('.ds-wifi-network').forEach(btn => {
        btn.addEventListener('click', () => {
          // Remove any previous selection
          container.querySelectorAll('.ds-wifi-network').forEach(b => b.classList.remove('connecting', 'connected'));
          btn.classList.add('connecting');
          const nameEl = btn.querySelector('.ds-wifi-name');
          const origName = nameEl.textContent;
          nameEl.textContent = origName + ' — connecting...';
          setTimeout(() => {
            btn.classList.remove('connecting');
            btn.classList.add('connected');
            nameEl.textContent = origName;
            // Add checkmark
            const check = document.createElement('span');
            check.className = 'ds-wifi-check';
            check.textContent = '✓';
            btn.prepend(check);
            setTimeout(onComplete, 500);
          }, 1200);
        });
      });
    },
    teardown() {}
  },

  // 12. Reply "ok"
  {
    id: 'reply-ok',
    prompt: 'Reply to the message.',
    setup(container, onComplete) {
      const messages = [
        { from: 'Mom', texts: ['Hey sweetie', 'Can you pick up milk on the way home?'] },
        { from: 'Boss', texts: ['Meeting moved to 3pm', 'Please confirm'] },
        { from: 'Alex', texts: ['yo', 'you coming tonight?'] },
        { from: 'Group Chat', texts: ['who\'s bringing snacks?', 'hello??'] },
      ];
      const convo = messages[Math.floor(Math.random() * messages.length)];

      container.innerHTML = `
        <div class="ds-game ds-reply-game">
          <div class="ds-reply-phone">
            <div class="ds-reply-header">
              <div class="ds-reply-avatar">${convo.from[0]}</div>
              <span class="ds-reply-name">${convo.from}</span>
            </div>
            <div class="ds-reply-messages">
              ${convo.texts.map(t => `<div class="ds-reply-bubble incoming">${t}</div>`).join('')}
            </div>
            <div class="ds-reply-input-bar">
              <input type="text" class="ds-reply-input" placeholder="iMessage" autocomplete="off" spellcheck="false">
              <button class="ds-reply-send" disabled>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
              </button>
            </div>
          </div>
        </div>
      `;

      const input = container.querySelector('.ds-reply-input');
      const sendBtn = container.querySelector('.ds-reply-send');
      const messagesEl = container.querySelector('.ds-reply-messages');

      input.addEventListener('input', () => {
        sendBtn.disabled = input.value.trim().length === 0;
      });

      const send = () => {
        const text = input.value.trim();
        if (!text) return;
        const bubble = document.createElement('div');
        bubble.className = 'ds-reply-bubble outgoing';
        bubble.textContent = text;
        messagesEl.appendChild(bubble);
        input.value = '';
        sendBtn.disabled = true;
        input.disabled = true;
        messagesEl.scrollTop = messagesEl.scrollHeight;

        // Show "delivered" after a beat
        setTimeout(() => {
          const status = document.createElement('div');
          status.className = 'ds-reply-status';
          status.textContent = 'Delivered';
          messagesEl.appendChild(status);
          messagesEl.scrollTop = messagesEl.scrollHeight;
          setTimeout(onComplete, 600);
        }, 400);
      };

      sendBtn.addEventListener('click', send);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') send();
      });
    },
    teardown() {}
  },

  // 13. Delete the App
  {
    id: 'delete-app',
    prompt: 'Delete the app.',
    setup(container, onComplete) {
      const apps = [
        { name: 'Faceook', emoji: '👤', color: '#4267B2' },
        { name: 'TokTik', emoji: '🎵', color: '#010101' },
        { name: 'Tweeter', emoji: '🐦', color: '#1DA1F2' },
        { name: 'InstaGrab', emoji: '📸', color: '#E1306C' },
        { name: 'SnapChap', emoji: '👻', color: '#FFFC00' },
        { name: 'LinkdOut', emoji: '💼', color: '#0077B5' },
      ];
      // Pick one to be the target, shuffle others around it
      const targetIdx = Math.floor(Math.random() * apps.length);
      const target = apps[targetIdx];
      const shuffled = apps.sort(() => Math.random() - 0.5);

      container.innerHTML = `
        <div class="ds-game ds-delete-game">
          <div class="ds-delete-screen">
            <div class="ds-delete-grid">
              ${shuffled.map(app => `
                <div class="ds-delete-app wiggle" data-name="${app.name}">
                  <div class="ds-delete-icon" style="background: ${app.color}">
                    <span>${app.emoji}</span>
                    <button class="ds-delete-x">✕</button>
                  </div>
                  <div class="ds-delete-label">${app.name}</div>
                </div>
              `).join('')}
            </div>
            <div class="ds-delete-hint">Tap ✕ on <strong>${target.name}</strong></div>
          </div>
          <div class="ds-delete-confirm" style="display: none">
            <div class="ds-delete-dialog">
              <div class="ds-delete-dialog-title">Delete "${target.name}"?</div>
              <div class="ds-delete-dialog-text">Deleting this app will also delete its data.</div>
              <div class="ds-delete-dialog-actions">
                <button class="ds-delete-cancel">Cancel</button>
                <button class="ds-delete-confirm-btn">Delete</button>
              </div>
            </div>
          </div>
        </div>
      `;

      // Only the target app's X button triggers the flow
      container.querySelectorAll('.ds-delete-app').forEach(el => {
        const x = el.querySelector('.ds-delete-x');
        x.addEventListener('click', (e) => {
          e.stopPropagation();
          if (el.dataset.name === target.name) {
            // Show confirmation dialog
            container.querySelector('.ds-delete-confirm').style.display = 'flex';
          }
        });
      });

      container.querySelector('.ds-delete-cancel').addEventListener('click', () => {
        container.querySelector('.ds-delete-confirm').style.display = 'none';
      });

      container.querySelector('.ds-delete-confirm-btn').addEventListener('click', () => {
        container.querySelector('.ds-delete-confirm').style.display = 'none';
        const appEl = container.querySelector(`.ds-delete-app[data-name="${target.name}"]`);
        appEl.style.transition = 'transform 0.3s, opacity 0.3s';
        appEl.style.transform = 'scale(0)';
        appEl.style.opacity = '0';
        setTimeout(onComplete, 400);
      });
    },
    teardown() {}
  },

  // 14. Rate Us 5 Stars
  {
    id: 'rate-stars',
    prompt: 'Rate your experience.',
    setup(container, onComplete) {
      container.innerHTML = `
        <div class="ds-game ds-rate-game">
          <div class="ds-rate-panel">
            <div class="ds-rate-emoji">😊</div>
            <div class="ds-rate-title">Enjoying the app?</div>
            <div class="ds-rate-sub">Tap a star to rate your experience</div>
            <div class="ds-rate-stars">
              ${[1, 2, 3, 4, 5].map(n => `<button class="ds-rate-star" data-value="${n}">☆</button>`).join('')}
            </div>
            <div class="ds-rate-label"></div>
          </div>
        </div>
      `;

      const stars = container.querySelectorAll('.ds-rate-star');
      const label = container.querySelector('.ds-rate-label');
      const emoji = container.querySelector('.ds-rate-emoji');
      const labels = ['', 'Terrible', 'Bad', 'Okay', 'Good', 'Amazing!'];
      const emojis = ['', '😠', '😕', '😐', '🙂', '🤩'];

      stars.forEach(star => {
        star.addEventListener('click', () => {
          const val = parseInt(star.dataset.value);
          stars.forEach(s => {
            const v = parseInt(s.dataset.value);
            s.textContent = v <= val ? '★' : '☆';
            s.classList.toggle('filled', v <= val);
          });
          label.textContent = labels[val];
          emoji.textContent = emojis[val];

          if (val === 5) {
            setTimeout(() => {
              label.textContent = 'Thank you! ♥';
              setTimeout(onComplete, 700);
            }, 400);
          }
        });
      });
    },
    teardown() {}
  },

  // 15. Empty the Trash
  {
    id: 'empty-trash',
    prompt: 'Empty the trash.',
    setup(container, onComplete) {
      const files = ['vacation_photo_final_FINAL_v3.jpg', 'Untitled Document (7).docx',
        'Screenshot 2024-01-15 at...', 'definitely-not-a-virus.exe', 'New Folder (2)'];

      container.innerHTML = `
        <div class="ds-game ds-trash-game">
          <div class="ds-trash-panel">
            <div class="ds-trash-header">
              <div class="ds-trash-icon-large">🗑️</div>
              <div class="ds-trash-info">
                <div class="ds-trash-title">Trash</div>
                <div class="ds-trash-count">${files.length} items</div>
              </div>
            </div>
            <div class="ds-trash-list">
              ${files.map(f => `
                <div class="ds-trash-file">
                  <span class="ds-trash-file-icon">📄</span>
                  <span class="ds-trash-file-name">${f}</span>
                </div>
              `).join('')}
            </div>
            <button class="ds-trash-empty-btn">Empty Trash</button>
          </div>
          <div class="ds-trash-confirm" style="display: none">
            <div class="ds-trash-dialog">
              <div class="ds-trash-dialog-icon">🗑️</div>
              <div class="ds-trash-dialog-text">Permanently delete ${files.length} items?<br><span>You can't undo this action.</span></div>
              <div class="ds-trash-dialog-actions">
                <button class="ds-trash-cancel">Cancel</button>
                <button class="ds-trash-delete">Empty Trash</button>
              </div>
            </div>
          </div>
        </div>
      `;

      container.querySelector('.ds-trash-empty-btn').addEventListener('click', () => {
        container.querySelector('.ds-trash-confirm').style.display = 'flex';
      });

      container.querySelector('.ds-trash-cancel').addEventListener('click', () => {
        container.querySelector('.ds-trash-confirm').style.display = 'none';
      });

      container.querySelector('.ds-trash-delete').addEventListener('click', () => {
        container.querySelector('.ds-trash-confirm').style.display = 'none';
        const list = container.querySelector('.ds-trash-list');
        const fileEls = list.querySelectorAll('.ds-trash-file');
        // Animate files disappearing one by one
        fileEls.forEach((el, i) => {
          setTimeout(() => {
            el.style.transition = 'transform 0.25s, opacity 0.25s, max-height 0.25s';
            el.style.transform = 'translateX(30px)';
            el.style.opacity = '0';
            el.style.maxHeight = '0';
            el.style.overflow = 'hidden';
            el.style.padding = '0';
            el.style.margin = '0';
          }, i * 120);
        });

        setTimeout(() => {
          container.querySelector('.ds-trash-count').textContent = 'No items';
          container.querySelector('.ds-trash-empty-btn').disabled = true;
          container.querySelector('.ds-trash-empty-btn').textContent = 'Trash is Empty';
          setTimeout(onComplete, 500);
        }, fileEls.length * 120 + 300);
      });
    },
    teardown() {}
  },

  // 16. Skip the Ad
  {
    id: 'skip-ad',
    prompt: 'Skip the ad.',
    setup(container, onComplete) {
      container.innerHTML = `
        <div class="ds-game ds-skipad-game">
          <div class="ds-skipad-player">
            <div class="ds-skipad-video">
              <div class="ds-skipad-fake-ad">
                <div class="ds-skipad-brand">AdCorp&trade;</div>
                <div class="ds-skipad-slogan">The future of synergy<br>is now.</div>
              </div>
            </div>
            <div class="ds-skipad-bar">
              <div class="ds-skipad-progress"><div class="ds-skipad-progress-fill"></div></div>
              <button class="ds-skipad-skip" disabled>
                <span class="ds-skipad-countdown">Skip ad in 5</span>
              </button>
            </div>
          </div>
        </div>
      `;
      const skipBtn = container.querySelector('.ds-skipad-skip');
      const countdown = container.querySelector('.ds-skipad-countdown');
      const fill = container.querySelector('.ds-skipad-progress-fill');
      let seconds = 5;

      const interval = setInterval(() => {
        seconds--;
        fill.style.width = ((5 - seconds) / 5 * 100) + '%';
        if (seconds > 0) {
          countdown.textContent = `Skip ad in ${seconds}`;
        } else {
          clearInterval(interval);
          skipBtn.disabled = false;
          countdown.innerHTML = 'Skip ad <span class="ds-skipad-arrow">▶▶</span>';
        }
      }, 1000);

      skipBtn.addEventListener('click', () => {
        if (!skipBtn.disabled) {
          clearInterval(interval);
          setTimeout(onComplete, 200);
        }
      });

      this._cleanup = () => clearInterval(interval);
    },
    teardown() { this._cleanup?.(); }
  },

  // 17. Snooze the Alarm
  {
    id: 'snooze-alarm',
    prompt: 'Snooze the alarm.',
    setup(container, onComplete) {
      const hours = 6 + Math.floor(Math.random() * 2);
      const mins = String(Math.floor(Math.random() * 60)).padStart(2, '0');

      container.innerHTML = `
        <div class="ds-game ds-alarm-game">
          <div class="ds-alarm-screen">
            <div class="ds-alarm-time">${hours}:${mins}</div>
            <div class="ds-alarm-label">⏰ Alarm</div>
            <div class="ds-alarm-ring">🔔</div>
            <div class="ds-alarm-buttons">
              <button class="ds-alarm-snooze">Snooze</button>
              <button class="ds-alarm-stop">Stop</button>
            </div>
          </div>
        </div>
      `;

      const ring = container.querySelector('.ds-alarm-ring');
      ring.classList.add('ringing');

      container.querySelector('.ds-alarm-snooze').addEventListener('click', () => {
        ring.classList.remove('ringing');
        const label = container.querySelector('.ds-alarm-label');
        label.textContent = 'Snoozed for 9 minutes';
        label.style.color = '#fbbf24';
        setTimeout(onComplete, 600);
      });

      container.querySelector('.ds-alarm-stop').addEventListener('click', () => {
        ring.classList.remove('ringing');
        const label = container.querySelector('.ds-alarm-label');
        label.textContent = 'Alarm off';
        label.style.opacity = '0.5';
        setTimeout(onComplete, 600);
      });
    },
    teardown() {}
  },

  // 18. Close the Chat Widget
  {
    id: 'close-chat',
    prompt: 'Close the chat widget.',
    setup(container, onComplete) {
      container.innerHTML = `
        <div class="ds-game ds-chat-game">
          <div class="ds-chat-site">
            <div class="ds-chat-fake-content">
              <div class="ds-cookies-fake-text"></div>
              <div class="ds-cookies-fake-text short"></div>
              <div class="ds-cookies-fake-text"></div>
            </div>
          </div>
          <div class="ds-chat-widget">
            <div class="ds-chat-widget-window">
              <div class="ds-chat-widget-header">
                <div class="ds-chat-widget-avatar">🤖</div>
                <div class="ds-chat-widget-info">
                  <div class="ds-chat-widget-name">Support Bot</div>
                  <div class="ds-chat-widget-status">● Online</div>
                </div>
                <button class="ds-chat-widget-close">✕</button>
              </div>
              <div class="ds-chat-widget-body">
                <div class="ds-chat-widget-msg">Hi there! 👋 How can I help you today?</div>
                <div class="ds-chat-widget-msg delay">I noticed you've been on this page for a while...</div>
              </div>
            </div>
          </div>
        </div>
      `;

      container.querySelector('.ds-chat-widget-close').addEventListener('click', () => {
        const widget = container.querySelector('.ds-chat-widget');
        widget.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
        widget.style.transform = 'scale(0.5) translateY(20px)';
        widget.style.opacity = '0';
        widget.style.transformOrigin = 'bottom right';
        setTimeout(onComplete, 350);
      });
    },
    teardown() {}
  },

  // 19. Allow Notifications
  {
    id: 'allow-notifications',
    prompt: 'Allow the notifications.',
    setup(container, onComplete) {
      container.innerHTML = `
        <div class="ds-game ds-notifperm-game">
          <div class="ds-notifperm-site">
            <div class="ds-notifperm-page">
              <div class="ds-cookies-fake-text"></div>
              <div class="ds-cookies-fake-text med"></div>
              <div class="ds-cookies-fake-text short"></div>
            </div>
            <div class="ds-notifperm-dialog">
              <div class="ds-notifperm-icon">🔔</div>
              <div class="ds-notifperm-text">
                <strong>totally-real-news.com</strong> wants to send you notifications
              </div>
              <div class="ds-notifperm-actions">
                <button class="ds-notifperm-block">Block</button>
                <button class="ds-notifperm-allow">Allow</button>
              </div>
            </div>
          </div>
        </div>
      `;

      container.querySelector('.ds-notifperm-allow').addEventListener('click', () => {
        const dialog = container.querySelector('.ds-notifperm-dialog');
        dialog.style.transition = 'opacity 0.3s, transform 0.3s';
        dialog.style.opacity = '0';
        dialog.style.transform = 'translateY(-10px)';
        setTimeout(onComplete, 350);
      });
    },
    teardown() {}
  },

  // 20. Skip the Tutorial
  {
    id: 'skip-tutorial',
    prompt: 'Skip the tutorial.',
    setup(container, onComplete) {
      const slides = [
        { emoji: '👋', title: 'Welcome!', text: 'Let us show you around.' },
        { emoji: '⚡', title: 'Lightning Fast', text: 'Everything loads instantly.' },
        { emoji: '🎨', title: 'Customizable', text: 'Make it yours with themes.' },
        { emoji: '🔒', title: 'Secure', text: 'Your data is safe with us.' },
        { emoji: '🚀', title: 'Ready to Go!', text: 'You\'re all set.' },
      ];
      let current = 0;

      const render = () => {
        const s = slides[current];
        const isLast = current === slides.length - 1;
        container.innerHTML = `
          <div class="ds-game ds-tutorial-game">
            <div class="ds-tutorial-card">
              <div class="ds-tutorial-slide">
                <div class="ds-tutorial-emoji">${s.emoji}</div>
                <div class="ds-tutorial-title">${s.title}</div>
                <div class="ds-tutorial-text">${s.text}</div>
              </div>
              <div class="ds-tutorial-footer">
                <div class="ds-tutorial-dots">
                  ${slides.map((_, i) => `<div class="ds-tutorial-dot ${i === current ? 'active' : ''}"></div>`).join('')}
                </div>
                <button class="ds-tutorial-next">${isLast ? 'Get Started' : 'Next'}</button>
              </div>
              ${current > 0 ? '<button class="ds-tutorial-skip">Skip</button>' : ''}
            </div>
          </div>
        `;

        container.querySelector('.ds-tutorial-next').addEventListener('click', () => {
          if (isLast) {
            onComplete();
          } else {
            current++;
            render();
          }
        });

        const skipBtn = container.querySelector('.ds-tutorial-skip');
        if (skipBtn) {
          skipBtn.addEventListener('click', onComplete);
        }
      };

      render();
    },
    teardown() {}
  },

  // 21. Verify Your Email
  {
    id: 'verify-email',
    prompt: 'Verify your email.',
    setup(container, onComplete) {
      container.innerHTML = `
        <div class="ds-game ds-email-game">
          <div class="ds-email-inbox">
            <div class="ds-email-header">
              <span class="ds-email-inbox-title">📥 Inbox</span>
              <span class="ds-email-badge">1</span>
            </div>
            <div class="ds-email-list">
              <button class="ds-email-item unread">
                <div class="ds-email-dot"></div>
                <div class="ds-email-item-content">
                  <div class="ds-email-from">noreply@accounts.example.com</div>
                  <div class="ds-email-subject">Verify your email address</div>
                  <div class="ds-email-preview">Please click the button below to verify...</div>
                </div>
              </button>
              <div class="ds-email-item read">
                <div class="ds-email-item-content">
                  <div class="ds-email-from">newsletter@spam.com</div>
                  <div class="ds-email-subject">🔥 HOT DEALS you won't believe!</div>
                  <div class="ds-email-preview">Unsubscribe? We don't do that here.</div>
                </div>
              </div>
            </div>
          </div>
          <div class="ds-email-view" style="display: none">
            <div class="ds-email-view-header">
              <button class="ds-email-back">← Back</button>
              <span>Verify your email address</span>
            </div>
            <div class="ds-email-view-body">
              <p>Hi there,</p>
              <p>Thanks for signing up! Please click the button below to verify your email address.</p>
              <button class="ds-email-verify-btn">Verify Email</button>
              <p class="ds-email-fine">If you didn't create an account, you can ignore this email.</p>
            </div>
          </div>
        </div>
      `;

      const inbox = container.querySelector('.ds-email-inbox');
      const view = container.querySelector('.ds-email-view');
      const unreadItem = container.querySelector('.ds-email-item.unread');

      unreadItem.addEventListener('click', () => {
        inbox.style.display = 'none';
        view.style.display = 'flex';
      });

      container.querySelector('.ds-email-back').addEventListener('click', () => {
        view.style.display = 'none';
        inbox.style.display = 'flex';
      });

      container.querySelector('.ds-email-verify-btn').addEventListener('click', () => {
        const btn = container.querySelector('.ds-email-verify-btn');
        btn.textContent = '✓ Email Verified!';
        btn.classList.add('verified');
        btn.disabled = true;
        setTimeout(onComplete, 600);
      });
    },
    teardown() {}
  },

  // 22. Update Available
  {
    id: 'update-available',
    prompt: 'Install the update.',
    setup(container, onComplete) {
      container.innerHTML = `
        <div class="ds-game ds-update-game">
          <div class="ds-update-panel">
            <div class="ds-update-icon">⬆️</div>
            <div class="ds-update-title">Update Available</div>
            <div class="ds-update-version">Version 4.2.1 → 4.2.2</div>
            <div class="ds-update-notes">
              <div class="ds-update-note">• Bug fixes and improvements</div>
              <div class="ds-update-note">• Performance enhancements</div>
              <div class="ds-update-note">• Minor UI adjustments</div>
            </div>
            <button class="ds-update-btn">Update Now</button>
            <button class="ds-update-later">Remind Me Later</button>
            <div class="ds-update-progress" style="display: none">
              <div class="ds-update-progress-bar"><div class="ds-update-progress-fill"></div></div>
              <div class="ds-update-progress-text">Downloading...</div>
            </div>
          </div>
        </div>
      `;

      container.querySelector('.ds-update-btn').addEventListener('click', () => {
        const btn = container.querySelector('.ds-update-btn');
        const later = container.querySelector('.ds-update-later');
        const progress = container.querySelector('.ds-update-progress');
        const fill = container.querySelector('.ds-update-progress-fill');
        const text = container.querySelector('.ds-update-progress-text');
        btn.style.display = 'none';
        later.style.display = 'none';
        progress.style.display = 'block';

        let pct = 0;
        const interval = setInterval(() => {
          pct += 3 + Math.random() * 8;
          if (pct >= 100) {
            pct = 100;
            clearInterval(interval);
            fill.style.width = '100%';
            text.textContent = 'Installing...';
            setTimeout(() => {
              text.textContent = '✓ Up to date!';
              fill.style.background = '#38a169';
              setTimeout(onComplete, 600);
            }, 800);
          } else {
            fill.style.width = pct + '%';
            text.textContent = `Downloading... ${Math.floor(pct)}%`;
          }
        }, 200);

        this._interval = interval;
      });
    },
    teardown() { clearInterval(this._interval); }
  },

  // 23. Sort the Icons
  {
    id: 'sort-icons',
    prompt: 'Sort the items in order.',
    setup(container, onComplete) {
      const items = [
        { label: 'A', color: '#ef4444' },
        { label: 'B', color: '#f59e0b' },
        { label: 'C', color: '#10b981' },
        { label: 'D', color: '#3b82f6' },
      ];
      // Shuffle until not already sorted
      let shuffled;
      do {
        shuffled = [...items].sort(() => Math.random() - 0.5);
      } while (shuffled.every((item, i) => item.label === items[i].label));

      container.innerHTML = `
        <div class="ds-game ds-sort-game">
          <div class="ds-sort-panel">
            <div class="ds-sort-hint">Tap two items to swap them</div>
            <div class="ds-sort-list">
              ${shuffled.map((item, i) => `
                <button class="ds-sort-item" data-index="${i}" data-label="${item.label}" style="background: ${item.color}">
                  ${item.label}
                </button>
              `).join('')}
            </div>
          </div>
        </div>
      `;

      let selected = null;
      const listEl = container.querySelector('.ds-sort-list');

      const checkSorted = () => {
        const current = [...listEl.querySelectorAll('.ds-sort-item')].map(el => el.dataset.label);
        return current.join('') === 'ABCD';
      };

      listEl.querySelectorAll('.ds-sort-item').forEach(el => {
        el.addEventListener('click', () => {
          if (selected === null) {
            selected = el;
            el.classList.add('selected');
          } else if (selected === el) {
            el.classList.remove('selected');
            selected = null;
          } else {
            // Swap
            const parent = el.parentNode;
            const items = [...parent.children];
            const idx1 = items.indexOf(selected);
            const idx2 = items.indexOf(el);

            selected.classList.remove('selected');
            selected.classList.add('swapping');
            el.classList.add('swapping');

            setTimeout(() => {
              if (idx1 < idx2) {
                parent.insertBefore(el, selected);
                parent.insertBefore(selected, items[idx2 + 1] || null);
              } else {
                parent.insertBefore(selected, el);
                parent.insertBefore(el, items[idx1 + 1] || null);
              }
              selected.classList.remove('swapping');
              el.classList.remove('swapping');
              selected = null;

              if (checkSorted()) {
                listEl.querySelectorAll('.ds-sort-item').forEach(it => it.classList.add('sorted'));
                setTimeout(onComplete, 500);
              }
            }, 200);
          }
        });
      });
    },
    teardown() {}
  },

  // 24. Spin the Loading Spinner
  {
    id: 'spin-loader',
    prompt: 'Finish loading the page.',
    setup(container, onComplete) {
      container.innerHTML = `
        <div class="ds-game ds-loader-game">
          <div class="ds-loader-panel">
            <div class="ds-loader-ring">
              <svg class="ds-loader-svg" viewBox="0 0 100 100">
                <circle class="ds-loader-track" cx="50" cy="50" r="42" fill="none" stroke-width="8"/>
                <circle class="ds-loader-fill" cx="50" cy="50" r="42" fill="none" stroke-width="8"
                  stroke-dasharray="264" stroke-dashoffset="264" stroke-linecap="round"/>
              </svg>
              <div class="ds-loader-pct">0%</div>
            </div>
            <div class="ds-loader-text">Drag around the circle to load</div>
          </div>
        </div>
      `;

      const svg = container.querySelector('.ds-loader-svg');
      const fillCircle = container.querySelector('.ds-loader-fill');
      const pctLabel = container.querySelector('.ds-loader-pct');
      const ring = container.querySelector('.ds-loader-ring');
      let progress = 0;
      let dragging = false;
      let lastAngle = null;

      const getAngle = (e) => {
        const rect = ring.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const x = (e.touches ? e.touches[0].clientX : e.clientX) - cx;
        const y = (e.touches ? e.touches[0].clientY : e.clientY) - cy;
        return Math.atan2(y, x) * (180 / Math.PI);
      };

      const updateFill = () => {
        const offset = 264 - (264 * Math.min(progress, 100) / 100);
        fillCircle.style.strokeDashoffset = offset;
        pctLabel.textContent = Math.floor(Math.min(progress, 100)) + '%';
      };

      const onStart = (e) => {
        dragging = true;
        lastAngle = getAngle(e);
      };
      const onMove = (e) => {
        if (!dragging) return;
        const angle = getAngle(e);
        if (lastAngle !== null) {
          let delta = angle - lastAngle;
          if (delta > 180) delta -= 360;
          if (delta < -180) delta += 360;
          progress += Math.abs(delta) * 0.15;
          updateFill();
          if (progress >= 100) {
            dragging = false;
            pctLabel.textContent = '✓';
            fillCircle.style.stroke = '#38a169';
            container.querySelector('.ds-loader-text').textContent = 'Loaded!';
            setTimeout(onComplete, 500);
          }
        }
        lastAngle = angle;
      };
      const onEnd = () => { dragging = false; lastAngle = null; };

      ring.addEventListener('mousedown', onStart);
      ring.addEventListener('touchstart', onStart, { passive: true });
      window.addEventListener('mousemove', onMove);
      window.addEventListener('touchmove', onMove, { passive: true });
      window.addEventListener('mouseup', onEnd);
      window.addEventListener('touchend', onEnd);

      this._cleanup = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('touchmove', onMove);
        window.removeEventListener('mouseup', onEnd);
        window.removeEventListener('touchend', onEnd);
      };
    },
    teardown() { this._cleanup?.(); }
  },

  // 25. Password Too Weak
  {
    id: 'password-strength',
    prompt: 'Create a strong password.',
    setup(container, onComplete) {
      container.innerHTML = `
        <div class="ds-game ds-password-game">
          <div class="ds-password-panel">
            <div class="ds-password-icon">🔐</div>
            <div class="ds-password-title">Choose a Password</div>
            <div class="ds-password-input-wrap">
              <input type="text" class="ds-password-input" placeholder="Enter password..." autocomplete="off" spellcheck="false">
            </div>
            <div class="ds-password-meter">
              <div class="ds-password-meter-fill"></div>
            </div>
            <div class="ds-password-label">Too short</div>
            <ul class="ds-password-rules">
              <li data-rule="length">At least 8 characters</li>
              <li data-rule="upper">One uppercase letter</li>
              <li data-rule="number">One number</li>
              <li data-rule="special">One special character (!@#$...)</li>
            </ul>
          </div>
        </div>
      `;

      const input = container.querySelector('.ds-password-input');
      const fill = container.querySelector('.ds-password-meter-fill');
      const label = container.querySelector('.ds-password-label');
      const rules = container.querySelectorAll('.ds-password-rules li');

      const check = () => {
        const v = input.value;
        const checks = {
          length: v.length >= 8,
          upper: /[A-Z]/.test(v),
          number: /[0-9]/.test(v),
          special: /[^A-Za-z0-9]/.test(v),
        };

        rules.forEach(li => {
          const rule = li.dataset.rule;
          li.classList.toggle('pass', checks[rule]);
        });

        const score = Object.values(checks).filter(Boolean).length;
        const pct = score * 25;
        fill.style.width = pct + '%';

        if (score === 0) { fill.style.background = '#e53e3e'; label.textContent = 'Too short'; }
        else if (score === 1) { fill.style.background = '#e53e3e'; label.textContent = 'Weak'; }
        else if (score === 2) { fill.style.background = '#dd6b20'; label.textContent = 'Fair'; }
        else if (score === 3) { fill.style.background = '#d69e2e'; label.textContent = 'Good'; }
        else { fill.style.background = '#38a169'; label.textContent = 'Strong!'; }

        if (score === 4) {
          input.disabled = true;
          setTimeout(onComplete, 700);
        }
      };

      input.addEventListener('input', check);
    },
    teardown() {}
  }
];

export default games;
