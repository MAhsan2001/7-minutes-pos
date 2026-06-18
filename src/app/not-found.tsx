import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="text-center space-y-4 max-w-md animate-scale-in">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 text-primary font-heading font-bold text-4xl mx-auto">
          404
        </div>
        <h2 className="font-heading font-bold text-xl text-foreground">
          Page Not Found
        </h2>
        <p className="text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary-hover transition-colors btn-press shadow-lg shadow-primary/25"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
