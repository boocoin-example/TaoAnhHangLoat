export type AspectRatio = "1:1" | "9:16" | "16:9";

export interface GenerationRequest {
  prompt: string;
  aspectRatio: AspectRatio;
  referenceImage?: string; // base64
}

export interface GenerationResponse {
  imageUrl: string;
  success: boolean;
  error?: string;
}

export interface PromptItem {
  id: string;
  text: string;
  status: 'idle' | 'processing' | 'completed' | 'error';
  imageUrl?: string;
  error?: string;
}
