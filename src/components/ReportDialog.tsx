import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export const REPORT_REASONS = [
  { id: "spam", label: "Spam or misleading" },
  { id: "harassment", label: "Harassment or hate speech" },
  { id: "sexual", label: "Sexual or adult content" },
  { id: "violence", label: "Violence or dangerous acts" },
  { id: "csam", label: "Child sexual abuse material (CSAM)" },
  { id: "self_harm", label: "Self-harm or suicide" },
  { id: "illegal", label: "Illegal activity" },
  { id: "ip", label: "Intellectual property violation" },
  { id: "other", label: "Other" },
] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (reason: string) => void;
  target?: "post" | "comment" | "media";
}

const ReportDialog = ({ open, onOpenChange, onSubmit, target = "post" }: Props) => {
  const [reasonId, setReasonId] = useState<string>("");
  const [details, setDetails] = useState("");

  const submit = () => {
    if (!reasonId) return;
    const label = REPORT_REASONS.find(r => r.id === reasonId)?.label || reasonId;
    const composed = details.trim() ? `${label} — ${details.trim().slice(0, 500)}` : label;
    onSubmit(composed);
    setReasonId("");
    setDetails("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Report this {target}</DialogTitle>
          <DialogDescription>Choose the reason that best describes the problem.</DialogDescription>
        </DialogHeader>
        <RadioGroup value={reasonId} onValueChange={setReasonId} className="space-y-2 max-h-72 overflow-auto pr-1">
          {REPORT_REASONS.map(r => (
            <div key={r.id} className="flex items-center space-x-2">
              <RadioGroupItem value={r.id} id={`reason-${r.id}`} />
              <Label htmlFor={`reason-${r.id}`} className="text-sm font-normal cursor-pointer">{r.label}</Label>
            </div>
          ))}
        </RadioGroup>
        <Textarea
          placeholder="Optional additional details (max 500 chars)"
          value={details}
          maxLength={500}
          onChange={(e) => setDetails(e.target.value)}
          className="resize-none min-h-20"
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!reasonId}>Submit report</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportDialog;
