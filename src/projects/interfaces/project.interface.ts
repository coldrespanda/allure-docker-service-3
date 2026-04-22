export interface Project {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  results: ProjectResult[];
}

export interface ProjectResult {
  id: string;
  timestamp: string;
  path: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  generatedReport?: string;
  error?: string;
}
