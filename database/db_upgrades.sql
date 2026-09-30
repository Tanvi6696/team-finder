-- ============================================================
-- DB UPGRADES
-- Put all NEW schema / data changes here.
-- Do NOT edit database.sql or queries.sql.
-- Safe to re-run: DROP IF EXISTS / CREATE OR REPLACE / IF NOT EXISTS
-- ============================================================

USE college_team_finder;


-- ============================================================
-- 1. UNIQUE(project_id, sender_student_id) on join_requests
-- ============================================================

-- Re-runnable UNIQUE: drop existing index via prepared statement (MySQL has no DROP INDEX IF EXISTS)
SET @idx_exists := (
    SELECT COUNT(1)
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'join_requests'
      AND index_name = 'uq_join_requests_project_sender'
);

SET @drop_sql := IF(
    @idx_exists > 0,
    'ALTER TABLE join_requests DROP INDEX uq_join_requests_project_sender',
    'DO 0'
);

PREPARE stmt_drop_uq FROM @drop_sql;
EXECUTE stmt_drop_uq;
DEALLOCATE PREPARE stmt_drop_uq;

ALTER TABLE join_requests
    ADD CONSTRAINT uq_join_requests_project_sender
    UNIQUE (project_id, sender_student_id);


-- ============================================================
-- 2. join_request_log + AFTER UPDATE trigger (status changes only)
-- ============================================================

CREATE TABLE IF NOT EXISTS join_request_log (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL,
    old_status ENUM(
        'PENDING',
        'ACCEPTED',
        'REJECTED',
        'CANCELLED'
    ) NOT NULL,
    new_status ENUM(
        'PENDING',
        'ACCEPTED',
        'REJECTED',
        'CANCELLED'
    ) NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (request_id)
        REFERENCES join_requests(request_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

DROP TRIGGER IF EXISTS trg_join_request_status_log;

DELIMITER //

CREATE TRIGGER trg_join_request_status_log
AFTER UPDATE ON join_requests
FOR EACH ROW
BEGIN
    -- Log only when the status value actually changed
    IF OLD.request_status <> NEW.request_status THEN
        INSERT INTO join_request_log (
            request_id,
            old_status,
            new_status,
            changed_at
        )
        VALUES (
            NEW.request_id,
            OLD.request_status,
            NEW.request_status,
            NOW()
        );
    END IF;
END //

DELIMITER ;


-- ============================================================
-- 3. AFTER INSERT on team_members: bump project size / mark FULL
-- ============================================================

DROP TRIGGER IF EXISTS trg_team_member_after_insert;

DELIMITER //

CREATE TRIGGER trg_team_member_after_insert
AFTER INSERT ON team_members
FOR EACH ROW
BEGIN
    DECLARE v_project_id INT;
    DECLARE v_current_size INT;
    DECLARE v_max_size INT;

    -- Find the project this team belongs to
    SELECT project_id
    INTO v_project_id
    FROM teams
    WHERE team_id = NEW.team_id;

    -- Increment current team size on the project
    UPDATE projects
    SET current_team_size = current_team_size + 1
    WHERE project_id = v_project_id;

    -- Read updated size vs max
    SELECT current_team_size, max_team_size
    INTO v_current_size, v_max_size
    FROM projects
    WHERE project_id = v_project_id;

    -- Mark project FULL when capacity is reached
    IF v_current_size >= v_max_size THEN
        UPDATE projects
        SET project_status = 'FULL'
        WHERE project_id = v_project_id;
    END IF;
END //

DELIMITER ;


-- ============================================================
-- 4. Procedure: accept_join_request
-- ============================================================

DROP PROCEDURE IF EXISTS accept_join_request;

DELIMITER //

CREATE PROCEDURE accept_join_request(IN p_request_id INT)
BEGIN
    DECLARE v_project_id INT;
    DECLARE v_sender_id INT;
    DECLARE v_request_status VARCHAR(20);
    DECLARE v_project_status VARCHAR(20);
    DECLARE v_team_id INT;
    DECLARE v_already_member INT DEFAULT 0;
    DECLARE v_found INT DEFAULT 1;

    -- On any SQL error: undo and re-raise the original error
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    -- SELECT INTO with 0 rows sets v_found = 0 (does not abort)
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_found = 0;

    START TRANSACTION;

    -- Lock the join request row
    SET v_found = 1;
    SELECT
        project_id,
        sender_student_id,
        request_status
    INTO
        v_project_id,
        v_sender_id,
        v_request_status
    FROM join_requests
    WHERE request_id = p_request_id
    FOR UPDATE;

    IF v_found = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Join request not found';
    END IF;

    IF v_request_status <> 'PENDING' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Only PENDING join requests can be accepted';
    END IF;

    -- Lock the project row (prevents race conditions on capacity)
    SET v_found = 1;
    SELECT project_status
    INTO v_project_status
    FROM projects
    WHERE project_id = v_project_id
    FOR UPDATE;

    IF v_found = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Project not found for this join request';
    END IF;

    IF v_project_status = 'FULL' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Cannot accept: project team is already FULL';
    END IF;

    -- Sender must not already be on this project's team
    SELECT COUNT(*)
    INTO v_already_member
    FROM team_members tm
    JOIN teams t ON tm.team_id = t.team_id
    WHERE t.project_id = v_project_id
      AND tm.student_id = v_sender_id
      AND tm.member_status = 'ACTIVE';

    IF v_already_member > 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Sender is already a member of this project team';
    END IF;

    -- Find the team for this project
    SET v_found = 1;
    SELECT team_id
    INTO v_team_id
    FROM teams
    WHERE project_id = v_project_id
    LIMIT 1;

    IF v_found = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'No team found for this project';
    END IF;

    -- Insert member (trigger increments current_team_size / may set FULL)
    INSERT INTO team_members (
        team_id,
        student_id,
        member_role,
        member_status
    )
    VALUES (
        v_team_id,
        v_sender_id,
        'OTHER',
        'ACTIVE'
    );

    -- Mark request accepted
    UPDATE join_requests
    SET
        request_status = 'ACCEPTED',
        responded_at = NOW()
    WHERE request_id = p_request_id;

    COMMIT;
END //

DELIMITER ;


-- ============================================================
-- 5. Procedure: reject_join_request
-- ============================================================

DROP PROCEDURE IF EXISTS reject_join_request;

DELIMITER //

CREATE PROCEDURE reject_join_request(IN p_request_id INT)
BEGIN
    DECLARE v_request_status VARCHAR(20);
    DECLARE v_request_id INT;
    DECLARE v_found INT DEFAULT 1;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_found = 0;

    START TRANSACTION;

    SET v_found = 1;
    SELECT request_id, request_status
    INTO v_request_id, v_request_status
    FROM join_requests
    WHERE request_id = p_request_id
    FOR UPDATE;

    IF v_found = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Join request not found';
    END IF;

    IF v_request_status <> 'PENDING' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Only PENDING join requests can be rejected';
    END IF;

    UPDATE join_requests
    SET
        request_status = 'REJECTED',
        responded_at = NOW()
    WHERE request_id = p_request_id;

    COMMIT;
END //

DELIMITER ;


-- ============================================================
-- 6. Views from Query 27 and Query 28
-- ============================================================

CREATE OR REPLACE VIEW student_skill_view AS
SELECT
    s.student_id,
    CONCAT(s.first_name,' ',s.last_name)
    AS student_name,
    sk.skill_name,
    ss.proficiency_level,
    ss.years_of_experience
FROM students s
JOIN student_skills ss
ON s.student_id = ss.student_id
JOIN skills sk
ON ss.skill_id = sk.skill_id;

CREATE OR REPLACE VIEW project_details_view AS
SELECT
    p.project_id,
    p.project_title,
    p.domain,
    p.difficulty_level,
    p.deadline,
    p.project_status,
    CONCAT(s.first_name,' ',s.last_name)
    AS project_creator
FROM projects p
JOIN students s
ON p.created_by = s.student_id;


-- ============================================================
-- 7. project_match_view (every student x project)
-- ============================================================

CREATE OR REPLACE VIEW project_match_view AS
SELECT
    s.student_id,
    p.project_id,
    ROUND(
        COALESCE(
            SUM(
                CASE
                    WHEN ss.skill_id IS NOT NULL
                     AND (ss.proficiency_level + 0 >= prs.minimum_proficiency + 0)
                    THEN prs.importance_weight
                    ELSE 0
                END
            )
            / NULLIF(SUM(prs.importance_weight), 0)
            * 100,
            0
        ),
        1
    ) AS match_percentage
FROM students s
CROSS JOIN projects p
LEFT JOIN project_required_skills prs
    ON prs.project_id = p.project_id
LEFT JOIN student_skills ss
    ON ss.student_id = s.student_id
   AND ss.skill_id = prs.skill_id
GROUP BY s.student_id, p.project_id;


-- ============================================================
-- 8. Read-only MySQL user for SQL Explorer
-- ============================================================

CREATE USER IF NOT EXISTS 'explorer_ro'@'localhost'
    IDENTIFIED BY 'explorer_pass';

GRANT SELECT ON college_team_finder.* TO 'explorer_ro'@'localhost';

FLUSH PRIVILEGES;
