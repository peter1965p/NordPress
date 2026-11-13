-- Empfänger der Benachrichtigung je Formular, mehrere durch Komma getrennt. Leer: keine Mail.
ALTER TABLE forms ADD COLUMN benachrichtigung text NOT NULL DEFAULT '';
