import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { FileText } from "lucide-react";

const Terms = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="text-center mb-10">
          <FileText className="h-12 w-12 mx-auto mb-4 text-primary" />
          <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
          <p className="text-sm text-muted-foreground">Last updated: June 19, 2026</p>
        </div>

        <Card className="p-8 shadow-card space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">1. Acceptance</h2>
            <p>
              By creating an account or using Bridge (the "Service"), operated by Rehan and Company,
              you agree to these Terms of Service and our Privacy Policy. If you do not agree, do
              not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">2. Eligibility</h2>
            <p>
              You must be at least 13 years old (16 in the EEA) to use Bridge. By signing up, you
              represent that you meet this requirement.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">3. Account &amp; Security</h2>
            <p>
              You are responsible for the activity on your account and for keeping your credentials
              safe. Notify us immediately of any unauthorized access.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">4. User-Generated Content</h2>
            <p>
              You retain ownership of content you post. By posting, you grant Rehan and Company a
              non-exclusive, worldwide, royalty-free license to host, display, and distribute that
              content inside the Service for the purpose of operating Bridge. You are solely
              responsible for content you post.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">5. Acceptable Use</h2>
            <p className="mb-2">You agree NOT to post or transmit content that:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Is illegal, threatening, harassing, defamatory, hateful, or invades privacy.</li>
              <li>Is sexually explicit, pornographic, or sexualizes minors in any way (CSAM is reported to NCMEC and law enforcement).</li>
              <li>Promotes self-harm, violence, terrorism, or dangerous activity.</li>
              <li>Infringes intellectual property or impersonates another person.</li>
              <li>Contains malware, spam, scams, or unauthorized advertising.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">6. Moderation, Reporting &amp; Blocking</h2>
            <p>
              We may remove content and suspend or terminate accounts that violate these terms.
              Every post and comment can be reported via the in-app Report button. Users can also
              block other users to hide all of their content.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">7. Termination</h2>
            <p>
              You may delete your account at any time from <em>Profile → Settings → Delete my account</em>.
              We may suspend or terminate accounts that violate these terms, with or without notice.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">8. Disclaimers</h2>
            <p>
              The Service is provided "as is" without warranties of any kind. We do not guarantee
              that the Service will be uninterrupted, error-free, or secure.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">9. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Rehan and Company is not liable for indirect,
              incidental, or consequential damages arising from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">10. Changes</h2>
            <p>
              We may update these Terms from time to time. Continued use after changes are posted
              constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">11. Contact</h2>
            <p>
              Questions? Contact Rehan and Company via the in-app Contact page or email
              <a className="text-primary underline ml-1" href="mailto:atlasthoughthelp@gmail.com">atlasthoughthelp@gmail.com</a>.
            </p>
          </section>
        </Card>
      </div>
    </Layout>
  );
};

export default Terms;
