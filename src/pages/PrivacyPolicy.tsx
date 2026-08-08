import React from 'react';
import { ChevronLeft } from 'lucide-react';

export default function PrivacyPolicy({ onBack }: { onBack: () => void }) {
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

        <h1 className="font-display text-2xl font-bold mb-4">GraficNeo Privacy Policy</h1>
        <p className="text-sm text-gray-500 dark:text-neutral-400 mb-6">Last updated: August 8, 2026</p>

        <div className="prose dark:prose-invert max-w-none text-sm text-gray-700 dark:text-neutral-200">
          <p>
            This Privacy Policy explains how GraficNeo (“GraficNeo”, “we”, “us”, or “our”) collects, uses, stores, and protects personal information when you use our website, application, and services.
          </p>

          <h2>1. Information We Collect</h2>
          <p>Depending on how you use GraficNeo, we may collect the following information:</p>

          <h3>Account information</h3>
          <p>When you create an account, we may collect:</p>
          <ul>
            <li>email address;</li>
            <li>username;</li>
            <li>display name;</li>
            <li>password-related authentication information;</li>
            <li>account identifier;</li>
            <li>profile information you choose to provide.</li>
          </ul>
          <p>Passwords should be handled by our authentication system and are not intended to be stored by GraficNeo in readable form.</p>

          <h3>Content and activity</h3>
          <p>When you use GraficNeo, we may store information you choose to create or interact with, including:</p>
          <ul>
            <li>posts;</li>
            <li>images and other uploaded content;</li>
            <li>comments;</li>
            <li>likes;</li>
            <li>followers and following relationships;</li>
            <li>messages;</li>
            <li>notifications;</li>
            <li>profile information;</li>
            <li>account settings.</li>
          </ul>

          <h3>Technical information</h3>
          <p>We may automatically receive technical information needed to operate and secure the service, such as:</p>
          <ul>
            <li>IP address;</li>
            <li>browser and device information;</li>
            <li>operating system information;</li>
            <li>request and diagnostic information;</li>
            <li>authentication and session information;</li>
            <li>timestamps and security logs.</li>
          </ul>

          <h2>2. How We Use Information</h2>
          <p>We may use information to:</p>
          <ul>
            <li>create and maintain your account;</li>
            <li>authenticate you;</li>
            <li>provide the GraficNeo social-media features;</li>
            <li>display profiles and User Content;</li>
            <li>deliver messages and notifications;</li>
            <li>process likes, follows, comments, and other interactions;</li>
            <li>maintain and improve the service;</li>
            <li>detect and prevent fraud, abuse, spam, and security incidents;</li>
            <li>troubleshoot technical problems;</li>
            <li>enforce our Terms of Service;</li>
            <li>comply with legal obligations.</li>
          </ul>

          <h2>3. Information You Choose to Make Public</h2>
          <p>
            Some information and content you provide may be visible to other GraficNeo users.
          </p>
          <p>Depending on the features you use, this may include username, display name, profile information, profile image, posts, comments, likes, follower and following relationships. Do not publish information that you do not want other users to see.</p>

          <h2>4. Direct Messages</h2>
          <p>If GraficNeo provides direct messaging, messages and related information may be stored so that the messaging system can deliver and display them. Do not use GraficNeo messages to send passwords, payment information, or other highly sensitive information unless necessary.</p>

          <h2>5. Cookies and Local Storage</h2>
          <p>GraficNeo may use cookies, local storage, or similar technologies to keep you signed in; maintain authentication sessions; remember settings; provide security; and understand technical usage of the service. You can control cookies through your browser settings, although disabling certain technologies may affect the functionality of GraficNeo.</p>

          <h2>6. Third-Party Service Providers</h2>
          <p>GraficNeo may rely on third-party infrastructure and service providers to operate the platform. These services may include authentication, database hosting, file storage, server infrastructure, analytics, security, and other technical services. For example, GraficNeo may use Supabase infrastructure for authentication, database, and related services. Third-party providers may process information on our behalf as necessary to provide their services.</p>

          <h2>7. Data Security</h2>
          <p>We use reasonable technical and organizational measures intended to protect information against unauthorized access, loss, misuse, or alteration. However, no internet transmission or storage system can be guaranteed to be completely secure. You are also responsible for protecting your account credentials.</p>

          <h2>8. Data Retention</h2>
          <p>We retain personal information for as long as reasonably necessary to provide GraficNeo, maintain security, comply with legal obligations, resolve disputes, and enforce our agreements. When information is no longer required, it may be deleted or anonymized where appropriate.</p>

          <h2>9. Account Deletion</h2>
          <p>You may request deletion of your GraficNeo account. When an account is deleted, we will delete or anonymize associated personal information where reasonably possible and where we are not required or permitted to retain it for legal, security, fraud-prevention, or other legitimate purposes. Some content may remain where necessary to preserve the integrity of the service or where removal is technically or legally restricted.</p>

          <h2>10. Your Privacy Rights</h2>
          <p>Depending on where you live, you may have rights regarding your personal information. For users in the European Economic Area and other jurisdictions where applicable, these may include rights to access, correct, delete, restrict processing, object to certain processing, request portability, withdraw consent where processing is based on consent, and lodge a complaint with a data protection authority. To exercise a privacy right, contact GraficNeo using the official contact method provided on the website. We may need to verify your identity before processing certain requests.</p>

          <h2>11. Children’s Privacy</h2>
          <p>GraficNeo is not intended for use in violation of applicable age restrictions. We do not knowingly collect personal information from children where doing so is prohibited by applicable law. If you believe that a child has provided personal information to GraficNeo in circumstances where this is not permitted, please contact us.</p>

          <h2>12. International Data Transfers</h2>
          <p>Because GraficNeo may use infrastructure and service providers located in different countries, your information may be processed outside your country. Where legally required, appropriate safeguards will be used for international transfers.</p>

          <h2>13. Legal Bases for Processing</h2>
          <p>Where applicable under data-protection laws such as the GDPR, we may process personal information on the basis of performance of a contract, compliance with legal obligations, legitimate interests, consent, or protection of the security and integrity of the service. The applicable legal basis depends on the specific processing activity.</p>

          <h2>14. Changes to This Privacy Policy</h2>
          <p>We may update this Privacy Policy when our services, technology, or legal obligations change. The “Last updated” date at the top of this policy indicates when it was most recently updated. For significant changes, we may provide additional notice where appropriate.</p>

          <h2>15. Contact</h2>
          <p>If you have questions about this Privacy Policy or want to exercise a privacy right, contact GraficNeo through the official contact method provided on the GraficNeo website.</p>

          <hr />

          <p>By using GraficNeo, you acknowledge that you have read this Privacy Policy.</p>
        </div>
      </div>
    </div>
  );
}
