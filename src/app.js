const demoRituals = [
  { id: 1, name: '补财库', description: '补财库祈福项目，正式介绍可在后台替换。', price_cents: 0 },
  { id: 2, name: '祈福消灾', description: '为家人、事业、平安等祈福。', price_cents: 0 },
  { id: 3, name: '超度法事', description: '超度类法事项目。', price_cents: 0 }
];

const demoTakers = [
  { id: 1, nickname: '示例接单员', taker_code: 'T001' },
  { id: 2, nickname: '后续接单员', taker_code: 'T002' }
];

const storageKeys = {
  blessings: 'folai-demo-blessings',
  profile: 'folai-profile',
  adminToken: 'folai-admin-token'
};

const state = {
  tab: 'intro',
  rituals: demoRituals,
  takers: demoTakers,
  blessings: JSON.parse(localStorage.getItem(storageKeys.blessings) || '[]'),
  profile: JSON.parse(localStorage.getItem(storageKeys.profile) || '{}'),
  releaseItems: [{ ritual_id: 1, quantity: 1 }],
  adminToken: localStorage.getItem(storageKeys.adminToken) || '',
  workerNotice: ''
};

const statusText = {
  PENDING: '待完成',
  ACCEPTED: '已接单',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
  RETURNED: '已退回'
};

function saveDemo() {
  localStorage.setItem(storageKeys.blessings, JSON.stringify(state.blessings));
}

function saveProfile() {
  localStorage.setItem(storageKeys.profile, JSON.stringify(state.profile));
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (state.adminToken) headers.Authorization = `Bearer ${state.adminToken}`;
  if (options.body && !(options.body instanceof FormData)) headers['content-type'] = 'application/json';
  const res = await fetch(path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) throw new Error(data.message || '请求失败');
  return data.data;
}

async function bootstrap() {
  try {
    const data = await api('/api/bootstrap');
    state.rituals = data.rituals?.length ? data.rituals : demoRituals;
    state.takers = data.takers?.length ? data.takers : demoTakers;
  } catch (_) {
    state.rituals = demoRituals;
    state.takers = demoTakers;
  }
  if (!state.releaseItems[0].ritual_id) state.releaseItems = [{ ritual_id: state.rituals[0]?.id || 1, quantity: 1 }];
  render();
}

function shell(content) {
  return `
    <div class="app-shell">
      <header class="topbar">
        <div class="topbar-inner">
          <div class="brand">
            <div class="brand-mark">佛</div>
            <div><h1 class="brand-title">佛来运转</h1><p class="brand-subtitle">用心祈愿 福佑随行</p></div>
          </div>
          <nav class="tabs top-tabs">
            ${tabButton('intro', '项目介绍')}
            ${tabButton('release', '发布需求')}
            ${tabButton('mine', '我的需求')}
            ${tabButton('worker', '接单员任务台')}
            ${tabButton('admin', '后台管理')}
          </nav>
        </div>
      </header>
      <main>${profileBar()}${content}</main>
      <nav class="bottom-nav">
        ${bottomButton('intro', '首页')}
        ${bottomButton('release', '发布')}
        ${bottomButton('mine', '我的')}
        ${bottomButton('worker', '任务')}
      </nav>
      <footer class="footer">第一版只保留祈福核心流程，旧商城、钱包、分销、营销功能不进入本项目。</footer>
    </div>`;
}

function profileBar() {
  if (state.tab === 'intro') return '';
  const label = state.profile.phone ? `${escapeHtml(state.profile.nickname || '用户')} · ${escapeHtml(state.profile.phone)}` : '未登记手机';
  return `<div class="profile-bar"><span>${label}</span><button class="secondary small" data-tab="mine">设置</button></div>`;
}

function tabButton(id, label) {
  return `<button class="tab ${state.tab === id ? 'active' : ''}" data-tab="${id}">${label}</button>`;
}

function bottomButton(id, label) {
  return `<button class="nav-item ${state.tab === id ? 'active' : ''}" data-tab="${id}"><span>${label}</span></button>`;
}

function renderIntro() {
  const pending = state.blessings.filter((b) => b.status !== 'COMPLETED' && b.status !== 'CANCELLED').length;
  const completed = state.blessings.filter((b) => b.status === 'COMPLETED').length;
  return `
    <section class="mobile-hero">
      <div class="hero-copy">
        <h1>佛来运转</h1>
        <p class="hero-kicker">用心祈愿&nbsp;&nbsp;福佑随行</p>
        <p>在寺院为您虔心祈福<br>愿所求皆所愿，所行化坦途</p>
      </div>
      <div class="hero-photo" aria-hidden="true"></div>
    </section>
    <section class="home-card home-card-primary">
      <button class="primary-entry" data-tab="release" type="button">
        <span class="entry-icon">合掌</span>
        <span class="entry-copy"><strong>发布需求</strong><em>填写祈愿信息，提交寺院祈福</em></span>
        <span class="entry-arrow">&rsaquo;</span>
      </button>
      <button class="quick-row" data-tab="mine" type="button"><span class="quick-icon">手机</span><span class="quick-title">手机登记</span><span class="quick-sub">用于接收进度通知</span><span>&rsaquo;</span></button>
      <button class="quick-row" data-tab="release" type="button"><span class="quick-icon">渠道</span><span class="quick-title">渠道码</span><span class="quick-sub">${escapeHtml(state.profile.channel_code || '请输入接单员渠道码')}</span><span>&rsaquo;</span></button>
    </section>
    <section class="home-card">
      <button class="quick-row large" data-tab="mine" type="button"><span class="quick-icon search">查询</span><span class="quick-title">我的需求 / 进度查询</span><span class="quick-sub">输入编号查询进度，也可查看所有祈福记录</span><span>&rsaquo;</span></button>
    </section>
    <section class="status-strip">
      <p>愿您的祈愿，早日圆满</p>
      <div class="status-pair">
        <button data-tab="mine" type="button"><strong>${pending}</strong><span>待完成</span></button>
        <button data-tab="mine" type="button"><strong>${completed}</strong><span>已完成</span></button>
      </div>
    </section>
    <section class="link-grid">
      <button data-tab="intro" type="button"><strong>项目介绍</strong><span>了解祈福项目</span></button>
      <button data-tab="mine" type="button"><strong>查看相册</strong><span>已完成祈福回顾</span></button>
    </section>
    <section class="panel section intro-projects"><h2>祈福项目</h2><div class="card-list">${state.rituals.map(ritualCard).join('')}</div></section>`;
}

function ritualCard(r) {
  const price = r.price_cents ? `¥${(r.price_cents / 100).toFixed(2)}` : '价格后台设置';
  return `<div class="ritual-card"><strong>${escapeHtml(r.name)}</strong><span class="meta">${price}</span><p>${escapeHtml(r.description || '暂无介绍')}</p></div>`;
}

function renderRelease() {
  const phone = state.profile.phone || '';
  return `
    <section class="panel page-panel">
      <h2>发布祈福需求</h2>
      <div class="notice">渠道码请填写接单员提供的编号，例如 T001。填写错误时，接单员可能看不到这条需求。</div>
      <form id="releaseForm" class="form-grid section-sm">
        ${input('real_name', '姓名', 'text', true)}
        ${input('mobile', '手机号', 'tel', true, phone)}
        ${input('channel_code', '渠道码', 'text', true, state.profile.channel_code || '')}
        ${input('birthday', '生日', 'date', true)}
        ${input('age', '年龄', 'number', false)}
        ${select('zodiac', '属相', ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'])}
        ${select('sex', '性别', ['男','女'])}
        <div class="field full"><label>祈福项目</label><div id="releaseItems" class="item-list">${releaseItemsHtml()}</div><button class="secondary" type="button" id="addItem">添加项目</button></div>
        <label class="field full">备注<textarea name="remark_text" placeholder="可填写祈福对象、愿望、特殊说明"></textarea></label>
        <div class="field full"><button class="primary" type="submit">提交需求</button></div>
      </form>
      <div id="releaseResult" class="result"></div>
    </section>`;
}

function releaseItemsHtml() {
  return state.releaseItems.map((item, index) => `
    <div class="item-row" data-index="${index}">
      <select name="ritual_id_${index}" required>${state.rituals.map((r) => `<option value="${r.id}" ${String(item.ritual_id) === String(r.id) ? 'selected' : ''}>${escapeHtml(r.name)}</option>`).join('')}</select>
      <input name="quantity_${index}" type="number" min="1" value="${Number(item.quantity || 1)}" required>
      <button class="danger icon-btn" type="button" data-remove-item="${index}" ${state.releaseItems.length === 1 ? 'disabled' : ''}>删</button>
    </div>`).join('');
}

function renderQuery() {
  return renderMine();
}

function renderMine() {
  const related = state.profile.phone ? state.blessings.filter((b) => b.mobile === state.profile.phone) : state.blessings;
  const pending = related.filter((b) => b.status !== 'COMPLETED' && b.status !== 'CANCELLED');
  const completed = related.filter((b) => b.status === 'COMPLETED');
  return `
    <section class="panel mine-lookup">
      <h2>我的需求 / 进度查询</h2>
      <p class="meta">提交后可用需求编号和查询码查看进度；手机登记后，本机发布记录会自动归到这里。</p>
      <form id="queryForm" class="form-grid compact-form">
        ${input('task_id', '需求编号', 'text', false)}
        ${input('access_code', '查询码', 'text', false)}
        <div class="field full"><button class="primary" type="submit">查询进度</button></div>
      </form>
      <div id="queryResult" class="result"></div>
    </section>
    <section class="panel section">
      <h2>手机登记</h2>
      <form id="profileForm" class="form-grid">
        ${input('profile_phone', '手机号', 'tel', true, state.profile.phone || '')}
        ${input('profile_nickname', '昵称', 'text', false, state.profile.nickname || '')}
        ${input('profile_channel', '常用渠道码', 'text', false, state.profile.channel_code || '')}
        ${input('profile_password', '本机密码备注', 'password', false, state.profile.password || '')}
        <div class="field full"><button class="secondary" type="submit">保存登记信息</button></div>
      </form>
      <div id="profileResult" class="result"></div>
    </section>
    <section class="split section">
      <div class="panel"><h2>待完成</h2><div class="card-list">${pending.map(cardForBlessing).join('') || '<p class="meta">暂无待完成需求。</p>'}</div></div>
      <div class="panel"><h2>已完成 / 相册</h2><div class="card-list">${completed.map(cardForBlessing).join('') || '<p class="meta">暂无已完成需求。</p>'}</div></div>
    </section>`;
}

function renderWorker() {
  const rows = state.blessings.filter((b) => b.status !== 'COMPLETED' && b.status !== 'CANCELLED').map(cardForWorker).join('') || '<p class="meta">暂无待办任务。</p>';
  return `<section class="panel page-panel"><h2>接单员任务台</h2><div class="notice">选择文件时可一次选择多张照片/多个视频；未配置后台 Token 时先走本机演示，配置后会上传到 R2。</div><div id="workerResult" class="result">${state.workerNotice ? `<div class="notice">${escapeHtml(state.workerNotice)}</div>` : ""}</div><div class="card-list section-sm">${rows}</div><div class="actions"><button class="secondary" data-tab="admin">后台管理</button></div></section>`;
}

function renderAdmin() {
  return `
    <section class="panel page-panel">
      <h2>后台管理</h2>
      <div class="form-grid">
        ${input('adminToken', '管理员 Token', 'password', false, state.adminToken)}
        <label class="field">状态筛选<select id="adminStatus"><option value="">全部</option><option value="PENDING">待完成</option><option value="ACCEPTED">已接单</option><option value="COMPLETED">已完成</option><option value="RETURNED">已退回</option><option value="CANCELLED">已取消</option></select></label>
      </div>
      <div class="actions"><button class="primary" id="saveToken">保存 Token</button><button class="secondary" id="loadAdmin">加载后台数据</button></div>
      <div id="adminResult" class="result"></div>
      <div class="table-wrap section-sm"><table class="table"><thead><tr><th>编号</th><th>姓名</th><th>渠道码</th><th>状态</th><th>接单员</th><th>操作</th></tr></thead><tbody>${state.blessings.map(adminRow).join('')}</tbody></table></div>
    </section>`;
}

function input(name, label, type, required, value = '') {
  return `<label class="field">${label}<input name="${name}" id="${name}" type="${type}" value="${escapeHtml(value)}" ${required ? 'required' : ''}></label>`;
}

function select(name, label, options) {
  return `<label class="field">${label}<select name="${name}">${options.map((o) => `<option value="${o}">${o}</option>`).join('')}</select></label>`;
}

function cardForBlessing(b) {
  const itemText = (b.items || []).map((i) => `${i.ritual_name || ritualName(i.ritual_id)} x ${i.quantity}`).join('，') || b.ritual_name || '';
  return `<article class="ritual-card"><div class="card-head"><strong>${escapeHtml(b.task_id)}</strong><span class="status ${b.status}">${statusText[b.status] || b.status}</span></div><p>${escapeHtml(b.real_name)} · ${escapeHtml(b.birthday)} · ${escapeHtml(itemText)}</p><p class="meta">性别：${escapeHtml(b.sex || '-')} · 年龄：${escapeHtml(b.age || '-')} · 渠道码：${escapeHtml(b.channel_code || '-')}</p><span class="meta">查询码：${escapeHtml(b.access_code || '')}</span><div class="actions"><button class="secondary" data-detail="${b.task_id}">项目详情</button><button class="secondary" data-album="${b.task_id}">查看相册</button></div></article>`;
}

function cardForWorker(b) {
  const itemText = (b.items || []).map((i) => `${i.ritual_name || ritualName(i.ritual_id)} x ${i.quantity}`).join('，') || b.ritual_name || '祈福项目';
  return `<article class="ritual-card worker-card">
    <div class="card-head"><strong>${escapeHtml(b.task_id)}</strong><span class="status ${b.status}">${statusText[b.status] || b.status}</span></div>
    <p>${escapeHtml(b.real_name)} · ${escapeHtml(b.sex || '-')} · ${escapeHtml(b.age || '-')}岁 · ${escapeHtml(itemText)}</p>
    <p class="meta">生日：${escapeHtml(b.birthday || '-')} · 属相：${escapeHtml(b.zodiac || '-')} · 渠道码：${escapeHtml(b.channel_code || '-')}</p>
    <p class="meta">当前接单员：${escapeHtml(takerName(b.current_taker_id) || '未指定')}</p>
    <div class="actions"><button class="secondary" data-detail="${b.task_id}">订单详情</button><button class="secondary" data-action="accept" data-id="${b.id}">确认接单</button></div>
    <label class="field full">流转给后续接单员<select data-flow-target="${b.id}">${state.takers.map((t) => `<option value="${t.id}" ${String(b.current_taker_id) === String(t.id) ? 'selected' : ''}>${escapeHtml(t.nickname || t.taker_code || t.id)}（${escapeHtml(t.taker_code || '-') }）</option>`).join('')}</select></label>
    <div class="actions"><button class="secondary" data-action="assign" data-id="${b.id}">确认流转</button><button class="primary" data-action="complete" data-id="${b.id}">完成</button></div>
    <label class="field full">拍照/视频上传<input type="file" accept="image/*,video/*" capture="environment" multiple data-files="${b.task_id}"></label>
    <div class="upload-preview">${mediaPreviewHtml(b.media || [], b)}</div>
  </article>`;
}

function adminRow(b) {
  return `<tr><td>${escapeHtml(b.task_id)}</td><td>${escapeHtml(b.real_name)}</td><td>${escapeHtml(b.channel_code || '-')}</td><td>${statusText[b.status] || b.status}</td><td>${escapeHtml(takerName(b.current_taker_id) || '-')}</td><td><button class="secondary" data-detail="${b.task_id}">详情</button> <button class="secondary" data-action="accept" data-id="${b.id}">接单</button> <button class="primary" data-action="complete" data-id="${b.id}">完成</button></td></tr>`;
}

function renderDetail(detail) {
  const info = detail.info || detail;
  const items = detail.items || info.items || [];
  const records = detail.records || info.records || [];
  const scenarios = detail.scenarios || info.scenarios || [];
  const media = detail.media || info.media || [];
  return `<div class="panel detail-panel"><h3>需求详情 ${escapeHtml(info.task_id)}</h3><span class="status ${info.status}">${statusText[info.status] || info.status}</span><div class="detail-grid"><span>姓名：${escapeHtml(info.real_name)}</span><span>性别：${escapeHtml(info.sex || '-')}</span><span>年龄：${escapeHtml(info.age || '-')}</span><span>生日：${escapeHtml(info.birthday || '-')}</span><span>属相：${escapeHtml(info.zodiac || '-')}</span><span>渠道码：${escapeHtml(info.channel_code || '-')}</span><span>手机号：${escapeHtml(info.mobile || '-')}</span><span>接单员：${escapeHtml(takerName(info.current_taker_id) || '未指定')}</span></div><p>${escapeHtml(info.remark_text || '')}</p><h3>项目</h3>${items.map((i) => `<p>${escapeHtml(i.ritual_name || ritualName(i.ritual_id))} x ${i.quantity}</p>`).join('') || '<p class="meta">暂无项目明细</p>'}<h3>现场概况</h3>${scenarios.map((s) => `<p>${escapeHtml(s.created_at || '')} ${escapeHtml(s.note || '')}</p>`).join('') || '<p class="meta">暂无现场概况</p>'}<h3>照片/视频</h3>${mediaPreviewHtml(media, info)}<h3>流转记录</h3>${records.map((r) => `<p>${escapeHtml(r.created_at || '')} · ${escapeHtml(r.note || r.action)}</p>`).join('') || '<p class="meta">暂无记录</p>'}</div>`;
}

function renderAlbum(b) {
  const media = b.media || b.files || [];
  return `<div class="panel"><h3>相册 ${escapeHtml(b.task_id)}</h3>${media.length ? `<div class="album-grid">${mediaPreviewHtml(media, b)}</div>` : '<p class="meta">完成后，接单员上传的照片和视频会显示在这里。正式部署后文件保存在 R2。</p>'}</div>`;
}

function mediaPreviewHtml(media, context = {}) {
  if (!media.length) return '<p class="meta">暂无照片或视频。</p>';
  return media.map((m) => {
    const name = m.name || m.filename || '现场文件';
    const type = m.type || m.content_type || '';
    const src = mediaUrl(m, context);
    if (type.startsWith('video/')) {
      return `<div class="album-item"><video src="${escapeAttr(src)}" controls playsinline></video><span>${escapeHtml(name)}</span></div>`;
    }
    if (type.startsWith('image/') || src.startsWith('data:image') || src.match(/\.(png|jpe?g|webp|gif)(\?|$)/i)) {
      return `<div class="album-item"><img src="${escapeAttr(src)}" alt="${escapeAttr(name)}"><span>${escapeHtml(name)}</span></div>`;
    }
    return `<div class="album-item file-item"><strong>${escapeHtml(name)}</strong><span class="meta">${escapeHtml(type || '文件')}</span></div>`;
  }).join('');
}

function mediaUrl(media, context = {}) {
  const src = media.data_url || media.preview_url || media.url || '';
  if (!src || src.startsWith('data:') || src.startsWith('blob:')) return src;
  if (context.task_id && context.access_code && src.startsWith('/api/media/')) {
    const separator = src.includes('?') ? '&' : '?';
    return `${src}${separator}task_id=${encodeURIComponent(context.task_id)}&access_code=${encodeURIComponent(context.access_code)}`;
  }
  return src;
}

function ritualName(id) {
  return state.rituals.find((r) => String(r.id) === String(id))?.name || '祈福项目';
}

function takerName(id) {
  if (!id) return '';
  const taker = state.takers.find((t) => String(t.id) === String(id));
  return taker ? `${taker.nickname || taker.real_name || '接单员'} ${taker.taker_code ? '(' + taker.taker_code + ')' : ''}` : `接单员 ${id}`;
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
}

function escapeAttr(value = '') {
  return escapeHtml(value).replace(/'/g, '&#39;');
}

function render() {
  const views = { intro: renderIntro, release: renderRelease, query: renderMine, mine: renderMine, worker: renderWorker, admin: renderAdmin };
  document.getElementById('app').innerHTML = shell(views[state.tab]());
  bindEvents();
}

function bindEvents() {
  document.querySelectorAll('[data-tab]').forEach((button) => button.addEventListener('click', () => { state.tab = button.dataset.tab; render(); }));
  document.getElementById('profileForm')?.addEventListener('submit', submitProfile);
  document.getElementById('releaseForm')?.addEventListener('submit', submitRelease);
  document.getElementById('queryForm')?.addEventListener('submit', submitQuery);
  document.getElementById('addItem')?.addEventListener('click', addReleaseItem);
  document.querySelectorAll('[data-remove-item]').forEach((button) => button.addEventListener('click', () => removeReleaseItem(Number(button.dataset.removeItem))));
  document.querySelectorAll('[data-detail]').forEach((button) => button.addEventListener('click', () => showLocalDetail(button.dataset.detail)));
  document.querySelectorAll('[data-album]').forEach((button) => button.addEventListener('click', () => showLocalAlbum(button.dataset.album)));
  document.getElementById('saveToken')?.addEventListener('click', saveToken);
  document.getElementById('loadAdmin')?.addEventListener('click', loadAdmin);
  document.querySelectorAll('[data-action]').forEach((button) => button.addEventListener('click', () => updateBlessing(button.dataset.id, button.dataset.action)));
  document.querySelectorAll('[data-files]').forEach((input) => input.addEventListener('change', () => attachMedia(input.dataset.files, input.files)));
}

function submitProfile(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  state.profile = {
    phone: String(form.get('profile_phone') || '').trim(),
    nickname: String(form.get('profile_nickname') || '').trim(),
    channel_code: String(form.get('profile_channel') || '').trim(),
    password: String(form.get('profile_password') || '').trim()
  };
  saveProfile();
  document.getElementById('profileResult').innerHTML = '<div class="notice">已保存到本机浏览器。正式部署如需短信验证码，可在后续版本接入。</div>';
  render();
}

function syncReleaseItems(form) {
  state.releaseItems = state.releaseItems.map((_, index) => ({
    ritual_id: Number(form.get(`ritual_id_${index}`)),
    quantity: Math.max(1, Number(form.get(`quantity_${index}`) || 1))
  }));
}

function addReleaseItem() {
  const form = document.getElementById('releaseForm');
  if (form) syncReleaseItems(new FormData(form));
  state.releaseItems.push({ ritual_id: state.rituals[0]?.id || 1, quantity: 1 });
  render();
}

function removeReleaseItem(index) {
  const form = document.getElementById('releaseForm');
  if (form) syncReleaseItems(new FormData(form));
  state.releaseItems.splice(index, 1);
  if (!state.releaseItems.length) state.releaseItems = [{ ritual_id: state.rituals[0]?.id || 1, quantity: 1 }];
  render();
}

async function submitRelease(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  syncReleaseItems(form);
  const items = state.releaseItems.filter((item) => item.ritual_id && item.quantity > 0);
  const body = {
    real_name: form.get('real_name'),
    mobile: form.get('mobile'),
    channel_code: form.get('channel_code'),
    birthday: form.get('birthday'),
    age: form.get('age'),
    zodiac: form.get('zodiac'),
    sex: form.get('sex'),
    remark_text: form.get('remark_text'),
    items
  };
  try {
    const data = await api('/api/blessings', { method: 'POST', body: JSON.stringify(body) });
    addLocalBlessing(data, body);
    document.getElementById('releaseResult').innerHTML = `<div class="notice">创建成功。需求编号：<strong>${escapeHtml(data.task_id)}</strong>，查询码：<strong>${escapeHtml(data.access_code)}</strong></div>`;
    state.releaseItems = [{ ritual_id: state.rituals[0]?.id || 1, quantity: 1 }];
    event.target.reset();
  } catch (err) {
    const demo = { id: Date.now(), task_id: `FL${Date.now().toString().slice(-8)}`, access_code: String(Math.floor(Math.random() * 900000 + 100000)) };
    addLocalBlessing(demo, body);
    document.getElementById('releaseResult').innerHTML = `<div class="notice">本机演示已创建。需求编号：<strong>${demo.task_id}</strong>，查询码：<strong>${demo.access_code}</strong></div>`;
  }
}

function addLocalBlessing(data, body) {
  const local = {
    id: data.id || Date.now(),
    task_id: data.task_id,
    access_code: data.access_code,
    real_name: body.real_name,
    mobile: body.mobile,
    birthday: body.birthday,
    age: body.age,
    zodiac: body.zodiac,
    sex: body.sex,
    channel_code: body.channel_code,
    remark_text: body.remark_text,
    current_taker_id: null,
    items: body.items.map((item) => ({ ...item, ritual_name: ritualName(item.ritual_id) })),
    media: [],
    records: [{ action: 'CREATED', note: '创建祈福需求', created_at: new Date().toLocaleString() }],
    status: 'PENDING'
  };
  state.blessings.unshift(local);
  saveDemo();
}

async function submitQuery(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  const taskId = String(form.get('task_id') || '').trim();
  const accessCode = String(form.get('access_code') || '').trim();
  if (!taskId || !accessCode) {
    document.getElementById('queryResult').innerHTML = '<div class="notice">请输入需求编号和查询码。</div>';
    return;
  }
  try {
    const listData = await api(`/api/blessings?task_id=${encodeURIComponent(taskId)}&access_code=${encodeURIComponent(accessCode)}`);
    const first = listData.list?.[0];
    if (!first) throw new Error('没有查询到需求');
    const detail = await api(`/api/blessings/${first.id}?task_id=${encodeURIComponent(taskId)}&access_code=${encodeURIComponent(accessCode)}`);
    const viewModel = { ...detail, info: { ...detail.info, task_id: taskId, access_code: accessCode } };
    document.getElementById('queryResult').innerHTML = renderDetail(viewModel) + renderAlbum({ task_id: taskId, access_code: accessCode, media: detail.media || [] });
  } catch (err) {
    const local = state.blessings.find((b) => b.task_id === taskId && b.access_code === accessCode);
    document.getElementById('queryResult').innerHTML = local ? renderDetail(local) + renderAlbum(local) : `<div class="notice">${escapeHtml(err.message)}</div>`;
  }
}

function showLocalDetail(taskId) {
  const item = state.blessings.find((b) => b.task_id === taskId);
  if (!item) return;
  const mount = document.querySelector('main');
  mount.insertAdjacentHTML('beforeend', `<div class="modal-backdrop" data-close-modal><div class="modal">${renderDetail(item)}<button class="primary" data-close-modal>关闭</button></div></div>`);
  bindModalClose();
}

function showLocalAlbum(taskId) {
  const item = state.blessings.find((b) => b.task_id === taskId);
  if (!item) return;
  const mount = document.querySelector('main');
  mount.insertAdjacentHTML('beforeend', `<div class="modal-backdrop" data-close-modal><div class="modal">${renderAlbum(item)}<button class="primary" data-close-modal>关闭</button></div></div>`);
  bindModalClose();
}

function bindModalClose() {
  document.querySelectorAll('[data-close-modal]').forEach((node) => node.addEventListener('click', (event) => {
    if (event.target.dataset.closeModal !== undefined) event.target.closest('.modal-backdrop')?.remove();
  }));
}

async function attachMedia(taskId, files) {
  const item = state.blessings.find((b) => b.task_id === taskId);
  if (!item || !files?.length) return;
  const fileList = Array.from(files);
  setWorkerMessage(`正在处理 ${fileList.length} 个文件...`);

  let uploaded = [];
  if (state.adminToken && item.id) {
    try {
      const form = new FormData();
      fileList.forEach((file) => form.append('file', file));
      form.append('owner_type', 'scenario');
      form.append('owner_id', item.id);
      form.append('note', '接单员上传现场照片/视频');
      const data = await api('/api/upload', { method: 'POST', body: form });
      uploaded = (data.files || []).map((file) => ({ ...file, type: file.content_type, name: file.filename }));
    } catch (err) {
      setWorkerMessage(`R2 上传失败，已保留本机预览：${err.message}`);
    }
  }

  const localMedia = await Promise.all(fileList.map(fileToMedia));
  item.media = item.media || [];
  if (uploaded.length) {
    item.media.push(...uploaded.map((file, index) => ({ ...file, data_url: localMedia[index]?.data_url || '', uploaded: true })));
  } else {
    item.media.push(...localMedia);
  }
  item.records = item.records || [];
  item.records.push({ action: 'UPLOADED', note: `上传 ${fileList.length} 个照片/视频`, created_at: new Date().toLocaleString() });
  saveDemo();
  setWorkerMessage(`已上传/加入 ${fileList.length} 个文件，可在订单详情和相册中预览。`);
  render();
}

function fileToMedia(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, type: file.type || '文件', size: file.size || 0, data_url: reader.result });
    reader.onerror = () => resolve({ name: file.name, type: file.type || '文件', size: file.size || 0, data_url: '' });
    reader.readAsDataURL(file);
  });
}

function setWorkerMessage(message) {
  state.workerNotice = message;
  const result = document.getElementById('workerResult');
  if (result) result.innerHTML = `<div class="notice">${escapeHtml(message)}</div>`;
}

function saveToken() {
  state.adminToken = document.getElementById('adminToken').value.trim();
  localStorage.setItem(storageKeys.adminToken, state.adminToken);
  document.getElementById('adminResult').innerHTML = '<div class="notice">Token 已保存在本机浏览器。</div>';
}

async function loadAdmin() {
  try {
    const data = await api('/api/admin');
    state.blessings = data.blessings || [];
    state.rituals = data.rituals || state.rituals;
    state.takers = data.takers || state.takers;
    saveDemo();
    render();
  } catch (err) {
    document.getElementById('adminResult').innerHTML = `<div class="notice">${escapeHtml(err.message)}。未部署时显示本机演示数据。</div>`;
  }
}

async function updateBlessing(id, action) {
  const item = state.blessings.find((b) => String(b.id) === String(id));
  const selectedTakerId = Number(document.querySelector(`[data-flow-target="${CSS.escape(String(id))}"]`)?.value || state.takers[0]?.id || 0) || null;
  try {
    await api(`/api/blessings/${id}`, { method: 'PATCH', body: JSON.stringify({ action, taker_id: selectedTakerId }) });
  } catch (_) {}
  if (item) {
    if (action === 'accept') {
      item.status = 'ACCEPTED';
      item.current_taker_id = item.current_taker_id || selectedTakerId || state.takers[0]?.id || null;
      addRecord(item, 'ACCEPTED', `已由 ${takerName(item.current_taker_id) || '接单员'} 确认接单`);
      setWorkerMessage(`${item.task_id} 已确认接单。`);
    }
    if (action === 'complete') {
      item.status = 'COMPLETED';
      item.completed_at = new Date().toISOString();
      addRecord(item, 'COMPLETED', '需求已完成，用户可查看相册');
      setWorkerMessage(`${item.task_id} 已完成，已进入用户已完成列表。`);
    }
    if (action === 'assign') {
      item.current_taker_id = selectedTakerId;
      item.status = 'PENDING';
      addRecord(item, 'ASSIGNED', `已流转给 ${takerName(selectedTakerId) || '后续接单员'}`);
      setWorkerMessage(`${item.task_id} 已流转给 ${takerName(selectedTakerId) || '后续接单员'}。`);
    }
    saveDemo();
  }
  render();
}

function addRecord(item, action, note) {
  item.records = item.records || [];
  item.records.push({ action, note, created_at: new Date().toLocaleString() });
}

bootstrap();

