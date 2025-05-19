import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface LoginFormProps {
  onLoginSuccess: (userId: number, username: string) => void;
  onRegisterSuccess: (userId: number, username: string) => void;
}

export default function LoginForm({ onLoginSuccess, onRegisterSuccess }: LoginFormProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  const { toast } = useToast();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Something went wrong");
      }
      
      const data = await response.json();
      
      if (isLogin) {
        onLoginSuccess(data.user.id, data.user.username);
        toast({
          title: "Login successful",
          description: `Welcome back, ${data.user.username}!`,
        });
      } else {
        onRegisterSuccess(data.user.id, data.user.username);
        toast({
          title: "Registration successful",
          description: `Welcome, ${data.user.username}!`,
        });
      }
    } catch (error) {
      toast({
        title: isLogin ? "Login failed" : "Registration failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
    
    setLoading(false);
  };
  
  return (
    <div className="w-full max-w-sm p-6 mx-auto mt-10 bg-white rounded-lg shadow-md">
      <h2 className="mb-6 text-2xl font-bold text-center">
        {isLogin ? "Log in to save plays online" : "Create an account"}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Please wait..." : isLogin ? "Log in" : "Register"}
        </Button>
      </form>
      
      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={() => setIsLogin(!isLogin)}
          className="text-sm text-blue-600 hover:underline"
        >
          {isLogin ? "Don't have an account? Register" : "Already have an account? Log in"}
        </button>
      </div>
    </div>
  );
}