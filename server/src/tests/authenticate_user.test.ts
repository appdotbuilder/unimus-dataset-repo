import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { authenticateUser } from '../handlers/authenticate_user';

// Test users data
const testUser1 = {
  email: 'test@example.com',
  password: 'password123',
  role: 'contributor' as const,
  name: 'Test User',
  orcid: null
};

const testUser2 = {
  email: 'admin@example.com',
  password: 'adminpass456',
  role: 'admin' as const,
  name: 'Admin User',
  orcid: 'https://orcid.org/0000-0000-0000-0000'
};

describe('authenticateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should authenticate user with correct credentials', async () => {
    // Create test user
    await db.insert(usersTable)
      .values(testUser1)
      .execute();

    const loginInput: LoginInput = {
      email: 'test@example.com',
      password: 'password123'
    };

    const result = await authenticateUser(loginInput);

    // Should return user data without password
    expect(result).not.toBeNull();
    expect(result!.email).toEqual('test@example.com');
    expect(result!.role).toEqual('contributor');
    expect(result!.name).toEqual('Test User');
    expect(result!.orcid).toBeNull();
    expect(result!.id).toBeDefined();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
    
    // Password should not be included in response
    expect((result as any).password).toBeUndefined();
  });

  it('should return null for non-existent user', async () => {
    const loginInput: LoginInput = {
      email: 'nonexistent@example.com',
      password: 'anypassword'
    };

    const result = await authenticateUser(loginInput);

    expect(result).toBeNull();
  });

  it('should return null for incorrect password', async () => {
    // Create test user
    await db.insert(usersTable)
      .values(testUser1)
      .execute();

    const loginInput: LoginInput = {
      email: 'test@example.com',
      password: 'wrongpassword'
    };

    const result = await authenticateUser(loginInput);

    expect(result).toBeNull();
  });

  it('should authenticate admin user correctly', async () => {
    // Create admin user
    await db.insert(usersTable)
      .values(testUser2)
      .execute();

    const loginInput: LoginInput = {
      email: 'admin@example.com',
      password: 'adminpass456'
    };

    const result = await authenticateUser(loginInput);

    expect(result).not.toBeNull();
    expect(result!.email).toEqual('admin@example.com');
    expect(result!.role).toEqual('admin');
    expect(result!.name).toEqual('Admin User');
    expect(result!.orcid).toEqual('https://orcid.org/0000-0000-0000-0000');
    expect((result as any).password).toBeUndefined();
  });

  it('should be case sensitive for email', async () => {
    // Create test user
    await db.insert(usersTable)
      .values(testUser1)
      .execute();

    const loginInput: LoginInput = {
      email: 'TEST@EXAMPLE.COM', // Different case
      password: 'password123'
    };

    const result = await authenticateUser(loginInput);

    // Should return null as email case doesn't match
    expect(result).toBeNull();
  });

  it('should handle user with null name and orcid fields', async () => {
    const userWithNulls = {
      email: 'minimal@example.com',
      password: 'testpass',
      role: 'viewer' as const,
      name: null,
      orcid: null
    };

    // Create test user with null fields
    await db.insert(usersTable)
      .values(userWithNulls)
      .execute();

    const loginInput: LoginInput = {
      email: 'minimal@example.com',
      password: 'testpass'
    };

    const result = await authenticateUser(loginInput);

    expect(result).not.toBeNull();
    expect(result!.email).toEqual('minimal@example.com');
    expect(result!.role).toEqual('viewer');
    expect(result!.name).toBeNull();
    expect(result!.orcid).toBeNull();
    expect((result as any).password).toBeUndefined();
  });

  it('should handle empty password attempt', async () => {
    // Create test user
    await db.insert(usersTable)
      .values(testUser1)
      .execute();

    const loginInput: LoginInput = {
      email: 'test@example.com',
      password: ''
    };

    const result = await authenticateUser(loginInput);

    expect(result).toBeNull();
  });

  it('should return correct user when multiple users exist', async () => {
    // Create multiple test users
    await db.insert(usersTable)
      .values([testUser1, testUser2])
      .execute();

    // Authenticate first user
    const loginInput1: LoginInput = {
      email: 'test@example.com',
      password: 'password123'
    };

    const result1 = await authenticateUser(loginInput1);

    expect(result1).not.toBeNull();
    expect(result1!.email).toEqual('test@example.com');
    expect(result1!.role).toEqual('contributor');

    // Authenticate second user
    const loginInput2: LoginInput = {
      email: 'admin@example.com',
      password: 'adminpass456'
    };

    const result2 = await authenticateUser(loginInput2);

    expect(result2).not.toBeNull();
    expect(result2!.email).toEqual('admin@example.com');
    expect(result2!.role).toEqual('admin');

    // Verify they are different users
    expect(result1!.id).not.toEqual(result2!.id);
  });
});