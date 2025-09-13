import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { previewDatasetFile, type DatasetPreview } from '../handlers/preview_dataset_file';
import { type DatasetFile } from '../schema';
import * as fs from 'fs/promises';
import * as path from 'path';

// Test directory for temporary files
const testDataDir = 'test_data';

describe('previewDatasetFile', () => {
  beforeEach(async () => {
    await createDB();
    // Create test data directory
    await fs.mkdir(testDataDir, { recursive: true });
  });

  afterEach(async () => {
    await resetDB();
    // Clean up test data directory
    try {
      await fs.rm(testDataDir, { recursive: true });
    } catch (error) {
      // Directory might not exist, ignore error
    }
  });

  describe('CSV parsing', () => {
    it('should parse simple CSV file correctly', async () => {
      const csvContent = `name,age,city
John,25,New York
Jane,30,Boston
Bob,35,Chicago`;

      const filePath = path.join(testDataDir, 'test.csv');
      await fs.writeFile(filePath, csvContent);

      const file: DatasetFile = {
        id: 1,
        dataset_id: 1,
        filename: 'test.csv',
        path: filePath,
        size: csvContent.length,
        type: 'csv',
        created_at: new Date()
      };

      const result = await previewDatasetFile(file);

      expect(result).not.toBeNull();
      expect(result!.headers).toEqual(['name', 'age', 'city']);
      expect(result!.rows).toEqual([
        ['John', 25, 'New York'],
        ['Jane', 30, 'Boston'],
        ['Bob', 35, 'Chicago']
      ]);
      expect(result!.totalRows).toBe(3);
      expect(result!.fileType).toBe('csv');
    });

    it('should handle CSV with quoted fields', async () => {
      const csvContent = `name,description,price
"Product A","High quality, durable",19.99
"Product B","Affordable option",9.50`;

      const filePath = path.join(testDataDir, 'quoted.csv');
      await fs.writeFile(filePath, csvContent);

      const file: DatasetFile = {
        id: 2,
        dataset_id: 1,
        filename: 'quoted.csv',
        path: filePath,
        size: csvContent.length,
        type: 'csv',
        created_at: new Date()
      };

      const result = await previewDatasetFile(file);

      expect(result).not.toBeNull();
      expect(result!.headers).toEqual(['name', 'description', 'price']);
      expect(result!.rows[0]).toEqual(['Product A', 'High quality, durable', 19.99]);
      expect(result!.rows[1]).toEqual(['Product B', 'Affordable option', 9.5]);
    });

    it('should handle CSV with null values', async () => {
      const csvContent = `name,age,email
John,25,john@example.com
Jane,,jane@example.com
Bob,35,null`;

      const filePath = path.join(testDataDir, 'nulls.csv');
      await fs.writeFile(filePath, csvContent);

      const file: DatasetFile = {
        id: 3,
        dataset_id: 1,
        filename: 'nulls.csv',
        path: filePath,
        size: csvContent.length,
        type: 'csv',
        created_at: new Date()
      };

      const result = await previewDatasetFile(file);

      expect(result).not.toBeNull();
      expect(result!.rows[0]).toEqual(['John', 25, 'john@example.com']);
      expect(result!.rows[1]).toEqual(['Jane', null, 'jane@example.com']);
      expect(result!.rows[2]).toEqual(['Bob', 35, null]);
    });

    it('should limit to 20 rows', async () => {
      const headers = 'id,value\n';
      const rows = Array.from({ length: 25 }, (_, i) => `${i + 1},value${i + 1}`).join('\n');
      const csvContent = headers + rows;

      const filePath = path.join(testDataDir, 'large.csv');
      await fs.writeFile(filePath, csvContent);

      const file: DatasetFile = {
        id: 4,
        dataset_id: 1,
        filename: 'large.csv',
        path: filePath,
        size: csvContent.length,
        type: 'csv',
        created_at: new Date()
      };

      const result = await previewDatasetFile(file);

      expect(result).not.toBeNull();
      expect(result!.rows).toHaveLength(20);
      expect(result!.totalRows).toBe(25);
      expect(result!.rows[19]).toEqual([20, 'value20']); // Last preview row
    });
  });

  describe('JSON parsing', () => {
    it('should parse array of objects JSON correctly', async () => {
      const jsonData = [
        { name: 'John', age: 25, city: 'New York' },
        { name: 'Jane', age: 30, city: 'Boston' },
        { name: 'Bob', age: 35, city: 'Chicago' }
      ];
      const jsonContent = JSON.stringify(jsonData);

      const filePath = path.join(testDataDir, 'test.json');
      await fs.writeFile(filePath, jsonContent);

      const file: DatasetFile = {
        id: 5,
        dataset_id: 1,
        filename: 'test.json',
        path: filePath,
        size: jsonContent.length,
        type: 'json',
        created_at: new Date()
      };

      const result = await previewDatasetFile(file);

      expect(result).not.toBeNull();
      expect(result!.headers).toEqual(['name', 'age', 'city']);
      expect(result!.rows).toEqual([
        ['John', 25, 'New York'],
        ['Jane', 30, 'Boston'],
        ['Bob', 35, 'Chicago']
      ]);
      expect(result!.totalRows).toBe(3);
      expect(result!.fileType).toBe('json');
    });

    it('should parse single object JSON', async () => {
      const jsonData = { name: 'John', age: 25, active: true };
      const jsonContent = JSON.stringify(jsonData);

      const filePath = path.join(testDataDir, 'single.json');
      await fs.writeFile(filePath, jsonContent);

      const file: DatasetFile = {
        id: 6,
        dataset_id: 1,
        filename: 'single.json',
        path: filePath,
        size: jsonContent.length,
        type: 'json',
        created_at: new Date()
      };

      const result = await previewDatasetFile(file);

      expect(result).not.toBeNull();
      expect(result!.headers).toEqual(['name', 'age', 'active']);
      expect(result!.rows).toEqual([['John', 25, 'true']]);
      expect(result!.totalRows).toBe(1);
    });

    it('should handle JSON with null values', async () => {
      const jsonData = [
        { name: 'John', age: 25, email: null },
        { name: 'Jane', age: null, email: 'jane@example.com' }
      ];
      const jsonContent = JSON.stringify(jsonData);

      const filePath = path.join(testDataDir, 'nulls.json');
      await fs.writeFile(filePath, jsonContent);

      const file: DatasetFile = {
        id: 7,
        dataset_id: 1,
        filename: 'nulls.json',
        path: filePath,
        size: jsonContent.length,
        type: 'json',
        created_at: new Date()
      };

      const result = await previewDatasetFile(file);

      expect(result).not.toBeNull();
      expect(result!.rows[0]).toEqual(['John', 25, null]);
      expect(result!.rows[1]).toEqual(['Jane', null, 'jane@example.com']);
    });
  });

  describe('ARFF parsing', () => {
    it('should parse ARFF file correctly', async () => {
      const arffContent = `@relation weather

@attribute outlook {sunny, overcast, rainy}
@attribute temperature real
@attribute humidity real
@attribute windy {TRUE, FALSE}
@attribute play {yes, no}

@data
sunny,85,85,FALSE,no
sunny,80,90,TRUE,no
overcast,83,86,FALSE,yes`;

      const filePath = path.join(testDataDir, 'weather.arff');
      await fs.writeFile(filePath, arffContent);

      const file: DatasetFile = {
        id: 8,
        dataset_id: 1,
        filename: 'weather.arff',
        path: filePath,
        size: arffContent.length,
        type: 'arff',
        created_at: new Date()
      };

      const result = await previewDatasetFile(file);

      expect(result).not.toBeNull();
      expect(result!.headers).toEqual(['outlook', 'temperature', 'humidity', 'windy', 'play']);
      expect(result!.rows).toEqual([
        ['sunny', 85, 85, 'FALSE', 'no'],
        ['sunny', 80, 90, 'TRUE', 'no'],
        ['overcast', 83, 86, 'FALSE', 'yes']
      ]);
      expect(result!.totalRows).toBe(3);
      expect(result!.fileType).toBe('arff');
    });

    it('should handle ARFF with missing values', async () => {
      const arffContent = `@relation test

@attribute name string
@attribute age real
@attribute active {yes, no}

@data
John,25,yes
Jane,?,no
Bob,35,?`;

      const filePath = path.join(testDataDir, 'missing.arff');
      await fs.writeFile(filePath, arffContent);

      const file: DatasetFile = {
        id: 9,
        dataset_id: 1,
        filename: 'missing.arff',
        path: filePath,
        size: arffContent.length,
        type: 'arff',
        created_at: new Date()
      };

      const result = await previewDatasetFile(file);

      expect(result).not.toBeNull();
      expect(result!.rows[0]).toEqual(['John', 25, 'yes']);
      expect(result!.rows[1]).toEqual(['Jane', null, 'no']);
      expect(result!.rows[2]).toEqual(['Bob', 35, null]);
    });

    it('should skip comments in ARFF data', async () => {
      const arffContent = `@relation test

@attribute name string
@attribute value real

@data
% This is a comment
John,25
% Another comment
Jane,30`;

      const filePath = path.join(testDataDir, 'comments.arff');
      await fs.writeFile(filePath, arffContent);

      const file: DatasetFile = {
        id: 10,
        dataset_id: 1,
        filename: 'comments.arff',
        path: filePath,
        size: arffContent.length,
        type: 'arff',
        created_at: new Date()
      };

      const result = await previewDatasetFile(file);

      expect(result).not.toBeNull();
      expect(result!.rows).toEqual([
        ['John', 25],
        ['Jane', 30]
      ]);
      expect(result!.totalRows).toBe(2);
    });
  });

  describe('Error handling', () => {
    it('should return null for non-existent files', async () => {
      const file: DatasetFile = {
        id: 11,
        dataset_id: 1,
        filename: 'nonexistent.csv',
        path: 'path/to/nonexistent.csv',
        size: 100,
        type: 'csv',
        created_at: new Date()
      };

      const result = await previewDatasetFile(file);

      expect(result).toBeNull();
    });

    it('should return null for unsupported file types', async () => {
      const content = 'Some binary content';
      const filePath = path.join(testDataDir, 'test.bin');
      await fs.writeFile(filePath, content);

      const file: DatasetFile = {
        id: 12,
        dataset_id: 1,
        filename: 'test.bin',
        path: filePath,
        size: content.length,
        type: 'binary',
        created_at: new Date()
      };

      const result = await previewDatasetFile(file);

      expect(result).toBeNull();
    });

    it('should handle malformed JSON gracefully', async () => {
      const malformedJson = '{ "name": "John", "age": }';
      const filePath = path.join(testDataDir, 'malformed.json');
      await fs.writeFile(filePath, malformedJson);

      const file: DatasetFile = {
        id: 13,
        dataset_id: 1,
        filename: 'malformed.json',
        path: filePath,
        size: malformedJson.length,
        type: 'json',
        created_at: new Date()
      };

      const result = await previewDatasetFile(file);

      expect(result).not.toBeNull();
      expect(result!.headers).toEqual([]);
      expect(result!.rows).toEqual([]);
      expect(result!.totalRows).toBe(0);
    });

    it('should handle empty files', async () => {
      const filePath = path.join(testDataDir, 'empty.csv');
      await fs.writeFile(filePath, '');

      const file: DatasetFile = {
        id: 14,
        dataset_id: 1,
        filename: 'empty.csv',
        path: filePath,
        size: 0,
        type: 'csv',
        created_at: new Date()
      };

      const result = await previewDatasetFile(file);

      expect(result).not.toBeNull();
      expect(result!.headers).toEqual([]);
      expect(result!.rows).toEqual([]);
      expect(result!.totalRows).toBe(0);
    });
  });

  describe('File type detection', () => {
    it('should detect CSV from file extension', async () => {
      const csvContent = 'name,age\nJohn,25';
      const filePath = path.join(testDataDir, 'test.csv');
      await fs.writeFile(filePath, csvContent);

      const file: DatasetFile = {
        id: 15,
        dataset_id: 1,
        filename: 'test.csv',
        path: filePath,
        size: csvContent.length,
        type: 'text', // Different type, but extension should be used
        created_at: new Date()
      };

      const result = await previewDatasetFile(file);

      expect(result).not.toBeNull();
      expect(result!.fileType).toBe('text'); // Should preserve original type
      expect(result!.headers).toEqual(['name', 'age']);
    });

    it('should fallback to type field when no extension', async () => {
      const csvContent = 'name,age\nJohn,25';
      const filePath = path.join(testDataDir, 'noextension');
      await fs.writeFile(filePath, csvContent);

      const file: DatasetFile = {
        id: 16,
        dataset_id: 1,
        filename: 'noextension',
        path: filePath,
        size: csvContent.length,
        type: 'csv',
        created_at: new Date()
      };

      const result = await previewDatasetFile(file);

      expect(result).not.toBeNull();
      expect(result!.fileType).toBe('csv');
      expect(result!.headers).toEqual(['name', 'age']);
    });
  });
});