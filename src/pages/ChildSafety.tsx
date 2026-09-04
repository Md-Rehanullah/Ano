import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

const ChildSafety = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="text-center mb-10">
          <ShieldAlert className="h-12 w-12 mx-auto mb-4 text-primary" />
          <h1 className="text-3xl font-bold mb-2">Child Safety Standards</h1>
          <p className="text-sm text-muted-foreground">Last updated: September 4, 2026</p>
        </div>

        <Card className="p-8 shadow-card space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">1. Zero tolerance</h2>
            <p>
              Bridge has a strict zero-tolerance policy towards child sexual abuse and exploitation
              (CSAE), including child sexual abuse material (CSAM). It is absolutely prohibited to
              upload, share, request, link to or solicit any content that sexualizes, exploits,
              endangers or grooms a minor, including drawings, AI-generated imagery and text.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">2. Minimum age</h2>
            <p>
              Bridge requires an account created with Google Sign-In and is intended for users aged
              14 and above. Users who declare an age of 13 or under during registration are blocked
              from creating an account, and the block is enforced on our servers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">3. How to report</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Use the in-app <strong>Report</strong> button on any post or comment and choose
                "Child sexual abuse material (CSAM)".</li>
              <li>Email our child safety contact:
                <a className="text-primary underline ml-1" href="mailto:atlasthoughthelp@gmail.com">
                  atlasthoughthelp@gmail.com
                </a>.
              </li>
              <li>Reports can be submitted by anyone, whether or not they have an account.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">4. Removal and enforcement</h2>
            <p>
              Reports involving child safety are prioritised and reviewed as quickly as possible.
              Confirmed violating content is removed immediately, the account is permanently banned,
              related content by the same account is reviewed and removed, and the account is barred
              from re-registration. Uploaded images and videos are additionally scanned by automated
              moderation before they are published.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">5. Cooperation with authorities</h2>
            <p>
              Where legally required, we report apparent child sexual abuse material and the
              associated account data to the National Center for Missing &amp; Exploited Children
              (NCMEC) and/or to law enforcement in the relevant jurisdiction, and we preserve
              evidence and cooperate with lawful requests from those authorities.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">6. Compliance</h2>
            <p>
              These standards follow Google Play's Child Safety Standards policy and applicable
              child protection laws, including India's POCSO Act and the IT Rules. They are reviewed
              periodically and updated as our features or obligations change.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">7. Child safety contact</h2>
            <p>
              Designated child safety point of contact:
              <a className="text-primary underline ml-1" href="mailto:atlasthoughthelp@gmail.com">
                atlasthoughthelp@gmail.com
              </a>
            </p>
          </section>
        </Card>
      </div>
    </Layout>
  );
};

export default ChildSafety;
