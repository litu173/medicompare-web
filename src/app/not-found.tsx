import Link from "next/link";

export default function NotFound() {
  return (
    <div className="pt-20 text-center">
      <p className="text-5xl font-bold text-gray-300">404</p>
      <h1 className="mt-2 text-xl font-semibold">Page not found</h1>
      <Link href="/" className="mt-6 inline-block rounded-xl bg-brand-600 px-5 py-2.5 font-semibold text-white">
        Go home
      </Link>
    </div>
  );
}
