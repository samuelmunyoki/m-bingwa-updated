import { Id } from "@/convex/_generated/dataModel";
import React from "react";
import { ShieldBan } from "lucide-react";
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
    <div className="flex flex-1 h-full overflow-hidden px-1.5 md:px-0">
      <div className="px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex flex-col flex-1 w-full gap-2 overflow-hidden">
        <div className="flex items-center gap-2 mb-2">
          <ShieldBan className="w-5 h-5 text-neutral-500" />
          <h2 className="text-lg text-neutral-600 dark:text-neutral-300 font-medium">Phone Number Blacklist</h2>
        </div>
        <div className="border-b border-neutral-200 dark:border-neutral-700 mb-2" />
        <div className="flex-1 overflow-y-auto">
          <BlacklistManager user={user} />
        </div>
      </div>
    </div>
  );
};

export default BlacklistMain;
