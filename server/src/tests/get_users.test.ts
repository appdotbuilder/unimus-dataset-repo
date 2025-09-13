import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { getUsers } from '../handlers/get_users';

// Test user data
const testUsers: CreateUserInput[] = [
  {
    email: 'admin@example.com',
    password: 'adminpass123',
    role: 'admin',
    name: 'Admin User',
    orcid: '0000-0000-0000-0001'
  },
  {
    email: 'curator@example.com',
    password: 'curatorpass123',
    role: 'curator',
    name: 'Curator User',
    orcid: null
  },
  {
    email: 'contributor@example.com',
    password: 'contributorpass123',
    role: 'contributor',
    name: 'Contributor User',
    orcid: '0000-0000-0000-0002'
  },
  {
    email: 'viewer@example.com',
    password: 'viewerpass123',
    role: 'viewer',
    name: null,
    orcid: null
  }
];

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no users exist', async () => {
    const result = await getUsers();
    
    expect(result).toEqual([]);
  });

  it('should retrieve all users from database', async () => {
    // Insert test users
    await db.insert(usersTable)
      .values(testUsers)
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(4);
    
    // Verify all users are returned
    const emails = result.map(u => u.email);
    expect(emails).toContain('admin@example.com');
    expect(emails).toContain('curator@example.com');
    expect(emails).toContain('contributor@example.com');
    expect(emails).toContain('viewer@example.com');
  });

  it('should exclude passwords from response', async () => {
    // Insert test users
    await db.insert(usersTable)
      .values(testUsers)
      .execute();

    const result = await getUsers();

    // Verify no actual passwords are returned
    result.forEach(user => {
      expect(user.password).toBe('');
      expect(user.password).not.toContain('pass123');
    });
  });

  it('should return all user fields except password', async () => {
    // Insert a test user
    await db.insert(usersTable)
      .values([testUsers[0]])
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(1);
    const user = result[0];

    // Verify all expected fields are present
    expect(user.id).toBeDefined();
    expect(user.email).toBe('admin@example.com');
    expect(user.role).toBe('admin');
    expect(user.name).toBe('Admin User');
    expect(user.orcid).toBe('0000-0000-0000-0001');
    expect(user.created_at).toBeInstanceOf(Date);
    expect(user.updated_at).toBeInstanceOf(Date);
    expect(user.password).toBe(''); // Should be empty, not the actual password
  });

  it('should handle users with null fields correctly', async () => {
    // Insert user with null name and orcid
    await db.insert(usersTable)
      .values([testUsers[3]]) // viewer user has null name and orcid
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(1);
    const user = result[0];

    expect(user.email).toBe('viewer@example.com');
    expect(user.role).toBe('viewer');
    expect(user.name).toBeNull();
    expect(user.orcid).toBeNull();
  });

  it('should return users with different roles', async () => {
    // Insert users with different roles
    await db.insert(usersTable)
      .values(testUsers)
      .execute();

    const result = await getUsers();

    const roles = result.map(u => u.role);
    expect(roles).toContain('admin');
    expect(roles).toContain('curator');
    expect(roles).toContain('contributor');
    expect(roles).toContain('viewer');
  });

  it('should return users ordered by creation (database default)', async () => {
    // Insert users one by one to ensure different timestamps
    await db.insert(usersTable)
      .values([testUsers[0]])
      .execute();
    
    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));
    
    await db.insert(usersTable)
      .values([testUsers[1]])
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(2);
    // First inserted user should appear first (natural database order)
    expect(result[0].email).toBe('admin@example.com');
    expect(result[1].email).toBe('curator@example.com');
  });

  it('should verify passwords are not accessible in database query', async () => {
    // Insert a user
    await db.insert(usersTable)
      .values([testUsers[0]])
      .execute();

    // Verify that actual password exists in database
    const dbUser = await db.select()
      .from(usersTable)
      .execute();
    
    expect(dbUser[0].password).toBe('adminpass123'); // Password exists in DB
    
    // But our handler should not return it
    const result = await getUsers();
    expect(result[0].password).toBe(''); // Handler returns empty string
  });
});