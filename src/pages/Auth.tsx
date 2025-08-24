import { useState, useEffect } from "react";
import { Eye, EyeOff, MessageCircle, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [authMethod, setAuthMethod] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [awaitingSms, setAwaitingSms] = useState(false);
  const { toast } = useToast();

  // Force dark mode on the auth page
  useEffect(() => {
    const root = document.documentElement;
    const hadLight = root.classList.contains('light');
    const hadDark = root.classList.contains('dark');

    root.classList.remove('light');
    root.classList.add('dark');

    return () => {
      if (hadLight) {
        root.classList.remove('dark');
        root.classList.add('light');
      } else if (!hadDark) {
        root.classList.remove('dark');
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (authMethod === "phone") {
      // Enhanced phone validation
      const phoneRegex = /^\+?[1-9]\d{10,14}$/;
      if (!phone || !phoneRegex.test(phone.replace(/\s/g, ''))) {
        toast({
          title: "Error",
          description: "Please enter a valid phone number with country code",
          variant: "destructive",
        });
        return;
      }
      
      setLoading(true);
      
      try {
        const { error } = await supabase.auth.signInWithOtp({
          phone,
        });

        if (error) {
          toast({
            title: "SMS Failed",
            description: error.message,
            variant: "destructive",
          });
        } else {
          setAwaitingSms(true);
          toast({
            title: "SMS Sent",
            description: "Please check your phone for the verification code",
          });
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Something went wrong. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
      return;
    }

    // Enhanced email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    if (!password) {
      toast({
        title: "Error",
        description: "Please enter a password",
        variant: "destructive",
      });
      return;
    }

    // Enhanced password validation for sign up
    if (!isLogin) {
      if (password.length < 8) {
        toast({
          title: "Error",
          description: "Password must be at least 8 characters long",
          variant: "destructive",
        });
        return;
      }

      if (password !== confirmPassword) {
        toast({
          title: "Error",
          description: "Passwords do not match",
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          toast({
            title: "Login Failed",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Welcome back!",
            description: "Successfully logged in",
          });
        }
      } else {
        const redirectUrl = `${window.location.origin}/`;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
          },
        });

        if (error) {
          toast({
            title: "Sign Up Failed",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Account Created",
            description: "Please check your email to verify your account",
          });
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSmsVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!smsCode) {
      toast({
        title: "Error",
        description: "Please enter the verification code",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        phone,
        token: smsCode,
        type: 'sms'
      });

      if (error) {
        toast({
          title: "Verification Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Welcome!",
          description: "Successfully logged in",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-3 md:p-4 page-enter">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-6 md:mb-8 scale-in">
          <div className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 bg-primary rounded-2xl mb-3 md:mb-4 bounce-in">
            <MessageCircle className="h-6 w-6 md:h-8 md:w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">Whispr</h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            Secure messaging for everyone
          </p>
        </div>

        <Card className="border-0 shadow-lg fade-in hover-lift">
          <CardHeader className="text-center p-4 md:p-6">
            <CardTitle className="text-xl md:text-2xl">
              {isLogin ? "Welcome back" : "Create account"}
            </CardTitle>
            <CardDescription className="text-sm md:text-base">
              {isLogin
                ? "Sign in to your account to continue"
                : "Join millions who trust Whispr for secure communication"}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 md:p-6">
            {awaitingSms ? (
              <form onSubmit={handleSmsVerification} className="space-y-4">
                <div className="text-center mb-4">
                  <p className="text-sm text-muted-foreground">
                    We sent a verification code to {phone}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="smsCode">Verification Code</Label>
                  <Input
                    id="smsCode"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={smsCode}
                    onChange={(e) => setSmsCode(e.target.value)}
                    required
                    className="h-12 text-center text-lg tracking-widest"
                    maxLength={6}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-10 md:h-12 text-sm md:text-base font-medium touch-feedback btn-press"
                  disabled={loading}
                >
                  {loading ? "Verifying..." : "Verify"}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full touch-feedback"
                  onClick={() => {
                    setAwaitingSms(false);
                    setSmsCode("");
                  }}
                >
                  Back to phone number
                </Button>
              </form>
            ) : (
              <>
                {/* Auth Method Toggle */}
                <div className="flex rounded-lg bg-muted p-1 mb-4 slide-down">
                  <Button
                    type="button"
                    variant={authMethod === "email" ? "default" : "ghost"}
                    size="sm"
                    className="flex-1 h-7 md:h-8 text-xs md:text-sm touch-feedback"
                    onClick={() => setAuthMethod("email")}
                  >
                    <Mail className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                    Email
                  </Button>
                  <Button
                    type="button"
                    variant={authMethod === "phone" ? "default" : "ghost"}
                    size="sm"
                    className="flex-1 h-7 md:h-8 text-xs md:text-sm touch-feedback"
                    onClick={() => setAuthMethod("phone")}
                  >
                    <Phone className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                    Phone
                  </Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {authMethod === "email" ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="h-10 md:h-12"
                          />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="h-10 md:h-12 pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-10 md:h-12 w-10 touch-feedback"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {!isLogin && (
                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword">Confirm Password</Label>
                          <Input
                            id="confirmPassword"
                            type="password"
                            placeholder="Confirm your password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            className="h-10 md:h-12"
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+1234567890"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        className="h-10 md:h-12"
                      />
                      <p className="text-xs text-muted-foreground">
                        We'll send you a verification code via SMS
                      </p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-10 md:h-12 text-sm md:text-base font-medium touch-feedback btn-press"
                    disabled={loading}
                  >
                    {loading
                      ? "Please wait..."
                      : authMethod === "phone"
                      ? "Send SMS Code"
                      : isLogin
                      ? "Sign In"
                      : "Create Account"}
                  </Button>
                </form>
              </>
            )}

            {!awaitingSms && authMethod === "email" && (
              <div className="mt-4 md:mt-6 text-center slide-up">
                <p className="text-sm text-muted-foreground">
                  {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                  <Button
                    variant="link"
                    className="p-0 h-auto font-medium text-primary touch-feedback"
                    onClick={() => {
                      setIsLogin(!isLogin);
                      setPassword("");
                      setConfirmPassword("");
                    }}
                  >
                    {isLogin ? "Sign up" : "Sign in"}
                  </Button>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center mt-4 md:mt-6 fade-in">
          <p className="text-xs text-muted-foreground">
            By continuing, you agree to Whispr's{" "}
            <Button variant="link" className="p-0 h-auto text-xs touch-feedback">
              Terms of Service
            </Button>{" "}
            and{" "}
            <Button variant="link" className="p-0 h-auto text-xs touch-feedback">
              Privacy Policy
            </Button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;