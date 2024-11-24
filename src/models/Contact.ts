import pool from '../config/database';

// Find users by email or phone with recursive linking
export async function findByEmailOrPhone(email: string | null, phoneNumber: string | null) {
  const query = `
    WITH RECURSIVE LinkedContacts AS (
      -- Base case: Find direct matches
      SELECT * FROM Contact 
      WHERE (email = ? OR phoneNumber = ?) 
      AND deletedAt IS NULL

      UNION

      -- Recursive case: Find linked contacts
      SELECT c.* 
      FROM Contact c
      INNER JOIN LinkedContacts lc ON 
        (c.id = lc.linkedId) OR 
        (c.linkedId = lc.id) OR
        (c.linkedId = lc.linkedId AND c.linkedId IS NOT NULL)
      WHERE c.deletedAt IS NULL
    )
    SELECT DISTINCT * FROM LinkedContacts
    ORDER BY createdAt ASC;
  `;
  const [rows] = await pool.query(query, [email, phoneNumber]);
  return rows;
}

// Create new user
export async function createUser(contact: {
  phoneNumber: string | null;
  email: string | null;
  linkedId: number | null;
  linkPrecedence: 'primary' | 'secondary';
}) {
  const query = `
    INSERT INTO Contact (phoneNumber, email, linkedId, linkPrecedence, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, NOW(), NOW())
  `;
  const [result] = await pool.query(query, [
    contact.phoneNumber,
    contact.email,
    contact.linkedId,
    contact.linkPrecedence
  ]);
  return { ...contact, id: (result as any).insertId };
}

// Update user
export async function updateUser(id: number, updates: { linkedId: number | null; linkPrecedence: 'primary' | 'secondary' }) {
  const query = `
    UPDATE Contact 
    SET linkedId = ?, linkPrecedence = ?, updatedAt = NOW()
    WHERE id = ?
  `;
  await pool.query(query, [updates.linkedId, updates.linkPrecedence, id]);
}

// Get all linked users
export async function getAllLinkedUsers(primaryId: number) {
  const query = `
    WITH RECURSIVE LinkedContacts AS (
      -- Base case: Start with the primary contact
      SELECT * FROM Contact WHERE id = ? AND deletedAt IS NULL
      
      UNION ALL
      
      -- Recursive case: Get all secondary contacts
      SELECT c.* 
      FROM Contact c
      INNER JOIN LinkedContacts lc ON c.linkedId = lc.id
      WHERE c.deletedAt IS NULL
    )
    SELECT DISTINCT * FROM LinkedContacts
    ORDER BY createdAt ASC;
  `;
  const [rows] = await pool.query(query, [primaryId]);
  return rows;
}
