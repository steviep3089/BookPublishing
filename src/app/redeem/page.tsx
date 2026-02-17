import Link from "next/link";

export default function RedeemPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token || "";

  return (
    <main className="app-shell">
      <h1>Claim your 7-day trial (Episode 1)</h1>
      {!token ? (
        <p>Missing token.</p>
      ) : (
        <>
          <p>Step 1: Log in (magic link). Step 2: Click &quot;Claim trial&quot;.</p>
          <div className="page-actions">
            <Link href="/login">Log in</Link>
            <form action="/redeem/claim" method="post">
              <input type="hidden" name="token" value={token} />
              <button type="submit">Claim trial</button>
            </form>
          </div>
        </>
      )}
    </main>
  );
}
