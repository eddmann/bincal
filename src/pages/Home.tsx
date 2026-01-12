import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { buildCalendarUrl, buildDownloadUrl } from "../lib/api";

type Council = "tmbc" | "tunbridge-wells" | "maidstone";

const COUNCILS: { id: Council; name: string }[] = [
  { id: "tunbridge-wells", name: "Tunbridge Wells" },
  { id: "tmbc", name: "TMBC" },
  { id: "maidstone", name: "Maidstone" },
];

export default function Home() {
  const [council, setCouncil] = useState<Council>("tunbridge-wells");
  const [postcode, setPostcode] = useState("");
  const [property, setProperty] = useState("");

  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [groupCollections, setGroupCollections] = useState(true);
  const [calendarName, setCalendarName] = useState("Bin Collections");

  const [showResult, setShowResult] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  const [openInstruction, setOpenInstruction] = useState<string | null>(null);

  const canGenerate = postcode.trim() && property.trim();

  const subscribeUrl = canGenerate
    ? buildCalendarUrl({
        council,
        postcode,
        property: property.trim(),
        reminder: reminderEnabled ? "19:00" : undefined,
        group: groupCollections,
        name: calendarName,
      })
    : "";

  const downloadUrl = canGenerate
    ? buildDownloadUrl({
        council,
        postcode,
        property: property.trim(),
        reminder: reminderEnabled ? "19:00" : undefined,
        group: groupCollections,
        name: calendarName,
      })
    : "";

  useEffect(() => {
    if (showResult && subscribeUrl) {
      QRCode.toDataURL(subscribeUrl, {
        width: 120,
        margin: 2,
        color: { dark: "#111827", light: "#ffffff" },
      })
        .then(setQrCodeUrl)
        .catch(() => setQrCodeUrl(null));
    }
  }, [showResult, subscribeUrl]);

  const handleGenerate = () => {
    if (canGenerate) setShowResult(true);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(subscribeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    window.location.href = downloadUrl;
  };

  return (
    <div className="min-h-screen bg-[#f9fafb]">
      <div className="max-w-lg mx-auto px-5 py-12">
        {/* Header */}
        <header className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-teal-50 mb-4">
            <TrashIcon className="w-6 h-6 text-teal-600" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">
            BinCal
          </h1>
          <p className="text-sm text-gray-500">
            Subscribe to your local collection schedule
          </p>
        </header>

        {/* Main Card */}
        <div className="card p-6 space-y-6">
          {/* Council Selector */}
          <Section label="Council">
            <div className="flex gap-2">
              {COUNCILS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setCouncil(c.id);
                    setProperty("");
                    setShowResult(false);
                  }}
                  className={`flex-1 py-2.5 px-3 text-sm font-medium rounded-lg border transition-colors ${
                    council === c.id
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </Section>

          {/* Address */}
          <Section label="Address">
            <div className="space-y-3">
              <input
                type="text"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value.toUpperCase())}
                placeholder="Postcode"
                className="input"
              />
              <div>
                <input
                  type="text"
                  value={property}
                  onChange={(e) => setProperty(e.target.value)}
                  placeholder={council === "maidstone" ? "House number (e.g. 25, Flat 2)" : "UPRN"}
                  className="input"
                />
                {council !== "maidstone" && (
                  <a
                    href="https://www.findmyaddress.co.uk/search"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-xs text-teal-600 hover:text-teal-700 mt-1.5"
                  >
                    Find your UPRN →
                  </a>
                )}
              </div>
            </div>
          </Section>

          {/* Options */}
          <Section label="Options">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Evening reminder</p>
                  <p className="text-xs text-gray-500">Notify at 7pm the day before</p>
                </div>
                <Toggle checked={reminderEnabled} onChange={setReminderEnabled} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Group collections</p>
                  <p className="text-xs text-gray-500">Combine same-day bins</p>
                </div>
                <Toggle checked={groupCollections} onChange={setGroupCollections} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">
                  Calendar name
                </label>
                <input
                  type="text"
                  value={calendarName}
                  onChange={(e) => setCalendarName(e.target.value)}
                  className="input"
                />
              </div>
            </div>
          </Section>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="btn btn-primary w-full py-3"
          >
            Generate Calendar
          </button>
        </div>

        {/* Result Panel */}
        {showResult && canGenerate && (
          <div className="card p-6 mt-4 animate-fade-in">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center">
                <CheckIcon className="w-4 h-4 text-teal-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Calendar ready</p>
                <p className="text-xs text-gray-500">Choose how to add it</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <button onClick={handleDownload} className="btn btn-secondary gap-2">
                <DownloadIcon className="w-4 h-4" />
                Download
              </button>
              <button onClick={handleCopy} className="btn btn-secondary gap-2">
                {copied ? (
                  <CheckIcon className="w-4 h-4 text-teal-600" />
                ) : (
                  <CopyIcon className="w-4 h-4" />
                )}
                {copied ? "Copied" : "Copy URL"}
              </button>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 mb-5">
              <p className="text-xs text-gray-500 mb-1">Subscribe URL</p>
              <p className="text-xs text-gray-700 font-mono break-all leading-relaxed">
                {subscribeUrl}
              </p>
            </div>

            <div className="flex justify-center">
              <div className="p-2 bg-white border border-gray-100 rounded-lg">
                {qrCodeUrl ? (
                  <img src={qrCodeUrl} alt="QR Code" className="w-28 h-28" />
                ) : (
                  <div className="w-28 h-28 bg-gray-100 rounded flex items-center justify-center">
                    <span className="text-xs text-gray-400">Loading...</span>
                  </div>
                )}
              </div>
            </div>
            <p className="text-center text-xs text-gray-400 mt-2">
              Scan to subscribe on mobile
            </p>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-4 space-y-2">
          {[
            {
              id: "google",
              name: "Google Calendar",
              icon: <CalendarIcon />,
              steps: [
                "Open Google Calendar Settings",
                "Click 'Add calendar' → 'From URL'",
                "Paste the subscribe URL",
                "Click 'Add calendar'",
              ],
            },
            {
              id: "apple",
              name: "Apple Calendar",
              icon: <AppleIcon />,
              steps: [
                "Open Calendar app",
                "File → New Calendar Subscription",
                "Paste the subscribe URL",
                "Click 'Subscribe'",
              ],
            },
            {
              id: "outlook",
              name: "Outlook",
              icon: <MailIcon />,
              steps: [
                "Open Outlook Calendar",
                "Add calendar → Subscribe from web",
                "Paste the subscribe URL",
                "Click 'Import'",
              ],
            },
          ].map((item) => (
            <div key={item.id} className="card overflow-hidden">
              <button
                onClick={() =>
                  setOpenInstruction(openInstruction === item.id ? null : item.id)
                }
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <span className="flex items-center gap-3">
                  <span className="text-gray-400">{item.icon}</span>
                  <span className="text-sm font-medium text-gray-900">{item.name}</span>
                </span>
                <ChevronIcon open={openInstruction === item.id} />
              </button>
              {openInstruction === item.id && (
                <div className="px-4 pb-4 animate-fade-in">
                  <ol className="space-y-1.5 text-sm text-gray-600 ml-8">
                    {item.steps.map((step, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-gray-400">{i + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <footer className="mt-10 text-center text-xs text-gray-400 space-y-2">
          <p>Data refreshes automatically every 24 hours</p>
          <p>
            Created by{" "}
            <a
              href="https://eddmann.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-600 hover:text-teal-700"
            >
              Edd Mann
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}

// Components

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
        {label}
      </label>
      {children}
    </section>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`toggle ${checked ? "active" : ""}`}
    >
      <div className="toggle-knob" />
    </button>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  );
}
