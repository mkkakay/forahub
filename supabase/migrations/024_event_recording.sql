-- Optional recording / livestream info for events.

ALTER TABLE events ADD COLUMN IF NOT EXISTS will_be_recorded boolean DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS recording_url text;

COMMENT ON COLUMN events.will_be_recorded IS 'Submitter indicates a recording will be available after the event.';
COMMENT ON COLUMN events.recording_url IS 'Where the recording will be posted (often added post-event).';
