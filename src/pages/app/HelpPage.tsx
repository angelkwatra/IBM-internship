import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, Search, Mail, HelpCircle, ArrowRight } from "lucide-react";
import PageHeader from "../../components/layout/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

interface FAQItem {
  question: string;
  answer: string;
}

interface Category {
  id: string;
  title: string;
  items: FAQItem[];
}

const FAQ_DATA: Category[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    items: [
      {
        question: "How do I upload my first file?",
        answer: "Drag & drop files or folders directly onto the My Drive page, or click the 'New / Upload' dropdown at the top right of the explorer to select files or folders from your computer.",
      },
      {
        question: "What is My Drive?",
        answer: "My Drive is your secure personal cloud storage workspace. All files stored here are encrypted client-side and can only be accessed by you unless you choose to share them.",
      },
      {
        question: "How do I update my profile details?",
        answer: "Click on your avatar in the top-right corner, select 'Settings', and modify your profile details (Display Name, Short Bio, or Avatar Photo) directly in the active Profile tab.",
      },
    ],
  },
  {
    id: "files-folders",
    title: "Files & Folders",
    items: [
      {
        question: "How can I preview a file?",
        answer: "Double-click any file item or right-click and select 'Preview'. CloudVault displays previews for images, video, audio, PDFs, and includes an interactive text/code editor.",
      },
      {
        question: "How do I rename or delete items?",
        answer: "Right-click the file or folder to trigger the context menu. You can rename the item directly, or choose 'Move to Trash' to remove it.",
      },
      {
        question: "What happens to deleted files?",
        answer: "Deleted files are moved to the Trash. You can restore them to their original location from the Trash page, or choose to delete them permanently to reclaim storage space.",
      },
    ],
  },
  {
    id: "sharing-links",
    title: "Sharing & Links",
    items: [
      {
        question: "How do I share a file with someone?",
        answer: "Right-click the file and click 'Share'. Enter the recipient's email address, specify their role (Viewer, Commenter, Editor), write an optional message, and hit 'Send'.",
      },
      {
        question: "What are advanced sharing options?",
        answer: "You can configure Password Protection, Expiration Dates, and Download Limits on your public link. Toggling these immediately updates the security settings of the shared resource.",
      },
      {
        question: "How do I revoke a public link?",
        answer: "Open the file's Share modal, navigate to the Link tab, and click the red 'Revoke Link' button. A confirmation will ask you to approve the deactivation.",
      },
    ],
  },
  {
    id: "storage-plans",
    title: "Storage & Plans",
    items: [
      {
        question: "How much free storage do I get?",
        answer: "Every free account includes 15 GB of secure cloud storage. You can view your real-time usage in the progress bar at the bottom of the sidebar.",
      },
      {
        question: "How do I upgrade my plan?",
        answer: "Go to Settings and navigate to the 'Billing & Plans' tab. From there, select a Plan tier (e.g. Pro or Business) that matches your workflow needs.",
      },
      {
        question: "What happens if my storage is full?",
        answer: "If you exceed your 15 GB limit, you will see a warning message and new file uploads will be paused. To resume, upgrade to a higher plan or delete unnecessary files from your Trash.",
      },
    ],
  },
  {
    id: "account-security",
    title: "Account & Security",
    items: [
      {
        question: "How do I change my password?",
        answer: "Navigate to Settings, select the 'Security & 2FA' tab, input your current password followed by your new password, and confirm to save changes.",
      },
      {
        question: "Can I secure my account with 2FA?",
        answer: "Yes. In the Settings 'Security & 2FA' tab, you can enable Two-Factor Authentication. Scan the QR code with your authenticator app (Google Authenticator, Authy) to link it.",
      },
      {
        question: "Are my files encrypted?",
        answer: "Yes. CloudVault enforces client-side zero-knowledge encryption patterns, meaning your files are fully secure and unreadable by anyone else without authorization.",
      },
    ],
  },
];

function AccordionItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-[var(--cv-border)] last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-4 text-left font-semibold text-sm text-[var(--cv-text)] hover:text-primary-650 transition-colors outline-none"
      >
        <span>{question}</span>
        <ChevronDown
          size={16}
          className={`text-[var(--cv-text-secondary)] transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pb-4 text-xs text-[var(--cv-text-secondary)] leading-relaxed">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCategories = FAQ_DATA.map((cat) => {
    const matchedItems = cat.items.filter(
      (item) =>
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return { ...cat, items: matchedItems };
  }).filter((cat) => cat.items.length > 0);

  return (
    <>
      <PageHeader title="Help & Support" breadcrumb={<span>Home / Help</span>} />

      <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
        {/* Search header banner */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-primary-600 to-indigo-600 text-white p-6 sm:p-8 shadow-md">
          <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 opacity-10">
            <HelpCircle size={200} />
          </div>
          <div className="relative z-10 max-w-xl space-y-3">
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              How can we help you today?
            </h2>
            <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
              Search our comprehensive knowledge base or browse the categories below to find answers to your questions.
            </p>
            <div className="relative pt-2">
              <input
                type="text"
                placeholder="Search articles, guides, and FAQs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 pl-10 pr-4 text-sm text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-transparent transition-all"
              />
              <Search className="absolute left-3.5 top-[21px] text-white/60" size={16} />
            </div>
          </div>
        </div>

        {/* FAQ list */}
        {filteredCategories.length === 0 ? (
          <Card className="p-8 text-center border border-dashed border-[var(--cv-border)] bg-[var(--cv-bg-subtle)]">
            <HelpCircle className="mx-auto text-[var(--cv-text-muted)] mb-2" size={32} />
            <h3 className="text-sm font-bold text-[var(--cv-text)]">No results found</h3>
            <p className="text-xs text-[var(--cv-text-secondary)] mt-1">
              We couldn't find any FAQs matching "{searchQuery}". Try using different keywords.
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredCategories.map((cat) => (
              <Card key={cat.id} className="p-6 border border-[var(--cv-border)] bg-[var(--cv-bg-elevated)]">
                <h3 className="text-sm font-bold text-primary-650 dark:text-primary-400 border-b border-[var(--cv-border)] pb-2 mb-2">
                  {cat.title}
                </h3>
                <div className="divide-y divide-[var(--cv-border)]">
                  {cat.items.map((item, index) => (
                    <AccordionItem
                      key={index}
                      question={item.question}
                      answer={item.answer}
                    />
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Contact CTA */}
        <Card className="p-6 border border-primary-200 dark:border-primary-800/30 bg-primary-50/30 dark:bg-primary-950/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="text-sm font-bold text-[var(--cv-text)]">Still need help?</h4>
            <p className="text-xs text-[var(--cv-text-secondary)] leading-relaxed">
              Can't find the answers you're looking for? Reach out to our customer support team directly.
            </p>
          </div>
          <a href="mailto:support@cloudvault.io">
            <Button variant="primary" size="sm" className="whitespace-nowrap flex items-center gap-1.5 shadow-sm">
              <Mail size={14} />
              <span>Contact Support</span>
              <ArrowRight size={12} className="ml-0.5" />
            </Button>
          </a>
        </Card>
      </div>
    </>
  );
}
