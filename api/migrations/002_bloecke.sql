-- Seiten und Beiträge bestehen aus Blöcken.
--   blocks        : was der Editor speichert (Quelle)
--   blocks_render : öffentliche Form, beim Speichern erzeugt (HTML bereits bereinigt, Bilder nur als ID)
--   such_text     : aller Text der Blöcke, für die Suche
-- content und content_html bleiben vorerst für die bisherige Oberfläche und einfache Abnehmer.
ALTER TABLE posts ADD COLUMN blocks        jsonb NOT NULL DEFAULT '[]';
ALTER TABLE posts ADD COLUMN blocks_render jsonb NOT NULL DEFAULT '[]';
ALTER TABLE posts ADD COLUMN such_text     text  NOT NULL DEFAULT '';

-- Vorhandenes Markdown wird zu einem Markdown-Block. Das HTML ist schon bereinigt und wird übernommen.
UPDATE posts SET
  blocks        = jsonb_build_array(jsonb_build_object('id', 'b1', 'typ', 'markdown', 'quelle', content)),
  blocks_render = jsonb_build_array(jsonb_build_object('id', 'b1', 'typ', 'markdown', 'html', content_html)),
  such_text     = content
WHERE content <> '';
