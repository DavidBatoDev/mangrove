import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mg-alert">
      <p><strong>Not found.</strong> There is nothing at this address.</p>
      <Link href="/">Back to the map</Link>
    </div>
  );
}
