-- P2 approved local LiveKit calling. No recordings, media tokens or room secrets are stored.
CREATE TABLE calls (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), job_id uuid NOT NULL REFERENCES jobs(id),
 conversation_id uuid NOT NULL REFERENCES conversations(id),
 caller_id uuid NOT NULL REFERENCES users(id), recipient_id uuid NOT NULL REFERENCES users(id),
 caller_family uuid NOT NULL, recipient_family uuid,
 state text NOT NULL DEFAULT 'ringing' CHECK(state IN ('ringing','accepted','declined','ended','busy','no_answer','failed','revoked')),
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(), answered_at timestamptz, ended_at timestamptz,
 ring_until timestamptz NOT NULL DEFAULT clock_timestamp()+interval '45 seconds',
 caller_heartbeat timestamptz NOT NULL DEFAULT clock_timestamp(), recipient_heartbeat timestamptz,
 media_issued_until timestamptz, cleanup_pending boolean NOT NULL DEFAULT false,
 CHECK(caller_id<>recipient_id), CHECK((state IN ('ringing','accepted'))=(ended_at IS NULL))
);
CREATE INDEX calls_participants ON calls(caller_id,recipient_id,created_at DESC);
CREATE INDEX calls_conversation ON calls(conversation_id,created_at DESC,id DESC);
CREATE INDEX calls_pending ON calls(state) WHERE state IN ('ringing','accepted') OR cleanup_pending;
-- The primary key enforces exclusivity across BOTH caller and recipient roles.
CREATE TABLE active_call_users (
 user_id uuid PRIMARY KEY REFERENCES users(id), call_id uuid NOT NULL REFERENCES calls(id)
);
CREATE INDEX active_call_users_call ON active_call_users(call_id);
