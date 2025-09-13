import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, profilesTable } from '../db/schema';
import { getProfileByUser } from '../handlers/get_profile_by_user';
import { eq } from 'drizzle-orm';

describe('getProfileByUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return profile for existing user', async () => {
    // Create a test user first
    const users = await db.insert(usersTable)
      .values({
        email: 'testuser@example.com',
        password: 'password123',
        role: 'contributor',
        name: 'Test User'
      })
      .returning()
      .execute();

    const userId = users[0].id;

    // Create a profile for the user
    await db.insert(profilesTable)
      .values({
        user_id: userId,
        type: 'lecturer',
        institution: 'Test University',
        department: 'Computer Science',
        orcid: '0000-0000-0000-0001'
      })
      .execute();

    const result = await getProfileByUser(userId);

    expect(result).not.toBeNull();
    expect(result!.user_id).toEqual(userId);
    expect(result!.type).toEqual('lecturer');
    expect(result!.institution).toEqual('Test University');
    expect(result!.department).toEqual('Computer Science');
    expect(result!.orcid).toEqual('0000-0000-0000-0001');
    expect(result!.id).toBeDefined();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null for user without profile', async () => {
    // Create a user without a profile
    const users = await db.insert(usersTable)
      .values({
        email: 'noprofile@example.com',
        password: 'password123',
        role: 'viewer',
        name: 'No Profile User'
      })
      .returning()
      .execute();

    const userId = users[0].id;
    const result = await getProfileByUser(userId);

    expect(result).toBeNull();
  });

  it('should return null for non-existent user', async () => {
    const result = await getProfileByUser(999);
    expect(result).toBeNull();
  });

  it('should return student profile correctly', async () => {
    // Create a test user
    const users = await db.insert(usersTable)
      .values({
        email: 'student@example.com',
        password: 'password123',
        role: 'contributor',
        name: 'Student User'
      })
      .returning()
      .execute();

    const userId = users[0].id;

    // Create a student profile
    await db.insert(profilesTable)
      .values({
        user_id: userId,
        type: 'student',
        institution: 'Student University',
        department: 'Mathematics',
        orcid: null
      })
      .execute();

    const result = await getProfileByUser(userId);

    expect(result).not.toBeNull();
    expect(result!.user_id).toEqual(userId);
    expect(result!.type).toEqual('student');
    expect(result!.institution).toEqual('Student University');
    expect(result!.department).toEqual('Mathematics');
    expect(result!.orcid).toBeNull();
    expect(result!.id).toBeDefined();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return only the profile for the specified user', async () => {
    // Create multiple users with profiles
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'user1@example.com',
          password: 'password123',
          role: 'contributor',
          name: 'User One'
        },
        {
          email: 'user2@example.com',
          password: 'password123',
          role: 'contributor',
          name: 'User Two'
        }
      ])
      .returning()
      .execute();

    const user1Id = users[0].id;
    const user2Id = users[1].id;

    // Create profiles for both users
    await db.insert(profilesTable)
      .values([
        {
          user_id: user1Id,
          type: 'lecturer',
          institution: 'University A',
          department: 'Physics',
          orcid: '0000-0000-0000-0001'
        },
        {
          user_id: user2Id,
          type: 'student',
          institution: 'University B',
          department: 'Chemistry',
          orcid: '0000-0000-0000-0002'
        }
      ])
      .execute();

    // Get profile for user 1
    const result1 = await getProfileByUser(user1Id);
    expect(result1).not.toBeNull();
    expect(result1!.user_id).toEqual(user1Id);
    expect(result1!.institution).toEqual('University A');
    expect(result1!.department).toEqual('Physics');
    expect(result1!.type).toEqual('lecturer');

    // Get profile for user 2
    const result2 = await getProfileByUser(user2Id);
    expect(result2).not.toBeNull();
    expect(result2!.user_id).toEqual(user2Id);
    expect(result2!.institution).toEqual('University B');
    expect(result2!.department).toEqual('Chemistry');
    expect(result2!.type).toEqual('student');
  });

  it('should handle profile with all nullable fields as null', async () => {
    // Create a test user
    const users = await db.insert(usersTable)
      .values({
        email: 'minimal@example.com',
        password: 'password123',
        role: 'contributor',
        name: 'Minimal User'
      })
      .returning()
      .execute();

    const userId = users[0].id;

    // Create a profile with minimal required fields
    await db.insert(profilesTable)
      .values({
        user_id: userId,
        type: 'lecturer',
        institution: 'Minimal University',
        department: 'Basic Department',
        orcid: null
      })
      .execute();

    const result = await getProfileByUser(userId);

    expect(result).not.toBeNull();
    expect(result!.user_id).toEqual(userId);
    expect(result!.type).toEqual('lecturer');
    expect(result!.institution).toEqual('Minimal University');
    expect(result!.department).toEqual('Basic Department');
    expect(result!.orcid).toBeNull();
  });
});