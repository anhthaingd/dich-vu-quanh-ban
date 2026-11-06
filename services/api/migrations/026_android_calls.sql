-- Old app installations retain ordinary notifications until a capable build registers.
ALTER TABLE push_devices ADD COLUMN android_calls boolean NOT NULL DEFAULT false;
