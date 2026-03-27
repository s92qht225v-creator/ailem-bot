# Admin Upload Debugging - Quick Steps

Since you confirmed the bucket and policies are correct, the issue is likely one of these:

## 1. Check Authentication Status

**Open browser console** (F12 → Console) when logged into admin panel and check:

```javascript
// Run this in console
checkUploadPermissions()
```

This will tell you exactly what's wrong. Look for:
- ✅ "Authenticated as: [your-email]" → Good, you're logged in
- ❌ "No active session" → You need to log in

## 2. Common Issues When Bucket/Policies Are Correct

### Issue A: Not Logged In
**Symptom:** Upload button does nothing or shows permission error

**Check:**
```javascript
// In console
supabase.auth.getSession().then(({data}) => console.log(data.session))
```

If returns `null`, you're not authenticated.

**Fix:**
1. Go to http://localhost:3000/?admin=true
2. Log in with admin email/password
3. Try upload again

### Issue B: File Input Not Triggering
**Symptom:** Click upload button, file dialog doesn't open

**Check browser console for:**
- JavaScript errors
- Event handler issues

**Fix:**
Open DevTools → Elements → Find the upload button:
```html
<input type="file" accept="image/*" multiple ... />
```
Right-click → Inspect → Check if `disabled` attribute is present

### Issue C: Upload Starts But Fails Silently
**Symptom:** File dialog opens, select file, but nothing happens

**Check console logs:**
```
📤 Uploading to Supabase Storage...
❌ Image upload failed: [error message]
```

**Common errors:**
- "mime type not supported" → Run SQL to add MIME type
- "new row violates" → RLS policy issue (but you said this is correct)
- "unauthorized" → Session expired, log in again

### Issue D: CORS or Network Issue
**Symptom:** Upload fails with network error

**Check Network tab** (F12 → Network):
- Look for POST request to `supabase.co/storage`
- Status code 403/401 → Auth issue
- Status code 415 → MIME type issue
- No request at all → JavaScript not running

## 3. Quick Fix: Add Debug Logging

If upload button does nothing, add temporary logging:

1. Open browser console
2. Run:
```javascript
// Override the upload function to add logging
const originalOnChange = document.querySelector('input[type="file"][multiple]')?.onchange;
console.log('File input found:', !!originalOnChange);
```

## 4. Test Direct Upload

Test if Supabase upload works at all:

```javascript
// In console (when logged in to admin)
const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });

supabase.storage
  .from('product-images')
  .upload(`test/${Date.now()}.txt`, testFile)
  .then(result => {
    console.log('Direct upload result:', result);
    // Clean up
    if (result.data) {
      supabase.storage.from('product-images').remove([result.data.path]);
    }
  });
```

If this works → Issue is in React component
If this fails → Issue is with Supabase config

## 5. What Error Do You See?

When you click "Rasmlarni yuklash" and select a file:

**A) Nothing happens at all**
→ Check: Is JavaScript error in console? Is file input disabled?

**B) "Yuklanmoqda..." appears then disappears**
→ Check: Console logs for upload error message

**C) Toast error message appears**
→ What does it say exactly? (e.g., "Rasm yuklashda xatolik: ...")

**D) Upload seems to work but image doesn't appear**
→ Check: Is `setAllImages()` being called? Check React DevTools state

## Next Steps

Run `checkUploadPermissions()` in console and paste the output here. That will tell us exactly what's wrong.

Alternatively, tell me:
1. What happens when you click the upload button?
2. Any errors in console?
3. Are you logged in as admin (did you enter email/password)?
