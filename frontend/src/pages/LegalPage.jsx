import { Link } from 'react-router-dom';

const content = {
  privacy: {
    title: 'Privacy Policy',
    intro: 'This Privacy Policy explains how MailBot collects, uses, and protects information when you use our application.',
    sections: [
      ['Information we collect', 'We may collect your name, email address, account details, and the digital asset information you choose to add to MailBot. We also collect limited technical information needed to keep the application secure and reliable.'],
      ['How we use information', 'We use information to provide and improve MailBot, authenticate your account, send requested renewal notifications, provide support, and protect the service from misuse.'],
      ['Data sharing', 'We do not sell your personal information. Information is shared only with service providers needed to operate MailBot, when required by law, or when necessary to protect our rights and users.'],
      ['Data security and retention', 'We use reasonable safeguards to protect your information. We retain account and asset data while your account is active or as needed to provide the service and meet legal obligations.'],
      ['Your choices', 'You may update your account information or request account deletion by contacting the MailBot administrator. You can also manage notification preferences inside the application.'],
      ['Changes to this policy', 'We may update this policy from time to time. Any changes will be posted on this page with an updated revision date.'],
    ],
  },
  terms: {
    title: 'Terms & Conditions',
    intro: 'These Terms & Conditions govern your access to and use of the MailBot application.',
    sections: [
      ['Using MailBot', 'You must provide accurate account information, keep your login credentials secure, and use the service only for lawful business and personal purposes.'],
      ['Your content', 'You retain ownership of the domains, subscriptions, notes, and other information you add to MailBot. You grant MailBot permission to process that information only as needed to operate the service.'],
      ['Notifications and accuracy', 'MailBot provides tracking and reminder tools. You are responsible for verifying asset details, renewal dates, billing information, and any action taken based on notifications.'],
      ['Prohibited use', 'Do not misuse the service, attempt unauthorized access, interfere with its operation, or upload content that violates applicable laws or the rights of others.'],
      ['Availability and changes', 'We work to keep MailBot available and may change, suspend, or discontinue features when reasonably necessary for maintenance, security, or product improvements.'],
      ['Termination', 'Access may be suspended or terminated if these terms are violated. You may stop using the service at any time and request deletion of your account data.'],
      ['Changes to these terms', 'We may update these terms as the service evolves. Continued use of MailBot after changes are posted means you accept the updated terms.'],
    ],
  },
};

export default function LegalPage({ type }) {
  const page = content[type] || content.privacy;

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#f0f2f5] dark:bg-[#191c20] text-[#111827] dark:text-white transition-colors duration-300">
      <header className="border-b border-[#dde1e9] dark:border-white/[0.06] bg-white/80 dark:bg-[#191c20]/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 min-h-16 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2.5" aria-label="MailBot home">
            <img src="/mailbotLogo.svg" alt="MailBot logo" className="w-9 h-9 object-contain" />
            <span className="font-bold text-[17px] tracking-tight">MailBot</span>
          </Link>
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:justify-end">
            <Link
              to="/privacy-policy"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                type === 'privacy'
                  ? 'bg-indigo-600 text-white'
                  : 'text-[#4b5563] dark:text-white/60 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400'
              }`}
            >
              Privacy
            </Link>
            <Link
              to="/terms-and-conditions"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                type === 'terms'
                  ? 'bg-indigo-600 text-white'
                  : 'text-[#4b5563] dark:text-white/60 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400'
              }`}
            >
              Terms
            </Link>
            <Link to="/" className="ml-1 sm:ml-2 text-xs sm:text-sm text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap">Back to home</Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16 break-words">
        <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-3">MailBot</p>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-5">{page.title}</h1>
        <p className="text-base sm:text-lg text-[#4b5563] dark:text-white/55 leading-relaxed mb-10 sm:mb-12">{page.intro}</p>
        <div className="space-y-7 sm:space-y-8">
          {page.sections.map(([heading, text]) => (
            <section key={heading}>
              <h2 className="text-xl font-bold mb-2">{heading}</h2>
              <p className="text-[#4b5563] dark:text-white/60 leading-7">{text}</p>
            </section>
          ))}
        </div>
        <p className="text-xs text-[#6b7280] dark:text-white/35 mt-14">Last updated: August 30, 2026</p>
      </main>
    </div>
  );
}
