import mysql from "mysql2";
import dotenv from "dotenv";

dotenv.config();

export const pool = mysql
  .createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: process.env.MYSQL_PORT,
    ssl: { rejectUnauthorized: false }
  })
  .promise();

export async function getAllCourses() {
  const [rows] = await pool.query(
    `SELECT * FROM courses;`
  );
  return rows;
}

export async function getCourseById(id) {
  const [rows] = await pool.query(
    `SELECT * FROM courses WHERE courseid = ?;`,
    [id]
  );
  return rows[0];
}

export async function addNewCourse(name, subjects) {
  const [result] = await pool.query(
    `INSERT INTO courses (coursename, coursesubjects) VALUES (?, ?);`,
    [name, subjects]
  );
  return getCourseById(result.insertId);
}

export async function updateCourse(id, name, subjects) {
  await pool.query(
    `UPDATE courses SET coursename = ?, coursesubjects = ? WHERE courseid = ?;`,
    [name, subjects, id]
  );
  return getCourseById(id);
}

export async function deleteCourse(id) {
  const [result] = await pool.query(
    `DELETE FROM courses WHERE courseid = ?;`,
    [id]
  );
  return result;
}

export async function getRecommendedBooksForCourse(courseId) {
  // 1. Mathematically extract the course precisely from the SQL record natively
  const course = await getCourseById(courseId);
  if (!course || !course.coursesubjects) {
    return []; // Gracefully fail if there are structurally no subjects tied to the course yet
  }

  // 2. Safely parse the messy comma-separated text into a strict sanitized Array! 
  // e.g. "Biology , Genetics, " -> ["Biology", "Genetics"]
  const subjectsArray = course.coursesubjects.split(",")
    .map(s => s.trim())
    .filter(s => s.length > 0);

  if (subjectsArray.length === 0) return [];

  // 3. Dynamically assemble the complex parameterized SQL String natively inside logic
  // We strictly append "OR catalogueinfo.ItemSubjects LIKE ?" for every single subject precisely mapped
  const whereClauses = subjectsArray.map(() => "catalogueinfo.ItemSubjects LIKE ?");
  const sqlQuery = `
    SELECT books.*, catalogueinfo.ItemSubjects, catalogueinfo.ItemDescription, catalogueinfo.ItemPublisher
    FROM books
    INNER JOIN catalogueinfo ON books.CatalogueInfoID = catalogueinfo.CatalogueInfoID
    WHERE ${whereClauses.join(" OR ")}
    LIMIT 100;
  `;

  // 4. Safely inject our dynamically created %param% wildcard wrappers for the parameters array
  const queryParams = subjectsArray.map(subject => `%${subject}%`);

  // Execute natively
  const [rows] = await pool.query(sqlQuery, queryParams);
  return rows;
}
