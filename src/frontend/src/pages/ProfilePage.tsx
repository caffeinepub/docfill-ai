import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import {
  useGetCallerUserProfile,
  useSaveCallerUserProfile,
} from "@/hooks/useQueries";
import {
  AlertTriangle,
  Briefcase,
  Calendar,
  CheckCircle2,
  CreditCard,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  Save,
  Shield,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface ExtraProfile {
  phone: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  dob: string;
  idNumber: string;
  employer: string;
  jobTitle: string;
}

interface RefereeProfile {
  referee1Name: string;
  referee1Relationship: string;
  referee1Phone: string;
  referee1Address: string;
  referee2Name: string;
  referee2Relationship: string;
  referee2Phone: string;
  referee2Address: string;
}

const EXTRA_KEY = "docfill_profile_extra";
const REFEREES_KEY = "docfill_referees";
const PRIVACY_KEY = "docfill_privacy_mode";

const EMPTY_EXTRA: ExtraProfile = {
  phone: "",
  street: "",
  city: "",
  state: "",
  zip: "",
  dob: "",
  idNumber: "",
  employer: "",
  jobTitle: "",
};

const EMPTY_REFEREES: RefereeProfile = {
  referee1Name: "",
  referee1Relationship: "",
  referee1Phone: "",
  referee1Address: "",
  referee2Name: "",
  referee2Relationship: "",
  referee2Phone: "",
  referee2Address: "",
};

function loadReferees(): RefereeProfile {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(REFEREES_KEY) || "{}",
    ) as Partial<RefereeProfile>;
    return { ...EMPTY_REFEREES, ...parsed };
  } catch {
    return { ...EMPTY_REFEREES };
  }
}

function loadExtra(): ExtraProfile {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(EXTRA_KEY) || "{}",
    ) as Partial<ExtraProfile>;
    return { ...EMPTY_EXTRA, ...parsed };
  } catch {
    return { ...EMPTY_EXTRA };
  }
}

export function ProfilePage() {
  const { data: profile, isLoading } = useGetCallerUserProfile();
  const { mutateAsync: saveProfile, isPending } = useSaveCallerUserProfile();
  const { identity } = useInternetIdentity();

  // Privacy mode — persisted as a boolean in localStorage (mode setting itself,
  // not the profile data)
  const [privacyMode, setPrivacyMode] = useState<boolean>(
    () => localStorage.getItem(PRIVACY_KEY) === "true",
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [dob, setDob] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [employer, setEmployer] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [saved, setSaved] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  // Referee state
  const [referee1Name, setReferee1Name] = useState("");
  const [referee1Relationship, setReferee1Relationship] = useState("");
  const [referee1Phone, setReferee1Phone] = useState("");
  const [referee1Address, setReferee1Address] = useState("");
  const [referee2Name, setReferee2Name] = useState("");
  const [referee2Relationship, setReferee2Relationship] = useState("");
  const [referee2Phone, setReferee2Phone] = useState("");
  const [referee2Address, setReferee2Address] = useState("");

  // Load profile name/email from backend
  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setEmail(profile.email || "");
    }
  }, [profile]);

  // Load extra fields from localStorage on first mount (only when privacy mode is OFF)
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally runs only on mount
  useEffect(() => {
    if (!privacyMode) {
      const extra = loadExtra();
      setPhone(extra.phone);
      setStreet(extra.street);
      setCity(extra.city);
      setState(extra.state);
      setZip(extra.zip);
      setDob(extra.dob);
      setIdNumber(extra.idNumber);
      setEmployer(extra.employer);
      setJobTitle(extra.jobTitle);

      const refs = loadReferees();
      setReferee1Name(refs.referee1Name);
      setReferee1Relationship(refs.referee1Relationship);
      setReferee1Phone(refs.referee1Phone);
      setReferee1Address(refs.referee1Address);
      setReferee2Name(refs.referee2Name);
      setReferee2Relationship(refs.referee2Relationship);
      setReferee2Phone(refs.referee2Phone);
      setReferee2Address(refs.referee2Address);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePrivacyToggle = (checked: boolean) => {
    setPrivacyMode(checked);
    localStorage.setItem(PRIVACY_KEY, String(checked));
    if (checked) {
      // Clear in-memory extra data — user chose privacy mode
      setPhone("");
      setStreet("");
      setCity("");
      setState("");
      setZip("");
      setDob("");
      setIdNumber("");
      setEmployer("");
      setJobTitle("");
      setReferee1Name("");
      setReferee1Relationship("");
      setReferee1Phone("");
      setReferee1Address("");
      setReferee2Name("");
      setReferee2Relationship("");
      setReferee2Phone("");
      setReferee2Address("");
      toast.info("Privacy Mode enabled — data won't be saved to localStorage");
    } else {
      toast.info("Privacy Mode disabled — data will persist after refresh");
    }
  };

  // 11 total fields
  const fields = [
    name,
    email,
    phone,
    street,
    city,
    state,
    zip,
    dob,
    idNumber,
    employer,
    jobTitle,
  ];
  const filledCount = fields.filter((v) => v.trim().length > 0).length;
  const completionPct = Math.round((filledCount / 11) * 100);

  const handleSave = async () => {
    try {
      const principal = identity?.getPrincipal().toString() || "";
      await saveProfile({ id: principal, name, email });

      // Only persist extra fields to localStorage when privacy mode is OFF
      if (!privacyMode) {
        const extra: ExtraProfile = {
          phone,
          street,
          city,
          state,
          zip,
          dob,
          idNumber,
          employer,
          jobTitle,
        };
        localStorage.setItem(EXTRA_KEY, JSON.stringify(extra));

        const refs: RefereeProfile = {
          referee1Name,
          referee1Relationship,
          referee1Phone,
          referee1Address,
          referee2Name,
          referee2Relationship,
          referee2Phone,
          referee2Address,
        };
        localStorage.setItem(REFEREES_KEY, JSON.stringify(refs));
      }

      setSaved(true);
      toast.success("Profile saved successfully");
      setTimeout(() => setSaved(false), 3000);
    } catch {
      toast.error("Failed to save profile. Please try again.");
    }
  };

  const handleClearAll = async () => {
    try {
      const principal = identity?.getPrincipal().toString() || "";
      await saveProfile({ id: principal, name: "", email: "" });
      localStorage.setItem(EXTRA_KEY, JSON.stringify({}));
      localStorage.setItem(REFEREES_KEY, JSON.stringify({}));
      setName("");
      setEmail("");
      setPhone("");
      setStreet("");
      setCity("");
      setState("");
      setZip("");
      setDob("");
      setIdNumber("");
      setEmployer("");
      setJobTitle("");
      setReferee1Name("");
      setReferee1Relationship("");
      setReferee1Phone("");
      setReferee1Address("");
      setReferee2Name("");
      setReferee2Relationship("");
      setReferee2Phone("");
      setReferee2Address("");
      setClearDialogOpen(false);
      toast.success("Profile cleared");
    } catch {
      toast.error("Failed to clear profile. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-1">
              Master Profile
            </h1>
            <p className="text-muted-foreground text-sm">
              Your personal data used to auto-fill document fields
            </p>
          </div>
          <Badge
            variant="secondary"
            className="text-xs px-2 py-1 bg-primary/10 text-primary border-primary/20"
          >
            v4.0
          </Badge>
        </div>
      </motion.div>

      {/* Privacy Mode Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.35 }}
      >
        <Card className="bento-card">
          <CardContent className="py-5 px-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Lock size={16} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Privacy Mode
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {privacyMode
                      ? "Data kept in memory only"
                      : "Data persisted to localStorage"}
                  </p>
                </div>
              </div>
              <Switch
                data-ocid="profile.privacy_mode.switch"
                checked={privacyMode}
                onCheckedChange={handlePrivacyToggle}
                aria-label="Toggle Privacy Mode"
              />
            </div>

            {/* Warning banner when privacy mode is ON */}
            {privacyMode && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-start gap-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3.5 py-3"
              >
                <AlertTriangle
                  size={15}
                  className="text-amber-500 flex-shrink-0 mt-0.5"
                />
                <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
                  <strong>
                    Data will be cleared if you refresh or close the tab.
                  </strong>{" "}
                  Only your name and email are saved to the secure backend.
                </p>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Completeness */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.35 }}
      >
        <Card className="bento-card">
          <CardContent className="py-5 px-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-primary" />
                <span className="text-sm font-semibold text-foreground">
                  Profile Completeness
                </span>
              </div>
              <Badge
                variant={completionPct === 100 ? "default" : "secondary"}
                className={
                  completionPct === 100
                    ? "bg-success text-success-foreground"
                    : ""
                }
              >
                {completionPct}% Complete
              </Badge>
            </div>
            <Progress value={completionPct} className="h-2.5" />
            <p className="text-xs text-muted-foreground mt-2">
              {filledCount} of 11 fields filled
            </p>
            {completionPct === 100 && (
              <div className="flex items-center gap-2 mt-2 text-success text-xs font-medium">
                <CheckCircle2 size={14} />
                All fields filled — maximum auto-fill accuracy
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Personal Information */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.35 }}
      >
        <Card className="bento-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User size={18} className="text-primary" />
              Personal Information
            </CardTitle>
            <CardDescription>
              Basic identity information for auto-filling document fields
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Row 1: Name + Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="name"
                  className="text-sm font-medium flex items-center gap-1.5"
                >
                  <User size={13} className="text-muted-foreground" />
                  Full Name
                </Label>
                <Input
                  id="name"
                  data-ocid="profile.name.input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Smith"
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-sm font-medium flex items-center gap-1.5"
                >
                  <Mail size={13} className="text-muted-foreground" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  data-ocid="profile.email.input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@example.com"
                  className="h-10"
                />
              </div>
            </div>

            {/* Row 2: Phone + DOB */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="phone"
                  className="text-sm font-medium flex items-center gap-1.5"
                >
                  <Phone size={13} className="text-muted-foreground" />
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  data-ocid="profile.phone.input"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="dob"
                  className="text-sm font-medium flex items-center gap-1.5"
                >
                  <Calendar size={13} className="text-muted-foreground" />
                  Date of Birth
                </Label>
                <Input
                  id="dob"
                  data-ocid="profile.dob.input"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="h-10"
                />
              </div>
            </div>

            {/* Row 3: ID Number */}
            <div className="space-y-2">
              <Label
                htmlFor="idNumber"
                className="text-sm font-medium flex items-center gap-1.5"
              >
                <CreditCard size={13} className="text-muted-foreground" />
                ID / Passport Number
              </Label>
              <Input
                id="idNumber"
                data-ocid="profile.id.input"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder="A12345678"
                className="h-10"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Mailing Address */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.35 }}
      >
        <Card className="bento-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin size={18} className="text-primary" />
              Mailing Address
            </CardTitle>
            <CardDescription>
              Your postal address for correspondence and document fields
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Street */}
            <div className="space-y-2">
              <Label
                htmlFor="street"
                className="text-sm font-medium flex items-center gap-1.5"
              >
                <MapPin size={13} className="text-muted-foreground" />
                Street Address
              </Label>
              <Input
                id="street"
                data-ocid="profile.street.input"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="123 Main Street"
                className="h-10"
              />
            </div>
            {/* City + State + Zip — 2×2 grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city" className="text-sm font-medium">
                  City
                </Label>
                <Input
                  id="city"
                  data-ocid="profile.city.input"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="New York"
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state" className="text-sm font-medium">
                  State
                </Label>
                <Input
                  id="state"
                  data-ocid="profile.state.input"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="NY"
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip" className="text-sm font-medium">
                  Zip Code
                </Label>
                <Input
                  id="zip"
                  data-ocid="profile.zip.input"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder="10001"
                  className="h-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Employment Information */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.35 }}
      >
        <Card className="bento-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Briefcase size={18} className="text-primary" />
              Employment Information
            </CardTitle>
            <CardDescription>
              Your current employer details for employment-related documents
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="employer"
                  className="text-sm font-medium flex items-center gap-1.5"
                >
                  <Briefcase size={13} className="text-muted-foreground" />
                  Employer / Company Name
                </Label>
                <Input
                  id="employer"
                  data-ocid="profile.employer.input"
                  value={employer}
                  onChange={(e) => setEmployer(e.target.value)}
                  placeholder="Acme Corporation"
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="jobTitle"
                  className="text-sm font-medium flex items-center gap-1.5"
                >
                  <Briefcase size={13} className="text-muted-foreground" />
                  Job Title
                </Label>
                <Input
                  id="jobTitle"
                  data-ocid="profile.jobtitle.input"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="Software Engineer"
                  className="h-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Referees / Sponsors */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28, duration: 0.35 }}
      >
        <Card className="bento-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users size={18} className="text-primary" />
              Referees / Sponsors
            </CardTitle>
            <CardDescription>
              Referee or sponsor details for immigration and naturalization
              forms (bonus fields — not counted in completeness)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Referee 1 */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">
                  1
                </span>
                Referee / Sponsor 1
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="referee1Name" className="text-sm font-medium">
                    Full Name
                  </Label>
                  <Input
                    id="referee1Name"
                    data-ocid="profile.referee1.name.input"
                    value={referee1Name}
                    onChange={(e) => setReferee1Name(e.target.value)}
                    placeholder="John Doe"
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="referee1Relationship"
                    className="text-sm font-medium"
                  >
                    Relationship
                  </Label>
                  <Input
                    id="referee1Relationship"
                    value={referee1Relationship}
                    onChange={(e) => setReferee1Relationship(e.target.value)}
                    placeholder="Friend, Colleague, etc."
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="referee1Phone"
                    className="text-sm font-medium"
                  >
                    Phone
                  </Label>
                  <Input
                    id="referee1Phone"
                    data-ocid="profile.referee1.phone.input"
                    type="tel"
                    value={referee1Phone}
                    onChange={(e) => setReferee1Phone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="referee1Address"
                    className="text-sm font-medium"
                  >
                    Address
                  </Label>
                  <Input
                    id="referee1Address"
                    data-ocid="profile.referee1.address.input"
                    value={referee1Address}
                    onChange={(e) => setReferee1Address(e.target.value)}
                    placeholder="123 Main St, City, State"
                    className="h-10"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-border/60" />

            {/* Referee 2 */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">
                  2
                </span>
                Referee / Sponsor 2
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="referee2Name" className="text-sm font-medium">
                    Full Name
                  </Label>
                  <Input
                    id="referee2Name"
                    data-ocid="profile.referee2.name.input"
                    value={referee2Name}
                    onChange={(e) => setReferee2Name(e.target.value)}
                    placeholder="Jane Smith"
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="referee2Relationship"
                    className="text-sm font-medium"
                  >
                    Relationship
                  </Label>
                  <Input
                    id="referee2Relationship"
                    value={referee2Relationship}
                    onChange={(e) => setReferee2Relationship(e.target.value)}
                    placeholder="Friend, Colleague, etc."
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="referee2Phone"
                    className="text-sm font-medium"
                  >
                    Phone
                  </Label>
                  <Input
                    id="referee2Phone"
                    data-ocid="profile.referee2.phone.input"
                    type="tel"
                    value={referee2Phone}
                    onChange={(e) => setReferee2Phone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="referee2Address"
                    className="text-sm font-medium"
                  >
                    Address
                  </Label>
                  <Input
                    id="referee2Address"
                    data-ocid="profile.referee2.address.input"
                    value={referee2Address}
                    onChange={(e) => setReferee2Address(e.target.value)}
                    placeholder="456 Oak Ave, City, State"
                    className="h-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Save + Clear Actions */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.35 }}
      >
        <Card className="bento-card">
          <CardContent className="py-5 px-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <Button
                  data-ocid="profile.save.button"
                  onClick={handleSave}
                  disabled={isPending}
                  className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary-glow"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : saved ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {isPending ? "Saving..." : saved ? "Saved!" : "Save Profile"}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  {privacyMode
                    ? "Name & email saved to backend only — extra fields kept in memory"
                    : "Profile data is stored securely on the Internet Computer"}
                </p>
              </div>

              <div className="border-t border-border sm:border-t-0 sm:border-l sm:pl-4 pt-4 sm:pt-0 w-full sm:w-auto">
                <AlertDialog
                  open={clearDialogOpen}
                  onOpenChange={setClearDialogOpen}
                >
                  <AlertDialogTrigger asChild>
                    <Button
                      data-ocid="profile.clear_all.open_modal_button"
                      variant="outline"
                      className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/5 hover:border-destructive/50 w-full sm:w-auto"
                    >
                      <Trash2 className="h-4 w-4" />
                      Clear All Data
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent data-ocid="profile.clear_all.dialog">
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Clear All Profile Data
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently erase all your profile
                        information. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel data-ocid="profile.clear_all.cancel_button">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        data-ocid="profile.clear_all.confirm_button"
                        onClick={handleClearAll}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Yes, Clear All
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <p className="text-xs text-muted-foreground mt-2 text-right sm:text-left">
                  Resets all fields to empty
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
