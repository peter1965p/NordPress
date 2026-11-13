-- SEO je Seite und Beitrag. Leer: Titel und Auszug (oder Textanfang) werden genommen.
ALTER TABLE posts ADD COLUMN seo_titel        text    NOT NULL DEFAULT '';
ALTER TABLE posts ADD COLUMN seo_beschreibung text    NOT NULL DEFAULT '';
ALTER TABLE posts ADD COLUMN noindex          boolean NOT NULL DEFAULT false;
