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
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import {
  useGetCallerUserProfile,
  useSaveCallerUserProfile,
} from "@/hooks/useQueries";
import {
  Calendar,
  CheckCircle2,
  CreditCard,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Save,
  Shield,
  User,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface ExtraProfile {
  phone: string;
  address: string;
  dob: string;
  idNumber: string;
}

const EXTRA_KEY = "docfill_profile_extra";

function loadExtra(): ExtraProfile {
  try {
    return JSON.parse(localStorage.getItem(EXTRA_KEY) || "{}") as ExtraProfile;
  } catch {
    return { phone: "", address: "", dob: "", idNumber: "" };
  }
}

export function ProfilePage() {
  const { data: profile, isLoading } = useGetCallerUserProfile();
  const { mutateAsync: saveProfile, isPending } = useSaveCallerUserProfile();
  const { identity } = useInternetIdentity();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [dob, setDob] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setEmail(profile.email || "");
    }
    const extra = loadExtra();
    setPhone(extra.phone || "");
    setAddress(extra.address || "");
    setDob(extra.dob || "");
    setIdNumber(extra.idNumber || "");
  }, [profile]);

  const fields = [name, email, phone, address, dob, idNumber];
  const filledCount = fields.filter((v) => v.trim().length > 0).length;
  const completionPct = Math.round((filledCount / fields.length) * 100);

  const handleSave = async () => {
    try {
      const principal = identity?.getPrincipal().toString() || "";
      await saveProfile({ id: principal, name, email });
      const extra: ExtraProfile = { phone, address, dob, idNumber };
      localStorage.setItem(EXTRA_KEY, JSON.stringify(extra));
      setSaved(true);
      toast.success("Profile saved successfully");
      setTimeout(() => setSaved(false), 3000);
    } catch {
      toast.error("Failed to save profile. Please try again.");
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
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-1">
          Master Profile
        </h1>
        <p className="text-muted-foreground text-sm">
          Your personal data used to auto-fill document fields
        </p>
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
            {completionPct === 100 && (
              <div className="flex items-center gap-2 mt-3 text-success text-xs font-medium">
                <CheckCircle2 size={14} />
                All fields filled — maximum auto-fill accuracy
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Form */}
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
              This information will be used to auto-fill form fields in uploaded
              documents
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Row 1 */}
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

            {/* Row 2 */}
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

            {/* Row 3 */}
            <div className="space-y-2">
              <Label
                htmlFor="address"
                className="text-sm font-medium flex items-center gap-1.5"
              >
                <MapPin size={13} className="text-muted-foreground" />
                Mailing Address
              </Label>
              <Input
                id="address"
                data-ocid="profile.address.input"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main Street, New York, NY 10001"
                className="h-10"
              />
            </div>

            {/* Row 4 */}
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

            {/* Save button */}
            <div className="pt-2 border-t border-border">
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
                Profile data is stored securely on the Internet Computer
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
