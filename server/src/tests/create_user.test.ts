import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input for creating a user
const testUserInput: CreateUserInput = {
  email: 'test@example.com',
  password: 'securepassword123',
  role: 'contributor',
  name: 'Test User',
  orcid: '0000-0000-0000-0000'
};

const minimalUserInput: CreateUserInput = {
  email: 'minimal@example.com',
  password: 'password123',
  role: 'viewer',
  name: null,
  orcid: null
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with all fields', async () => {
    const result = await createUser(testUserInput);

    // Verify basic field values
    expect(result.email).toEqual('test@example.com');
    expect(result.role).toEqual('contributor');
    expect(result.name).toEqual('Test User');
    expect(result.orcid).toEqual('0000-0000-0000-0000');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify password was hashed (not stored as plain text)
    expect(result.password).not.toEqual('securepassword123');
    expect(result.password).toMatch(/^\$2[aby]\$10\$/); // bcrypt hash pattern
  });

  it('should create a user with minimal required fields', async () => {
    const result = await createUser(minimalUserInput);

    expect(result.email).toEqual('minimal@example.com');
    expect(result.role).toEqual('viewer');
    expect(result.name).toBeNull();
    expect(result.orcid).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify password was hashed
    expect(result.password).not.toEqual('password123');
    expect(result.password).toMatch(/^\$2[aby]\$10\$/);
  });

  it('should save user to database correctly', async () => {
    const result = await createUser(testUserInput);

    // Query the database to verify the user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    const savedUser = users[0];
    
    expect(savedUser.email).toEqual('test@example.com');
    expect(savedUser.role).toEqual('contributor');
    expect(savedUser.name).toEqual('Test User');
    expect(savedUser.orcid).toEqual('0000-0000-0000-0000');
    expect(savedUser.password).toMatch(/^\$2[aby]\$10\$/);
    expect(savedUser.created_at).toBeInstanceOf(Date);
    expect(savedUser.updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when email already exists', async () => {
    // Create first user
    await createUser(testUserInput);

    // Attempt to create second user with same email
    const duplicateInput: CreateUserInput = {
      email: 'test@example.com', // Same email
      password: 'differentpassword',
      role: 'admin',
      name: 'Different User',
      orcid: null
    };

    await expect(createUser(duplicateInput)).rejects.toThrow(/email already exists/i);
  });

  it('should handle different user roles correctly', async () => {
    const roles = ['viewer', 'contributor', 'curator', 'admin'] as const;

    for (const role of roles) {
      const userInput: CreateUserInput = {
        email: `${role}@example.com`,
        password: 'password123',
        role: role,
        name: `${role} user`,
        orcid: null
      };

      const result = await createUser(userInput);
      expect(result.role).toEqual(role);
      expect(result.email).toEqual(`${role}@example.com`);
    }
  });

  it('should verify password can be verified against hash', async () => {
    const result = await createUser(testUserInput);

    // Verify the hashed password matches the original
    const isValid = await Bun.password.verify('securepassword123', result.password);
    expect(isValid).toBe(true);

    // Verify incorrect password doesn't match
    const isInvalid = await Bun.password.verify('wrongpassword', result.password);
    expect(isInvalid).toBe(false);
  });

  it('should set timestamps correctly', async () => {
    const beforeCreation = new Date();
    const result = await createUser(testUserInput);
    const afterCreation = new Date();

    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.updated_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
  });
});