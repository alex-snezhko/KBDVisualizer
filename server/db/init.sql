CREATE TYPE IF NOT EXISTS item_status AS ENUM ('Interest Check', 'Group Buy - Active', 'Group Buy - Closed', 'Restocking');

CREATE TABLE IF NOT EXISTS keyboard_kits (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR (30) UNIQUE NOT NULL,
    image           VARCHAR NOT NULL,
    link            VARCHAR NOT NULL,
    price           FLOAT,
    status          item_status NOT NULL,
    form_factor     VARCHAR (20) NOT NULL
);

CREATE TABLE IF NOT EXISTS kit_items (
    item_id     INT NOT NULL,
    item_type   VARCHAR (20) NOT NULL CHECK (item_type IN ('case', 'plate', 'pcb')),
    item_desc   VARCHAR (20) NOT NULL,
    color_arr   VARCHAR (40),
    extra_price FLOAT NOT NULL,
    FOREIGN KEY(item_id) REFERENCES keyboard_kits(id)
);

CREATE TABLE IF NOT EXISTS cases (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR (60) UNIQUE NOT NULL,
    image           VARCHAR NOT NULL,
    link            VARCHAR NOT NULL,
    price           FLOAT,
    status          item_status NOT NULL,
    form_factor     VARCHAR (20) NOT NULL,
    mount_method    VARCHAR (20) NOT NULL,
    material        VARCHAR (20) NOT NULL
);

CREATE TABLE IF NOT EXISTS case_colors (
    item_id     INT NOT NULL,
    color       VARCHAR (20) NOT NULL,
    color_arr   FLOAT[] NOT NULL,
    extra_price FLOAT NOT NULL,
    PRIMARY KEY(item_id, color),
    FOREIGN KEY(item_id) REFERENCES cases(id)
);

CREATE TABLE IF NOT EXISTS keycap_sets (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR (60) UNIQUE NOT NULL,
    image       VARCHAR NOT NULL,
    link        VARCHAR NOT NULL,
    price       FLOAT,
    status          item_status NOT NULL,
    legends     VARCHAR (20) CHECK (legends IN ('Doubleshot', 'Dye-sublimated')),
    material    VARCHAR (20) CHECK (material IN ('ABS', 'PBT'))
);

CREATE TABLE IF NOT EXISTS keycap_colors (
    item_id     INT NOT NULL,
    color       VARCHAR (20) NOT NULL,
    PRIMARY KEY(item_id, color),
    FOREIGN KEY(item_id) REFERENCES keycap_sets(id)
);

CREATE TABLE IF NOT EXISTS switches (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR (30) UNIQUE NOT NULL,
    image           VARCHAR NOT NULL,
    link            VARCHAR NOT NULL,
    price           FLOAT,
    status          item_status NOT NULL,
    tactility       VARCHAR (20) CHECK (tactility IN ('Linear', 'Tactile', 'Clicky', 'Silent Linear', 'Silent Tactile')),
    spring_weight   INT NOT NULL,
    act_dist        FLOAT NOT NULL,
    bot_dist        FLOAT NOT NULL,
    color_arr       FLOAT[] NOT NULL
);

CREATE TABLE IF NOT EXISTS plates (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR (30) UNIQUE NOT NULL,
    image           VARCHAR NOT NULL,
    link            VARCHAR NOT NULL,
    price           FLOAT,
    status          item_status NOT NULL,
    form_factor     VARCHAR (20) NOT NULL,
    material        VARCHAR (20) NOT NULL
);

CREATE TABLE IF NOT EXISTS pcbs (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR (30) UNIQUE NOT NULL,
    image           VARCHAR NOT NULL,
    link            VARCHAR NOT NULL,
    price           FLOAT,
    form_factor     VARCHAR (20) NOT NULL,
    hot_swap        VARCHAR (3) NOT NULL CHECK (hot_swap IN ('Yes', 'No')),
    backlight       VARCHAR (20) NOT NULL
);

CREATE TABLE IF NOT EXISTS stabilizers (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR (60) UNIQUE NOT NULL,
    image           VARCHAR NOT NULL,
    link            VARCHAR NOT NULL,
    price           FLOAT,
    mount_method    VARCHAR (20) NOT NULL CHECK (mount_method IN ('PCB Screw-in', 'PCB Clip-in', 'Plate-mount')),
    color_arr       FLOAT[] NOT NULL
);

CREATE TABLE IF NOT EXISTS keyboard_info (
    name            VARCHAR (60) NOT NULL PRIMARY KEY,
    data            TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS keycaps_info (
    name            VARCHAR (60) NOT NULL PRIMARY KEY,
    data            TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS groupbuys (
    name        VARCHAR (60) PRIMARY KEY UNIQUE NOT NULL,
    image       VARCHAR NOT NULL,
    link        VARCHAR NOT NULL,
    item_type   VARCHAR (20) CHECK (item_type IN ('Keycaps', 'Switches', 'Keyboard')),
    start_date  DATE NOT NULL,
    end_date    DATE NOT NULL,
    price       FLOAT
);

CREATE TABLE IF NOT EXISTS interest_checks (
    name        VARCHAR (60) PRIMARY KEY UNIQUE NOT NULL,
    image       VARCHAR NOT NULL,
    link        VARCHAR NOT NULL,
    item_type   VARCHAR (20) CHECK (item_type IN ('Keycaps', 'Switches', 'Keyboard'))
);
