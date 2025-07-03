-- Create a sequence starting at 10000000
CREATE SEQUENCE IF NOT EXISTS student_id_seq START 10000000;

-- Function to set studentId using the sequence
CREATE OR REPLACE FUNCTION set_sequential_student_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.student_id IS NULL OR NEW.student_id = '' THEN
    NEW.student_id := LPAD(nextval('student_id_seq')::text, 8, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_set_student_id ON students;
CREATE TRIGGER trg_set_student_id
BEFORE INSERT ON students
FOR EACH ROW
WHEN (NEW.student_id IS NULL OR NEW.student_id = '')
EXECUTE FUNCTION set_sequential_student_id();