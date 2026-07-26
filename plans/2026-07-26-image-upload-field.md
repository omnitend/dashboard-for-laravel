# DXForm field type: image/file upload

Status: OPEN. Origin: greendragon /employees review (EM3), 2026-07-26.

## Problem

Consumers keep hitting form fields that are files, not scalars. Concrete
case: greendragon's legacy employee form let you upload a name-badge image
(a Spatie media-library collection on the Employee model). The app-next port
had to drop the field — DXForm/edit-fields have no file or image type — so
the cutover has a functional regression on that page (and the same gap will
bite product images and any other media field later).

## Is this dfl's job or Spatie-specific? (James raised this)

Split it: the STORAGE side (Spatie media-library, collections, conversions)
is app/server territory and stays out of dfl. The FIELD side is universal —
"render a file input with constraints and a preview, carry the File through
the form submit" doesn't care what the server does with the bytes. dfl
already owns the transport (useForm's fetch), so it can own multipart too.

## Ask

1. **`type: "file"` (and an `"image"` variant) in DXField**:
   - native `<input type="file">` styled like the other controls; `accept`,
     `multiple` off by default;
   - `"image"` adds a thumbnail preview of the current value and the pending
     selection (object URL), plus a clear/remove affordance;
   - current-value display: the field reads a URL from the form data (e.g.
     `field.previewKey` or the field's own value when it's a string URL) so
     an existing server-side image shows before any change.
2. **useForm multipart support**: when any form value is a `File`/`FileList`,
   submit as `FormData` instead of JSON (and spoof `_method` for PUT/PATCH,
   since PHP only parses multipart on POST). Everything else about the 422 /
   onSuccess contract stays identical.
3. **DXTable edit-modal pass-through**: `edit-fields` accepts the new type
   unchanged (it already funnels through DXField).

The consumer then handles the request server-side however it likes —
greendragon will pass the uploaded file to Spatie
(`$model->addMediaFromRequest(...)->toMediaCollection(...)`); another app
could `Storage::put`. No Spatie coupling in dfl.

## Notes

- Deletion/replacement semantics: simplest v1 contract is "absent = leave
  alone, File = replace, explicit null via a remove checkbox = delete" —
  document whichever is chosen.
- greendragon consumer wiring (EmployeeApiController + the employees page
  edit-fields) lands there once this ships; the legacy reference is
  lt-employees' name_badge_media field.
