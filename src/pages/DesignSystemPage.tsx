import { useState } from "react";
import {
  Sun,
  Moon,
  Search,
  Mail,
  Lock,
  Eye,
  ChevronDown,
  Settings,
  User,
  LogOut,
  Copy,
  Trash2,
  Edit3,
  Download,
  Upload,
  FolderOpen,
  Plus,
  Star,
  Bell,
  Cloud,
  HardDrive,
  Zap,
} from "lucide-react";
import { cn } from "../lib/cn";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../components/ui/ToastProvider";

// ── UI Components ────────────────────────────────────────────────
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Checkbox } from "../components/ui/Checkbox";
import { Toggle } from "../components/ui/Toggle";
import { RadioGroup, RadioItem } from "../components/ui/Radio";
import { Modal } from "../components/ui/Modal";
import { DropdownMenu } from "../components/ui/DropdownMenu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/Tabs";
import { Tooltip } from "../components/ui/Tooltip";
import { Avatar } from "../components/ui/Avatar";
import { Badge } from "../components/ui/Badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../components/ui/Card";
import { ProgressBar } from "../components/ui/ProgressBar";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";

/* ═══════════════════════════════════════════════════════════════════
   Section wrapper — consistent spacing + heading style
   ═══════════════════════════════════════════════════════════════════ */
function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-2xl font-bold tracking-tight text-[var(--cv-text)] mb-6">
        {title}
      </h2>
      {children}
    </section>
  );
}

function SubSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold text-[var(--cv-text-secondary)]">
        {title}
      </h3>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Color Swatch
   ═══════════════════════════════════════════════════════════════════ */
function Swatch({ name, cssVar }: { name: string; cssVar: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="w-12 h-12 rounded-lg border border-[var(--cv-border)] shadow-sm"
        style={{ backgroundColor: `var(${cssVar})` }}
      />
      <span className="text-[10px] font-medium text-[var(--cv-text-muted)] leading-none">
        {name}
      </span>
    </div>
  );
}

function ColorScale({
  label,
  prefix,
  steps,
}: {
  label: string;
  prefix: string;
  steps: (string | number)[];
}) {
  return (
    <div className="space-y-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-[var(--cv-text-muted)]">
        {label}
      </span>
      <div className="flex flex-wrap gap-2">
        {steps.map((step) => (
          <Swatch
            key={step}
            name={String(step)}
            cssVar={`--color-${prefix}-${step}`}
          />
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Design System Page
   ═══════════════════════════════════════════════════════════════════ */
export default function DesignSystemPage() {
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();

  // ── State for interactive demos ────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSize, setModalSize] = useState<"sm" | "md" | "lg">("md");
  const [checkboxes, setCheckboxes] = useState({
    terms: false,
    newsletter: true,
    indeterminate: false,
  });
  const [toggle1, setToggle1] = useState(false);
  const [toggle2, setToggle2] = useState(true);
  const [radioValue, setRadioValue] = useState("option1");
  const [selectValue, setSelectValue] = useState("");
  const [progress, setProgress] = useState(65);

  // Color scale steps
  const scale10 = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

  return (
    <div className="min-h-screen bg-[var(--cv-bg)] transition-colors duration-200">
      {/* ─── Sticky Header ──────────────────────────────────────── */}
      <header
        className={cn(
          "sticky top-0 z-40 border-b border-[var(--cv-border)]",
          "bg-[var(--cv-bg-elevated)]/80 backdrop-blur-xl"
        )}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Cloud className="h-6 w-6 text-primary-500" />
            <h1 className="text-lg font-bold tracking-tight text-[var(--cv-text)]">
              CloudVault{" "}
              <span className="font-normal text-[var(--cv-text-muted)]">
                / Design System
              </span>
            </h1>
          </div>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            iconOnly
            size="md"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          >
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </Button>
        </div>
      </header>

      {/* ─── Page Content ───────────────────────────────────────── */}
      <main className="mx-auto max-w-6xl px-6 py-12 space-y-16">
        {/* ═══════════════════════════════════════════════════════
           1. Color Palette
           ═══════════════════════════════════════════════════════ */}
        <Section id="colors" title="Color Palette">
          <div className="space-y-8">
            <ColorScale label="Neutral" prefix="neutral" steps={scale10} />
            <ColorScale label="Primary (Indigo)" prefix="primary" steps={scale10} />
            <ColorScale label="Accent (Violet)" prefix="accent" steps={scale10} />

            {/* Semantic colors */}
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--cv-text-muted)]">
                Semantic
              </span>
              <div className="flex flex-wrap gap-6">
                <div className="space-y-2">
                  <span className="text-xs text-[var(--cv-text-secondary)]">Success</span>
                  <div className="flex gap-2">
                    <Swatch name="light" cssVar="--color-success-light" />
                    <Swatch name="base" cssVar="--color-success" />
                    <Swatch name="dark" cssVar="--color-success-dark" />
                  </div>
                </div>
                <div className="space-y-2">
                  <span className="text-xs text-[var(--cv-text-secondary)]">Warning</span>
                  <div className="flex gap-2">
                    <Swatch name="light" cssVar="--color-warning-light" />
                    <Swatch name="base" cssVar="--color-warning" />
                    <Swatch name="dark" cssVar="--color-warning-dark" />
                  </div>
                </div>
                <div className="space-y-2">
                  <span className="text-xs text-[var(--cv-text-secondary)]">Error</span>
                  <div className="flex gap-2">
                    <Swatch name="light" cssVar="--color-error-light" />
                    <Swatch name="base" cssVar="--color-error" />
                    <Swatch name="dark" cssVar="--color-error-dark" />
                  </div>
                </div>
                <div className="space-y-2">
                  <span className="text-xs text-[var(--cv-text-secondary)]">Info</span>
                  <div className="flex gap-2">
                    <Swatch name="light" cssVar="--color-info-light" />
                    <Swatch name="base" cssVar="--color-info" />
                    <Swatch name="dark" cssVar="--color-info-dark" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ═══════════════════════════════════════════════════════
           2. Typography
           ═══════════════════════════════════════════════════════ */}
        <Section id="typography" title="Typography">
          <div className="space-y-6">
            <div className="space-y-4">
              <p className="text-5xl font-bold tracking-tighter text-[var(--cv-text)]">
                Display — 48px / -0.04em
              </p>
              <p className="text-4xl font-bold tracking-tight text-[var(--cv-text)]">
                Heading 1 — 36px / -0.03em
              </p>
              <p className="text-3xl font-semibold tracking-tight text-[var(--cv-text)]">
                Heading 2 — 30px / -0.02em
              </p>
              <p className="text-2xl font-semibold text-[var(--cv-text)]">
                Heading 3 — 24px
              </p>
              <p className="text-xl font-semibold text-[var(--cv-text)]">
                Heading 4 — 20px
              </p>
              <p className="text-lg font-medium text-[var(--cv-text)]">
                Large — 17px
              </p>
            </div>
            <div className="h-px bg-[var(--cv-border)]" />
            <div className="space-y-3 max-w-2xl">
              <p className="text-base text-[var(--cv-text)]">
                Body — 14px. The quick brown fox jumps over the lazy dog. This is the
                default body text used throughout the application.
              </p>
              <p className="text-sm text-[var(--cv-text-secondary)]">
                Small — 13px. Secondary text for supporting information and meta details.
              </p>
              <p className="text-xs text-[var(--cv-text-muted)]">
                Extra Small — 12px. Captions, labels, and fine print.
              </p>
            </div>
          </div>
        </Section>

        {/* ═══════════════════════════════════════════════════════
           3. Buttons
           ═══════════════════════════════════════════════════════ */}
        <Section id="buttons" title="Buttons">
          <div className="space-y-8">
            {/* Variants */}
            <SubSection title="Variants">
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="primary" iconOnly aria-label="Add item">
                  <Plus size={16} />
                </Button>
              </div>
            </SubSection>

            {/* Sizes */}
            <SubSection title="Sizes">
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" size="sm">Small</Button>
                <Button variant="primary" size="md">Medium</Button>
                <Button variant="primary" size="lg">Large</Button>
              </div>
            </SubSection>

            {/* With icons */}
            <SubSection title="With Icons">
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" leftIcon={<Upload size={16} />}>
                  Upload
                </Button>
                <Button variant="secondary" rightIcon={<Download size={16} />}>
                  Download
                </Button>
                <Button variant="ghost" leftIcon={<Star size={16} />}>
                  Favorite
                </Button>
              </div>
            </SubSection>

            {/* States */}
            <SubSection title="States">
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" isLoading>
                  Loading
                </Button>
                <Button variant="secondary" isLoading>
                  Loading
                </Button>
                <Button variant="primary" disabled>
                  Disabled
                </Button>
                <Button variant="secondary" disabled>
                  Disabled
                </Button>
              </div>
            </SubSection>
          </div>
        </Section>

        {/* ═══════════════════════════════════════════════════════
           4. Form Controls
           ═══════════════════════════════════════════════════════ */}
        <Section id="form-controls" title="Form Controls">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Input */}
            <div className="space-y-6">
              <SubSection title="Input">
                <div className="space-y-4">
                  <Input label="Email" placeholder="name@example.com" prefixIcon={<Mail size={16} />} />
                  <Input label="Password" type="password" placeholder="Enter password" prefixIcon={<Lock size={16} />} suffixIcon={<Eye size={16} />} />
                  <Input label="Search" placeholder="Search files..." prefixIcon={<Search size={16} />} helperText="Type to filter results" />
                  <Input label="With Error" placeholder="Invalid input" error="This field is required" />
                  <Input label="Disabled" placeholder="Cannot edit" disabled />
                  <Input label="Read Only" value="Read-only value" readOnly />
                  <Input label="Loading" isLoading />
                </div>
              </SubSection>
            </div>

            {/* Select */}
            <div className="space-y-6">
              <SubSection title="Select">
                <div className="space-y-4">
                  <Select
                    label="Storage Plan"
                    placeholder="Choose a plan"
                    options={[
                      { value: "free", label: "Free — 5 GB" },
                      { value: "pro", label: "Pro — 100 GB" },
                      { value: "team", label: "Team — 1 TB" },
                      { value: "enterprise", label: "Enterprise — Unlimited" },
                    ]}
                    value={selectValue}
                    onChange={(e) => setSelectValue(e.target.value)}
                    helperText="You can upgrade anytime"
                  />
                  <Select
                    label="With Error"
                    options={[{ value: "a", label: "Option A" }]}
                    error="Selection is required"
                  />
                  <Select
                    label="Disabled"
                    options={[{ value: "x", label: "Locked option" }]}
                    disabled
                  />
                  <Select
                    label="Loading"
                    options={[]}
                    isLoading
                  />
                </div>
              </SubSection>
            </div>
          </div>

          {/* Checkbox / Toggle / Radio row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10">
            {/* Checkbox */}
            <SubSection title="Checkbox">
              <div className="space-y-3">
                <Checkbox
                  label="Accept terms & conditions"
                  checked={checkboxes.terms}
                  onChange={(v) =>
                    setCheckboxes((s) => ({ ...s, terms: v }))
                  }
                />
                <Checkbox
                  label="Subscribe to newsletter"
                  checked={checkboxes.newsletter}
                  onChange={(v) =>
                    setCheckboxes((s) => ({ ...s, newsletter: v }))
                  }
                />
                <Checkbox
                  label="Indeterminate"
                  checked={false}
                  indeterminate
                  onChange={(v) =>
                    setCheckboxes((s) => ({ ...s, indeterminate: v }))
                  }
                />
                <Checkbox label="Disabled unchecked" disabled />
                <Checkbox label="Disabled checked" checked disabled />
              </div>
            </SubSection>

            {/* Toggle */}
            <SubSection title="Toggle">
              <div className="space-y-3">
                <Toggle
                  label="Dark mode"
                  checked={toggle1}
                  onChange={setToggle1}
                />
                <Toggle
                  label="Notifications"
                  checked={toggle2}
                  onChange={setToggle2}
                />
                <Toggle label="Disabled off" disabled />
                <Toggle label="Disabled on" checked disabled />
              </div>
            </SubSection>

            {/* Radio */}
            <SubSection title="Radio Group">
              <RadioGroup
                value={radioValue}
                onChange={setRadioValue}
                label="File visibility"
              >
                <RadioItem value="option1" label="Public" />
                <RadioItem value="option2" label="Private" />
                <RadioItem value="option3" label="Shared with link" />
                <RadioItem value="option4" label="Disabled option" disabled />
              </RadioGroup>
            </SubSection>
          </div>
        </Section>

        {/* ═══════════════════════════════════════════════════════
           5. Feedback (Toast, Modal, Tooltip, Badge, ProgressBar)
           ═══════════════════════════════════════════════════════ */}
        <Section id="feedback" title="Feedback">
          <div className="space-y-10">
            {/* Toasts */}
            <SubSection title="Toast Notifications">
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    toast.success("File uploaded", "document.pdf was uploaded successfully.")
                  }
                >
                  Success Toast
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    toast.error("Upload failed", "The file exceeds the 100MB limit.")
                  }
                >
                  Error Toast
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    toast.warning("Storage almost full", "You've used 95% of your quota.")
                  }
                >
                  Warning Toast
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    toast.info("Sync in progress", "Your files are being synchronized.")
                  }
                >
                  Info Toast
                </Button>
              </div>
            </SubSection>

            {/* Modal */}
            <SubSection title="Modal">
              <div className="flex flex-wrap gap-3">
                {(["sm", "md", "lg"] as const).map((size) => (
                  <Button
                    key={size}
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setModalSize(size);
                      setModalOpen(true);
                    }}
                  >
                    Open {size.toUpperCase()} Modal
                  </Button>
                ))}
              </div>

              <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={`Modal — ${modalSize.toUpperCase()}`}
                size={modalSize}
              >
                <div className="space-y-4">
                  <p className="text-sm text-[var(--cv-text-secondary)]">
                    This modal supports backdrop blur, fade + scale enter/exit
                    animation, Escape to close, click-outside to close, and focus
                    trapping for full keyboard operability.
                  </p>
                  <Input label="Folder name" placeholder="New folder" />
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setModalOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setModalOpen(false)}
                    >
                      Create
                    </Button>
                  </div>
                </div>
              </Modal>
            </SubSection>

            {/* Tooltip */}
            <SubSection title="Tooltip">
              <div className="flex flex-wrap items-center gap-6">
                {(["top", "right", "bottom", "left"] as const).map(
                  (placement) => (
                    <Tooltip
                      key={placement}
                      content={`Tooltip on ${placement}`}
                      placement={placement}
                    >
                      <Button variant="secondary" size="sm">
                        {placement.charAt(0).toUpperCase() + placement.slice(1)}
                      </Button>
                    </Tooltip>
                  )
                )}
              </div>
            </SubSection>

            {/* Badge */}
            <SubSection title="Badge">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge>Default</Badge>
                  <Badge variant="primary">Primary</Badge>
                  <Badge variant="success">Success</Badge>
                  <Badge variant="warning">Warning</Badge>
                  <Badge variant="error">Error</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="success" dot>Online</Badge>
                  <Badge variant="warning" dot>Syncing</Badge>
                  <Badge variant="error" dot>Offline</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="primary" size="sm">Small</Badge>
                  <Badge variant="primary" size="md">Medium</Badge>
                  <Badge variant="primary" icon={Zap}>With Icon</Badge>
                </div>
              </div>
            </SubSection>

            {/* ProgressBar */}
            <SubSection title="Progress Bar">
              <div className="max-w-md space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setProgress((p) => Math.max(0, p - 10))}
                    >
                      −10
                    </Button>
                    <span className="text-sm font-medium text-[var(--cv-text)]">
                      {progress}%
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setProgress((p) => Math.min(100, p + 10))}
                    >
                      +10
                    </Button>
                  </div>
                  <ProgressBar value={progress} label />
                </div>
                <ProgressBar value={progress} color="success" size="lg" />
                <ProgressBar value={40} color="warning" size="md" />
                <ProgressBar value={80} color="error" size="sm" />

                <div className="space-y-2 pt-2">
                  <span className="text-sm font-medium text-[var(--cv-text-secondary)]">
                    Indeterminate
                  </span>
                  <ProgressBar />
                </div>
              </div>
            </SubSection>
          </div>
        </Section>

        {/* ═══════════════════════════════════════════════════════
           6. Layout (Card, Tabs, Dropdown, Avatar, EmptyState, Skeleton)
           ═══════════════════════════════════════════════════════ */}
        <Section id="layout" title="Layout">
          <div className="space-y-10">
            {/* Cards */}
            <SubSection title="Card">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card hoverable>
                  <CardHeader bordered>
                    <CardTitle>Cloud Storage</CardTitle>
                    <CardDescription>
                      Securely store and access your files from anywhere.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <ProgressBar value={73} label />
                      <p className="text-xs text-[var(--cv-text-muted)]">
                        73 GB of 100 GB used
                      </p>
                    </div>
                  </CardContent>
                  <CardFooter bordered>
                    <Button variant="primary" size="sm">
                      Upgrade
                    </Button>
                    <Button variant="ghost" size="sm">
                      Manage
                    </Button>
                  </CardFooter>
                </Card>

                <Card hoverable>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Your latest file changes.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {[
                        { icon: Upload, text: "design_v2.fig uploaded", time: "2m ago" },
                        { icon: Edit3, text: "report.docx modified", time: "1h ago" },
                        { icon: Download, text: "backup.zip downloaded", time: "3h ago" },
                      ].map((item) => (
                        <div
                          key={item.text}
                          className="flex items-center gap-3 text-sm"
                        >
                          <item.icon
                            size={14}
                            className="shrink-0 text-[var(--cv-text-muted)]"
                          />
                          <span className="flex-1 text-[var(--cv-text)]">
                            {item.text}
                          </span>
                          <span className="text-xs text-[var(--cv-text-muted)]">
                            {item.time}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Skeleton card */}
                <Card isLoading />
              </div>
            </SubSection>

            {/* Tabs */}
            <SubSection title="Tabs">
              <div className="max-w-lg">
                <Tabs defaultValue="files">
                  <TabsList>
                    <TabsTrigger value="files">Files</TabsTrigger>
                    <TabsTrigger value="shared">Shared</TabsTrigger>
                    <TabsTrigger value="recent">Recent</TabsTrigger>
                    <TabsTrigger value="trash" disabled>
                      Trash
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="files">
                    <Card>
                      <CardContent>
                        <p className="text-sm text-[var(--cv-text-secondary)]">
                          Browse and manage all your uploaded files.
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  <TabsContent value="shared">
                    <Card>
                      <CardContent>
                        <p className="text-sm text-[var(--cv-text-secondary)]">
                          Files shared with you by team members.
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  <TabsContent value="recent">
                    <Card>
                      <CardContent>
                        <p className="text-sm text-[var(--cv-text-secondary)]">
                          Recently accessed files from the last 30 days.
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            </SubSection>

            {/* Dropdown Menu */}
            <SubSection title="Dropdown Menu">
              <div className="flex gap-4">
                <DropdownMenu
                  trigger={
                    <Button variant="secondary" size="sm" rightIcon={<ChevronDown size={14} />}>
                      Actions
                    </Button>
                  }
                  items={[
                    { label: "Edit", icon: Edit3, onClick: () => toast.info("Edit clicked") },
                    { label: "Duplicate", icon: Copy, onClick: () => toast.info("Duplicated") },
                    { label: "Download", icon: Download, shortcut: "⌘D" },
                    { isDivider: true, label: "" },
                    { label: "Delete", icon: Trash2, onClick: () => toast.error("Deleted") },
                  ]}
                />
                <DropdownMenu
                  trigger={
                    <Button variant="ghost" iconOnly size="sm" aria-label="Settings menu">
                      <Settings size={16} />
                    </Button>
                  }
                  items={[
                    { label: "Profile", icon: User },
                    { label: "Notifications", icon: Bell },
                    { label: "Settings", icon: Settings },
                    { isDivider: true, label: "" },
                    { label: "Disabled item", icon: Lock, disabled: true },
                    { isDivider: true, label: "" },
                    { label: "Log out", icon: LogOut },
                  ]}
                  align="right"
                />
              </div>
            </SubSection>

            {/* Avatar */}
            <SubSection title="Avatar">
              <div className="space-y-6">
                {/* Sizes */}
                <div className="flex items-end gap-4">
                  <Avatar name="Alice Chen" alt="Alice Chen" size="sm" />
                  <Avatar name="Bob Smith" alt="Bob Smith" size="md" />
                  <Avatar name="Carol Davis" alt="Carol Davis" size="lg" />
                  <Avatar name="Dan Evans" alt="Dan Evans" size="xl" />
                </div>

                {/* With status */}
                <div className="flex items-center gap-4">
                  <Avatar
                    name="Alice Chen"
                    alt="Alice Chen"
                    size="lg"
                    status="online"
                  />
                  <Avatar
                    name="Bob Smith"
                    alt="Bob Smith"
                    size="lg"
                    status="away"
                  />
                  <Avatar
                    name="Carol Davis"
                    alt="Carol Davis"
                    size="lg"
                    status="busy"
                  />
                  <Avatar
                    name="Dan Evans"
                    alt="Dan Evans"
                    size="lg"
                    status="offline"
                  />
                </div>

                {/* With image (broken to show fallback) */}
                <div className="flex items-center gap-4">
                  <Avatar
                    name="Jane Wilson"
                    alt="Jane Wilson"
                    src="https://i.pravatar.cc/150?u=jane"
                    size="lg"
                    status="online"
                  />
                  <Avatar
                    name="Mark Johnson"
                    alt="Mark Johnson"
                    src="https://i.pravatar.cc/150?u=mark"
                    size="lg"
                  />
                </div>
              </div>
            </SubSection>

            {/* Empty State */}
            <SubSection title="Empty State">
              <Card>
                <EmptyState
                  icon={FolderOpen}
                  title="No files yet"
                  description="Upload your first file to get started with CloudVault's secure cloud storage."
                  actionLabel="Upload Files"
                  onAction={() => toast.info("Upload started")}
                />
              </Card>
            </SubSection>

            {/* Skeleton */}
            <SubSection title="Skeleton">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <span className="text-xs text-[var(--cv-text-muted)]">
                    Rectangular
                  </span>
                  <Skeleton variant="rectangular" height={120} />
                </div>
                <div className="space-y-4">
                  <span className="text-xs text-[var(--cv-text-muted)]">
                    Circular
                  </span>
                  <div className="flex items-center gap-4">
                    <Skeleton variant="circular" width={40} height={40} />
                    <Skeleton variant="circular" width={56} height={56} />
                    <Skeleton variant="circular" width={72} height={72} />
                  </div>
                </div>
                <div className="space-y-4">
                  <span className="text-xs text-[var(--cv-text-muted)]">
                    Text Lines
                  </span>
                  <Skeleton variant="text" count={4} />
                </div>
              </div>
            </SubSection>
          </div>
        </Section>

        {/* ─── Footer ───────────────────────────────────────────── */}
        <footer className="border-t border-[var(--cv-border)] pt-8 pb-12 text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-[var(--cv-text-muted)]">
            <HardDrive size={14} />
            <span>
              CloudVault Design System • Built with React 19 + TypeScript + Vite +
              Tailwind CSS v4
            </span>
          </div>
        </footer>
      </main>
    </div>
  );
}
