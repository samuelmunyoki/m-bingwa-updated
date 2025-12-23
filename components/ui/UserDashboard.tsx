"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SignOutButton, useUser, SignIn } from "@clerk/nextjs";
import { Loader2, User, Shield, Mail, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Authenticated, Unauthenticated } from "convex/react";

export default function UserDashboard() {
  return (
    <div className="container mx-auto p-4 min-h-screen flex items-center justify-center">
      <Authenticated>
        <AuthenticatedDashboard />
      </Authenticated>
      <Unauthenticated>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Welcome</CardTitle>
          </CardHeader>
          <CardContent>
            <SignIn />
          </CardContent>
        </Card>
      </Unauthenticated>
    </div>
  );
}

function AuthenticatedDashboard() {
  const { user } = useUser();
  const userData = useQuery(
    api.users.getUserById,
    user ? { userId: user.id } : "skip"
  );

  if (!user || userData === undefined) {
    return (
      <div className="flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (userData === null) {
    return (
      <div className="flex flex-col items-center justify-center text-red-500">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p>User not found. Please contact support.</p>
      </div>
    );
  }

  const dashboardLink = userData.isAdmin ? "/dashboard" : "/platform";

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl font-bold flex items-center justify-between">
          User Profile
          <Badge variant={userData.isAdmin ? "default" : "secondary"}>
            {userData.isAdmin ? "Admin" : "User"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-4">
          <User className="h-5 w-5 text-gray-500" />
          <span className="font-medium">{userData.name}</span>
        </div>
        <div className="flex items-center space-x-4">
          <Mail className="h-5 w-5 text-gray-500" />
          <span>{userData.email}</span>
        </div>
        <div className="flex items-center space-x-4">
          <Shield className="h-5 w-5 text-gray-500" />
          <span>Account Status: </span>
          <Badge variant={userData.suspended ? "destructive" : "success"}>
            {userData.suspended ? "Suspended" : "Active"}
          </Badge>
        </div>
        <div className="flex justify-between items-center">
          <Link
            href={dashboardLink}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Go to Dashboard
          </Link>
          <SignOutButton/>
          </div>
      </CardContent>
    </Card>
  );
}
