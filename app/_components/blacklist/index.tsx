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
      <div className="p-6 md:p-10 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white -m-[1px] dark:bg-neutral-900 flex flex-col gap-2 flex-1 w-full">
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
