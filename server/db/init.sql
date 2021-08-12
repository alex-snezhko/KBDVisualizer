CREATE TABLE IF NOT EXISTS keyboard_kits (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR (30) UNIQUE NOT NULL,
    image           VARCHAR NOT NULL,
    link            VARCHAR NOT NULL,
    price           FLOAT NOT NULL,
    form_factor     VARCHAR (20) NOT NULL
);

CREATE TABLE IF NOT EXISTS kit_parts (
    item_id     INT NOT NULL,
    part_type   VARCHAR (20) NOT NULL CHECK (part_type = 'case' OR part_type = 'plate' OR part_type = 'pcb'),
    part_desc   VARCHAR (20) NOT NULL,
    color_arr   VARCHAR (40),
    extra_price FLOAT NOT NULL,
    FOREIGN KEY(item_id) REFERENCES keyboard_kits(id)
);

CREATE TABLE IF NOT EXISTS cases (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR (30) UNIQUE NOT NULL,
    image           VARCHAR NOT NULL,
    link            VARCHAR NOT NULL,
    price           FLOAT NOT NULL,
    form_factor     VARCHAR (20) NOT NULL,
    mount_method    VARCHAR (20) NOT NULL,
    material        VARCHAR (20) NOT NULL
);

CREATE TABLE IF NOT EXISTS case_colors (
    item_id     INT NOT NULL,
    color       VARCHAR (20) NOT NULL,
    color_arr   VARCHAR (40) NOT NULL,
    extra_price FLOAT NOT NULL,
    FOREIGN KEY(item_id) REFERENCES cases(id)
);

CREATE TABLE IF NOT EXISTS keycap_sets (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR (30) UNIQUE NOT NULL,
    image       VARCHAR NOT NULL,
    link        VARCHAR NOT NULL,
    price       FLOAT NOT NULL,
    legends     VARCHAR (20) CHECK (legends = 'Doubleshot' OR legends = 'Dye-sublimated'),
    material    VARCHAR (20) CHECK (material = 'ABS' OR material = 'PBT')
);

CREATE TABLE IF NOT EXISTS keycap_colors (
    item_id     INT NOT NULL,
    color       VARCHAR (20) NOT NULL,
    FOREIGN KEY(item_id) REFERENCES keycap_sets(id)
);

CREATE TABLE IF NOT EXISTS switches (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR (30) UNIQUE NOT NULL,
    image           VARCHAR NOT NULL,
    link            VARCHAR NOT NULL,
    price           FLOAT NOT NULL,
    tactility       VARCHAR (20) CHECK (tactility = 'Linear' OR tactility = 'Tactile' OR tactility = 'Clicky' OR tactility = 'Silent Linear' OR tactility = 'Silent Tactile'),
    spring_weight   INT NOT NULL,
    act_dist        FLOAT NOT NULL,
    bot_dist        FLOAT NOT NULL,
    color_arr       VARCHAR (40) NOT NULL
);

CREATE TABLE IF NOT EXISTS plates (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR (30) UNIQUE NOT NULL,
    image           VARCHAR NOT NULL,
    link            VARCHAR NOT NULL,
    price           FLOAT NOT NULL,
    form_factor     VARCHAR (20) NOT NULL,
    material        VARCHAR (20) NOT NULL
);

CREATE TABLE IF NOT EXISTS pcbs (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR (30) UNIQUE NOT NULL,
    image           VARCHAR NOT NULL,
    link            VARCHAR NOT NULL,
    price           FLOAT NOT NULL,
    form_factor     VARCHAR (20) NOT NULL,
    hot_swap        VARCHAR (3) NOT NULL CHECK (hot_swap = 'Yes' OR hot_swap = 'No'),
    backlight       VARCHAR (20) NOT NULL
);

CREATE TABLE IF NOT EXISTS stabilizers (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR (30) UNIQUE NOT NULL,
    image           VARCHAR NOT NULL,
    link            VARCHAR NOT NULL,
    price           FLOAT NOT NULL,
    mount_method    VARCHAR (20) NOT NULL CHECK (mount_method = 'PCB Screw-in' OR mount_method = 'PCB Clip-in' OR mount_method = 'Plate-mount'),
    color_arr       VARCHAR (40) NOT NULL
);

CREATE TABLE IF NOT EXISTS keyboard_info (
    name            VARCHAR (30) NOT NULL PRIMARY KEY,
    data            TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS keycaps_info (
    name            VARCHAR (30) NOT NULL PRIMARY KEY,
    data            TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS groupbuys (
    name        VARCHAR (30) PRIMARY KEY UNIQUE NOT NULL,
    image       VARCHAR NOT NULL,
    link        VARCHAR NOT NULL,
    part_type   VARCHAR (20) CHECK (part_type = 'keycaps' OR part_type = 'switches' OR part_type = 'keyboard'),
    start_date  DATE NOT NULL,
    end_date    DATE NOT NULL,
    price       FLOAT NOT NULL
);
