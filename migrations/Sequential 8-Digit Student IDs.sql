-- 1. Create the helper table for yearly sequence
CREATE TABLE IF NOT EXISTS student_id_year (
  year INTEGER PRIMARY KEY,
  last_value INTEGER NOT NULL
);

-- 2. Drop the trigger before altering the column
DROP TRIGGER IF EXISTS trg_set_student_id ON students;

-- 3. Make sure student_id is varchar(8)
ALTER TABLE students
  ALTER COLUMN student_id TYPE varchar(8);

-- 4. Function to set studentId as `${year}${sequence}` (8 digits)
CREATE OR REPLACE FUNCTION set_sequential_student_id()
RETURNS TRIGGER AS $$
DECLARE
  year_prefix TEXT := TO_CHAR(NOW(), 'YYYY');
  seq_num INTEGER;
BEGIN
  IF NEW.student_id IS NULL OR NEW.student_id = '' THEN
    LOOP
      UPDATE student_id_year
      SET last_value = last_value + 1
      WHERE year = year_prefix::INTEGER
      RETURNING last_value INTO seq_num;
      EXIT WHEN FOUND;
      BEGIN
        INSERT INTO student_id_year(year, last_value)
        VALUES (year_prefix::INTEGER, 1)
        RETURNING last_value INTO seq_num;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        -- If another transaction inserted, loop again
      END;
    END LOOP;
    NEW.student_id := year_prefix || LPAD(seq_num::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Recreate the trigger
CREATE TRIGGER trg_set_student_id
BEFORE INSERT ON students
FOR EACH ROW
WHEN (NEW.student_id IS NULL OR NEW.student_id = '')
EXECUTE FUNCTION set_sequential_student_id();

-- 6. For students missing student_id, assign for the current year
DO $$
DECLARE
  stu RECORD;
  year_prefix TEXT := TO_CHAR(NOW(), 'YYYY');
  seq_num INTEGER;
BEGIN
  FOR stu IN SELECT * FROM students WHERE student_id IS NULL OR student_id = '' LOOP
    LOOP
      UPDATE student_id_year
      SET last_value = last_value + 1
      WHERE year = year_prefix::INTEGER
      RETURNING last_value INTO seq_num;
      EXIT WHEN FOUND;
      BEGIN
        INSERT INTO student_id_year(year, last_value)
        VALUES (year_prefix::INTEGER, 1)
        RETURNING last_value INTO seq_num;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
      END;
    END LOOP;
    UPDATE students
    SET student_id = year_prefix || LPAD(seq_num::text, 4, '0')
    WHERE id = stu.id;
  END LOOP;
END $$;