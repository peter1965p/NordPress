-- Formulare: im Admin frei zusammengestellt, per Block „Formular“ in Seiten eingebunden.
--   felder : [{ id, typ, label, pflicht, platzhalter, optionen, breite }], geprüft in api/src/lib/formulare.js
CREATE TABLE forms (
  id            bigserial PRIMARY KEY,
  name          text NOT NULL,
  felder        jsonb NOT NULL DEFAULT '[]',
  absenden_text text NOT NULL DEFAULT 'Absenden',
  erfolg_text   text NOT NULL DEFAULT 'Danke! Wir melden uns so schnell wie möglich.',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Einsendungen speichern Beschriftung und Wert je Feld. Spätere Änderungen am Formular verfälschen alte Einsendungen so nicht.
CREATE TABLE form_submissions (
  id         bigserial PRIMARY KEY,
  form_id    bigint NOT NULL REFERENCES forms ON DELETE CASCADE,
  daten      jsonb NOT NULL,
  gelesen    boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX form_submissions_form ON form_submissions (form_id, created_at DESC);
