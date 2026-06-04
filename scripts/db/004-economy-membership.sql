-- 鍙欏 Narraverse 鈥?Economy + Membership v4.0

-- 鈹€鈹€ First VIP purchase tracking 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_vip_purchase_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS uid_display TEXT;

-- Generate display UIDs for existing users
UPDATE users u SET uid_display = sub.uid_display FROM (SELECT id, 'NAR_' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::TEXT, 6, '0') AS uid_display FROM users WHERE uid_display IS NULL) sub WHERE u.id = sub.id;

-- 鈹€鈹€ Membership history 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
CREATE TABLE IF NOT EXISTS user_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('monthly', 'quarterly', 'yearly')),
  price_stars INTEGER NOT NULL,
  is_first_purchase BOOLEAN NOT NULL DEFAULT false,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expire_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_memberships_user ON user_memberships(user_id);

-- 鈹€鈹€ Admin wallet operations log 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
CREATE TABLE IF NOT EXISTS admin_wallet_ops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES users(id),
  target_user_id UUID NOT NULL REFERENCES users(id),
  operation TEXT NOT NULL CHECK (operation IN ('add_stars', 'deduct_stars')),
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 鈹€鈹€ Recharge orders (manual fulfillment) 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
CREATE TABLE IF NOT EXISTS recharge_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  package_stars INTEGER NOT NULL,
  package_price REAL NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('wechat', 'alipay')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  fulfilled_at TIMESTAMPTZ
);

CREATE INDEX idx_recharge_user ON recharge_orders(user_id);
