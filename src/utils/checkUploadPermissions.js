/**
 * Diagnostic utility to check admin upload permissions
 * Run this in browser console when logged into admin panel
 */

import { supabase } from '../lib/supabase';

export async function checkUploadPermissions() {
  console.log('🔍 Checking upload permissions...\n');

  // 1. Check if user is authenticated
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError) {
    console.error('❌ Session error:', sessionError);
    return;
  }

  if (!session) {
    console.error('❌ No active session - you must be logged in!');
    console.log('📝 Solution: Log in at /?admin=true');
    return;
  }

  console.log('✅ Authenticated as:', session.user.email);
  console.log('📝 User ID:', session.user.id);
  console.log('📝 Role:', session.user.role);
  console.log('📝 Token expires:', new Date(session.expires_at * 1000).toLocaleString());
  console.log('');

  // 2. Check if bucket exists
  console.log('🪣 Checking bucket...');
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  
  if (bucketsError) {
    console.error('❌ Error listing buckets:', bucketsError);
    return;
  }

  const productBucket = buckets.find(b => b.id === 'product-images');
  
  if (!productBucket) {
    console.error('❌ Bucket "product-images" does not exist!');
    console.log('📝 Solution: Run fix-admin-storage-upload.sql');
    return;
  }

  console.log('✅ Bucket exists:', productBucket.name);
  console.log('📝 Public:', productBucket.public);
  console.log('📝 File size limit:', (productBucket.file_size_limit / 1024 / 1024).toFixed(1), 'MB');
  console.log('📝 Allowed MIME types:', productBucket.allowed_mime_types || 'Not specified');
  console.log('');

  // 3. Test upload with a tiny test file
  console.log('📤 Testing upload permissions...');
  
  // Create a tiny test image (1x1 PNG)
  const testBlob = await fetch('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')
    .then(r => r.blob());
  
  const testFile = new File([testBlob], 'test-upload.png', { type: 'image/png' });
  const testPath = `test/${Date.now()}-test.png`;

  try {
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(testPath, testFile, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Upload test failed:', uploadError.message);
      
      // Specific error diagnostics
      if (uploadError.message.includes('mime type')) {
        console.log('📝 Issue: Bucket does not allow this MIME type');
        console.log('📝 Solution: Run fix-admin-storage-upload.sql to configure allowed_mime_types');
      } else if (uploadError.message.includes('policy') || uploadError.message.includes('security')) {
        console.log('📝 Issue: Row Level Security policy blocking upload');
        console.log('📝 Solution: Run fix-admin-storage-upload.sql to create RLS policies');
      } else if (uploadError.message.includes('size')) {
        console.log('📝 Issue: File too large for bucket limit');
        console.log('📝 File size:', (testFile.size / 1024).toFixed(1), 'KB');
      }
      
      return;
    }

    console.log('✅ Upload test successful!');
    console.log('📝 Path:', uploadData.path);
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(testPath);
    
    console.log('📝 Public URL:', publicUrl);

    // Clean up test file
    console.log('🧹 Cleaning up test file...');
    await supabase.storage
      .from('product-images')
      .remove([testPath]);
    
    console.log('✅ Test file deleted');
    console.log('');
    console.log('✨ All checks passed! Upload should work.');

  } catch (err) {
    console.error('❌ Unexpected error during test:', err);
  }
}

// Add to window for easy console access
if (typeof window !== 'undefined') {
  window.checkUploadPermissions = checkUploadPermissions;
}
