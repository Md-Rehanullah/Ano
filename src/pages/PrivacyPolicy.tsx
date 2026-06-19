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
          <p className="text-sm text-muted-foreground">Last updated: June 19, 2026</p>
        </div>

        <Card className="p-8 shadow-card space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">1. Introduction</h2>
            <p>
              Rehan and Company ("we", "our", "us") operates the Bridge mobile application and website
              (the "Service"). This page informs you of our policies regarding the collection, use,
              and disclosure of personal data when you use our Service and the choices you have
              associated with that data.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">2. Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Account information:</strong> email address and (optionally) display name and avatar.</li>
              <li><strong>User-generated content:</strong> posts, comments, bookmarks, reports, and uploaded images or videos.</li>
              <li><strong>Optional profile details:</strong> city/region you choose to enter, bio, and public social media links (X, Instagram, Facebook).</li>
              <li><strong>Usage data:</strong> post views, likes, and basic interaction history needed to power the app.</li>
              <li><strong>Device data:</strong> general device type and app version, used for diagnostics.</li>
            </ul>
            <p className="mt-2">We do <strong>not</strong> collect precise location, contacts, SMS, call logs, or microphone data.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">3. How We Use Information</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To provide, maintain, and improve the Service.</li>
              <li>To authenticate you and protect your account.</li>
              <li>To display your content and interactions to other users.</li>
              <li>To moderate content and respond to abuse reports.</li>
              <li>To respond to support requests submitted through the contact form.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">4. Data Sharing &amp; Third-Party Services</h2>
            <p>We do not sell your personal data. We share limited data only with the following processors:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Supabase</strong> — authentication, database, and file storage.</li>
              <li><strong>Google Play Services</strong> — required by Android for distribution, crash reporting, and (where you opt in) Google sign-in.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">5. Child Safety &amp; CSAM Standard</h2>
            <p>
              The Service is not directed to children under 13 (or under 16 in the EEA). We have zero
              tolerance for child sexual abuse material (CSAM) or any content that exploits, endangers,
              or sexualizes minors. Any such content is removed immediately upon discovery, the
              uploading account is permanently banned, and reports are escalated to the National
              Center for Missing &amp; Exploited Children (NCMEC) and/or local law enforcement as
              required by law. To report CSAM in our app, use the in-app Report button or email
              <a className="text-primary underline ml-1" href="mailto:atlasthoughthelp@gmail.com">atlasthoughthelp@gmail.com</a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">6. User-Generated Content &amp; Moderation</h2>
            <p>
              Bridge hosts user-generated content. We apply automated profanity filters, allow any
              user to report posts and comments, and let users block other users to remove their
              content from view. Content violating our community guidelines (hate, harassment,
              sexual content, illegal activity, CSAM) is removed and the user may be banned.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">7. Data Retention</h2>
            <p>
              Account data is retained while your account is active. Posts and comments remain visible
              until you delete them or your account. Reports are retained for moderation auditing for
              up to 24 months. Deleted accounts and their content are permanently purged within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">8. Account &amp; Data Deletion</h2>
            <p>
              You can permanently delete your account and all associated content from inside the app
              at <em>Profile → Settings → Delete my account</em>. You can also email
              <a className="text-primary underline mx-1" href="mailto:atlasthoughthelp@gmail.com">atlasthoughthelp@gmail.com</a>
              to request deletion. Deletion is processed within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">9. Your Rights</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Access, correct, or delete your personal data.</li>
              <li>Withdraw consent at any time.</li>
              <li>Request a copy of your data (data portability).</li>
              <li>Lodge a complaint with your local data protection authority.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">10. Security</h2>
            <p>
              We use HTTPS/TLS in transit, encryption at rest, and row-level security on our database.
              No method of transmission over the internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">11. Permissions Used by the App</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Internet:</strong> required to load and submit content.</li>
              <li><strong>Photos / media:</strong> only when you choose to upload an image or video.</li>
              <li><strong>Vibration:</strong> short haptic feedback when liking a post.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">12. Changes to This Policy</h2>
            <p>
              We may update this policy from time to time. Material changes will be highlighted by an
              in-app notice and reflected in the "Last updated" date above.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">13. Contact Us</h2>
            <p>
              For privacy-related questions, contact Rehan and Company through the in-app Contact page
              or email
              <a className="text-primary underline ml-1" href="mailto:atlasthoughthelp@gmail.com">atlasthoughthelp@gmail.com</a>.
            </p>
          </section>
        </Card>
      </div>
    </Layout>
  );
};

export default PrivacyPolicy;
