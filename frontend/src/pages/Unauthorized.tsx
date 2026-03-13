import { Link } from 'react-router-dom';

export default function Unauthorized() {
  return (
    <div className="max-w-2xl mx-auto py-20 text-center space-y-4">
      <h1 className="text-3xl font-bold text-[#2A1B7A]">Access restricted</h1>
      <p className="text-slate-500">You don&apos;t have permission to view this page.</p>
      <div className="flex items-center justify-center gap-3">
        <Link to="/" className="btn-secondary px-6">Go Home</Link>
        <Link to="/login" className="btn-primary px-6">Login</Link>
      </div>
    </div>
  );
}

