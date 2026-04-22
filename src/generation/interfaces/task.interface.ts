export interface GenerationTask {
  id: string;
  projectId: string;
  resultId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  outputPath?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}
