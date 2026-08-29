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
  try {
    localStorage.setItem(storageKeys.blessings, JSON.stringify(state.blessings));
  } catch (_) {
    const compact = state.blessings.map((blessing) => ({
      ...blessing,
      media: (blessing.media || []).map(({ data_url, preview_url, ...media }) => media)
    }));
    try {
      localStorage.setItem(storageKeys.blessings, JSON.stringify(compact));
    } catch (_) {}
  }
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
            ${tabButton('intro', '首页')}
            ${tabButton('projects', '项目介绍')}
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
        <span class="entry-icon icon-ring">${icon('hands')}</span>
        <span class="entry-copy"><strong>发布需求</strong><em>填写祈愿信息，提交寺院祈福</em></span>
        <span class="entry-arrow">&rsaquo;</span>
      </button>
      <button class="quick-row" data-tab="mine" type="button"><span class="quick-icon">${icon('phone')}</span><span class="quick-title">手机登记</span><span class="quick-sub">用于接收进度通知</span><span>&rsaquo;</span></button>
      <button class="quick-row" data-tab="release" type="button"><span class="quick-icon">${icon('qr')}</span><span class="quick-title">渠道码</span><span class="quick-sub">${escapeHtml(state.profile.channel_code || '请输入接单员渠道码')}</span><span>&rsaquo;</span></button>
    </section>
    <section class="home-card">
      <button class="quick-row large" data-tab="mine" type="button"><span class="quick-icon search">${icon('search')}</span><span class="quick-title">我的需求 / 进度查询</span><span class="quick-sub">输入编号查询进度，也可查看所有祈福记录</span><span>&rsaquo;</span></button>
    </section>
    <section class="status-strip">
      <p><span class="leaf-icon">${icon('leaf')}</span> 愿您的祈愿，早日圆满 <span class="leaf-icon">${icon('leaf')}</span></p>
      <div class="status-pair">
        <button data-tab="mine" type="button"><span class="status-icon pending">${icon('hourglass')}</span><strong>${pending}</strong><span>待完成</span></button>
        <button data-tab="mine" type="button"><span class="status-icon done">${icon('check')}</span><strong>${completed}</strong><span>已完成</span></button>
      </div>
    </section>
    <section class="link-grid">
      <button data-tab="projects" type="button"><span class="link-icon">${icon('temple')}</span><strong>项目介绍</strong><span>了解祈福项目</span></button>
      <button data-tab="mine" type="button"><span class="link-icon">${icon('image')}</span><strong>查看相册</strong><span>已完成祈福回顾</span></button>
    </section>
    <section class="home-blessing"><span class="leaf-icon">${icon('leaf')}</span> 佛前祈愿，心诚则灵。愿您平安顺遂，吉祥如意。</section>`;
}

function renderProjects() {
  return `
    <section class="panel page-panel project-page">
      <div class="section-title with-icon"><span class="link-icon">${icon('temple')}</span><div><h2>项目介绍</h2><p class="meta">后台新增或修改祈福项目后，会自动显示在这里。</p></div></div>
      <div class="project-list">${state.rituals.map(projectCard).join('') || '<p class="meta">暂无项目介绍。</p>'}</div>
    </section>`;
}

function projectCard(r) {
  const price = r.price_cents ? `¥${(r.price_cents / 100).toFixed(2)}` : '价格后台设置';
  return `<article class="project-card"><div class="project-icon">${icon('temple')}</div><div><h3>${escapeHtml(r.name)}</h3><p>${escapeHtml(r.description || '暂无介绍，后续可在后台补充。')}</p><span class="meta">${price}</span></div></article>`;
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
  return `<section class="panel page-panel"><h2>接单员任务台</h2><div class="notice">选择文件时可一次选择多张照片/多个视频；保存后台 Token 后会上传到 R2，未保存 Token 只做本机临时预览。</div><div id="workerResult" class="result">${state.workerNotice ? `<div class="notice">${escapeHtml(state.workerNotice)}</div>` : ""}</div><div class="card-list section-sm">${rows}</div><div class="actions"><button class="secondary" data-tab="admin">后台管理</button></div></section>`;
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
  const accepted = b.status === 'ACCEPTED';
  return `<article class="ritual-card worker-card compact-worker">
    <div class="worker-top"><strong>${escapeHtml(b.real_name || '-')}</strong><span class="status ${b.status}">${statusText[b.status] || b.status}</span></div>
    <div class="worker-info"><span>性别 ${escapeHtml(b.sex || '-')}</span><span>出生 ${escapeHtml(b.birthday || '-')}</span><span>属相 ${escapeHtml(b.zodiac || '-')}</span><span>年龄 ${escapeHtml(b.age || '-')}</span></div>
    <div class="worker-ritual">${escapeHtml(itemText)}</div>
    <div class="worker-meta"><span>${escapeHtml(b.task_id)}</span><span>渠道码 ${escapeHtml(b.channel_code || '-')}</span></div>
    <div class="actions"><button class="secondary" data-detail="${b.task_id}">详情</button><button class="secondary" data-action="accept" data-id="${b.id}" ${accepted ? 'disabled' : ''}>${accepted ? '已接单' : '确认接单'}</button></div>
    ${accepted ? `<label class="field full upload-field">上传照片/视频<input type="file" accept="image/*,video/*,.mp4,.mov,.webm" multiple data-files="${b.task_id}"><span class="meta">选择后会先压缩到 1MB 以内，再上传或加入预览。</span></label>` : '<div class="notice slim">确认接单后可上传照片/视频。</div>'}
    <label class="field full">流转给后续接单员<select data-flow-target="${b.id}">${state.takers.map((t) => `<option value="${t.id}" ${String(b.current_taker_id) === String(t.id) ? 'selected' : ''}>${escapeHtml(t.nickname || t.taker_code || t.id)}（${escapeHtml(t.taker_code || '-') }）</option>`).join('')}</select></label>
    <div class="actions"><button class="secondary" data-action="assign" data-id="${b.id}">确认流转</button><button class="primary" data-action="complete" data-id="${b.id}">完成</button></div>
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
  return media.map((m, index) => {
    const name = m.name || m.filename || '现场文件';
    const type = m.type || m.content_type || guessContentType(name, m.url || m.r2_key || m.key || '');
    const src = mediaUrl(m, context);
    if (!src) {
      return `<div class="album-item file-item"><strong>${escapeHtml(name)}</strong><span class="meta">未上传到云端，请在接单员任务台重新上传。</span></div>`;
    }
    if (type.startsWith('video/')) {
      return `<div class="album-item"><video src="${escapeAttr(src)}" controls playsinline preload="metadata"></video><span>${escapeHtml(name)}</span><button class="secondary small open-media" type="button" data-open-media="${escapeAttr(src)}" data-media-name="${escapeAttr(name)}" data-media-type="${escapeAttr(type)}">打开/保存</button></div>`;
    }
    if (type.startsWith('image/') || src.startsWith('data:image') || src.match(/\.(png|jpe?g|webp|gif)(\?|$)/i)) {
      return `<button class="album-item album-button" type="button" data-open-media="${escapeAttr(src)}" data-media-name="${escapeAttr(name)}" data-media-type="${escapeAttr(type)}"><img src="${escapeAttr(src)}" alt="${escapeAttr(name)}" loading="lazy"><span>${escapeHtml(name)}</span></button>`;
    }
    return `<div class="album-item file-item"><strong>${escapeHtml(name)}</strong><span class="meta">${escapeHtml(type || '文件')} #${index + 1}</span></div>`;
  }).join('');
}

function mediaUrl(media, context = {}) {
  const key = media.r2_key || media.key || '';
  let src = media.data_url || media.preview_url || media.url || '';
  if (!src && key) src = `/api/media/${key.split('/').map(encodeURIComponent).join('/')}`;
  if (src.startsWith('/api/media/')) src = normalizeMediaPath(src);
  if (!src || src.startsWith('data:') || src.startsWith('blob:')) return src;
  if (!src.startsWith('/api/media/') && !src.startsWith('http://') && !src.startsWith('https://')) return '';
  if (context.task_id && context.access_code && src.startsWith('/api/media/')) {
    const separator = src.includes('?') ? '&' : '?';
    return `${src}${separator}task_id=${encodeURIComponent(context.task_id)}&access_code=${encodeURIComponent(context.access_code)}`;
  }
  return src;
}

function normalizeMediaPath(src) {
  const [path, query = ''] = src.split('?');
  const fixedPath = path.replace(/%2F/gi, '/');
  return query ? `${fixedPath}?${query}` : fixedPath;
}

function guessContentType(name = '', path = '') {
  const value = `${name} ${path}`.toLowerCase();
  if (value.match(/\.(mp4|mov|webm|m4v)(\?|$|\s)/)) return 'video/mp4';
  if (value.match(/\.(png|jpe?g|webp|gif)(\?|$|\s)/)) return 'image/jpeg';
  return '';
}

function icon(name) {
  const icons = {
    hands: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.7 12.8V4.9a1.7 1.7 0 0 1 3.4 0v7.3"/><path d="M12.1 12.2V4.2a1.7 1.7 0 0 1 3.4 0v9.7"/><path d="M8.7 8.5 5.9 5.7a1.6 1.6 0 0 0-2.3 2.2l4.6 5.8c.8 1 1.4 2.1 1.8 3.3l.7 2.2"/><path d="M15.5 9.4 18 6.9a1.6 1.6 0 0 1 2.3 2.2l-3.9 5.2c-.7 1-1.3 2.1-1.6 3.3l-.4 1.6"/></svg>',
    phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="2.8" width="10" height="18.4" rx="2.2"/><path d="M10.5 18h3"/></svg>',
    qr: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><path d="M15 15h2.6v2.6H21M21 21h-6v-3M12 3v4M12 12h3M12 18h1.8"/></svg>',
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.4"/><path d="m15.4 15.4 5 5"/></svg>',
    hourglass: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10M7 21h10M8 3c0 4 2.7 5.4 4 7 1.3-1.6 4-3 4-7M8 21c0-4 2.7-5.4 4-7 1.3 1.6 4 3 4 7"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="m8 12.4 2.6 2.6L16.5 9"/></svg>',
    temple: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21h16M6 18h12M7 18v-6h10v6M5 12h14L12 6 5 12ZM8 8V5h8v3"/></svg>',
    image: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8" cy="10" r="1.5"/><path d="m5.5 17 4.2-4.2 3 3 2.2-2.2 3.6 3.4"/></svg>',
    leaf: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19c8-1 12-6 14-14C11 7 6 11 5 19Z"/><path d="M5 19c4-4 7-6 12-9"/></svg>'
  };
  return icons[name] || '';
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
  const views = { intro: renderIntro, projects: renderProjects, release: renderRelease, query: renderMine, mine: renderMine, worker: renderWorker, admin: renderAdmin };
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
  bindMediaOpen();
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
  bindMediaOpen();
}

function showLocalDetail(taskId) {
  const item = state.blessings.find((b) => b.task_id === taskId);
  if (!item) return;
  const mount = document.querySelector('main');
  mount.insertAdjacentHTML('beforeend', `<div class="modal-backdrop" data-close-modal><div class="modal">${renderDetail(item)}<button class="primary" data-close-modal>关闭</button></div></div>`);
  bindModalClose();
  bindMediaOpen();
}

function showLocalAlbum(taskId) {
  const item = state.blessings.find((b) => b.task_id === taskId);
  if (!item) return;
  const mount = document.querySelector('main');
  mount.insertAdjacentHTML('beforeend', `<div class="modal-backdrop" data-close-modal><div class="modal">${renderAlbum(item)}<button class="primary" data-close-modal>关闭</button></div></div>`);
  bindModalClose();
  bindMediaOpen();
}

function showMediaPreview(src, name, type = '') {
  if (!src) return;
  const safeName = name || '现场照片';
  const preview = type.startsWith('video/') ? `<video src="${escapeAttr(src)}" controls playsinline></video>` : `<img src="${escapeAttr(src)}" alt="${escapeAttr(safeName)}">`;
  const mount = document.querySelector('main');
  mount.insertAdjacentHTML('beforeend', `<div class="modal-backdrop" data-close-modal><div class="modal media-modal"><h3>${escapeHtml(safeName)}</h3>${preview}<div class="actions media-actions"><a class="secondary download-link" href="${escapeAttr(src)}" download="${escapeAttr(safeName)}" target="_blank" rel="noopener">下载/保存</a><button class="primary" data-close-modal>关闭</button></div><p class="meta">手机浏览器如未直接下载，可长按图片或打开后保存。</p></div></div>`);
  bindModalClose();
}

function bindMediaOpen() {
  document.querySelectorAll('[data-open-media]').forEach((button) => {
    if (button.dataset.boundMedia) return;
    button.dataset.boundMedia = '1';
    button.addEventListener('click', () => showMediaPreview(button.dataset.openMedia, button.dataset.mediaName, button.dataset.mediaType || ''));
  });
}

function bindModalClose() {
  document.querySelectorAll('[data-close-modal]').forEach((node) => {
    if (node.dataset.boundClose) return;
    node.dataset.boundClose = '1';
    node.addEventListener('click', (event) => {
      if (event.target.dataset.closeModal !== undefined) event.target.closest('.modal-backdrop')?.remove();
    });
  });
}

async function attachMedia(taskId, files) {
  const item = state.blessings.find((b) => b.task_id === taskId);
  if (!item || !files?.length) return;
  if (item.status !== 'ACCEPTED') {
    setWorkerMessage('请先确认接单，再上传照片/视频。');
    return;
  }
  const sourceFiles = Array.from(files);
  const willUploadToCloud = Boolean(state.adminToken && item.id);
  setWorkerMessage(`正在压缩 ${sourceFiles.length} 个文件，请稍候...`);
  const processed = await Promise.all(sourceFiles.map(prepareUploadFile));
  const fileList = processed.map((entry) => entry.file);
  const warnings = processed.filter((entry) => entry.warning).map((entry) => entry.warning);
  setWorkerMessage(willUploadToCloud ? `正在上传 ${fileList.length} 个压缩文件到云端...` : `正在生成 ${fileList.length} 个本机临时预览...`);

  let uploaded = [];
  if (willUploadToCloud) {
    try {
      const form = new FormData();
      fileList.forEach((file) => form.append('file', file));
      form.append('owner_type', 'scenario');
      form.append('owner_id', item.id);
      form.append('task_id', item.task_id || '');
      form.append('access_code', item.access_code || '');
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
  const suffix = warnings.length ? ` ${warnings.join(' ')}` : '';
  setWorkerMessage((uploaded.length ? `已上传 ${uploaded.length} 个文件到云端，可在订单详情和相册中预览。` : `已加入 ${fileList.length} 个本机临时预览；未上传到 R2，刷新或换手机后可能无法查看。`) + suffix);
  render();
}

async function prepareUploadFile(file) {
  if ((file.type || '').startsWith('image/')) return compressImage(file);
  if ((file.type || '').startsWith('video/')) return compressVideo(file);
  return { file, warning: file.size > 1024 * 1024 ? `${file.name} 不是图片或视频，未压缩。` : '' };
}

function compressImage(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = async () => {
      URL.revokeObjectURL(url);
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;
      let quality = 0.82;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      let blob = null;
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const scale = Math.min(1, 1400 / Math.max(width, height));
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        blob = await canvasToBlob(canvas, 'image/jpeg', quality);
        if (blob && blob.size <= 1024 * 1024) break;
        width *= 0.82;
        height *= 0.82;
        quality = Math.max(0.45, quality - 0.08);
      }
      if (!blob) return resolve({ file, warning: `${file.name} 压缩失败，使用原文件。` });
      const compressed = new File([blob], renameFile(file.name, '.jpg'), { type: 'image/jpeg' });
      resolve({ file: compressed, warning: compressed.size > 1024 * 1024 ? `${file.name} 仍超过 1MB。` : '' });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ file, warning: `${file.name} 压缩失败，使用原文件。` });
    };
    img.src = url;
  });
}

function compressVideo(file) {
  if (file.size <= 1024 * 1024) return Promise.resolve({ file, warning: '' });
  if (!window.MediaRecorder) return Promise.resolve({ file, warning: `${file.name} 当前浏览器不支持视频压缩，请选择 1MB 以内视频。` });
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    const chunks = [];
    let finished = false;
    const finish = (result) => {
      if (finished) return;
      finished = true;
      URL.revokeObjectURL(url);
      resolve(result);
    };
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const canvas = document.createElement('canvas');
      const maxSide = 360;
      const scale = Math.min(1, maxSide / Math.max(video.videoWidth || maxSide, video.videoHeight || maxSide));
      canvas.width = Math.max(1, Math.round((video.videoWidth || maxSide) * scale));
      canvas.height = Math.max(1, Math.round((video.videoHeight || maxSide) * scale));
      const ctx = canvas.getContext('2d');
      const stream = canvas.captureStream ? canvas.captureStream(12) : null;
      if (!stream) return finish({ file, warning: `${file.name} 当前浏览器不支持视频压缩，请选择 1MB 以内视频。` });
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8') ? 'video/webm;codecs=vp8' : 'video/webm';
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 180000 });
      recorder.ondataavailable = (event) => { if (event.data?.size) chunks.push(event.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        if (!blob.size) return finish({ file, warning: `${file.name} 视频压缩失败，使用原文件。` });
        const compressed = new File([blob], renameFile(file.name, '.webm'), { type: 'video/webm' });
        finish({ file: compressed, warning: compressed.size > 1024 * 1024 ? `${file.name} 已压缩但仍超过 1MB。` : '' });
      };
      const draw = () => {
        if (video.paused || video.ended) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        requestAnimationFrame(draw);
      };
      recorder.start(250);
      video.play().then(() => draw()).catch(() => finish({ file, warning: `${file.name} 视频压缩失败，使用原文件。` }));
      video.onended = () => recorder.state !== 'inactive' && recorder.stop();
      setTimeout(() => recorder.state !== 'inactive' && recorder.stop(), Math.max(3000, (video.duration || 5) * 1000 + 1000));
    };
    video.onerror = () => finish({ file, warning: `${file.name} 视频压缩失败，使用原文件。` });
    video.src = url;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

function renameFile(name, ext) {
  return `${String(name || 'media').replace(/\.[^.]+$/, '')}${ext}`;
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
  const flowSelect = Array.from(document.querySelectorAll('[data-flow-target]')).find((node) => String(node.dataset.flowTarget) === String(id));
  const selectedTakerId = Number(flowSelect?.value || state.takers[0]?.id || 0) || null;
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
