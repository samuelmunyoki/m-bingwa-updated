import React from "react";
import { UsersTable } from "./users-table";
const UsersMain = () => {
  return (
    <div className="flex flex-1 !mb-2">
      <div className="p-6 md:p-5  md:pl-10 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white -m-[1px] dark:bg-neutral-900 flex flex-col gap-2 flex-1 w-full">
        <h2 className="text-lg text-neutral-600 font-medium">
          Users Management
        </h2>
        <div className="flex gap-2">
          <UsersTable />
        </div>
      </div>
    </div>
  );
};

export default UsersMain;
