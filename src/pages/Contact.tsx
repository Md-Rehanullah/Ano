import { useState } from "react";
import { z } from "zod";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, Send, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  subject: z.string().trim().min(1, "Subject is required").max(200),
  message: z.string().trim().min(1, "Message is required").max(1000),
});

const Contact = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = contactSchema.safeParse({ name, email, subject, message });
    if (!parsed.success) {
      toast({ title: "Please check your input", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("contact_messages").insert({
        name: parsed.data.name,
        email: parsed.data.email,
        subject: parsed.data.subject,
        message: parsed.data.message,
        user_id: user?.id ?? null,
      });
      if (error) throw error;
      toast({ title: "Message sent!", description: "Thanks — we received your message and will get back to you soon." });
      setName(""); setEmail(""); setSubject(""); setMessage("");
    } catch (err) {
      console.error("Contact submit failed:", err);
      toast({ title: "Could not send", description: "Please try again in a moment.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-12">
          <Mail className="h-12 w-12 mx-auto mb-4 text-primary" />
          <h1 className="text-3xl font-bold mb-3">Get In Touch</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Have questions, suggestions, or need support? We'd love to hear from you.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          <Card className="p-8 shadow-elegant">
            <div className="flex items-center mb-6">
              <MessageSquare className="h-6 w-6 text-primary mr-3" />
              <h2 className="text-2xl font-bold">Send us a message</h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="name">Your Name *</Label><Input id="name" placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} /></div>
                <div className="space-y-2"><Label htmlFor="email">Email Address *</Label><Input id="email" type="email" placeholder="your.email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} /></div>
              </div>
              <div className="space-y-2"><Label htmlFor="subject">Subject *</Label><Input id="subject" placeholder="What's this about?" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} /></div>
              <div className="space-y-2">
                <Label htmlFor="message">Message *</Label>
                <Textarea id="message" placeholder="Tell us more..." value={message} onChange={(e) => setMessage(e.target.value)} className="resize-none" rows={6} maxLength={1000} />
                <div className="text-xs text-muted-foreground text-right">{message.length}/1000</div>
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : <><Send className="h-4 w-4 mr-2" />Send Message</>}
              </Button>
            </form>
          </Card>

          <div className="space-y-8">
            <Card className="p-8 shadow-card">
              <h3 className="text-xl font-semibold mb-4">Why Contact Us?</h3>
              <div className="space-y-4 text-muted-foreground">
                <div className="flex items-start space-x-3">
                  <div className="bg-primary/10 p-2 rounded-lg mt-1"><MessageSquare className="h-4 w-4 text-primary" /></div>
                  <div><h4 className="font-medium text-foreground mb-1">General Inquiries</h4><p className="text-sm">Questions about our platform or features.</p></div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-primary/10 p-2 rounded-lg mt-1"><Mail className="h-4 w-4 text-primary" /></div>
                  <div><h4 className="font-medium text-foreground mb-1">Reports & Issues</h4><p className="text-sm">Report content issues or technical problems.</p></div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-primary/10 p-2 rounded-lg mt-1"><Send className="h-4 w-4 text-primary" /></div>
                  <div><h4 className="font-medium text-foreground mb-1">Feedback</h4><p className="text-sm">Help us improve by sharing your ideas.</p></div>
                </div>
              </div>
            </Card>
            <Card className="p-8 shadow-card">
              <h3 className="text-xl font-semibold mb-4">Response Time</h3>
              <p className="text-muted-foreground mb-4">We typically respond within 24-48 hours.</p>
              <div className="text-sm text-muted-foreground">
                <p className="mb-2"><strong>Business Hours:</strong> Monday - Friday, 9 AM - 6 PM (GMT)</p>
                <p><strong>Emergency Support:</strong> Available 24/7 for critical issues</p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Contact;
