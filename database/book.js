import mysql from "mysql2";
import dotenv from "dotenv";
dotenv.config();

export const pool = mysql
  .createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  })
  .promise();

export async function newgetBook(id) {
  const [rows] = await pool.query(
    `
    SELECT * 
    FROM Books
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
    FROM Books
    WHERE BookTitle = ?;
    `,
    [title],
  );
  return rows;
}

export async function getfullBookInfo(id) {
  const [rows] = await pool.query(
    `
    SELECT Books.* , CatalogueInfo.ItemSubjects, CatalogueInfo.ItemDescription,CatalogueInfo.ItemPublisher 
    FROM Books 
    INNER JOIN CatalogueInfo
    ON Books.CatalogueInfoID = CatalogueInfo.CatalogueInfoID AND Books.BookID= ?
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
    FROM CatalogueInfo
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
      INSERT into Books (BookTitle,BookIdentifier,BookEdition,BookDate,BookContributors,BookAuthor,BookFileName)
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
      UPDATE Books
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
      INSERT into CatalogueInfo (ItemSubjects,ItemPublisher,ItemDescription)
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
        INSERT into CatalogueInfo (ItemSubjects,ItemPublisher,ItemDescription)
        Values(?,?,?)
      `,
      [catalogueValues.itemSubjects, catalogueValues.itemPublisher, catalogueValues.itemDescription]
    );
    const catalogueId = catalogueResult.insertId;

    // 2. Insert Book linking the newly created CatalogueInfoID
    const [bookResult] = await connection.query(
      `
        INSERT into Books (BookTitle, BookIdentifier, BookEdition, BookDate, BookContributors, BookAuthor, BookFileName, catalogueInfoID)
        Values(?,?,?,?,?,?,?,?)
      `,
      [
        bookValues.bookTitle || null,
        bookValues.bookIdentifier || null,
        bookValues.bookEdition || null,
        bookValues.bookReleaseDate === '' ? null : bookValues.bookReleaseDate,
        bookValues.bookContributors || null,
        bookValues.bookAuthor || null,
        bookValues.bookFileName || null,
        catalogueId
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
    const [book] = await connection.query(`SELECT catalogueInfoID AS catId FROM Books WHERE BookID = ?`, [bookId]);
    if (book.length > 0) {
      const catalogueId = book[0].catId;
      // 2. Delete Book
      await connection.query(`DELETE FROM Books WHERE BookID = ?`, [bookId]);
      // 3. Delete CatalogueInfo
      if (catalogueId) {
        await connection.query(`DELETE FROM CatalogueInfo WHERE CatalogueInfoID = ?`, [catalogueId]);
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

    const [book] = await connection.query(`SELECT catalogueInfoID AS catId FROM Books WHERE BookID = ?`, [bookId]);
    if (book.length === 0) {
      throw new Error("Book not found");
    }
    const catalogueId = book[0].catId;

    let updateQuery = `
      UPDATE Books 
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
          UPDATE CatalogueInfo 
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
