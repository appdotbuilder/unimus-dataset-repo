import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, profilesTable } from '../db/schema';
import { type CreateProfileInput, type CreateUserInput } from '../schema';
import { createProfile } from '../handlers/create_profile';
import { eq } from 'drizzle-orm';

// Test user data for creating prerequisite users
const testUser: CreateUserInput = {
  email: 'test@university.edu',
  password: 'password123',
  role: 'contributor',
  name: 'Test User',
  orcid: '0000-0000-0000-0001'
};

// Test profile input
const testProfileInput: CreateProfileInput = {
  user_id: 1, // Will be set dynamically
  type: 'lecturer',
  institution: 'University of Example',
  department: 'Computer Science',
  orcid: '0000-0000-0000-0001'
};

describe('createProfile', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a profile for a valid user', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;
    const profileInput = { ...testProfileInput, user_id: userId };

    const result = await createProfile(profileInput);

    // Verify profile fields
    expect(result.user_id).toEqual(userId);
    expect(result.type).toEqual('lecturer');
    expect(result.institution).toEqual('University of Example');
    expect(result.department).toEqual('Computer Science');
    expect(result.orcid).toEqual('0000-0000-0000-0001');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save profile to database', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;
    const profileInput = { ...testProfileInput, user_id: userId };

    const result = await createProfile(profileInput);

    // Query database to verify profile was saved
    const savedProfiles = await db.select()
      .from(profilesTable)
      .where(eq(profilesTable.id, result.id))
      .execute();

    expect(savedProfiles).toHaveLength(1);
    expect(savedProfiles[0].user_id).toEqual(userId);
    expect(savedProfiles[0].type).toEqual('lecturer');
    expect(savedProfiles[0].institution).toEqual('University of Example');
    expect(savedProfiles[0].department).toEqual('Computer Science');
    expect(savedProfiles[0].orcid).toEqual('0000-0000-0000-0001');
    expect(savedProfiles[0].created_at).toBeInstanceOf(Date);
    expect(savedProfiles[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create student profile with null orcid', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;
    const studentProfileInput: CreateProfileInput = {
      user_id: userId,
      type: 'student',
      institution: 'Student University',
      department: 'Mathematics',
      orcid: null
    };

    const result = await createProfile(studentProfileInput);

    expect(result.user_id).toEqual(userId);
    expect(result.type).toEqual('student');
    expect(result.institution).toEqual('Student University');
    expect(result.department).toEqual('Mathematics');
    expect(result.orcid).toBeNull();
  });

  it('should throw error when user does not exist', async () => {
    const profileInput = { ...testProfileInput, user_id: 999 };

    await expect(createProfile(profileInput)).rejects.toThrow(/user with id 999 does not exist/i);
  });

  it('should throw error when user already has a profile', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;
    const profileInput = { ...testProfileInput, user_id: userId };

    // Create first profile
    await createProfile(profileInput);

    // Try to create second profile for same user
    const duplicateProfileInput = {
      ...profileInput,
      institution: 'Different University',
      department: 'Different Department'
    };

    await expect(createProfile(duplicateProfileInput)).rejects.toThrow(/user with id .* already has a profile/i);
  });

  it('should create profiles for multiple different users', async () => {
    // Create first user and profile
    const user1Result = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const user1Id = user1Result[0].id;
    const profile1Input = { ...testProfileInput, user_id: user1Id };
    const profile1 = await createProfile(profile1Input);

    // Create second user and profile
    const user2Data = {
      ...testUser,
      email: 'user2@university.edu',
      name: 'Second User',
      orcid: '0000-0000-0000-0002'
    };
    
    const user2Result = await db.insert(usersTable)
      .values(user2Data)
      .returning()
      .execute();
    
    const user2Id = user2Result[0].id;
    const profile2Input: CreateProfileInput = {
      user_id: user2Id,
      type: 'student',
      institution: 'Another University',
      department: 'Biology',
      orcid: null
    };
    const profile2 = await createProfile(profile2Input);

    // Verify both profiles exist and are different
    expect(profile1.id).not.toEqual(profile2.id);
    expect(profile1.user_id).toEqual(user1Id);
    expect(profile2.user_id).toEqual(user2Id);
    expect(profile1.type).toEqual('lecturer');
    expect(profile2.type).toEqual('student');

    // Verify both profiles are in database
    const allProfiles = await db.select()
      .from(profilesTable)
      .execute();

    expect(allProfiles).toHaveLength(2);
    expect(allProfiles.find(p => p.user_id === user1Id)).toBeDefined();
    expect(allProfiles.find(p => p.user_id === user2Id)).toBeDefined();
  });

  it('should handle profile creation with foreign key constraint validation', async () => {
    // Create user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Verify user exists before creating profile
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(users).toHaveLength(1);

    // Create profile with valid foreign key
    const profileInput = { ...testProfileInput, user_id: userId };
    const result = await createProfile(profileInput);

    expect(result.user_id).toEqual(userId);

    // Verify profile references the correct user
    const profiles = await db.select()
      .from(profilesTable)
      .where(eq(profilesTable.user_id, userId))
      .execute();

    expect(profiles).toHaveLength(1);
    expect(profiles[0].user_id).toEqual(userId);
  });
});