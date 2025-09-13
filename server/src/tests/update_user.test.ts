import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput } from '../schema';
import { updateUser } from '../handlers/update_user';
import { eq } from 'drizzle-orm';
import { createHash, randomBytes } from 'crypto';

// Helper function to create a test user
const createTestUser = async () => {
  // Create a simple hash with salt using Node.js crypto
  const salt = randomBytes(16).toString('hex');
  const hash = createHash('sha256').update('password123' + salt).digest('hex');
  const hashedPassword = `${salt}:${hash}`;
  
  const result = await db.insert(usersTable)
    .values({
      email: 'test@example.com',
      password: hashedPassword,
      role: 'viewer',
      name: 'Test User',
      orcid: 'test-orcid'
    })
    .returning()
    .execute();
  
  return result[0];
};

// Helper function to verify password
const verifyPassword = (password: string, hashedPassword: string): boolean => {
  const [salt, hash] = hashedPassword.split(':');
  const testHash = createHash('sha256').update(password + salt).digest('hex');
  return hash === testHash;
};

describe('updateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update user email', async () => {
    const testUser = await createTestUser();
    
    const input: UpdateUserInput = {
      id: testUser.id,
      email: 'updated@example.com'
    };

    const result = await updateUser(input);

    expect(result.id).toEqual(testUser.id);
    expect(result.email).toEqual('updated@example.com');
    expect(result.role).toEqual('viewer'); // Should remain unchanged
    expect(result.name).toEqual('Test User'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > testUser.updated_at).toBe(true);
  });

  it('should update user role', async () => {
    const testUser = await createTestUser();
    
    const input: UpdateUserInput = {
      id: testUser.id,
      role: 'admin'
    };

    const result = await updateUser(input);

    expect(result.id).toEqual(testUser.id);
    expect(result.email).toEqual('test@example.com'); // Should remain unchanged
    expect(result.role).toEqual('admin');
    expect(result.name).toEqual('Test User'); // Should remain unchanged
  });

  it('should update user password and hash it', async () => {
    const testUser = await createTestUser();
    
    const input: UpdateUserInput = {
      id: testUser.id,
      password: 'newpassword456'
    };

    const result = await updateUser(input);

    expect(result.id).toEqual(testUser.id);
    expect(result.password).not.toEqual('newpassword456'); // Should be hashed
    expect(result.password).not.toEqual(testUser.password); // Should be different from old hash

    // Verify the password is properly hashed
    const passwordMatch = verifyPassword('newpassword456', result.password);
    expect(passwordMatch).toBe(true);
  });

  it('should update multiple fields at once', async () => {
    const testUser = await createTestUser();
    
    const input: UpdateUserInput = {
      id: testUser.id,
      email: 'multi@example.com',
      role: 'contributor',
      name: 'Updated Name',
      orcid: 'updated-orcid'
    };

    const result = await updateUser(input);

    expect(result.id).toEqual(testUser.id);
    expect(result.email).toEqual('multi@example.com');
    expect(result.role).toEqual('contributor');
    expect(result.name).toEqual('Updated Name');
    expect(result.orcid).toEqual('updated-orcid');
    expect(result.updated_at > testUser.updated_at).toBe(true);
  });

  it('should update nullable fields to null', async () => {
    const testUser = await createTestUser();
    
    const input: UpdateUserInput = {
      id: testUser.id,
      name: null,
      orcid: null
    };

    const result = await updateUser(input);

    expect(result.id).toEqual(testUser.id);
    expect(result.name).toBeNull();
    expect(result.orcid).toBeNull();
  });

  it('should save updated user to database', async () => {
    const testUser = await createTestUser();
    
    const input: UpdateUserInput = {
      id: testUser.id,
      email: 'saved@example.com',
      role: 'curator'
    };

    await updateUser(input);

    // Verify the update was persisted
    const updatedUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUser.id))
      .execute();

    expect(updatedUser).toHaveLength(1);
    expect(updatedUser[0].email).toEqual('saved@example.com');
    expect(updatedUser[0].role).toEqual('curator');
    expect(updatedUser[0].updated_at > testUser.updated_at).toBe(true);
  });

  it('should throw error when user does not exist', async () => {
    const input: UpdateUserInput = {
      id: 999, // Non-existent user ID
      email: 'nonexistent@example.com'
    };

    expect(updateUser(input)).rejects.toThrow(/user with id 999 not found/i);
  });

  it('should throw error when email is already in use by another user', async () => {
    // Create two test users
    const user1 = await createTestUser();
    
    // Create second user with hashed password
    const salt2 = randomBytes(16).toString('hex');
    const hash2 = createHash('sha256').update('password123' + salt2).digest('hex');
    const hashedPassword2 = `${salt2}:${hash2}`;
    
    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password: hashedPassword2,
        role: 'viewer',
        name: 'User 2'
      })
      .returning()
      .execute();
    
    const user2 = user2Result[0];

    // Try to update user2's email to user1's email
    const input: UpdateUserInput = {
      id: user2.id,
      email: 'test@example.com' // This is user1's email
    };

    expect(updateUser(input)).rejects.toThrow(/email test@example\.com is already in use/i);
  });

  it('should allow updating email to the same email (no change)', async () => {
    const testUser = await createTestUser();
    
    const input: UpdateUserInput = {
      id: testUser.id,
      email: 'test@example.com', // Same email
      name: 'Updated Name'
    };

    const result = await updateUser(input);

    expect(result.email).toEqual('test@example.com');
    expect(result.name).toEqual('Updated Name');
  });

  it('should handle partial updates correctly', async () => {
    const testUser = await createTestUser();
    
    // Only update name, leave everything else unchanged
    const input: UpdateUserInput = {
      id: testUser.id,
      name: 'Only Name Changed'
    };

    const result = await updateUser(input);

    expect(result.id).toEqual(testUser.id);
    expect(result.email).toEqual(testUser.email);
    expect(result.role).toEqual(testUser.role);
    expect(result.name).toEqual('Only Name Changed');
    expect(result.orcid).toEqual(testUser.orcid);
    expect(result.password).toEqual(testUser.password); // Should remain unchanged
    expect(result.updated_at > testUser.updated_at).toBe(true);
  });
});