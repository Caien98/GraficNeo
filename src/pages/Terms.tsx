import React from 'react';
import { ChevronLeft } from 'lucide-react';

export default function Terms({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 flex items-start justify-center p-6">
      <div className="w-full max-w-3xl bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-gray-100 dark:border-neutral-800 p-6 sm:p-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-600 dark:text-neutral-300 hover:text-brand-600 mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        <h1 className="font-display text-2xl font-bold mb-4">GraficNeo Terms of Service</h1>
        <p className="text-sm text-gray-500 dark:text-neutral-400 mb-6">Last updated: August 8, 2026</p>

        <div className="prose dark:prose-invert max-w-none text-sm text-gray-700 dark:text-neutral-200">
          <p>
            Welcome to GraficNeo. These Terms of Service (“Terms”) govern your access to and use of the
            GraficNeo website, application, and services (“GraficNeo”, “we”, “us”, or “our”).
          </p>
          <p>By creating an account or using GraficNeo, you agree to these Terms. If you do not agree with them, you must not use GraficNeo.</p>

          <h2>1. Eligibility</h2>
          <p>
            You must provide accurate information when creating your account.
          </p>
          <p>
            If you are under the minimum age required to use an online service in your country, you may only use GraficNeo with the required permission or supervision of a parent or legal guardian.
          </p>
          <p>
            You are responsible for making sure that your use of GraficNeo is permitted under the laws applicable to you.
          </p>

          <h2>2. Your Account</h2>
          <p>You are responsible for maintaining the security of your account and password.</p>
          <p>You must not:</p>
          <ul>
            <li>impersonate another person;</li>
            <li>create an account using false or misleading information;</li>
            <li>share your password with others;</li>
            <li>attempt to access another user’s account;</li>
            <li>use another person’s account without permission.</li>
          </ul>
          <p>You are responsible for activity performed through your account.</p>

          <h2>3. Content You Post</h2>
          <p>
            GraficNeo allows users to create and share content, including posts, images, comments, profile information, and other material (“User Content”).
          </p>
          <p>You retain ownership of the content you create and upload.</p>
          <p>
            By posting User Content on GraficNeo, you grant GraficNeo a non-exclusive, worldwide, royalty-free license to host, store, reproduce, display, and distribute that content as necessary to operate and provide the service.
          </p>
          <p>You are responsible for the content you post.</p>
          <p>You must not upload or share content that:</p>
          <ul>
            <li>violates applicable law;</li>
            <li>infringes another person’s copyright, trademark, or other rights;</li>
            <li>contains malicious software;</li>
            <li>attempts to obtain another person’s private information;</li>
            <li>contains threats or targeted harassment;</li>
            <li>impersonates another person or organization;</li>
            <li>is intended to scam, deceive, or manipulate other users.</li>
          </ul>
          <p>We may remove or restrict content that violates these Terms or creates a risk to users or the service.</p>

          <h2>4. Messages and Interactions</h2>
          <p>
            GraficNeo may provide features such as direct messages, comments, likes, follows, notifications, and other interactions.
          </p>
          <p>You must use these features responsibly and must not use them for spam, harassment, scams, or other abusive activity.</p>

          <h2>5. Prohibited Activities</h2>
          <p>You must not:</p>
          <ul>
            <li>attempt to bypass security or authentication systems;</li>
            <li>interfere with the operation of GraficNeo;</li>
            <li>scrape or automatically collect information without permission;</li>
            <li>introduce malware or other harmful code;</li>
            <li>attempt to gain unauthorized access to our servers, databases, or accounts;</li>
            <li>use GraficNeo to conduct fraudulent or illegal activities;</li>
            <li>intentionally overload or disrupt the service.</li>
          </ul>

          <h2>6. Moderation and Account Restrictions</h2>
          <p>We may investigate suspected violations of these Terms.</p>
          <p>We may warn, restrict, suspend, or terminate an account when reasonably necessary to protect GraficNeo, its users, or the integrity of the service.</p>
          <p>Where appropriate, we may provide information about the reason for an account restriction.</p>

          <h2>7. Intellectual Property</h2>
          <p>GraficNeo and its original software, branding, interface, logos, and other materials are owned by or licensed to GraficNeo unless otherwise stated.</p>
          <p>You may not copy, modify, distribute, reverse engineer, or commercially exploit GraficNeo without permission, except where applicable law permits it.</p>

          <h2>8. Third-Party Services</h2>
          <p>GraficNeo may use third-party services to provide features such as authentication, hosting, databases, storage, analytics, or other infrastructure.</p>
          <p>Your use of those services through GraficNeo may also be subject to their respective terms and policies.</p>

          <h2>9. Availability</h2>
          <p>We aim to keep GraficNeo available and reliable, but we do not guarantee uninterrupted or error-free operation.</p>
          <p>The service may occasionally be unavailable because of maintenance, updates, technical problems, security incidents, or circumstances outside our control.</p>

          <h2>10. Disclaimer</h2>
          <p>GraficNeo is provided on an “as is” and “as available” basis to the extent permitted by law.</p>
          <p>We do not guarantee that the service will always be available, secure, accurate, or free from errors.</p>
          <p>Nothing in these Terms excludes rights or protections that cannot legally be excluded.</p>

          <h2>11. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by applicable law, GraficNeo and its operators will not be responsible for indirect, incidental, special, consequential, or similar damages arising from your use of the service.
          </p>
          <p>Nothing in these Terms limits liability where such limitation is prohibited by law.</p>

          <h2>12. Changes to These Terms</h2>
          <p>We may update these Terms from time to time.</p>
          <p>When we make significant changes, we may provide notice through GraficNeo or other reasonable means.</p>
          <p>Your continued use of GraficNeo after the updated Terms become effective means that you accept the updated Terms.</p>

          <h2>13. Account Deletion</h2>
          <p>You may stop using GraficNeo at any time.</p>
          <p>Where account deletion is available, you may request deletion of your account and associated personal data, subject to legal or legitimate retention requirements described in our Privacy Policy.</p>

          <h2>14. Privacy</h2>
          <p>Our collection and use of personal information is described in the GraficNeo Privacy Policy.</p>

          <h2>15. Governing Law</h2>
          <p>These Terms are governed by applicable law. Mandatory consumer protections and other rights that apply to you under the laws of your country remain unaffected.</p>

          <h2>16. Contact</h2>
          <p>If you have questions about these Terms, contact GraficNeo through the official contact method provided on the GraficNeo website.</p>

          <hr />

          <p>By using GraficNeo, you acknowledge that you have read and agree to these Terms of Service.</p>
        </div>
      </div>
    </div>
  );
}
