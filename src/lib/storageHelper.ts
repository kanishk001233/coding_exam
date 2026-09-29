import { supabase, isSupabaseConfigured } from './supabase';

export interface UploadMediaResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Uploads an image or GIF to Supabase storage bucket 'images'.
 * Falls back to Base64 Data URL if Supabase is unconfigured or encounters an error.
 */
export async function uploadQuestionImage(file: File): Promise<UploadMediaResult> {
  // 1. Validation
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  const isImageOrGif = validTypes.includes(file.type) || /\.(gif|jpe?g|png|webp|svg)$/i.test(file.name);
  
  if (!isImageOrGif) {
    return {
      success: false,
      error: 'Invalid file format. Please upload an image or GIF (PNG, JPG, GIF, WebP, SVG).'
    };
  }

  // 15MB limit
  const maxSizeBytes = 15 * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      success: false,
      error: 'File size exceeds 15MB limit. Please choose a smaller image or GIF.'
    };
  }

  // 2. Try Supabase Storage Upload if configured
  if (isSupabaseConfigured && supabase) {
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const uniquePath = `questions/${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${cleanFileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('images')
        .upload(uniquePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type || `image/${fileExt}`
        });

      if (uploadError) {
        console.warn('Supabase storage upload failed, falling back to data URL:', uploadError.message);
      } else if (uploadData) {
        const { data: publicData } = supabase.storage.from('images').getPublicUrl(uploadData.path);
        if (publicData && publicData.publicUrl) {
          return {
            success: true,
            url: publicData.publicUrl
          };
        }
      }
    } catch (err: any) {
      console.warn('Supabase storage exception, falling back to data URL:', err?.message || err);
    }
  }

  // 3. Fallback: Convert to Base64 Data URL (Local / Offline support)
  try {
    const base64Url = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });

    return {
      success: true,
      url: base64Url
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to process image file.'
    };
  }
}
