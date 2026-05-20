import { Id } from "@/convex/_generated/dataModel";
import React from "react";
import BlacklistManager from "./blacklist";

interface dbUser {
  _id: Id<"users">;
  userId: string;
  name: string;
  email: string;
  isAdmin: boolean;
  profileImage: string;
  suspended: boolean;
  phoneNumber?: string;
}

interface SettingsMainProps {
  user: dbUser;
}
const BlacklistMain = ({ user }: SettingsMainProps) => {
  return (
    <div className="flex flex-1">
      <div className="px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex flex-col flex-1 w-full gap-2">
        <h2 className="text-lg text-neutral-600 font-medium">
          Blacklist Management
        </h2>
        <div className="flex gap-2">
          <BlacklistManager user={user}/>
        </div>
      </div>
    </div>
  );
};

export default BlacklistMain;
