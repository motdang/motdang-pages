-- shares by day, what (market, stall:<slug>, g:<aid>, am:<site>/<id>, guide, sian) and channel
CREATE TABLE IF NOT EXISTS market_share (day TEXT NOT NULL, what TEXT NOT NULL, ch TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (day, what, ch));
