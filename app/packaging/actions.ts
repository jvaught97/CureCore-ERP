'use server';

import { createClient } from '@/utils/supabase/server';
import { PackagingUpdate, PackagingFileInsert } from '@/types/database';
import {
  isValidFileType,
  MAX_FILE_SIZE,
  FileCategory,
} from '@/lib/packaging-constants';

/**
 * Upload a file for a packaging item
 */
export async function uploadPackagingFile(
  packagingId: string,
  formData: FormData
): Promise<{ success: boolean; error?: string; fileId?: string }> {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    const file = formData.get('file') as File;
    const fileCategory = formData.get('category') as FileCategory;

    if (!file) {
      return { success: false, error: 'No file provided' };
    }

    // Validate file type
    if (!isValidFileType(file)) {
      return {
        success: false,
        error: 'Invalid file type. Only PDF, PNG, JPG, SVG, AI, and EPS files are allowed.',
      };
    }

    // Validate file size (10MB max)
    if (file.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: 'File size must be less than 10MB',
      };
    }

    // Verify packaging item exists
    const { data: packaging, error: packagingError } = await supabase
      .from('packaging')
      .select('id, name')
      .eq('id', packagingId)
      .single();

    if (packagingError || !packaging) {
      return { success: false, error: 'Packaging item not found' };
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const timestamp = Date.now();
    const fileName = `${user.id}/${packagingId}/${fileCategory}-${timestamp}.${fileExt}`;

    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('packaging-files')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return { success: false, error: 'Failed to upload file' };
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('packaging-files').getPublicUrl(fileName);

    // Insert file record into database
    const fileInsert: PackagingFileInsert = {
      packaging_id: packagingId,
      file_name: file.name,
      file_type: file.type,
      file_url: publicUrl,
      file_category: fileCategory,
      file_size: file.size,
    };

    const { data: fileRecord, error: dbError } = await supabase
      .from('packaging_files')
      .insert({
        ...fileInsert,
        tenant_id: user.id,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (dbError) {
      // Clean up uploaded file if database insert fails
      await supabase.storage.from('packaging-files').remove([fileName]);
      console.error('Database error:', dbError);
      console.error('Error details:', JSON.stringify(dbError, null, 2));
      return { success: false, error: `Failed to save file record: ${dbError.message || dbError.code || 'Unknown error'}` };
    }

    return { success: true, fileId: fileRecord.id };
  } catch (error) {
    console.error('Upload error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Delete a packaging file
 */
export async function deletePackagingFile(
  fileId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get file record
    const { data: fileRecord, error: fetchError } = await supabase
      .from('packaging_files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (fetchError || !fileRecord) {
      return { success: false, error: 'File not found' };
    }

    // Extract storage path from URL
    const url = new URL(fileRecord.file_url);
    const pathParts = url.pathname.split('/');
    const bucketIndex = pathParts.indexOf('packaging-files');
    const storagePath = pathParts.slice(bucketIndex + 1).join('/');

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('packaging-files')
      .remove([storagePath]);

    if (storageError) {
      console.error('Storage deletion error:', storageError);
      // Continue with database deletion even if storage fails
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('packaging_files')
      .delete()
      .eq('id', fileId);

    if (dbError) {
      console.error('Database deletion error:', dbError);
      return { success: false, error: 'Failed to delete file record' };
    }

    return { success: true };
  } catch (error) {
    console.error('Delete error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get all files for a packaging item
 */
export async function getPackagingFiles(packagingId: string) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { data: null, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('packaging_files')
      .select('*')
      .eq('packaging_id', packagingId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch files error:', error);
      return { data: null, error: 'Failed to fetch files' };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Get files error:', error);
    return { data: null, error: 'An unexpected error occurred' };
  }
}

/**
 * Update packaging details including category-specific fields
 */
export async function updatePackagingDetails(
  packagingId: string,
  updates: PackagingUpdate
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Update packaging
    const { error: updateError } = await supabase
      .from('packaging')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', packagingId);

    if (updateError) {
      console.error('Update error:', updateError);
      return { success: false, error: 'Failed to update packaging' };
    }

    // Log activity
    const { data: packaging } = await supabase
      .from('packaging')
      .select('name')
      .eq('id', packagingId)
      .single();

    if (packaging) {
      await supabase.from('activity_log').insert({
        tenant_id: user.id,
        user_id: user.id,
        action: 'packaging_update',
        description: `Updated packaging details for: ${packaging.name}`,
        metadata: {
          packaging_id: packagingId,
          updated_fields: Object.keys(updates),
        },
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Update packaging error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Download a packaging file
 */
export async function downloadPackagingFile(fileId: string) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { data: null, error: 'Not authenticated' };
    }

    // Get file record
    const { data: fileRecord, error: fetchError } = await supabase
      .from('packaging_files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (fetchError || !fileRecord) {
      return { data: null, error: 'File not found' };
    }

    return { data: fileRecord, error: null };
  } catch (error) {
    console.error('Download error:', error);
    return { data: null, error: 'An unexpected error occurred' };
  }
}
