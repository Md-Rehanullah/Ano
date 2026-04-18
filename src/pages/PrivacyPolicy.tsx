import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Shield } from "lucide-react";

const PrivacyPolicy = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="text-center mb-10">
          <Shield className="h-12 w-12 mx-auto mb-4 text-primary" />
          <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: April 18, 2026</p>
        </div>

        <Card className="p-8 shadow-card space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">1. Introduction</h2>
            <p>
              atlasTHOUGHT ("we", "our", "us") operates the Bridge mobile application and website (the "Service").
              This page informs you of our policies regarding the collection, use, and disclosure of personal data
              when you use our Service and the choices you have associated with that data.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">2. Information We Collect</h2>
            <p className="mb-2">We collect the following categories of information:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Account information:</strong> email address, display name, and avatar (when you sign in with email or GitHub).</li>
              <li><strong>User-generated content:</strong> posts, comments, bookmarks, reports, and uploaded images or videos.</li>
              <li><strong>Usage data:</strong> post views, likes, and basic interaction history needed to power the app.</li>
              <li><strong>Device data:</strong> general device type and app version, used for diagnostics.</li>
            </ul>
            <p className="mt-2">We do <strong>not</strong> collect precise location, contacts, SMS, call logs, or microphone data.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">3. How We Use Information</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To provide and maintain the Service.</li>
              <li>To authenticate you and protect your account.</li>
              <li>To display your content and interactions to other users.</li>
              <li>To moderate content and respond to reports.</li>
              <li>To respond to your support requests submitted through the contact form.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">4. Legal Bases (GDPR)</h2>
            <p>We process personal data based on: your consent (account creation, content submission), the performance
              of a contract (providing the Service), and our legitimate interest in keeping the platform safe.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">5. Data Sharing</h2>
            <p>We do not sell your personal data. We share limited data only with the following service providers:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Supabase</strong> — authentication, database, and file storage.</li>
              <li><strong>GitHub</strong> — only if you choose to sign in with GitHub.</li>
              <li><strong>Google Play Services</strong> — required by Android for distribution and crash reporting.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">6. Children's Privacy</h2>
            <p>The Service is not directed to children under 13 (or under 16 in the EEA). We do not knowingly collect
              personal information from children. If you believe a child has provided us with personal data, please
              contact us so we can delete it.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">7. Data Retention</h2>
            <p>We retain account data for as long as your account is active. Posts and comments remain visible until
              you delete them or your account. Reports are kept for moderation purposes.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">8. Your Rights</h2>
            <p>Depending on your jurisdiction, you may have the right to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Access, correct, or delete your personal data.</li>
              <li>Withdraw consent at any time.</li>
              <li>Request a copy of your data (data portability).</li>
              <li>Lodge a complaint with your local data protection authority.</li>
            </ul>
            <p className="mt-2">To exercise these rights, contact us through the in-app Contact form or email
              <a className="text-primary underline ml-1" href="mailto:privacy@atlasthought.app">privacy@atlasthought.app</a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">9. Account & Data Deletion</h2>
            <p>You can delete your posts and comments at any time from your Profile page. To request full account
              deletion, contact us via the Contact form. We will process the request within 30 days.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">10. Security</h2>
            <p>We use industry-standard encryption in transit (HTTPS/TLS) and at rest, and follow the principle of
              least privilege via row-level security on our database. No method of transmission over the internet is
              100% secure.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">11. Permissions Used by the App</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Internet:</strong> required to load and submit content.</li>
              <li><strong>Photos / media:</strong> only when you choose to upload an image or video.</li>
              <li><strong>Notifications (optional):</strong> if enabled, used for replies and mentions.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">12. Changes to This Policy</h2>
            <p>We may update this policy from time to time. We will notify you by updating the "Last updated" date
              above and, when changes are material, by an in-app notice.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">13. Contact Us</h2>
            <p>For privacy-related questions, contact us through the in-app Contact page or email
              <a className="text-primary underline ml-1" href="mailto:privacy@atlasthought.app">privacy@atlasthought.app</a>.
            </p>
          </section>
        </Card>
      </div>
    </Layout>
  );
};

export default PrivacyPolicy;
