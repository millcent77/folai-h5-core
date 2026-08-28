-- 佛来运转 H5 核心闭环 D1 schema
-- Apply with: npx wrangler d1 migrations apply <database_name> --remote

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','taker','admin')),
  phone TEXT,
  password_hash TEXT,
  nickname TEXT,
  real_name TEXT,
  avatar_url TEXT,
  taker_code TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','DISABLED')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rituals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  cover_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS blessings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL UNIQUE,
  access_code TEXT NOT NULL,
  customer_user_id INTEGER,
  current_taker_id INTEGER,
  channel_code TEXT,
  real_name TEXT NOT NULL,
  mobile TEXT,
  birthday TEXT NOT NULL,
  age INTEGER,
  zodiac TEXT,
  sex TEXT,
  remark_text TEXT,
  remark_images TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACCEPTED','COMPLETED','CANCELLED','RETURNED')),
  payment_status TEXT NOT NULL DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID','PAID','CONFIRMED','REFUNDED')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  accepted_at TEXT,
  completed_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (customer_user_id) REFERENCES users(id),
  FOREIGN KEY (current_taker_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS blessing_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  blessing_id INTEGER NOT NULL,
  ritual_id INTEGER NOT NULL,
  ritual_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  images TEXT,
  videos TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (blessing_id) REFERENCES blessings(id) ON DELETE CASCADE,
  FOREIGN KEY (ritual_id) REFERENCES rituals(id)
);

CREATE TABLE IF NOT EXISTS blessing_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  blessing_id INTEGER NOT NULL,
  actor_user_id INTEGER,
  action TEXT NOT NULL,
  note TEXT,
  from_taker_id INTEGER,
  to_taker_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (blessing_id) REFERENCES blessings(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS scenarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  blessing_id INTEGER NOT NULL,
  uploader_user_id INTEGER,
  images TEXT,
  videos TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (blessing_id) REFERENCES blessings(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS media_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_type TEXT NOT NULL,
  owner_id INTEGER,
  r2_key TEXT NOT NULL,
  url TEXT,
  filename TEXT,
  content_type TEXT,
  size INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_blessings_task_id ON blessings(task_id);
CREATE INDEX IF NOT EXISTS idx_blessings_access ON blessings(task_id, access_code);
CREATE INDEX IF NOT EXISTS idx_blessings_query ON blessings(real_name, birthday);
CREATE INDEX IF NOT EXISTS idx_blessings_channel ON blessings(channel_code, status);
CREATE INDEX IF NOT EXISTS idx_blessings_status ON blessings(status);
CREATE INDEX IF NOT EXISTS idx_blessings_taker ON blessings(current_taker_id, status);
CREATE INDEX IF NOT EXISTS idx_records_blessing ON blessing_records(blessing_id, created_at);
CREATE INDEX IF NOT EXISTS idx_scenarios_blessing ON scenarios(blessing_id, created_at);

INSERT INTO rituals (name, description, price_cents, sort_order, status)
SELECT '补财库', '补财库祈福项目，可用于第一版演示和后台编辑。', 0, 10, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM rituals);
INSERT INTO rituals (name, description, price_cents, sort_order, status)
SELECT '祈福消灾', '祈福消灾项目，可替换为正式法事介绍。', 0, 20, 'ACTIVE'
WHERE (SELECT COUNT(*) FROM rituals) < 2;
INSERT INTO rituals (name, description, price_cents, sort_order, status)
SELECT '超度法事', '超度类项目，可替换为正式说明。', 0, 30, 'ACTIVE'
WHERE (SELECT COUNT(*) FROM rituals) < 3;

INSERT INTO users (role, phone, nickname, real_name, taker_code)
SELECT 'taker', '18800000001', '示例接单员', '示例接单员', 'T001'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE taker_code = 'T001');

PRAGMA optimize;
