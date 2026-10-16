import type { Metadata } from "next";
import QRCode from "qrcode";
import { Download, Smartphone, Wifi, ShieldCheck } from "lucide-react";

export const metadata: Metadata = { title: "Get the app" };

/** Latest Android build, published by the mobile repo's GitHub Actions workflow. */
const APK_URL =
  process.env.ANDROID_APK_URL ??
  "https://github.com/litu173/medicompare-mobile/releases/download/latest-android/medicompare.apk";

export default async function AppPage() {
  const qr = await QRCode.toString(APK_URL, { type: "svg", margin: 1, width: 180, color: { dark: "#063d31" } });
  const steps = [
    {
      icon: Download,
      t: "Download the APK",
      d: "Tap the button below on your Android phone, or scan the QR code with its camera.",
    },
    {
      icon: ShieldCheck,
      t: "Allow the install",
      d: "Android will ask to allow installs from your browser (Settings → Install unknown apps). This is a test build, not from the Play Store yet.",
    },
    {
      icon: Wifi,
      t: "Connect to the server",
      d: "In the app open Account → Server address and enter this computer's Wi-Fi address, e.g. 192.168.0.104:3000. The phone must be on the same Wi-Fi.",
    },
  ];
  return (
    <div className="space-y-5 pt-6">
      <div className="flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-2xl bg-brand-600 text-white">
          <Smartphone className="size-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold">MediCompare for Android</h1>
          <p className="text-sm text-gray-700">Test build · iPhone version coming soon</p>
        </div>
      </div>

      <section className="flex flex-col items-center gap-4 rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-black/5 sm:flex-row sm:text-left">
        <div
          className="hidden shrink-0 rounded-xl border border-gray-200 p-2 sm:block"
          dangerouslySetInnerHTML={{ __html: qr }}
        />
        <div className="space-y-3">
          <a
            href={APK_URL}
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand-600 px-5 font-semibold text-white hover:bg-brand-700"
          >
            <Download className="size-5" /> Download for Android (.apk)
          </a>
          <p className="text-sm text-gray-700">
            On a computer? Scan the QR code with your phone&apos;s camera to download it there.
          </p>
        </div>
      </section>

      <ol className="space-y-3">
        {steps.map((s, i) => (
          <li key={s.t} className="flex gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-50 font-bold text-brand-700">
              {i + 1}
            </span>
            <div>
              <p className="flex items-center gap-2 font-semibold">
                <s.icon className="size-4 text-brand-700" /> {s.t}
              </p>
              <p className="text-sm text-gray-700">{s.d}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="text-xs text-gray-600">
        Each new build is signed with a temporary key. If installing an update fails, uninstall the old app first.
      </p>
    </div>
  );
}
