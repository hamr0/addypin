import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Mail, Send } from "lucide-react";

export function ContactForm() {
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const { toast } = useToast();

  const sendContactMutation = useMutation({
    mutationFn: async (data: { email: string; subject: string; message: string }) => {
      const response = await apiRequest("POST", "/api/contact", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Message received!",
        description: "Your message has been logged for review. We'll get back to you soon.",
        duration: 5000,
      });
      // Reset form
      setEmail("");
      setSubject("");
      setMessage("");
    },
    onError: (error) => {
      toast({
        title: "Failed to send message",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !subject || !message) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }
    sendContactMutation.mutate({ email, subject, message });
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-addypin-dark">
          <Mail size={20} />
          Contact Support
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="contact-email" className="block text-sm font-medium text-addypin-dark mb-2">
              Your Email
            </Label>
            <Input
              id="contact-email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-gray-300 focus:border-addypin-cyan focus:ring-addypin-cyan"
              data-testid="input-contact-email"
            />
          </div>

          <div>
            <Label htmlFor="contact-subject" className="block text-sm font-medium text-addypin-dark mb-2">
              Subject
            </Label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger className="border-gray-300 focus:border-addypin-cyan focus:ring-addypin-cyan" data-testid="select-contact-subject">
                <SelectValue placeholder="Choose a subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Complaint">Complaint</SelectItem>
                <SelectItem value="Product Feedback">Product Feedback</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="contact-message" className="block text-sm font-medium text-addypin-dark mb-2">
              Message
            </Label>
            <Textarea
              id="contact-message"
              placeholder="Describe your issue or feedback..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="border-gray-300 focus:border-addypin-cyan focus:ring-addypin-cyan resize-none"
              data-testid="textarea-contact-message"
            />
          </div>

          <Button
            type="submit"
            disabled={sendContactMutation.isPending}
            className="w-full bg-addypin-cyan hover:bg-cyan-600 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200"
            data-testid="button-send-contact"
          >
            <Send className="mr-2" size={16} />
            {sendContactMutation.isPending ? "Sending..." : "Send Message"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}