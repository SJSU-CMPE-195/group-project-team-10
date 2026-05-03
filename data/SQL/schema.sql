CREATE TABLE IF NOT EXISTS majors (
    major_id     INT          NOT NULL AUTO_INCREMENT,
    major_name   VARCHAR(100) NOT NULL,
    department   VARCHAR(100) NOT NULL,
    total_units  INT          NOT NULL,
    PRIMARY KEY (major_id)
);

CREATE TABLE IF NOT EXISTS students (
    student_id    INT          NOT NULL AUTO_INCREMENT,
    sjsu_id       VARCHAR(9)   NOT NULL,
    first_name    VARCHAR(50)  NULL,
    last_name     VARCHAR(50)  NULL,
    email         VARCHAR(100) NULL,
    major_id      INT          NULL,
    start_term    VARCHAR(20)  NULL,
    expected_grad VARCHAR(20)  NULL,
    created_at    TIMESTAMP    NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (student_id),
    UNIQUE KEY uq_students_sjsu_id (sjsu_id),
    UNIQUE KEY uq_students_email (email),
    CONSTRAINT fk_students_major
        FOREIGN KEY (major_id) REFERENCES majors (major_id)
);

CREATE TABLE IF NOT EXISTS degree_requirements (
    requirement_id INT          NOT NULL AUTO_INCREMENT,
    major_id       INT          NOT NULL,
    category_name  VARCHAR(100) NOT NULL,
    required_units INT          NOT NULL,
    PRIMARY KEY (requirement_id),
    CONSTRAINT fk_degree_requirements_major
        FOREIGN KEY (major_id) REFERENCES majors (major_id)
);

CREATE TABLE IF NOT EXISTS courses (
    course_id        INT          NOT NULL AUTO_INCREMENT,
    course_code      VARCHAR(20)  NOT NULL,
    course_title     VARCHAR(200) NOT NULL,
    description      TEXT         NULL,
    units            INT          NOT NULL,
    department       VARCHAR(50)  NOT NULL,
    difficulty_score DOUBLE       NULL,
    avg_workload     DOUBLE       NULL,
    syllabus_url     TEXT         NULL,
    PRIMARY KEY (course_id),
    UNIQUE KEY uq_courses_course_code (course_code)
);

CREATE TABLE IF NOT EXISTS instructors (
    instructor_id     INT          NOT NULL AUTO_INCREMENT,
    name              VARCHAR(100) NOT NULL,
    department        VARCHAR(100) NULL,
    rate_my_prof_url  TEXT         NULL,
    rating            DOUBLE       NULL,
    PRIMARY KEY (instructor_id)
);

CREATE TABLE IF NOT EXISTS course_offerings (
    offering_id      INT         NOT NULL AUTO_INCREMENT,
    course_id        INT         NOT NULL,
    term             VARCHAR(20) NOT NULL,
    section_number   VARCHAR(10) NOT NULL,
    instructor_id    INT         NULL,
    mode             VARCHAR(20) NULL,
    seats_available  INT         NOT NULL DEFAULT 0,
    schedule_info    TEXT        NULL,
    PRIMARY KEY (offering_id),
    CONSTRAINT fk_course_offerings_course
        FOREIGN KEY (course_id) REFERENCES courses (course_id),
    CONSTRAINT fk_course_offerings_instructor
        FOREIGN KEY (instructor_id) REFERENCES instructors (instructor_id)
);

CREATE TABLE IF NOT EXISTS prerequisites (
    course_id        INT         NOT NULL,
    prereq_course_id INT         NOT NULL,
    prereq_type      VARCHAR(20) NOT NULL,
    PRIMARY KEY (course_id, prereq_course_id),
    CONSTRAINT fk_prerequisites_course
        FOREIGN KEY (course_id) REFERENCES courses (course_id),
    CONSTRAINT fk_prerequisites_prereq_course
        FOREIGN KEY (prereq_course_id) REFERENCES courses (course_id)
);

CREATE TABLE IF NOT EXISTS requirement_courses (
    requirement_id INT NOT NULL,
    course_id      INT NOT NULL,
    PRIMARY KEY (requirement_id, course_id),
    CONSTRAINT fk_requirement_courses_requirement
        FOREIGN KEY (requirement_id) REFERENCES degree_requirements (requirement_id),
    CONSTRAINT fk_requirement_courses_course
        FOREIGN KEY (course_id) REFERENCES courses (course_id)
);

CREATE TABLE IF NOT EXISTS student_history (
    history_id  INT         NOT NULL AUTO_INCREMENT,
    student_id  INT         NOT NULL,
    course_id   INT         NOT NULL,
    term_taken  VARCHAR(20) NULL,
    grade       VARCHAR(2)  NULL,
    status      VARCHAR(20) NULL,
    PRIMARY KEY (history_id),
    CONSTRAINT fk_student_history_student
        FOREIGN KEY (student_id) REFERENCES students (student_id),
    CONSTRAINT fk_student_history_course
        FOREIGN KEY (course_id) REFERENCES courses (course_id)
);

CREATE TABLE IF NOT EXISTS student_roadmaps (
    roadmap_id    INT         NOT NULL AUTO_INCREMENT,
    student_id    INT         NOT NULL,
    course_id     INT         NOT NULL,
    planned_term  VARCHAR(20) NULL,
    status        VARCHAR(20) NULL,
    PRIMARY KEY (roadmap_id),
    CONSTRAINT fk_student_roadmaps_student
        FOREIGN KEY (student_id) REFERENCES students (student_id),
    CONSTRAINT fk_student_roadmaps_course
        FOREIGN KEY (course_id) REFERENCES courses (course_id)
);

CREATE TABLE IF NOT EXISTS semesters (
    semester_id  INT         NOT NULL AUTO_INCREMENT,
    student_id   INT         NOT NULL,
    term         VARCHAR(20) NOT NULL,
    total_units  INT         NOT NULL DEFAULT 0,
    status       VARCHAR(20) NULL,
    PRIMARY KEY (semester_id),
    CONSTRAINT fk_semesters_student
        FOREIGN KEY (student_id) REFERENCES students (student_id)
);

CREATE TABLE IF NOT EXISTS semester_courses (
    semester_id INT NOT NULL,
    course_id   INT NOT NULL,
    PRIMARY KEY (semester_id, course_id),
    CONSTRAINT fk_semester_courses_semester
        FOREIGN KEY (semester_id) REFERENCES semesters (semester_id),
    CONSTRAINT fk_semester_courses_course
        FOREIGN KEY (course_id) REFERENCES courses (course_id)
);

CREATE TABLE IF NOT EXISTS sections (
    id                  BIGINT       NOT NULL AUTO_INCREMENT,
    term                VARCHAR(255) NOT NULL,
    course_code         VARCHAR(255) NOT NULL,
    section_code        VARCHAR(255) NOT NULL,
    class_number        VARCHAR(255) NOT NULL,
    mode_of_instruction VARCHAR(255) NOT NULL,
    title               VARCHAR(500) NOT NULL,
    satisfies           VARCHAR(255) NULL,
    units               DOUBLE       NOT NULL,
    `TYPE`              VARCHAR(255) NOT NULL,
    days                VARCHAR(255) NOT NULL,
    times               VARCHAR(255) NOT NULL,
    instructor          VARCHAR(255) NOT NULL,
    location            VARCHAR(255) NOT NULL,
    dates               VARCHAR(255) NOT NULL,
    open_seats          INT          NOT NULL,
    notes               TEXT         NULL,
    PRIMARY KEY (id)
);
