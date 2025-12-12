import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Mail, Lock, CheckCircle, AlertCircle, Shield } from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

export default function Settings() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordVerificationCode, setPasswordVerificationCode] = useState("");
  const [showPasswordVerification, setShowPasswordVerification] = useState(false);
  
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailVerificationCode, setEmailVerificationCode] = useState("");
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  
  const [verificationCode, setVerificationCode] = useState("");

  const verifyEmailMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/auth/verify-email", { code });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Email verified successfully" });
      refreshUser();
      setVerificationCode("");
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Verification failed", description: error.message });
    }
  });

  const resendVerificationMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/resend-verification", {});
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Verification code sent", description: "Check your email for the new code" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Failed to send code", description: error.message });
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await apiRequest("POST", "/api/auth/change-password", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Verification code sent", description: "Check your email to confirm password change" });
      setShowPasswordVerification(true);
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Failed to change password", description: error.message });
    }
  });

  const confirmPasswordChangeMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/auth/confirm-password-change", { code });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Password changed successfully" });
      setShowPasswordVerification(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setPasswordVerificationCode("");
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Failed to confirm", description: error.message });
    }
  });

  const changeEmailMutation = useMutation({
    mutationFn: async (data: { newEmail: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/change-email", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Verification code sent", description: "Check your new email to confirm the change" });
      setShowEmailVerification(true);
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Failed to change email", description: error.message });
    }
  });

  const confirmEmailChangeMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/auth/confirm-email-change", { code });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Email changed successfully" });
      setShowEmailVerification(false);
      setNewEmail("");
      setEmailPassword("");
      setEmailVerificationCode("");
      refreshUser();
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Failed to confirm", description: error.message });
    }
  });

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      toast({ variant: "destructive", title: "Passwords don't match" });
      return;
    }
    if (newPassword.length < 8) {
      toast({ variant: "destructive", title: "Password too short", description: "Password must be at least 8 characters" });
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  const handleEmailChange = (e: React.FormEvent) => {
    e.preventDefault();
    changeEmailMutation.mutate({ newEmail, password: emailPassword });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setLocation("/dashboard")}
            data-testid="button-back-dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">Account Settings</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Verification
            </CardTitle>
            <CardDescription>
              Verify your email address to secure your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-muted-foreground">{user?.email}</span>
              {user?.isEmailVerified ? (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Not Verified
                </Badge>
              )}
            </div>
            
            {!user?.isEmailVerified && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit verification code sent to your email:
                </p>
                <div className="flex items-center gap-4">
                  <InputOTP 
                    maxLength={6} 
                    value={verificationCode}
                    onChange={setVerificationCode}
                    data-testid="input-verification-code"
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                  <Button 
                    onClick={() => verifyEmailMutation.mutate(verificationCode)}
                    disabled={verificationCode.length !== 6 || verifyEmailMutation.isPending}
                    data-testid="button-verify-email"
                  >
                    {verifyEmailMutation.isPending ? "Verifying..." : "Verify"}
                  </Button>
                </div>
                <Button 
                  variant="link" 
                  className="px-0"
                  onClick={() => resendVerificationMutation.mutate()}
                  disabled={resendVerificationMutation.isPending}
                  data-testid="button-resend-verification"
                >
                  {resendVerificationMutation.isPending ? "Sending..." : "Resend verification code"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Change Password
            </CardTitle>
            <CardDescription>
              Update your password to keep your account secure
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showPasswordVerification ? (
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    data-testid="input-current-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    data-testid="input-new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                  <Input
                    id="confirmNewPassword"
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                    data-testid="input-confirm-new-password"
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={changePasswordMutation.isPending}
                  data-testid="button-change-password"
                >
                  {changePasswordMutation.isPending ? "Processing..." : "Change Password"}
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit code sent to your email to confirm password change:
                </p>
                <div className="flex items-center gap-4">
                  <InputOTP 
                    maxLength={6} 
                    value={passwordVerificationCode}
                    onChange={setPasswordVerificationCode}
                    data-testid="input-password-verification-code"
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                  <Button 
                    onClick={() => confirmPasswordChangeMutation.mutate(passwordVerificationCode)}
                    disabled={passwordVerificationCode.length !== 6 || confirmPasswordChangeMutation.isPending}
                    data-testid="button-confirm-password-change"
                  >
                    {confirmPasswordChangeMutation.isPending ? "Confirming..." : "Confirm"}
                  </Button>
                </div>
                <Button 
                  variant="ghost"
                  onClick={() => {
                    setShowPasswordVerification(false);
                    setPasswordVerificationCode("");
                  }}
                  data-testid="button-cancel-password-change"
                >
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Change Email
            </CardTitle>
            <CardDescription>
              Update your email address (requires verification)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showEmailVerification ? (
              <form onSubmit={handleEmailChange} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newEmail">New Email Address</Label>
                  <Input
                    id="newEmail"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                    data-testid="input-new-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emailPassword">Confirm with Password</Label>
                  <Input
                    id="emailPassword"
                    type="password"
                    value={emailPassword}
                    onChange={(e) => setEmailPassword(e.target.value)}
                    required
                    data-testid="input-email-password"
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={changeEmailMutation.isPending}
                  data-testid="button-change-email"
                >
                  {changeEmailMutation.isPending ? "Processing..." : "Change Email"}
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit code sent to your new email ({newEmail}) to confirm:
                </p>
                <div className="flex items-center gap-4">
                  <InputOTP 
                    maxLength={6} 
                    value={emailVerificationCode}
                    onChange={setEmailVerificationCode}
                    data-testid="input-email-verification-code"
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                  <Button 
                    onClick={() => confirmEmailChangeMutation.mutate(emailVerificationCode)}
                    disabled={emailVerificationCode.length !== 6 || confirmEmailChangeMutation.isPending}
                    data-testid="button-confirm-email-change"
                  >
                    {confirmEmailChangeMutation.isPending ? "Confirming..." : "Confirm"}
                  </Button>
                </div>
                <Button 
                  variant="ghost"
                  onClick={() => {
                    setShowEmailVerification(false);
                    setEmailVerificationCode("");
                  }}
                  data-testid="button-cancel-email-change"
                >
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
