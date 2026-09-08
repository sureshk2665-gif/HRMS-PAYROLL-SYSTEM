// The backend serves uploaded files (employee photos, company logo) as
// relative paths like "/uploads/company/logo-123.png". The frontend runs on
// a different port (Vite dev server), so these need to be resolved against
// the backend's origin, not the frontend's, or the browser will 404.
export function resolveUploadUrl(relativeUrl: string | null | undefined): string | null {
  if (!relativeUrl) return null;
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
  const backendOrigin = apiBase.replace(/\/api\/?$/, '');
  return `${backendOrigin}${relativeUrl}`;
}
