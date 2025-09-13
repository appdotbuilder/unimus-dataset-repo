import { type DatasetFile } from '../schema';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface DatasetPreview {
  headers: string[];
  rows: (string | number | null)[][];
  totalRows: number;
  fileType: string;
}

/**
 * Generates a preview of the first 20 rows of a dataset file.
 * Should support CSV, JSON, and ARFF formats for tabular data preview.
 * Handles file parsing and returns structured data for display.
 */
export async function previewDatasetFile(file: DatasetFile): Promise<DatasetPreview | null> {
  try {
    // Check if file exists
    const fileExists = await fs.access(file.path).then(() => true).catch(() => false);
    if (!fileExists) {
      console.error(`File not found: ${file.path}`);
      return null;
    }

    // Read file content
    const content = await fs.readFile(file.path, 'utf-8');
    
    // Determine file type from extension or type field
    const fileExtension = path.extname(file.filename).toLowerCase();
    const fileType = fileExtension || `.${file.type.toLowerCase()}`;

    switch (fileType) {
      case '.csv':
        return parseCSV(content, file.type);
      case '.json':
        return parseJSON(content, file.type);
      case '.arff':
        return parseARFF(content, file.type);
      default:
        console.error(`Unsupported file type: ${fileType}`);
        return null;
    }
  } catch (error) {
    console.error('File preview failed:', error);
    return null;
  }
}

/**
 * Parse CSV content and return preview
 */
function parseCSV(content: string, fileType: string): DatasetPreview {
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    return {
      headers: [],
      rows: [],
      totalRows: 0,
      fileType
    };
  }

  // Parse CSV by splitting on commas and handling quoted fields
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  };

  // Extract headers (first line)
  const headers = parseCSVLine(lines[0]);

  // Parse data rows (up to 20 rows after header)
  const dataLines = lines.slice(1, 21);
  const rows: (string | number | null)[][] = dataLines.map(line => {
    return parseCSVLine(line).map(cell => {
      const trimmed = cell.replace(/^"|"$/g, ''); // Remove surrounding quotes
      
      // Try to convert to number
      if (trimmed === '' || trimmed.toLowerCase() === 'null') {
        return null;
      }
      
      const num = parseFloat(trimmed);
      if (!isNaN(num) && isFinite(num)) {
        return num;
      }
      
      return trimmed;
    });
  });

  return {
    headers,
    rows,
    totalRows: lines.length - 1, // Exclude header
    fileType
  };
}

/**
 * Parse JSON content and return preview
 */
function parseJSON(content: string, fileType: string): DatasetPreview {
  try {
    const data = JSON.parse(content);
    
    // Handle array of objects (most common case)
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
      const headers = Object.keys(data[0]);
      const rows: (string | number | null)[][] = data.slice(0, 20).map(item => 
        headers.map(header => {
          const value = item[header];
          if (value === null || value === undefined) return null;
          if (typeof value === 'number') return value;
          return String(value);
        })
      );
      
      return {
        headers,
        rows,
        totalRows: data.length,
        fileType
      };
    }
    
    // Handle single object
    if (typeof data === 'object' && data !== null) {
      const headers = Object.keys(data);
      const rows: (string | number | null)[][] = [
        headers.map(header => {
          const value = data[header];
          if (value === null || value === undefined) return null;
          if (typeof value === 'number') return value;
          return String(value);
        })
      ];
      
      return {
        headers,
        rows,
        totalRows: 1,
        fileType
      };
    }
    
    // Fallback for other formats
    return {
      headers: ['value'],
      rows: [[String(data)]],
      totalRows: 1,
      fileType
    };
  } catch (error) {
    console.error('JSON parsing failed:', error);
    return {
      headers: [],
      rows: [],
      totalRows: 0,
      fileType
    };
  }
}

/**
 * Parse ARFF content and return preview
 */
function parseARFF(content: string, fileType: string): DatasetPreview {
  const lines = content.split('\n').map(line => line.trim()).filter(line => line);
  
  const headers: string[] = [];
  const dataStartIndex = lines.findIndex(line => line.toLowerCase() === '@data');
  
  if (dataStartIndex === -1) {
    return {
      headers: [],
      rows: [],
      totalRows: 0,
      fileType
    };
  }
  
  // Extract attribute names from @attribute lines
  for (let i = 0; i < dataStartIndex; i++) {
    const line = lines[i].toLowerCase();
    if (line.startsWith('@attribute')) {
      // Extract attribute name (second token)
      const parts = lines[i].split(/\s+/);
      if (parts.length >= 2) {
        headers.push(parts[1]);
      }
    }
  }
  
  // Parse data rows (up to 20 rows after @data)
  const dataLines = lines.slice(dataStartIndex + 1, dataStartIndex + 21);
  const rows: (string | number | null)[][] = dataLines
    .filter(line => !line.startsWith('%')) // Skip comments
    .map(line => {
      // Split by comma, handling quoted values
      const values = line.split(',').map(val => val.trim());
      
      return values.map(val => {
        const cleaned = val.replace(/^'|'$/g, ''); // Remove single quotes
        
        if (cleaned === '?' || cleaned === '' || cleaned.toLowerCase() === 'null') {
          return null;
        }
        
        const num = parseFloat(cleaned);
        if (!isNaN(num) && isFinite(num)) {
          return num;
        }
        
        return cleaned;
      });
    });
  
  // Count total data rows
  const totalDataLines = lines.slice(dataStartIndex + 1).filter(line => 
    line && !line.startsWith('%')
  );
  
  return {
    headers,
    rows,
    totalRows: totalDataLines.length,
    fileType
  };
}