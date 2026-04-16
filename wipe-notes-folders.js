import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: process.env.MYSQL_PORT,
    ssl: { rejectUnauthorized: false }
});

async function clearNotesAndFolders() {
    try {
        console.log("Temporarily disabling foreign key checks...");
        await pool.query("SET FOREIGN_KEY_CHECKS = 0;");

        console.log("Deleting all records from notes table...");
        const [noteResult] = await pool.query("DELETE FROM notes;");
        console.log(`Deleted ${noteResult.affectedRows} notes.`);

        console.log("Deleting all records from folders table...");
        const [folderResult] = await pool.query("DELETE FROM folders;");
        console.log(`Deleted ${folderResult.affectedRows} folders.`);

        console.log("Re-enabling foreign key checks...");
        await pool.query("SET FOREIGN_KEY_CHECKS = 1;");
        
        console.log("Data wipe completed successfully.");
    } catch (error) {
        console.error("An error occurred during deletion:", error);
    } finally {
        // Ensure the connection pool closes so the script exits automatically
        pool.end();
    }
}

clearNotesAndFolders();
