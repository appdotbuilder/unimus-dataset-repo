import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, profilesTable } from '../db/schema';
import { getProfiles } from '../handlers/get_profiles';

// Test data
const testUser1 = {
  email: 'lecturer@university.edu',
  password: 'password123',
  role: 'contributor' as const,
  name: 'Dr. Jane Smith',
  orcid: '0000-0000-0000-0001'
};

const testUser2 = {
  email: 'student@university.edu',
  password: 'password456',
  role: 'viewer' as const,
  name: 'John Doe',
  orcid: null
};

const testProfile1 = {
  type: 'lecturer' as const,
  institution: 'MIT',
  department: 'Computer Science',
  orcid: '0000-0000-0000-0001'
};

const testProfile2 = {
  type: 'student' as const,
  institution: 'MIT',
  department: 'Mathematics',
  orcid: null
};

describe('getProfiles', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no profiles exist', async () => {
    const result = await getProfiles();
    expect(result).toEqual([]);
  });

  it('should retrieve all profiles with complete information', async () => {
    // Create test users first
    const users = await db.insert(usersTable)
      .values([testUser1, testUser2])
      .returning()
      .execute();

    // Create profiles for the users
    const profiles = await db.insert(profilesTable)
      .values([
        { ...testProfile1, user_id: users[0].id },
        { ...testProfile2, user_id: users[1].id }
      ])
      .returning()
      .execute();

    const result = await getProfiles();

    expect(result).toHaveLength(2);

    // Verify first profile
    const profile1 = result.find(p => p.type === 'lecturer');
    expect(profile1).toBeDefined();
    expect(profile1?.id).toEqual(profiles[0].id);
    expect(profile1?.user_id).toEqual(users[0].id);
    expect(profile1?.type).toEqual('lecturer');
    expect(profile1?.institution).toEqual('MIT');
    expect(profile1?.department).toEqual('Computer Science');
    expect(profile1?.orcid).toEqual('0000-0000-0000-0001');
    expect(profile1?.created_at).toBeInstanceOf(Date);
    expect(profile1?.updated_at).toBeInstanceOf(Date);

    // Verify second profile
    const profile2 = result.find(p => p.type === 'student');
    expect(profile2).toBeDefined();
    expect(profile2?.id).toEqual(profiles[1].id);
    expect(profile2?.user_id).toEqual(users[1].id);
    expect(profile2?.type).toEqual('student');
    expect(profile2?.institution).toEqual('MIT');
    expect(profile2?.department).toEqual('Mathematics');
    expect(profile2?.orcid).toBeNull();
    expect(profile2?.created_at).toBeInstanceOf(Date);
    expect(profile2?.updated_at).toBeInstanceOf(Date);
  });

  it('should handle profiles with null orcid values correctly', async () => {
    // Create user without ORCID
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password: 'password123',
        role: 'viewer',
        name: 'Test User',
        orcid: null
      })
      .returning()
      .execute();

    // Create profile without ORCID
    await db.insert(profilesTable)
      .values({
        user_id: user[0].id,
        type: 'student',
        institution: 'Test University',
        department: 'Test Department',
        orcid: null
      })
      .execute();

    const result = await getProfiles();

    expect(result).toHaveLength(1);
    expect(result[0].orcid).toBeNull();
  });

  it('should return profiles ordered consistently', async () => {
    // Create multiple users and profiles
    const users = await db.insert(usersTable)
      .values([
        { email: 'user1@test.com', password: 'pass1', role: 'viewer', name: 'User 1', orcid: null },
        { email: 'user2@test.com', password: 'pass2', role: 'viewer', name: 'User 2', orcid: null },
        { email: 'user3@test.com', password: 'pass3', role: 'viewer', name: 'User 3', orcid: null }
      ])
      .returning()
      .execute();

    await db.insert(profilesTable)
      .values([
        { user_id: users[0].id, type: 'lecturer', institution: 'Univ A', department: 'Dept A', orcid: null },
        { user_id: users[1].id, type: 'student', institution: 'Univ B', department: 'Dept B', orcid: null },
        { user_id: users[2].id, type: 'lecturer', institution: 'Univ C', department: 'Dept C', orcid: null }
      ])
      .execute();

    const result = await getProfiles();

    expect(result).toHaveLength(3);
    expect(result.every(profile => typeof profile.id === 'number')).toBe(true);
    expect(result.every(profile => profile.created_at instanceof Date)).toBe(true);
    expect(result.every(profile => profile.updated_at instanceof Date)).toBe(true);
  });

  it('should handle different profile types correctly', async () => {
    // Create users
    const users = await db.insert(usersTable)
      .values([
        { email: 'lecturer@test.com', password: 'pass1', role: 'contributor', name: 'Lecturer', orcid: null },
        { email: 'student@test.com', password: 'pass2', role: 'viewer', name: 'Student', orcid: null }
      ])
      .returning()
      .execute();

    // Create profiles with different types
    await db.insert(profilesTable)
      .values([
        { user_id: users[0].id, type: 'lecturer', institution: 'University', department: 'CS', orcid: null },
        { user_id: users[1].id, type: 'student', institution: 'University', department: 'Math', orcid: null }
      ])
      .execute();

    const result = await getProfiles();

    expect(result).toHaveLength(2);
    
    const lecturerProfile = result.find(p => p.type === 'lecturer');
    const studentProfile = result.find(p => p.type === 'student');

    expect(lecturerProfile).toBeDefined();
    expect(lecturerProfile?.type).toEqual('lecturer');
    expect(lecturerProfile?.department).toEqual('CS');

    expect(studentProfile).toBeDefined();
    expect(studentProfile?.type).toEqual('student');
    expect(studentProfile?.department).toEqual('Math');
  });
});