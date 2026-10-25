import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const CONTACT_EMAIL = 'YOUR_SUPPORT_EMAIL@example.com';
const OWNER = 'SOLRIDE (operated by YOUR NAME)';
const COUNTRY = 'YOUR COUNTRY';

const PRIVACY = [
  ['Who we are', `${OWNER} runs the SOLRIDE app. Questions: ${CONTACT_EMAIL}.`],
  ['What we collect', ['Account: username, email, password (stored only as a secure hash).',
    'Profile (optional): name, birth date, deck setup, favourite trick/spot, bio, photo.',
    'Location: GPS while a ride runs, when you add a spot, and while you show as a live rider. Not when the app is closed.',
    'Content: trick videos, captions, tags, spots, photos, chat and direct messages, tips, reports.',
    'Usage: DFQ points and ride history, server logs (IP, time) for security.']],
  ['How we use it', ['To run the app.', 'One account per email, stop spam and abuse.', 'Moderate reported content.',
    'We do not sell data, show ads or track you across other apps.']],
  ['Who can see it', ['Public: username, photo, profile, tricks, spots, global chat, live position while riding.',
    'Private: email, password, DMs, points history.']],
  ['Service providers', ['Supabase (database, storage)', 'Railway (hosting)', 'Email provider (sign-up code only)', 'OpenStreetMap (map tiles)']],
  ['Retention & deletion', 'Kept while your account exists. Profile → Delete account removes everything immediately; backups are overwritten within 30 days.'],
  ['Your rights', 'Email us to see, correct, export or delete your data.'],
  ['Children', 'SOLRIDE is for ages 13+. Accounts of younger users are deleted.'],
  ['DFQ points', 'In-app points with no cash value. Cannot be bought, sold or withdrawn.'],
];
const TERMS = [
  ['Agreement', `Using SOLRIDE means you accept these Terms (EULA). Contact: ${CONTACT_EMAIL}.`],
  ['Who can use it', 'Age 13+. One account per person.'],
  ['Zero tolerance', ['No harassment, threats, hate speech.', 'No nudity or sexual content.', 'No violence, illegal acts, spam, scams, impersonation.',
    'Reports reviewed within 24h; content removed and accounts banned.']],
  ['Report and block', 'Every trick, spot, profile and message can be reported or its author blocked.'],
  ['Your content', 'You own it; you let SOLRIDE show it inside the app. Delete it any time.'],
  ['Skate safe', 'Skateboarding is dangerous. Wear protection, respect laws and property. You skate at your own risk.'],
  ['DFQ points', 'No money value, cannot be bought, withdrawn or exchanged; may be changed or reset.'],
  ['No warranty', 'App provided "as is"; liability limited as far as the law allows.'],
  ['Apple', 'These Terms are between you and SOLRIDE, not Apple. Apple has no support obligation and is a third-party beneficiary.'],
  ['Law', `Governed by the laws of ${COUNTRY}.`],
];

export default function LegalPage({ kind }) {
  const navigate = useNavigate();
  const isPrivacy = kind === 'privacy';
  return (
    <div className="min-h-screen bg-black text-white pb-16">
      <header className="sticky top-0 z-40 flex items-center gap-3 px-4 py-3 bg-black/80 backdrop-blur-md border-b border-neutral-900">
        <button onClick={() => navigate(-1)} className="w-11 h-11 -ml-2 flex items-center justify-center text-neutral-400"><ArrowLeft size={20} /></button>
        <span className="font-black uppercase tracking-widest text-sm">{isPrivacy ? 'Privacy Policy' : 'Terms of Use'}</span>
      </header>
      <main className="max-w-2xl mx-auto px-5 pt-6 space-y-6">
        {(isPrivacy ? PRIVACY : TERMS).map(([title, body]) => (
          <section key={title} className="space-y-2">
            <h2 className="text-sm font-black uppercase tracking-wider text-[#D2FF00]">{title}</h2>
            {Array.isArray(body)
              ? <ul className="list-disc pl-5 space-y-1.5 text-sm text-neutral-300">{body.map((b) => <li key={b}>{b}</li>)}</ul>
              : <p className="text-sm text-neutral-300">{body}</p>}
          </section>
        ))}
      </main>
    </div>
  );
}