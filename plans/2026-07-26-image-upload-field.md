# DXForm field type: image/file upload

Status: OPEN, but **downgraded from blocker to nicety (2026-08-20)** — see the
note at the end. A consumer closed the gap without this.

Origin: a consumer's /employees review (EM3), 2026-07-26.

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


---

## Update 2026-08-20 — this was never the blocker

The consumer that filed this had six pages parked on it. It turns out
media-library-pro does not upload through the form at all: the file POSTs to
its own `/media-library-pro/uploads` route, which answers `{ uuid, name, … }`,
and the model field then carries a plain JSON map keyed by uuid that
`syncFromMediaLibraryRequest` reads on save. The surrounding form stays ordinary
JSON.

So the gap was closed with a small app-side component in a `#value` slot — no
new dependency, no multipart in `useForm`, no change to any controller.

That changes the shape of the ask rather than removing it:

- **Point 2 (multipart in useForm) is NOT needed for media-library.** It would
  only matter for an app that posts the file as part of the form itself. Worth
  confirming a real consumer needs it before building it.
- **Points 1 and 3 (a `type: "file"`/`"image"` DXField, passed through by
  DXTable's edit-fields) still stand,** and would be genuinely nicer than every
  consumer hand-rolling a `#value` slot — but as ergonomics, not as an unblock.

Two details from the implementation worth folding into whatever ships:

- **Preview a fresh upload from the LOCAL file** (`URL.createObjectURL`,
  revoked on unmount). A temporary upload has no server URL unless
  `generate_thumbnails_for_temporary_uploads` is on, so a just-picked image
  otherwise renders with an empty `src`.
- **Check dimension/size constraints BEFORE uploading.** Where the server
  enforces exact dimensions, uploading first and failing at save time gives a
  422 on a field that looks unrelated and leaves an orphaned temporary upload.
