import mysql from "mysql2";
import dotenv from "dotenv";
import path from "path";
dotenv.config();export const pool = mysql
  .createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: process.env.MYSQL_PORT,
    ssl: { rejectUnauthorized: false }
  })
  .promise();

export async function newgetBook(id) {
  const [rows] = await pool.query(
    `
    SELECT * 
    FROM books
    WHERE BookID = ?;
    `,
    [id],
  );
  return rows[0];
}

export async function getBooksByTitle(title) {
  const [rows] = await pool.query(
    `
    SELECT * 
    FROM books
    WHERE BookTitle = ?;
    `,
    [title],
  );
  return rows;
}

export async function getfullBookInfo(id) {
  const [rows] = await pool.query(
    `
    SELECT books.* , catalogueinfo.ItemSubjects, catalogueinfo.ItemDescription,catalogueinfo.ItemPublisher 
    FROM books 
    INNER JOIN catalogueinfo
    ON books.CatalogueInfoID = catalogueinfo.CatalogueInfoID AND books.BookID= ?
    `,
    [id],
  );

  console.log(rows[0]);
  return rows[0];
}

export async function getCatalogueInfo(id) {
  const [rows] = await pool.query(
    `
    SELECT * 
    FROM catalogueinfo
    WHERE CatalogueInfoID = ?;
    `,
    [id],
  );
  return rows[0];
}

export async function addNewBook(values) {
  console.log(values);
  const [result] = await pool.query(
    `
      INSERT INTO books (BookTitle,BookIdentifier,BookEdition,BookDate,BookContributors,BookAuthor,BookFileName)
      Values(?,?,?,?,?,?,?)
    `,
    [
      values.bookTitle,
      values.bookIdentifier,
      values.bookEdition,
      values.bookReleaseDate,
      values.bookContributors,
      values.bookAuthor,
      values.bookFileName,
    ],
  );

  const id = [result.insertId];

  return newgetBook(id);
}

export async function addBookID(id) {
  //console.log("id is " + id);
  const [result] = await pool.query(
    `
      UPDATE books
      SET catalogueInfoID = ?
      WHERE BookID = ?;`,
    [id, id],
  );
  return result;
}

//We call this and then alter the table to include the insertid of this record, whatever it is
export async function addNewCatalogueInfo(values) {
  console.log("Melty");
  console.log(values);
  const [result] = await pool.query(
    `
      INSERT INTO catalogueinfo (ItemSubjects,ItemPublisher,ItemDescription)
      Values(?,?,?)
    `,
    [values.itemSubjects, values.itemPublisher, values.itemDescription],
  );
  const id = [result.insertId];
  console.log("result.insert id in the function is " + id);
  return id;
}

export async function addBookWithCatalogueTransaction(bookValues, catalogueValues) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Insert CatalogueInfo
    const [catalogueResult] = await connection.query(
      `
        INSERT INTO catalogueinfo (ItemSubjects,ItemPublisher,ItemDescription)
        Values(?,?,?)
      `,
      [catalogueValues.itemSubjects, catalogueValues.itemPublisher, catalogueValues.itemDescription]
    );
    const catalogueId = catalogueResult.insertId;

    // Use manually provided URL if it exists, otherwise rigorously calculate it
    let thumbnailUrl = bookValues.bookThumbnailURL || null;
    if (!thumbnailUrl && bookValues.bookFileName) {
      const originalName = path.parse(bookValues.bookFileName).name;
      const bookThumbnailName = "thumb+" + originalName;
      thumbnailUrl = `https://fyp-assets.lon1.cdn.digitaloceanspaces.com/thumbnails/${bookThumbnailName}.jpg`;
    }

    // 2. Insert Book linking the newly created CatalogueInfoID
    const [bookResult] = await connection.query(
      `
        INSERT INTO books (BookTitle, BookIdentifier, BookEdition, BookDate, BookContributors, BookAuthor, BookFileName, catalogueInfoID, BookThumbnailURL)
        Values(?,?,?,?,?,?,?,?,?)
      `,
      [
        bookValues.bookTitle || null,
        bookValues.bookIdentifier || null,
        bookValues.bookEdition || null,
        bookValues.bookReleaseDate === '' ? null : bookValues.bookReleaseDate,
        bookValues.bookContributors || null,
        bookValues.bookAuthor || null,
        bookValues.bookFileName || null,
        catalogueId,
        thumbnailUrl
      ]
    );
    const bookId = bookResult.insertId;

    await connection.commit();
    return bookId;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export async function deleteBookAndCatalogue(bookId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Get catalogue ID (using AS to avoid case-sensitivity issues)
    const [book] = await connection.query(`SELECT catalogueInfoID AS catId FROM books WHERE BookID = ?`, [bookId]);
    if (book.length > 0) {
      const catalogueId = book[0].catId;
      // 2. Delete Book
      await connection.query(`DELETE FROM books WHERE BookID = ?`, [bookId]);
      // 3. Delete CatalogueInfo
      if (catalogueId) {
        await connection.query(`DELETE FROM catalogueinfo WHERE CatalogueInfoID = ?`, [catalogueId]);
      }
    }

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export async function updateBookAndCatalogueTransaction(bookId, bookValues, catalogueValues) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [book] = await connection.query(`SELECT catalogueInfoID AS catId FROM books WHERE BookID = ?`, [bookId]);
    if (book.length === 0) {
      throw new Error("Book not found");
    }
    const catalogueId = book[0].catId;

    let updateQuery = `
      UPDATE books 
      SET BookTitle = ?, BookIdentifier = ?, BookEdition = ?, BookDate = ?, BookContributors = ?, BookAuthor = ?
    `;
    const queryParams = [
      bookValues.bookTitle || null,
      bookValues.bookIdentifier || null,
      bookValues.bookEdition || null,
      bookValues.bookReleaseDate === '' ? null : bookValues.bookReleaseDate,
      bookValues.bookContributors || null,
      bookValues.bookAuthor || null
    ];

    if (bookValues.bookThumbnailURL) {
      // 1. Manually provided thumbnail takes precedence
      updateQuery += `, BookThumbnailURL = ?`;
      queryParams.push(bookValues.bookThumbnailURL);
    } else if (bookValues.bookFileName) {
      // 2. Only compute the CDN thumbnail mathematically if the PDF was uploaded and no manual URL was set
      updateQuery += `, BookThumbnailURL = ?`;
      const originalName = path.parse(bookValues.bookFileName).name;
      const bookThumbnailName = "thumb+" + originalName;
      const thumbnailUrl = `https://fyp-assets.lon1.cdn.digitaloceanspaces.com/thumbnails/${bookThumbnailName}.jpg`;
      queryParams.push(thumbnailUrl);
    }

    if (bookValues.bookFileName) {
      updateQuery += `, BookFileName = ?`;
      queryParams.push(bookValues.bookFileName);
    }

    updateQuery += ` WHERE BookID = ?`;
    queryParams.push(bookId);

    await connection.query(updateQuery, queryParams);

    if (catalogueId) {
      await connection.query(
        `
          UPDATE catalogueinfo 
          SET ItemSubjects = ?, ItemPublisher = ?, ItemDescription = ?
          WHERE CatalogueInfoID = ?
        `,
        [
          catalogueValues.itemSubjects || null, 
          catalogueValues.itemPublisher || null, 
          catalogueValues.itemDescription || null, 
          catalogueId
        ]
      );
    }

    await connection.commit();
    return bookId;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export async function getBookSubjects(bookId) {
  const [rows] = await pool.query(
    `SELECT catalogueinfo.ItemSubjects 
     FROM books 
     INNER JOIN catalogueinfo ON books.CatalogueInfoID = catalogueinfo.CatalogueInfoID 
     WHERE books.BookID = ?;`,
    [bookId]
  );
  
  if (rows.length === 0 || !rows[0].ItemSubjects) return [];
  
  // Safely parse the comma-separated string natively into a Javascript Array!
  return rows[0].ItemSubjects.split(",").map(sub => sub.trim()).filter(sub => sub.length > 0);
}

export async function getAllUniqueSubjects() {
  const [rows] = await pool.query(`SELECT ItemSubjects FROM catalogueinfo WHERE ItemSubjects IS NOT NULL AND ItemSubjects != ''`);
  let allSubjects = new Set();
  
  rows.forEach(row => {
     if (row.ItemSubjects) {
         row.ItemSubjects.split(",").forEach(sub => {
             const cleanSub = sub.trim();
             if (cleanSub.length > 0) allSubjects.add(cleanSub);
         });
     }
  });
  
  // Return a completely deduplicated and alphabetically sorted native array!
  return Array.from(allSubjects).sort();
}

export async function getBooksBySubject(subjectName) {
  if (!subjectName) return [];
  
  // Use a wildcard search dynamically to match the specific subject string anywhere within the comma-separated structure
  const exactSearchPattern = `%${subjectName.trim()}%`;
  
  const [rows] = await pool.query(
    `SELECT books.*, catalogueinfo.ItemSubjects, catalogueinfo.ItemDescription, catalogueinfo.ItemPublisher 
     FROM books 
     INNER JOIN catalogueinfo ON books.CatalogueInfoID = catalogueinfo.CatalogueInfoID 
     WHERE catalogueinfo.ItemSubjects LIKE ?;`,
    [exactSearchPattern]
  );
  
  return rows;
}
