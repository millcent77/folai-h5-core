const demoRituals = [
  { id: 1, name: '补财库', description: '补财库祈福项目，正式介绍可在后台替换。', price_cents: 0 },
  { id: 2, name: '祈福消灾', description: '为家人、事业、平安等祈福。', price_cents: 0 },
  { id: 3, name: '超度法事', description: '超度类法事项目。', price_cents: 0 }
];

const demoTakers = [
  { id: 1, nickname: '示例接单员', taker_code: 'T001' }
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
  selectedDetail: null,
  releaseItems: [{ ritual_id: 1, quantity: 1 }],
  adminToken: localStorage.getItem(storageKeys.adminToken) || ''
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
            <div><h1 class="brand-title">佛来运转</h1><p class="brand-subtitle">低成本 H5 核心闭环</p></div>
          </div>
          <nav class="tabs">
            ${tabButton('intro', '项目介绍')}
            ${tabButton('release', '发布需求')}
            ${tabButton('query', '需求查询')}
            ${tabButton('mine', '我的需求')}
            ${tabButton('worker', '接单员任务台')}
            ${tabButton('admin', '后台管理')}
          </nav>
        </div>
      </header>
      <main>${profileBar()}${content}</main>
      <footer class="footer">第一版只保留祈福核心流程，旧商城、钱包、分销、营销功能不进入本项目。</footer>
    </div>`;
}

function profileBar() {
  const label = state.profile.phone ? `${escapeHtml(state.profile.nickname || '用户')} · ${escapeHtml(state.profile.phone)}` : '未登记手机';
  return `<div class="profile-bar"><span>${label}</span><button class="secondary small" data-tab="mine">设置</button></div>`;
}

function tabButton(id, label) {
  return `<button class="tab ${state.tab === id ? 'active' : ''}" data-tab="${id}">${label}</button>`;
}

function renderIntro() {
  return `
    <section class="hero">
      <h1>佛来运转</h1>
      <p>把原 App 和小程序收缩为一个手机网页：终端用户登记手机、填写渠道码、一次提交多个祈福项目，工作人员接单、流转、上传现场照片视频，用户在“我的需求”查看待完成和已完成相册。</p>
    </section>
    <section class="grid">
      <div class="panel"><h2>终端用户</h2><p>手机登记，设置昵称，发布需求，保存需求编号和查询码，在我的需求中查看待完成、已完成和相册。</p></div>
      <div class="panel"><h2>接单员</h2><p>用渠道码识别来源，确认接单，上传照片或视频，必要时流转给其他接单员，完成后用户可查看。</p></div>
      <div class="panel"><h2>低成本后台</h2><p>Cloudflare Pages Functions 负责接口，D1 保存需求和流转，R2 保存图片视频，不再维护 App Store 和小程序。</p></div>
    </section>
    <section class="panel section"><h2>祈福项目</h2><div class="card-list">${state.rituals.map(ritualCard).join('')}</div></section>`;
}

function ritualCard(r) {
  const price = r.price_cents ? `¥${(r.price_cents / 100).toFixed(2)}` : '价格后台设置';
  return `<div class="ritual-card"><strong>${escapeHtml(r.name)}</strong><span class="meta">${price}</span><p>${escapeHtml(r.description || '暂无介绍')}</p></div>`;
}

function renderRelease() {
  const phone = state.profile.phone || '';
  return `
    <section class="panel">
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
  return `
    <section class="panel">
      <h2>需求查询</h2>
      <p class="meta">为保护姓名、生日、照片和视频，H5 版使用“需求编号 + 查询码”查看详情。提交成功后请保存这两个号码。</p>
      <form id="queryForm" class="form-grid">
        ${input('task_id', '需求编号', 'text', true)}
        ${input('access_code', '查询码', 'text', true)}
        <div class="field full"><button class="primary" type="submit">查询</button></div>
      </form>
      <div id="queryResult" class="result"></div>
    </section>`;
}

function renderMine() {
  const related = state.profile.phone ? state.blessings.filter((b) => b.mobile === state.profile.phone) : state.blessings;
  const pending = related.filter((b) => b.status !== 'COMPLETED' && b.status !== 'CANCELLED');
  const completed = related.filter((b) => b.status === 'COMPLETED');
  return `
    <section class="panel">
      <h2>我的设置</h2>
      <form id="profileForm" class="form-grid">
        ${input('profile_phone', '手机号', 'tel', true, state.profile.phone || '')}
        ${input('profile_nickname', '昵称', 'text', false, state.profile.nickname || '')}
        ${input('profile_channel', '常用渠道码', 'text', false, state.profile.channel_code || '')}
        ${input('profile_password', '本机密码备注', 'password', false, state.profile.password || '')}
        <div class="field full"><button class="primary" type="submit">保存设置</button></div>
      </form>
      <div id="profileResult" class="result"></div>
    </section>
    <section class="split section">
      <div class="panel"><h2>待完成</h2><div class="card-list">${pending.map(cardForBlessing).join('') || '<p class="meta">暂无待完成需求。</p>'}</div></div>
      <div class="panel"><h2>已完成</h2><div class="card-list">${completed.map(cardForBlessing).join('') || '<p class="meta">暂无已完成需求。</p>'}</div></div>
    </section>`;
}

function renderWorker() {
  const rows = state.blessings.filter((b) => b.status !== 'COMPLETED' && b.status !== 'CANCELLED').map(cardForWorker).join('') || '<p class="meta">暂无待办任务。</p>';
  return `<section class="panel"><h2>接单员任务台</h2><div class="notice">部署后，确认接单、上传照片视频、流转和完成都由管理员 Token 保护。未部署时可本机演示状态变化。</div><div class="card-list section-sm">${rows}</div></section>`;
}

function renderAdmin() {
  return `
    <section class="panel">
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
  return `<article class="ritual-card"><strong>${escapeHtml(b.task_id)}</strong><span class="status ${b.status}">${statusText[b.status] || b.status}</span><p>${escapeHtml(b.real_name)} · ${escapeHtml(b.birthday)} · ${escapeHtml(itemText)}</p><span class="meta">查询码：${escapeHtml(b.access_code || '')} · 渠道码：${escapeHtml(b.channel_code || '-')}</span><div class="actions"><button class="secondary" data-detail="${b.task_id}">项目详情</button><button class="secondary" data-album="${b.task_id}">查看相册</button></div></article>`;
}

function cardForWorker(b) {
  return `<article class="ritual-card"><strong>${escapeHtml(b.task_id)}</strong><p>${escapeHtml(b.real_name)} · 渠道码 ${escapeHtml(b.channel_code || '-')}</p><label class="field">拍照/视频上传<input type="file" accept="image/*,video/*" capture="environment" multiple data-files="${b.task_id}"></label><div class="actions"><button class="secondary" data-action="accept" data-id="${b.id}">确认接单</button><button class="secondary" data-action="assign" data-id="${b.id}">流转</button><button class="primary" data-action="complete" data-id="${b.id}">完成</button></div></article>`;
}

function adminRow(b) {
  return `<tr><td>${escapeHtml(b.task_id)}</td><td>${escapeHtml(b.real_name)}</td><td>${escapeHtml(b.channel_code || '-')}</td><td>${statusText[b.status] || b.status}</td><td>${b.current_taker_id || '-'}</td><td><button class="secondary" data-action="accept" data-id="${b.id}">接单</button> <button class="primary" data-action="complete" data-id="${b.id}">完成</button></td></tr>`;
}

function renderDetail(detail) {
  const info = detail.info || detail;
  const items = detail.items || info.items || [];
  const records = detail.records || info.records || [];
  const scenarios = detail.scenarios || info.scenarios || [];
  return `<div class="panel"><h3>需求详情 ${escapeHtml(info.task_id)}</h3><span class="status ${info.status}">${statusText[info.status] || info.status}</span><p>${escapeHtml(info.real_name)} · ${escapeHtml(info.birthday)} · ${escapeHtml(info.zodiac || '')} · 渠道码 ${escapeHtml(info.channel_code || '-')}</p><p>${escapeHtml(info.remark_text || '')}</p><h3>项目</h3>${items.map((i) => `<p>${escapeHtml(i.ritual_name || ritualName(i.ritual_id))} x ${i.quantity}</p>`).join('') || '<p class="meta">暂无项目明细</p>'}<h3>现场概况</h3>${scenarios.map((s) => `<p>${escapeHtml(s.created_at || '')} ${escapeHtml(s.note || '')}</p>`).join('') || '<p class="meta">暂无现场概况</p>'}<h3>流转记录</h3>${records.map((r) => `<p>${escapeHtml(r.created_at || '')} · ${escapeHtml(r.note || r.action)}</p>`).join('') || '<p class="meta">暂无记录</p>'}</div>`;
}

function renderAlbum(b) {
  const media = b.media || [];
  return `<div class="panel"><h3>相册 ${escapeHtml(b.task_id)}</h3>${media.length ? `<div class="album-grid">${media.map((m) => `<div class="album-item"><strong>${escapeHtml(m.name)}</strong><span class="meta">${escapeHtml(m.type || '文件')}</span></div>`).join('')}</div>` : '<p class="meta">完成后，接单员上传的照片和视频会显示在这里。正式部署后文件保存在 R2。</p>'}</div>`;
}

function ritualName(id) {
  return state.rituals.find((r) => String(r.id) === String(id))?.name || '祈福项目';
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
}

function render() {
  const views = { intro: renderIntro, release: renderRelease, query: renderQuery, mine: renderMine, worker: renderWorker, admin: renderAdmin };
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
  document.querySelectorAll('[data-files]').forEach((input) => input.addEventListener('change', () => attachLocalMedia(input.dataset.files, input.files)));
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
  try {
    const listData = await api(`/api/blessings?task_id=${encodeURIComponent(taskId)}&access_code=${encodeURIComponent(accessCode)}`);
    const first = listData.list?.[0];
    if (!first) throw new Error('没有查询到需求');
    const detail = await api(`/api/blessings/${first.id}?task_id=${encodeURIComponent(taskId)}&access_code=${encodeURIComponent(accessCode)}`);
    document.getElementById('queryResult').innerHTML = renderDetail(detail);
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

function attachLocalMedia(taskId, files) {
  const item = state.blessings.find((b) => b.task_id === taskId);
  if (!item || !files?.length) return;
  item.media = item.media || [];
  Array.from(files).forEach((file) => item.media.push({ name: file.name, type: file.type || '文件' }));
  item.records = item.records || [];
  item.records.push({ action: 'UPLOADED', note: `上传 ${files.length} 个照片/视频`, created_at: new Date().toLocaleString() });
  saveDemo();
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
  const taker = state.takers[0];
  try {
    await api(`/api/blessings/${id}`, { method: 'PATCH', body: JSON.stringify({ action, taker_id: taker?.id }) });
  } catch (_) {}
  const item = state.blessings.find((b) => String(b.id) === String(id));
  if (item) {
    if (action === 'accept') item.status = 'ACCEPTED';
    if (action === 'complete') {
      item.status = 'COMPLETED';
      item.completed_at = new Date().toISOString();
    }
    if (action === 'assign') item.current_taker_id = taker?.id || 1;
    item.records = item.records || [];
    item.records.push({ action: action.toUpperCase(), note: statusText[item.status] || action, created_at: new Date().toLocaleString() });
    saveDemo();
  }
  render();
}

bootstrap();
