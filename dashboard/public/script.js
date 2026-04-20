/* ==========================================
   CHATBOT DASHBOARD — PREMIUM SCRIPT
   ========================================== */

const REFRESH = 3000;
const GRADIENTS = [
  'linear-gradient(135deg, #3898ec, #60bffa)',
  'linear-gradient(135deg, #0ea5e9, #38bdf8)',
  'linear-gradient(135deg, #06b6d4, #22d3ee)',
  'linear-gradient(135deg, #2563eb, #60a5fa)',
  'linear-gradient(135deg, #0284c7, #38bdf8)',
  'linear-gradient(135deg, #0891b2, #06b6d4)',
  'linear-gradient(135deg, #1d4ed8, #3b82f6)',
  'linear-gradient(135deg, #0369a1, #0ea5e9)',
];

const $ = id => document.getElementById(id);

function fmtUptime(s) {
  if (!s || s <= 0) return '0 detik';
  if (s < 60) return s + ' detik';
  if (s < 3600) return Math.floor(s/60) + 'm ' + (s%60) + 's';
  const h = Math.floor(s/3600);
  const m = Math.floor((s%3600)/60);
  return h + 'j ' + m + 'm';
}

function fmtTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
}

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

function esc(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

function maskPhone(sender) {
  if (!sender) return 'Unknown';
  // Format: 628xxx@c.us → 628xxx***
  const num = sender.replace(/@.*/, '');
  if (num.length > 6) return num.slice(0, 6) + '***' + num.slice(-2);
  return num;
}

// =========================================================================
// 👇👇👇 [SKRIPSI] KODE UNTUK MENAMPILKAN BARCODE KE LAYAR WEB 👇👇👇
// =========================================================================
// ========== QR CODE ==========
async function updateQR() {
  try {
    const res = await fetch('/api/qr');
    const data = await res.json();
    const sec = $('qrSection');

    if (data.status === 'connected') {
      sec.style.display = 'block';
      $('qrMessage').textContent = '✅ ' + data.message;
      $('qrContainer').innerHTML = `
        <div class="qr-connected">
          <div class="connected-icon">✅</div>
          <p style="margin:10px 0;color:var(--text-secondary)">WhatsApp terhubung dan chatbot aktif</p>
          <button onclick="disconnectWA()" class="btn-disconnect" id="disconnectBtn">🔌 Putuskan & Scan Ulang</button>
        </div>`;
    } else if (data.status === 'waiting_scan' && data.qr) {
      sec.style.display = 'block';
      $('qrMessage').textContent = data.message;
      $('qrContainer').innerHTML = `<img src="${data.qr}" alt="QR Code">`;
    } else {
      sec.style.display = 'block';
      $('qrMessage').textContent = data.message;
      $('qrContainer').innerHTML = '<div class="qr-loading"><div class="spinner"></div><p>Memuat QR Code...</p></div>';
    }
  } catch (e) {}
}

// ========== DISCONNECT WA ==========
async function disconnectWA() {
  if (!confirm('Putuskan koneksi WhatsApp? Anda perlu scan QR code ulang.')) return;
  const btn = $('disconnectBtn');
  if (btn) { btn.textContent = '⏳ Memutuskan...'; btn.disabled = true; }
  try {
    const res = await fetch('/api/disconnect', { method: 'POST' });
    const d = await res.json();
    if (d.success) {
      $('qrMessage').textContent = '🔄 ' + d.message;
      $('qrContainer').innerHTML = '<div class="qr-loading"><div class="spinner"></div><p>Menunggu QR Code baru...</p></div>';
    } else {
      alert('Gagal: ' + d.message);
      if (btn) { btn.textContent = '🔌 Putuskan & Scan Ulang'; btn.disabled = false; }
    }
  } catch (e) {
    alert('Gagal memutuskan koneksi');
    if (btn) { btn.textContent = '🔌 Putuskan & Scan Ulang'; btn.disabled = false; }
  }
}

// ========== STATUS ==========
async function updateStatus() {
  try {
    const res = await fetch('/api/status');
    const d = await res.json();
    const on = d.whatsapp?.isReady;
    $('statusBadge').className = 'badge badge-status ' + (on ? 'online' : 'offline');
    $('statusText').textContent = on ? 'Online' : 'Offline';
    if (d.serverTime) $('serverTime').textContent = fmtTime(d.serverTime);
  } catch (e) {
    $('statusBadge').className = 'badge badge-status offline';
    $('statusText').textContent = 'Error';
  }
}

// ========== STATS ==========
async function updateStats() {
  try {
    const res = await fetch('/api/stats');
    const d = await res.json();
    animateNumber($('totalMessages'), d.totalMessages || 0);
    animateNumber($('totalResponses'), d.totalResponses || 0);
    $('avgConfidence').textContent = Math.round((d.averageConfidence || 0) * 100) + '%';
    $('uptime').textContent = fmtUptime(d.uptime);

    // Intent chart
    const dist = d.intentDistribution;
    if (dist && Object.keys(dist).length > 0) {
      const sorted = Object.entries(dist).sort((a,b) => b[1]-a[1]);
      const mx = sorted[0][1];
      $('intentChart').innerHTML = sorted.map(([intent, count], i) => {
        const pct = Math.round((count/mx)*100);
        return `<div class="intent-bar-wrapper">
          <span class="intent-name">${esc(intent)}</span>
          <div class="intent-bar-track">
            <div class="intent-bar" style="width:${pct}%;background:${GRADIENTS[i%GRADIENTS.length]}"></div>
          </div>
          <span class="intent-count">${count}</span>
        </div>`;
      }).join('');
    } else {
      $('intentChart').innerHTML = '<p class="empty-state">Menunggu data percakapan...</p>';
    }
  } catch (e) {}
}

function animateNumber(el, target) {
  const current = parseInt(el.textContent) || 0;
  if (current === target) return;
  el.textContent = target;
  el.style.transform = 'scale(1.15)';
  el.style.transition = 'transform 0.3s ease';
  setTimeout(() => { el.style.transform = 'scale(1)'; }, 300);
}

// ========== LOGS ==========
async function updateLogs() {
  try {
    const res = await fetch('/api/logs?limit=30');
    const d = await res.json();
    $('logSource').textContent = d.source === 'mysql' ? '🗄️ MySQL' : '💾 Memory';
    
    if (!d.logs || d.logs.length === 0) {
      $('logsList').innerHTML = '<p class="empty-state">Menunggu percakapan masuk...</p>';
      return;
    }

    $('logsList').innerHTML = d.logs.map(log => {
      const conf = log.confidence || 0;
      const cls = conf >= 0.7 ? 'high' : conf >= 0.4 ? 'medium' : 'low';
      const time = log.created_at || log.timestamp || '';
      return `<div class="log-entry">
        <div class="log-header">
          <span class="log-time">${time ? fmtTime(time) : ''}</span>
          <div class="log-badges">
            <span class="log-intent">${esc(log.intent || '')}</span>
            <span class="log-confidence ${cls}">${Math.round(conf*100)}%</span>
          </div>
        </div>
        <div class="log-message">📩 ${esc(log.message || '')}</div>
        <div class="log-response">💬 ${esc(log.response || '')}</div>
      </div>`;
    }).join('');
  } catch (e) {}
}

// ========== USERS ==========
async function updateUsers() {
  try {
    const res = await fetch('/api/users');
    const d = await res.json();
    $('userCount').textContent = (d.total || 0) + ' pengguna';

    if (!d.users || d.users.length === 0) {
      $('usersTable').innerHTML = '<p class="empty-state">Belum ada pengguna yang menggunakan chatbot...</p>';
      return;
    }

    const rows = d.users.map((u, i) => {
      const name = maskPhone(u.sender);
      const initials = (i + 1).toString();
      return `<tr>
        <td>
          <div class="user-cell">
            <div class="user-avatar" style="background:${GRADIENTS[i%GRADIENTS.length]}">${initials}</div>
            <div>
              <div style="font-weight:600">${esc(name)}</div>
              <div class="user-id">${esc(u.sender || '')}</div>
            </div>
          </div>
        </td>
        <td><span class="user-msg-count">${u.total_messages} pesan</span></td>
        <td style="color:var(--text-secondary);font-size:0.82rem">${u.top_intent ? esc(u.top_intent) : '-'}</td>
        <td style="font-size:0.82rem">${u.avg_confidence ? Math.round(u.avg_confidence * 100) + '%' : '-'}</td>
        <td style="color:var(--text-secondary);font-size:0.78rem">${fmtDate(u.first_message)}</td>
        <td style="color:var(--text-secondary);font-size:0.78rem">${fmtDate(u.last_message)}</td>
      </tr>`;
    }).join('');

    $('usersTable').innerHTML = `<table class="users-table">
      <thead><tr>
        <th>Pengguna</th>
        <th>Total Pesan</th>
        <th>Intent Terbanyak</th>
        <th>Avg Confidence</th>
        <th>Pertama Chat</th>
        <th>Terakhir Chat</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  } catch (e) {}
}

// ========== DB STATUS ==========
async function updateDB() {
  try {
    const res = await fetch('/api/db-status');
    const d = await res.json();
    const badge = $('dbBadge');
    if (d.connected) {
      badge.innerHTML = '<span class="badge-dot"></span><span>MySQL ✓</span>';
      badge.className = 'badge badge-db connected';
    } else {
      badge.innerHTML = '<span class="badge-dot"></span><span>MySQL ✗</span>';
      badge.className = 'badge badge-db';
    }
  } catch (e) {}
}

// ========== NLP TEST ==========
async function testNLP() {
  const msg = $('testInput').value.trim();
  if (!msg) return;
  $('testBtn').textContent = '⏳ Menganalisis...';
  $('testBtn').disabled = true;
  try {
    const res = await fetch('/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg })
    });
    const d = await res.json();
    
    if (!res.ok || d.error) {
      $('testResult').innerHTML = `<p class="empty-state">❌ ${esc(d.error || 'Gagal menguji NLP')}</p>`;
      $('testResult').style.display = 'block';
    } else {
      $('testResult').style.display = 'block';
      $('testResult').innerHTML = `
        <div class="result-row"><span class="result-label">Intent:</span><span class="result-value intent-tag">${esc(d.intent)}</span></div>
        <div class="result-row"><span class="result-label">Confidence:</span><span class="result-value">${Math.round(d.confidence*100)}% (${d.confidence})</span></div>
        <div class="result-row"><span class="result-label">Respons:</span><span class="result-value">${esc(d.response)}</span></div>
        <div class="result-row"><span class="result-label">Entitas:</span><span class="result-value">${d.entities && Object.keys(d.entities).length ? esc(JSON.stringify(d.entities)) : 'Tidak terdeteksi'}</span></div>
        <div class="result-row"><span class="result-label">Waktu:</span><span class="result-value">${d.processingTime}ms</span></div>
      `;
    }
  } catch (e) {
    $('testResult').innerHTML = '<p class="empty-state">❌ Tidak dapat terhubung ke server. Pastikan server berjalan.</p>';
    $('testResult').style.display = 'block';
  }
  $('testBtn').textContent = 'Analisis';
  $('testBtn').disabled = false;
}

$('testBtn').addEventListener('click', testNLP);
$('testInput').addEventListener('keypress', e => { if (e.key === 'Enter') testNLP(); });

// ========== INTENT MANAGEMENT ==========
async function loadIntents() {
  try {
    const res = await fetch('/api/intents');
    const d = await res.json();
    $('intentCount').textContent = (d.total || 0) + ' intent';

    if (!d.intents || d.intents.length === 0) {
      $('intentsList').innerHTML = '<p class="empty-state">Belum ada intent...</p>';
      return;
    }

    $('intentsList').innerHTML = d.intents.map((intent, i) => {
      const patterns = intent.patterns.slice(0, 8).map(p => esc(p)).join(', ');
      const extra = intent.patterns.length > 8 ? ` +${intent.patterns.length - 8} lagi` : '';
      const responses = intent.responses.map(r => '• ' + esc(r).replace(/\n/g, '<br>')).join('<br><br>');
      return `<div class="intent-card">
        <div class="intent-card-header">
          <span class="intent-card-tag">${esc(intent.tag)}</span>
          <div class="intent-card-actions">
            <button class="btn-sm btn-blue" onclick="openEditModal('${esc(intent.tag)}')">✏️ Edit</button>
            <button class="btn-sm btn-red" onclick="deleteIntent('${esc(intent.tag)}')">🗑️ Hapus</button>
          </div>
        </div>
        <div class="intent-card-body">
          <div class="intent-detail">
            <h4>Pola Kalimat (${intent.patterns.length})</h4>
            <div class="intent-detail-list">${patterns}${extra}</div>
          </div>
          <div class="intent-detail">
            <h4>Respons (${intent.responses.length})</h4>
            <div class="intent-detail-list">${responses}</div>
          </div>
        </div>
      </div>`;
    }).join('');
  } catch (e) {
    $('intentsList').innerHTML = '<p class="empty-state">Gagal memuat data intent</p>';
  }
}

// Add Intent
async function addIntent() {
  const tag = $('newTag').value.trim();
  const patterns = $('newPatterns').value.trim();
  const responses = $('newResponses').value.trim();
  const msg = $('addIntentMsg');

  if (!tag || !patterns || !responses) {
    msg.style.display = 'block'; msg.className = 'form-message error';
    msg.textContent = '⚠️ Semua field harus diisi!';
    return;
  }

  try {
    const res = await fetch('/api/intents', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag, patterns, responses })
    });
    const d = await res.json();
    
    if (d.success) {
      msg.style.display = 'block'; msg.className = 'form-message success';
      msg.textContent = `✅ ${d.message}`;
      $('newTag').value = ''; $('newPatterns').value = ''; $('newResponses').value = '';
      loadIntents();
    } else {
      msg.style.display = 'block'; msg.className = 'form-message error';
      msg.textContent = `❌ ${d.error || 'Gagal menambah intent'}`;
    }
  } catch (e) {
    console.error('Add intent error:', e);
    msg.style.display = 'block'; msg.className = 'form-message error';
    msg.textContent = '❌ Gagal menambah intent: ' + e.message;
  }
  setTimeout(() => { msg.style.display = 'none'; }, 4000);
}

// Edit Modal
let currentEditTag = '';

function openEditModal(tag) {
  currentEditTag = tag;
  $('editTag').textContent = tag;
  $('editModal').style.display = 'flex';

  // Fetch current data
  fetch('/api/intents').then(r => r.json()).then(d => {
    const intent = d.intents.find(i => i.tag === tag);
    if (intent) {
      $('editPatterns').value = intent.patterns.join('\n');
      $('editResponses').value = intent.responses.join('\n');
    }
  });
}

function closeEditModal() {
  $('editModal').style.display = 'none';
  currentEditTag = '';
}

async function saveEdit() {
  const patterns = $('editPatterns').value.trim();
  const responses = $('editResponses').value.trim();
  const msg = $('editMsg');

  if (!patterns || !responses) {
    msg.style.display = 'block'; msg.className = 'form-message error';
    msg.textContent = '⚠️ Patterns dan responses harus diisi!';
    return;
  }

  try {
    const res = await fetch(`/api/intents/${encodeURIComponent(currentEditTag)}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patterns, responses })
    });
    const d = await res.json();

    if (d.success) {
      msg.style.display = 'block'; msg.className = 'form-message success';
      msg.textContent = `✅ ${d.message}`;
      loadIntents();
      setTimeout(closeEditModal, 1500);
    } else {
      msg.style.display = 'block'; msg.className = 'form-message error';
      msg.textContent = `❌ ${d.error}`;
    }
  } catch (e) {
    msg.style.display = 'block'; msg.className = 'form-message error';
    msg.textContent = '❌ Gagal menyimpan perubahan';
  }
}

// Delete Intent
async function deleteIntent(tag) {
  if (!confirm(`Hapus intent "${tag}"? Tindakan ini tidak bisa dibatalkan.`)) return;

  try {
    const res = await fetch(`/api/intents/${encodeURIComponent(tag)}`, { method: 'DELETE' });
    const d = await res.json();
    if (d.success) {
      loadIntents();
    } else {
      alert('Gagal menghapus: ' + d.error);
    }
  } catch (e) {
    alert('Gagal menghapus intent');
  }
}

// Reload NLP
async function reloadNLP() {
  $('reloadNLP').textContent = '⏳ Reloading...';
  $('reloadNLP').disabled = true;
  try {
    const res = await fetch('/api/intents/reload', { method: 'POST' });
    const d = await res.json();
    if (d.success) {
      $('reloadNLP').textContent = '✅ Berhasil!';
      setTimeout(() => { $('reloadNLP').textContent = '🔄 Reload NLP'; $('reloadNLP').disabled = false; }, 2000);
    } else {
      alert('Gagal reload: ' + d.error);
      $('reloadNLP').textContent = '🔄 Reload NLP'; $('reloadNLP').disabled = false;
    }
  } catch (e) {
    alert('Gagal reload NLP');
    $('reloadNLP').textContent = '🔄 Reload NLP'; $('reloadNLP').disabled = false;
  }
}

$('addIntentBtn').addEventListener('click', addIntent);
$('saveEditBtn').addEventListener('click', saveEdit);
$('reloadNLP').addEventListener('click', reloadNLP);

// ========== UPLOAD KALENDER ==========
$('uploadKalenderBtn').addEventListener('click', async () => {
  const fileInput = $('kalenderFileInput');
  const msg = $('uploadKalenderMsg');
  const btn = $('uploadKalenderBtn');
  
  if (!fileInput.files || fileInput.files.length === 0) {
    msg.style.display = 'block'; msg.className = 'form-message error';
    msg.textContent = '⚠️ Silakan pilih file gambar terlebih dahulu!';
    setTimeout(() => { msg.style.display = 'none'; }, 3000);
    return;
  }

  const formData = new FormData();
  formData.append('kalenderImage', fileInput.files[0]);

  btn.textContent = '⏳ Mengunggah...';
  btn.disabled = true;

  try {
    const res = await fetch('/api/upload-kalender', {
      method: 'POST',
      body: formData
    });
    const d = await res.json();

    if (d.success) {
      msg.style.display = 'block'; msg.className = 'form-message success';
      msg.textContent = `✅ ${d.message}`;
      fileInput.value = ''; // Reset input
    } else {
      msg.style.display = 'block'; msg.className = 'form-message error';
      msg.textContent = `❌ ${d.error || 'Gagal mengunggah gambar'}`;
    }
  } catch (e) {
    console.error('Upload Error:', e);
    msg.style.display = 'block'; msg.className = 'form-message error';
    msg.textContent = '❌ Terjadi kesalahan saat mengunggah gambar';
  }

  btn.textContent = '📤 Unggah Kalender';
  btn.disabled = false;
  setTimeout(() => { msg.style.display = 'none'; }, 4000);
});

// ========== INIT ==========
function refresh() { updateQR(); updateStatus(); updateStats(); updateLogs(); }
refresh();
updateDB();
updateUsers();
loadIntents();
setInterval(refresh, REFRESH);
setInterval(updateDB, 15000);
setInterval(updateUsers, 10000);
