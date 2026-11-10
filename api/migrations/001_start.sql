CREATE TABLE users (
  id            bigserial PRIMARY KEY,
  email         text NOT NULL UNIQUE,
  name          text NOT NULL,
  role          text NOT NULL CHECK (role IN ('admin', 'editor', 'author')),
  password_hash text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Im Cookie steht ein Zufallswert, in der Datenbank nur sein SHA-256.
CREATE TABLE sessions (
  token_hash text PRIMARY KEY,
  user_id    bigint NOT NULL REFERENCES users ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user ON sessions (user_id);

CREATE TABLE media (
  id            bigserial PRIMARY KEY,
  filename      text NOT NULL UNIQUE,
  original_name text NOT NULL,
  mime          text NOT NULL,
  size          integer NOT NULL,
  alt           text NOT NULL DEFAULT '',
  uploaded_by   bigint REFERENCES users ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE terms (
  id       bigserial PRIMARY KEY,
  taxonomy text NOT NULL CHECK (taxonomy IN ('category', 'tag')),
  name     text NOT NULL,
  slug     text NOT NULL,
  UNIQUE (taxonomy, slug)
);

CREATE TABLE posts (
  id                bigserial PRIMARY KEY,
  type              text NOT NULL CHECK (type IN ('post', 'page')),
  title             text NOT NULL,
  slug              text NOT NULL,
  excerpt           text NOT NULL DEFAULT '',
  content           text NOT NULL DEFAULT '',
  content_html      text NOT NULL DEFAULT '',
  status            text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  author_id         bigint REFERENCES users ON DELETE SET NULL,
  featured_media_id bigint REFERENCES media ON DELETE SET NULL,
  menu_order        integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  published_at      timestamptz,
  UNIQUE (type, slug)
);
CREATE INDEX posts_published ON posts (type, status, published_at DESC);

CREATE TABLE post_terms (
  post_id bigint NOT NULL REFERENCES posts ON DELETE CASCADE,
  term_id bigint NOT NULL REFERENCES terms ON DELETE CASCADE,
  PRIMARY KEY (post_id, term_id)
);

CREATE TABLE settings (
  key   text PRIMARY KEY,
  value text NOT NULL
);
INSERT INTO settings (key, value) VALUES ('title', 'NordPress'), ('tagline', 'Ein schlankes Headless-CMS');
