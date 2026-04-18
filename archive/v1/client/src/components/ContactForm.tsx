import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { HelpCircle, Send } from "lucide-react";

export function ContactForm() {
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isOpen, setIsOpen] = useState(false);
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
      // Reset form and close dialog
      setEmail("");
      setSubject("");
      setMessage("");
      setIsOpen(false);
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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-6 right-6 z-50 shadow-lg bg-white hover:bg-addypin-light border-addypin-cyan text-addypin-dark"
          data-testid="button-help"
        >
          <HelpCircle className="mr-2" size={16} />
          Help
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-addypin-dark">
            <HelpCircle size={20} />
            Contact Support
          </DialogTitle>
          <DialogDescription>
            Help? Send us a message and we'll get back to you.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="contact-email" className="block text-sm font-medium text-addypin-dark mb-2">
              Your Email
            </Label>
            <Input
              id="contact-email"
              type="email"
              placeholder="example@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-gray-300 focus:border-addypin-cyan focus:ring-addypin-cyan placeholder:text-gray-400"
              data-testid="input-contact-email"
            />
          </div>

          <div>
            <Label htmlFor="contact-subject" className="block text-sm font-medium text-addypin-dark mb-2">
              Subject
            </Label>
            <Input
              id="contact-subject"
              type="text"
              placeholder="Bug report, feature request, billing question..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="border-gray-300 focus:border-addypin-cyan focus:ring-addypin-cyan placeholder:text-gray-400"
              data-testid="input-contact-subject"
            />
          </div>

          <div>
            <Label htmlFor="contact-message" className="block text-sm font-medium text-addypin-dark mb-2">
              Message
            </Label>
            <Textarea
              id="contact-message"
              placeholder="I'm having trouble with... The app crashed when... Could you add a feature for..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="border-gray-300 focus:border-addypin-cyan focus:ring-addypin-cyan resize-none placeholder:text-gray-400"
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
      </DialogContent>
    </Dialog>
  );
}